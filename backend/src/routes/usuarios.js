import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/connection.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/usuarios — lista docentes activos (solo admin)
router.get('/', verifyToken, requireRole('admin'), (req, res) => {
  const usuarios = db.prepare(`
    SELECT id, nombre, email, rol, created_at
    FROM usuarios
    WHERE rol = 'docente' AND estado = 'activo'
    ORDER BY nombre
  `).all();
  res.json(usuarios);
});

// POST /api/usuarios — crear docente (solo admin)
router.post('/', verifyToken, requireRole('admin'), (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y contraseña son requeridos' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(`
      INSERT INTO usuarios (nombre, email, password_hash, rol)
      VALUES (@nombre, @email, @password_hash, 'docente')
    `).run({ nombre, email, password_hash });
    const nuevo = db.prepare(
      'SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?'
    ).get(result.lastInsertRowid);
    res.status(201).json(nuevo);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    throw err;
  }
});

// PUT /api/usuarios/:id — editar nombre, email y opcionalmente contraseña (solo admin)
router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { nombre, email, password } = req.body;
  const usuario = db.prepare(
    "SELECT id FROM usuarios WHERE id = ? AND rol = 'docente' AND estado = 'activo'"
  ).get(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Docente no encontrado' });

  if (password) {
    const password_hash = bcrypt.hashSync(password, 10);
    db.prepare(`
      UPDATE usuarios
      SET nombre = COALESCE(@nombre, nombre),
          email  = COALESCE(@email, email),
          password_hash = @password_hash
      WHERE id = @id
    `).run({ id: req.params.id, nombre: nombre || null, email: email || null, password_hash });
  } else {
    db.prepare(`
      UPDATE usuarios
      SET nombre = COALESCE(@nombre, nombre),
          email  = COALESCE(@email, email)
      WHERE id = @id
    `).run({ id: req.params.id, nombre: nombre || null, email: email || null });
  }

  res.json(
    db.prepare('SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?').get(req.params.id)
  );
});

// DELETE /api/usuarios/:id — baja lógica (solo admin, solo docentes)
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const usuario = db.prepare(
    "SELECT id FROM usuarios WHERE id = ? AND rol = 'docente' AND estado = 'activo'"
  ).get(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Docente no encontrado' });

  db.prepare("UPDATE usuarios SET estado = 'inactivo' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Docente desactivado correctamente' });
});

export default router;
