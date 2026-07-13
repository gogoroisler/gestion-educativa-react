import { Router } from 'express';
import db from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// Envuelve cada valor en comillas y escapa comillas internas duplicándolas.
// Garantiza que comas, saltos de línea o comillas en los datos no rompan el CSV.
function csvField(value) {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

function buildCsv(headers, rows) {
  const header = headers.map(csvField).join(',');
  const body   = rows.map(row => row.map(csvField).join(',')).join('\n');
  return `${header}\n${body}`;
}

// GET /api/alumnos/:id/boletin.csv — boletín individual de un alumno
router.get('/alumnos/:id/boletin.csv', verifyToken, (req, res) => {
  const alumno = db.prepare('SELECT * FROM alumnos WHERE id = ?').get(req.params.id);
  if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado' });

  const datos = db.prepare(`
    SELECT cu.nombre AS curso, c.nombre AS comision, c.turno, c.anio,
           ROUND(AVG(cal.nota), 2)                                         AS promedio,
           CASE WHEN COUNT(asi.id) > 0
                THEN ROUND(100.0 * SUM(asi.presente) / COUNT(asi.id), 1)
                ELSE NULL END                                               AS pct_asistencia,
           COUNT(DISTINCT cal.id)                                           AS cantidad_notas,
           COUNT(DISTINCT asi.id)                                           AS clases_registradas
    FROM inscripciones i
    JOIN comisiones c  ON c.id  = i.comision_id
    JOIN cursos cu     ON cu.id = c.curso_id
    LEFT JOIN calificaciones cal ON cal.inscripcion_id = i.id
    LEFT JOIN asistencias asi    ON asi.inscripcion_id = i.id
    WHERE i.alumno_id = ? AND i.estado = 'activo'
    GROUP BY i.id
    ORDER BY c.anio DESC, cu.nombre
  `).all(req.params.id);

  const csv = buildCsv(
    ['Alumno', 'DNI', 'Curso', 'Comisión', 'Turno', 'Año', 'Promedio', '% Asistencia', 'Clases registradas'],
    datos.map(d => [
      `${alumno.apellido}, ${alumno.nombre}`,
      alumno.dni,
      d.curso,
      d.comision,
      d.turno,
      d.anio,
      d.promedio ?? 'Sin notas',
      d.pct_asistencia !== null ? `${d.pct_asistencia}%` : 'Sin registros',
      d.clases_registradas,
    ])
  );

  const filename = `boletin_${alumno.apellido}_${alumno.nombre}.csv`
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes del nombre de archivo
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv); // BOM para que Excel abra correctamente con tildes
});

// GET /api/comisiones/:id/listado.csv — listado completo de alumnos de la comisión
router.get('/comisiones/:id/listado.csv', verifyToken, (req, res) => {
  const comision = db.prepare(`
    SELECT c.*, cu.nombre AS curso_nombre FROM comisiones c
    JOIN cursos cu ON cu.id = c.curso_id WHERE c.id = ?
  `).get(req.params.id);
  if (!comision) return res.status(404).json({ error: 'Comisión no encontrada' });

  if (req.user.rol === 'docente' && comision.docente_id !== req.user.id) {
    return res.status(403).json({ error: 'Sin permisos para esta comisión' });
  }

  const alumnos = db.prepare(`
    WITH inscriptos AS (
      SELECT i.id AS inscripcion_id, i.alumno_id
      FROM inscripciones i WHERE i.comision_id = ? AND i.estado = 'activo'
    )
    SELECT a.apellido, a.nombre, a.dni,
           ROUND(AVG(cal.nota), 2) AS promedio,
           CASE WHEN COUNT(asi.id) > 0
                THEN ROUND(100.0 * SUM(asi.presente) / COUNT(asi.id), 1)
                ELSE NULL END AS pct_asistencia,
           CASE
             WHEN AVG(cal.nota) IS NOT NULL AND AVG(cal.nota) < 6
              AND COUNT(asi.id) > 0 AND (100.0 * SUM(asi.presente) / COUNT(asi.id)) < 75 THEN 'Ambos'
             WHEN AVG(cal.nota) IS NOT NULL AND AVG(cal.nota) < 6                         THEN 'Nota baja'
             WHEN COUNT(asi.id) > 0 AND (100.0 * SUM(asi.presente) / COUNT(asi.id)) < 75 THEN 'Asistencia baja'
             ELSE 'Sin riesgo'
           END AS situacion
    FROM inscriptos ins
    JOIN alumnos a ON a.id = ins.alumno_id
    LEFT JOIN calificaciones cal ON cal.inscripcion_id = ins.inscripcion_id
    LEFT JOIN asistencias asi    ON asi.inscripcion_id = ins.inscripcion_id
    GROUP BY ins.alumno_id
    ORDER BY a.apellido, a.nombre
  `).all(req.params.id);

  const csv = buildCsv(
    ['Apellido', 'Nombre', 'DNI', 'Promedio', '% Asistencia', 'Situación'],
    alumnos.map(a => [
      a.apellido,
      a.nombre,
      a.dni,
      a.promedio ?? 'Sin notas',
      a.pct_asistencia !== null ? `${a.pct_asistencia}%` : 'Sin registros',
      a.situacion,
    ])
  );

  const filename = `listado_${comision.curso_nombre}_${comision.nombre}_${comision.anio}.csv`
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv);
});

export default router;
