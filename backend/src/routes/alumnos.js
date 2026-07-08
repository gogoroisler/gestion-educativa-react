import { Router } from 'express';
import db from '../db/connection.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/alumnos — lista alumnos activos
router.get('/', verifyToken, (req, res) => {
  const alumnos = db.prepare(`
    SELECT id, dni, nombre, apellido, email, fecha_nacimiento, estado, created_at
    FROM alumnos
    WHERE estado = 'activo'
    ORDER BY apellido, nombre
  `).all();
  res.json(alumnos);
});

// GET /api/alumnos/:id — detalle de un alumno (activo o inactivo)
router.get('/:id', verifyToken, (req, res) => {
  const alumno = db.prepare(`
    SELECT id, dni, nombre, apellido, email, fecha_nacimiento, estado, created_at
    FROM alumnos
    WHERE id = ?
  `).get(req.params.id);

  if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado' });
  res.json(alumno);
});

// POST /api/alumnos — crear alumno (solo admin)
router.post('/', verifyToken, requireRole('admin'), (req, res) => {
  const { dni, nombre, apellido, email, fecha_nacimiento } = req.body;

  if (!dni || !nombre || !apellido) {
    return res.status(400).json({ error: 'dni, nombre y apellido son requeridos' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO alumnos (dni, nombre, apellido, email, fecha_nacimiento)
      VALUES (@dni, @nombre, @apellido, @email, @fecha_nacimiento)
    `).run({ dni, nombre, apellido, email: email || null, fecha_nacimiento: fecha_nacimiento || null });

    const nuevo = db.prepare('SELECT * FROM alumnos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(nuevo);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un alumno con ese DNI' });
    }
    throw err;
  }
});

// PUT /api/alumnos/:id — actualizar alumno (solo admin)
router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { dni, nombre, apellido, email, fecha_nacimiento } = req.body;

  const alumno = db.prepare('SELECT id FROM alumnos WHERE id = ?').get(req.params.id);
  if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado' });

  try {
    db.prepare(`
      UPDATE alumnos
      SET dni = COALESCE(@dni, dni),
          nombre = COALESCE(@nombre, nombre),
          apellido = COALESCE(@apellido, apellido),
          email = COALESCE(@email, email),
          fecha_nacimiento = COALESCE(@fecha_nacimiento, fecha_nacimiento)
      WHERE id = @id
    `).run({ id: req.params.id, dni: dni || null, nombre: nombre || null, apellido: apellido || null, email: email || null, fecha_nacimiento: fecha_nacimiento || null });

    res.json(db.prepare('SELECT * FROM alumnos WHERE id = ?').get(req.params.id));
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un alumno con ese DNI' });
    }
    throw err;
  }
});

// DELETE /api/alumnos/:id — baja lógica (solo admin)
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const alumno = db.prepare('SELECT id FROM alumnos WHERE id = ?').get(req.params.id);
  if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado' });

  db.prepare("UPDATE alumnos SET estado = 'inactivo' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Alumno dado de baja correctamente' });
});

export default router;
