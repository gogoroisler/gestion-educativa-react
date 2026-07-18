import { Router } from 'express';
import db from '../db/connection.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

function puedeEscribirEnComision(comisionId, user) {
  if (user.rol === 'admin') return true;
  const comision = db.prepare('SELECT docente_id FROM comisiones WHERE id = ?').get(comisionId);
  return comision?.docente_id === user.id;
}

// ── Router anidado: /api/comisiones/:comisionId/asistencias ────────────────
export const comisionAsistRouter = Router({ mergeParams: true });

// GET — asistencias de la comisión; ?fecha=YYYY-MM-DD para filtrar por día
comisionAsistRouter.get('/', verifyToken, (req, res) => {
  const { comisionId } = req.params;
  const { fecha } = req.query;

  const comision = db.prepare('SELECT id FROM comisiones WHERE id = ?').get(comisionId);
  if (!comision) return res.status(404).json({ error: 'Comisión no encontrada' });

  const filtroFecha = fecha ? 'AND asi.fecha = ?' : '';
  const params = fecha ? [comisionId, fecha] : [comisionId];

  const asistencias = db.prepare(`
    SELECT asi.id, asi.fecha, asi.presente,
           a.id AS alumno_id, a.nombre || ' ' || a.apellido AS nombre, a.dni,
           i.id AS inscripcion_id
    FROM asistencias asi
    JOIN inscripciones i ON i.id = asi.inscripcion_id
    JOIN alumnos a ON a.id = i.alumno_id
    WHERE i.comision_id = ? AND i.estado = 'activo' ${filtroFecha}
    ORDER BY asi.fecha DESC, a.apellido, a.nombre
  `).all(...params);

  res.json(asistencias);
});

// POST — registrar asistencia del día para todos los alumnos a la vez
// Body: { fecha: "YYYY-MM-DD", alumnos: [{ alumno_id, presente }] }
// Si ya existe registro para esa fecha, actualiza (upsert).
comisionAsistRouter.post('/', verifyToken, (req, res) => {
  const { comisionId } = req.params;
  const { fecha, alumnos } = req.body;

  if (!puedeEscribirEnComision(Number(comisionId), req.user)) {
    return res.status(403).json({ error: 'Sin permisos para esta comisión' });
  }

  if (!fecha || !Array.isArray(alumnos) || alumnos.length === 0) {
    return res.status(400).json({ error: 'fecha y un array de alumnos son requeridos' });
  }

  const upsert = db.prepare(`
    INSERT INTO asistencias (inscripcion_id, fecha, presente)
    VALUES (@inscripcion_id, @fecha, @presente)
    ON CONFLICT(inscripcion_id, fecha) DO UPDATE SET presente = excluded.presente
  `);

  const getInscripcion = db.prepare(`
    SELECT id FROM inscripciones
    WHERE alumno_id = ? AND comision_id = ? AND estado = 'activo'
  `);

  // Transacción: o se guardan todos o ninguno (si hay un error a mitad de lista)
  const registrarTodos = db.transaction((alumnos) => {
    const resultados = [];
    for (const { alumno_id, presente } of alumnos) {
      const inscripcion = getInscripcion.get(alumno_id, comisionId);
      if (!inscripcion) continue; // alumno no inscripto en esta comisión, se omite
      upsert.run({ inscripcion_id: inscripcion.id, fecha, presente: presente ? 1 : 0 });
      resultados.push({ alumno_id, presente });
    }
    return resultados;
  });

  const guardados = registrarTodos(alumnos);
  res.status(201).json({ fecha, registros: guardados.length, detalle: guardados });
});

// ── Router de recursos individuales: /api/asistencias/:id ─────────────────
export const asistRouter = Router();

// PUT — corregir un registro individual
asistRouter.put('/:id', verifyToken, (req, res) => {
  const { presente } = req.body;
  if (presente === undefined) {
    return res.status(400).json({ error: 'presente es requerido' });
  }

  const asistencia = db.prepare(`
    SELECT asi.*, i.comision_id FROM asistencias asi
    JOIN inscripciones i ON i.id = asi.inscripcion_id
    WHERE asi.id = ?
  `).get(req.params.id);

  if (!asistencia) return res.status(404).json({ error: 'Registro no encontrado' });

  if (!puedeEscribirEnComision(asistencia.comision_id, req.user)) {
    return res.status(403).json({ error: 'Sin permisos para esta comisión' });
  }

  db.prepare('UPDATE asistencias SET presente = ? WHERE id = ?').run(presente ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM asistencias WHERE id = ?').get(req.params.id));
});

// DELETE — solo admin
asistRouter.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const asistencia = db.prepare('SELECT id FROM asistencias WHERE id = ?').get(req.params.id);
  if (!asistencia) return res.status(404).json({ error: 'Registro no encontrado' });

  db.prepare('DELETE FROM asistencias WHERE id = ?').run(req.params.id);
  res.json({ message: 'Registro de asistencia eliminado' });
});
