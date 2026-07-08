import { Router } from 'express';
import db from '../db/connection.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', verifyToken, (req, res) => {
  const cursos = db.prepare(`
    SELECT id, nombre, descripcion, estado, created_at
    FROM cursos
    WHERE estado = 'activo'
    ORDER BY nombre
  `).all();
  res.json(cursos);
});

router.get('/:id', verifyToken, (req, res) => {
  const curso = db.prepare('SELECT * FROM cursos WHERE id = ?').get(req.params.id);
  if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
  res.json(curso);
});

router.post('/', verifyToken, requireRole('admin'), (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

  const result = db.prepare(
    'INSERT INTO cursos (nombre, descripcion) VALUES (@nombre, @descripcion)'
  ).run({ nombre, descripcion: descripcion || null });

  res.status(201).json(db.prepare('SELECT * FROM cursos WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const { nombre, descripcion } = req.body;
  const curso = db.prepare('SELECT id FROM cursos WHERE id = ?').get(req.params.id);
  if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

  db.prepare(`
    UPDATE cursos
    SET nombre = COALESCE(@nombre, nombre),
        descripcion = COALESCE(@descripcion, descripcion)
    WHERE id = @id
  `).run({ id: req.params.id, nombre: nombre || null, descripcion: descripcion || null });

  res.json(db.prepare('SELECT * FROM cursos WHERE id = ?').get(req.params.id));
});

router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const curso = db.prepare('SELECT id FROM cursos WHERE id = ?').get(req.params.id);
  if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

  db.prepare("UPDATE cursos SET estado = 'inactivo' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Curso dado de baja correctamente' });
});

export default router;
