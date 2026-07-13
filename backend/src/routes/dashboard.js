import { Router } from 'express';
import db from '../db/connection.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/comisiones/:id/dashboard
// Métricas de una comisión: resumen, alumnos con indicadores, distribución de notas.
// Ambos roles pueden acceder, pero el docente solo a sus propias comisiones.
export function dashboardComisionHandler(req, res) {
  const comisionId = Number(req.params.id ?? req.params.comisionId);

  const comision = db.prepare(`
    SELECT c.*, cu.nombre AS curso_nombre FROM comisiones c
    JOIN cursos cu ON cu.id = c.curso_id
    WHERE c.id = ?
  `).get(comisionId);
  if (!comision) return res.status(404).json({ error: 'Comisión no encontrada' });

  if (req.user.rol === 'docente' && comision.docente_id !== req.user.id) {
    return res.status(403).json({ error: 'Sin permisos para esta comisión' });
  }

  // CTEs: dividimos la query compleja en pasos con nombre legible.
  // 1. inscriptos: los alumnos activos de la comisión (base de los demás pasos)
  // 2. promedios: promedio de notas por alumno (NULL si no tiene notas aún)
  // 3. asist_pct: porcentaje de asistencia y total de clases por alumno
  // El SELECT final cruza los tres para armar el indicador de riesgo.
  const alumnos = db.prepare(`
    WITH inscriptos AS (
      SELECT i.id AS inscripcion_id, i.alumno_id
      FROM inscripciones i
      WHERE i.comision_id = ? AND i.estado = 'activo'
    ),
    promedios AS (
      SELECT ins.alumno_id,
             ROUND(AVG(cal.nota), 2) AS promedio
      FROM inscriptos ins
      LEFT JOIN calificaciones cal ON cal.inscripcion_id = ins.inscripcion_id
      GROUP BY ins.alumno_id
    ),
    asist_pct AS (
      SELECT ins.alumno_id,
             COUNT(asi.id) AS clases_totales,
             CASE WHEN COUNT(asi.id) > 0
                  THEN ROUND(100.0 * SUM(asi.presente) / COUNT(asi.id), 1)
                  ELSE NULL END AS pct_asistencia
      FROM inscriptos ins
      LEFT JOIN asistencias asi ON asi.inscripcion_id = ins.inscripcion_id
      GROUP BY ins.alumno_id
    )
    SELECT a.id AS alumno_id, a.nombre, a.apellido, a.dni,
           p.promedio,
           ap.pct_asistencia,
           ap.clases_totales,
           CASE
             WHEN (p.promedio IS NOT NULL AND p.promedio < 6)
              AND (ap.pct_asistencia IS NOT NULL AND ap.pct_asistencia < 75) THEN 'ambos'
             WHEN p.promedio IS NOT NULL AND p.promedio < 6                  THEN 'baja_nota'
             WHEN ap.pct_asistencia IS NOT NULL AND ap.pct_asistencia < 75   THEN 'baja_asistencia'
             ELSE NULL
           END AS riesgo
    FROM inscriptos ins
    JOIN alumnos a ON a.id = ins.alumno_id
    LEFT JOIN promedios p   ON p.alumno_id  = ins.alumno_id
    LEFT JOIN asist_pct ap  ON ap.alumno_id = ins.alumno_id
    ORDER BY a.apellido, a.nombre
  `).all(comisionId);

  // Distribución de notas para el histograma del frontend
  const distribucion = db.prepare(`
    SELECT
      CASE
        WHEN nota < 4  THEN '0-3'
        WHEN nota < 6  THEN '4-5'
        WHEN nota < 8  THEN '6-7'
        WHEN nota < 10 THEN '8-9'
        ELSE '10'
      END AS rango,
      COUNT(*) AS cantidad
    FROM calificaciones cal
    JOIN inscripciones i ON i.id = cal.inscripcion_id
    WHERE i.comision_id = ? AND i.estado = 'activo'
    GROUP BY rango
  `).all(comisionId);

  // Completar rangos con 0 para que el frontend tenga siempre los 5 rangos
  const rangos = ['0-3', '4-5', '6-7', '8-9', '10'];
  const distMap = Object.fromEntries(distribucion.map(d => [d.rango, d.cantidad]));
  const distribucion_notas = rangos.map(r => ({ rango: r, cantidad: distMap[r] ?? 0 }));

  // Resumen calculado en JS a partir del array ya resuelto (más simple que otro CTE)
  const conNotas      = alumnos.filter(a => a.promedio !== null);
  const aprobados     = conNotas.filter(a => a.promedio >= 6);
  const enRiesgo      = alumnos.filter(a => a.riesgo !== null);
  const tasaAprobacion = conNotas.length > 0
    ? Math.round((aprobados.length / conNotas.length) * 1000) / 10
    : null;

  res.json({
    comision: { id: comision.id, nombre: comision.nombre, curso: comision.curso_nombre },
    resumen: {
      total_inscriptos: alumnos.length,
      aprobados: aprobados.length,
      en_riesgo: enRiesgo.length,
      tasa_aprobacion: tasaAprobacion,
    },
    alumnos,
    distribucion_notas,
  });
}

