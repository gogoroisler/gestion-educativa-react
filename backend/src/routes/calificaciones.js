import { Router } from 'express';
import db from '../db/connection.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

// Verifica que el usuario sea admin o el docente asignado a la comisión.
// Se usa en rutas de escritura (POST, PUT, DELETE de notas).
function puedeEscribirEnComision(comisionId, user) {
  if (user.rol === 'admin') return true;
  const comision = db.prepare('SELECT docente_id FROM comisiones WHERE id = ?').get(comisionId);
  return comision?.docente_id === user.id;
}

// ── Router anidado: /api/comisiones/:comisionId/calificaciones ─────────────
// mergeParams: true permite acceder a :comisionId definido en el router padre.
export const comisionCalifRouter = Router({ mergeParams: true });

// GET — todas las calificaciones de la comisión, con info del alumno
comisionCalifRouter.get('/', verifyToken, (req, res) => {
  const { comisionId } = req.params;

  const comision = db.prepare('SELECT id FROM comisiones WHERE id = ?').get(comisionId);
  if (!comision) return res.status(404).json({ error: 'Comisión no encontrada' });

  const calificaciones = db.prepare(`
    SELECT cal.id, cal.periodo, cal.nota, cal.fecha,
           a.id AS alumno_id, a.nombre || ' ' || a.apellido AS nombre, a.dni,
           i.id AS inscripcion_id
    FROM calificaciones cal
    JOIN inscripciones i ON i.id = cal.inscripcion_id
    JOIN alumnos a ON a.id = i.alumno_id
    WHERE i.comision_id = ? AND i.estado = 'activo'
    ORDER BY a.apellido, a.nombre, cal.periodo
  `).all(comisionId);

  res.json(calificaciones);
});

// POST — cargar nota para un alumno en esta comisión
comisionCalifRouter.post('/', verifyToken, (req, res) => {
  const { comisionId } = req.params;
  const { alumno_id, periodo, nota } = req.body;

  if (!puedeEscribirEnComision(Number(comisionId), req.user)) {
    return res.status(403).json({ error: 'Sin permisos para esta comisión' });
  }

  if (!alumno_id || !periodo || nota === undefined) {
    return res.status(400).json({ error: 'alumno_id, periodo y nota son requeridos' });
  }

  const inscripcion = db.prepare(`
    SELECT id FROM inscripciones
    WHERE alumno_id = ? AND comision_id = ? AND estado = 'activo'
  `).get(alumno_id, comisionId);

  if (!inscripcion) {
    return res.status(404).json({ error: 'El alumno no está inscripto en esta comisión' });
  }

  const result = db.prepare(`
    INSERT INTO calificaciones (inscripcion_id, periodo, nota)
    VALUES (@inscripcion_id, @periodo, @nota)
  `).run({ inscripcion_id: inscripcion.id, periodo, nota });

  res.status(201).json(
    db.prepare('SELECT * FROM calificaciones WHERE id = ?').get(result.lastInsertRowid)
  );
});

// ── Router de recursos individuales: /api/calificaciones/:id ──────────────
export const califRouter = Router();

// PUT — editar nota (admin o docente de la comisión)
califRouter.put('/:id', verifyToken, (req, res) => {
  const { periodo, nota } = req.body;
  const calificacion = db.prepare(`
    SELECT cal.*, i.comision_id FROM calificaciones cal
    JOIN inscripciones i ON i.id = cal.inscripcion_id
    WHERE cal.id = ?
  `).get(req.params.id);

  if (!calificacion) return res.status(404).json({ error: 'Calificación no encontrada' });

  if (!puedeEscribirEnComision(calificacion.comision_id, req.user)) {
    return res.status(403).json({ error: 'Sin permisos para esta comisión' });
  }

  db.prepare(`
    UPDATE calificaciones
    SET periodo = COALESCE(@periodo, periodo),
        nota    = COALESCE(@nota, nota)
    WHERE id = @id
  `).run({ id: req.params.id, periodo: periodo ?? null, nota: nota ?? null });

  res.json(db.prepare('SELECT * FROM calificaciones WHERE id = ?').get(req.params.id));
});

// DELETE — eliminar nota (solo admin)
califRouter.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const calificacion = db.prepare('SELECT id FROM calificaciones WHERE id = ?').get(req.params.id);
  if (!calificacion) return res.status(404).json({ error: 'Calificación no encontrada' });

  db.prepare('DELETE FROM calificaciones WHERE id = ?').run(req.params.id);
  res.json({ message: 'Calificación eliminada' });
});
