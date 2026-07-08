import { Router } from 'express';
import db from '../db/connection.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/comisiones — admin ve todas, docente solo las suyas
router.get('/', verifyToken, (req, res) => {
  const filtroDocente = req.user.rol === 'docente'
    ? 'AND c.docente_id = ?'
    : '';
  const params = req.user.rol === 'docente' ? [req.user.id] : [];

  const comisiones = db.prepare(`
    SELECT c.id, c.nombre, c.turno, c.cupo, c.anio, c.estado,
           cu.nombre AS curso_nombre,
           u.nombre  AS docente_nombre,
           COUNT(i.id) AS inscriptos
    FROM comisiones c
    JOIN cursos cu ON cu.id = c.curso_id
    LEFT JOIN usuarios u ON u.id = c.docente_id
    LEFT JOIN inscripciones i ON i.comision_id = c.id AND i.estado = 'activo'
    WHERE c.estado = 'activo' ${filtroDocente}
    GROUP BY c.id
    ORDER BY cu.nombre, c.nombre
  `).all(...params);

  res.json(comisiones);
});

// GET /api/comisiones/:id — detalle de la comisión
router.get('/:id', verifyToken, (req, res) => {
  const comision = db.prepare(`
    SELECT c.*, cu.nombre AS curso_nombre, u.nombre AS docente_nombre
    FROM comisiones c
    JOIN cursos cu ON cu.id = c.curso_id
    LEFT JOIN usuarios u ON u.id = c.docente_id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!comision) return res.status(404).json({ error: 'Comisión no encontrada' });
  res.json(comision);
});

// POST /api/comisiones — crear (solo admin)
router.post('/', verifyToken, requireRole('admin'), (req, res) => {
  const { curso_id, nombre, turno, cupo, anio, docente_id } = req.body;

  if (!curso_id || !nombre || !turno || !cupo || !anio) {
    return res.status(400).json({ error: 'curso_id, nombre, turno, cupo y anio son requeridos' });
  }

  const curso = db.prepare("SELECT id FROM cursos WHERE id = ? AND estado = 'activo'").get(curso_id);
  if (!curso) return res.status(400).json({ error: 'El curso indicado no existe o está inactivo' });

  const result = db.prepare(`
    INSERT INTO comisiones (curso_id, nombre, turno, cupo, anio, docente_id)
    VALUES (@curso_id, @nombre, @turno, @cupo, @anio, @docente_id)
  `).run({ curso_id, nombre, turno, cupo, anio, docente_id: docente_id || null });

  res.status(201).json(db.prepare('SELECT * FROM comisiones WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/comisiones/:id — actualizar (solo admin)
router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { nombre, turno, cupo, anio, docente_id } = req.body;
  const comision = db.prepare('SELECT id FROM comisiones WHERE id = ?').get(req.params.id);
  if (!comision) return res.status(404).json({ error: 'Comisión no encontrada' });

  db.prepare(`
    UPDATE comisiones
    SET nombre     = COALESCE(@nombre, nombre),
        turno      = COALESCE(@turno, turno),
        cupo       = COALESCE(@cupo, cupo),
        anio       = COALESCE(@anio, anio),
        docente_id = COALESCE(@docente_id, docente_id)
    WHERE id = @id
  `).run({ id: req.params.id, nombre: nombre || null, turno: turno || null, cupo: cupo || null, anio: anio || null, docente_id: docente_id || null });

  res.json(db.prepare('SELECT * FROM comisiones WHERE id = ?').get(req.params.id));
});

// DELETE /api/comisiones/:id — baja lógica (solo admin)
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const comision = db.prepare('SELECT id FROM comisiones WHERE id = ?').get(req.params.id);
  if (!comision) return res.status(404).json({ error: 'Comisión no encontrada' });

  db.prepare("UPDATE comisiones SET estado = 'inactivo' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Comisión dada de baja correctamente' });
});

// GET /api/comisiones/:id/alumnos — listado de alumnos inscriptos
router.get('/:id/alumnos', verifyToken, (req, res) => {
  const comision = db.prepare('SELECT id FROM comisiones WHERE id = ?').get(req.params.id);
  if (!comision) return res.status(404).json({ error: 'Comisión no encontrada' });

  const alumnos = db.prepare(`
    SELECT a.id, a.dni, a.nombre, a.apellido, a.email, i.id AS inscripcion_id, i.fecha_inscripcion
    FROM inscripciones i
    JOIN alumnos a ON a.id = i.alumno_id
    WHERE i.comision_id = ? AND i.estado = 'activo'
    ORDER BY a.apellido, a.nombre
  `).all(req.params.id);

  res.json(alumnos);
});

// POST /api/comisiones/:id/alumnos — inscribir alumno (solo admin)
router.post('/:id/alumnos', verifyToken, requireRole('admin'), (req, res) => {
  const { alumno_id } = req.body;
  if (!alumno_id) return res.status(400).json({ error: 'alumno_id es requerido' });

  const comision = db.prepare("SELECT id, cupo FROM comisiones WHERE id = ? AND estado = 'activo'").get(req.params.id);
  if (!comision) return res.status(404).json({ error: 'Comisión no encontrada' });

  const alumno = db.prepare("SELECT id FROM alumnos WHERE id = ? AND estado = 'activo'").get(alumno_id);
  if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado' });

  const { inscriptos } = db.prepare(
    "SELECT COUNT(*) AS inscriptos FROM inscripciones WHERE comision_id = ? AND estado = 'activo'"
  ).get(req.params.id);
  if (inscriptos >= comision.cupo) {
    return res.status(409).json({ error: 'La comisión alcanzó el cupo máximo' });
  }

  try {
    const result = db.prepare(
      'INSERT INTO inscripciones (alumno_id, comision_id) VALUES (?, ?)'
    ).run(alumno_id, req.params.id);
    res.status(201).json({ inscripcion_id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'El alumno ya está inscripto en esta comisión' });
    }
    throw err;
  }
});

// DELETE /api/comisiones/:id/alumnos/:alumnoId — dar de baja inscripción (solo admin)
router.delete('/:id/alumnos/:alumnoId', verifyToken, requireRole('admin'), (req, res) => {
  const inscripcion = db.prepare(`
    SELECT id FROM inscripciones
    WHERE comision_id = ? AND alumno_id = ? AND estado = 'activo'
  `).get(req.params.id, req.params.alumnoId);

  if (!inscripcion) return res.status(404).json({ error: 'Inscripción no encontrada' });

  db.prepare("UPDATE inscripciones SET estado = 'inactivo' WHERE id = ?").run(inscripcion.id);
  res.json({ message: 'Alumno dado de baja de la comisión' });
});

export default router;