// GET /api/dashboard — resumen global (solo admin)
router.get('/', verifyToken, requireRole('admin'), (req, res) => {
  const stats = db.prepare(`
    WITH inscriptos AS (
      SELECT i.id AS inscripcion_id, i.alumno_id, i.comision_id
      FROM inscripciones i WHERE i.estado = 'activo'
    ),
    promedios AS (
      SELECT ins.alumno_id, ins.comision_id,
             AVG(cal.nota) AS promedio
      FROM inscriptos ins
      LEFT JOIN calificaciones cal ON cal.inscripcion_id = ins.inscripcion_id
      GROUP BY ins.alumno_id, ins.comision_id
    ),
    asist_pct AS (
      SELECT ins.alumno_id, ins.comision_id,
             CASE WHEN COUNT(asi.id) > 0
                  THEN 100.0 * SUM(asi.presente) / COUNT(asi.id)
                  ELSE NULL END AS pct_asistencia
      FROM inscriptos ins
      LEFT JOIN asistencias asi ON asi.inscripcion_id = ins.inscripcion_id
      GROUP BY ins.alumno_id, ins.comision_id
    )
    SELECT
      COUNT(DISTINCT ins.alumno_id)                                              AS total_alumnos,
      COUNT(DISTINCT ins.comision_id)                                            AS total_comisiones,
      COUNT(DISTINCT CASE WHEN p.promedio IS NOT NULL AND p.promedio < 6
                       OR ap.pct_asistencia IS NOT NULL AND ap.pct_asistencia < 75
                    THEN ins.alumno_id END)                                      AS alumnos_en_riesgo
    FROM inscriptos ins
    LEFT JOIN promedios p   ON p.alumno_id   = ins.alumno_id AND p.comision_id  = ins.comision_id
    LEFT JOIN asist_pct ap  ON ap.alumno_id  = ins.alumno_id AND ap.comision_id = ins.comision_id
  `).get();

  res.json(stats);
});

// GET /api/dashboard/por-materia — tasa de aprobación y riesgo por curso (solo admin)
// Responde: "¿qué materia tiene más alumnos con dificultades?"
router.get('/por-materia', verifyToken, requireRole('admin'), (req, res) => {
  const materias = db.prepare(`
    WITH inscriptos AS (
      SELECT i.id AS inscripcion_id, i.alumno_id, c.curso_id
      FROM inscripciones i
      JOIN comisiones c ON c.id = i.comision_id
      WHERE i.estado = 'activo' AND c.estado = 'activo'
    ),
    promedios AS (
      SELECT ins.alumno_id, ins.curso_id,
             AVG(cal.nota) AS promedio
      FROM inscriptos ins
      LEFT JOIN calificaciones cal ON cal.inscripcion_id = ins.inscripcion_id
      GROUP BY ins.alumno_id, ins.curso_id
    ),
    asist_pct AS (
      SELECT ins.alumno_id, ins.curso_id,
             CASE WHEN COUNT(asi.id) > 0
                  THEN 100.0 * SUM(asi.presente) / COUNT(asi.id)
                  ELSE NULL END AS pct_asistencia
      FROM inscriptos ins
      LEFT JOIN asistencias asi ON asi.inscripcion_id = ins.inscripcion_id
      GROUP BY ins.alumno_id, ins.curso_id
    ),
    clasificados AS (
      SELECT ins.alumno_id, ins.curso_id,
             CASE
               WHEN (p.promedio IS NOT NULL AND p.promedio < 6)
                 OR (ap.pct_asistencia IS NOT NULL AND ap.pct_asistencia < 75)
               THEN 1 ELSE 0
             END AS en_riesgo,
             CASE WHEN p.promedio IS NOT NULL AND p.promedio >= 6 THEN 1 ELSE 0 END AS aprobado,
             CASE WHEN p.promedio IS NOT NULL THEN 1 ELSE 0 END AS tiene_notas
      FROM inscriptos ins
      LEFT JOIN promedios p  ON p.alumno_id  = ins.alumno_id AND p.curso_id  = ins.curso_id
      LEFT JOIN asist_pct ap ON ap.alumno_id = ins.alumno_id AND ap.curso_id = ins.curso_id
    )
    SELECT cu.id AS curso_id,
           cu.nombre AS curso,
           COUNT(DISTINCT cl.alumno_id)                       AS total_inscriptos,
           SUM(cl.aprobado)                                    AS aprobados,
           SUM(cl.en_riesgo)                                   AS en_riesgo,
           CASE WHEN SUM(cl.tiene_notas) > 0
                THEN ROUND(100.0 * SUM(cl.aprobado) / SUM(cl.tiene_notas), 1)
                ELSE NULL END                                   AS tasa_aprobacion
    FROM clasificados cl
    JOIN cursos cu ON cu.id = cl.curso_id
    GROUP BY cl.curso_id
    ORDER BY tasa_aprobacion ASC NULLS LAST
  `).all();

  res.json(materias);
});

export default router;
