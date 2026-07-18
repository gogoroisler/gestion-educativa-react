import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import db from './db/connection.js';
import authRouter from './routes/auth.js';
import alumnosRouter from './routes/alumnos.js';
import cursosRouter from './routes/cursos.js';
import comisionesRouter from './routes/comisiones.js';
import { comisionCalifRouter, califRouter } from './routes/calificaciones.js';
import { comisionAsistRouter, asistRouter } from './routes/asistencias.js';
import dashboardRouter, { dashboardComisionHandler } from './routes/dashboard.js';
import exportsRouter from './routes/exports.js';
import usuariosRouter from './routes/usuarios.js';
import { verifyToken, requireRole } from './middleware/auth.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/alumnos', alumnosRouter);
app.use('/api/cursos', cursosRouter);
app.use('/api/comisiones', comisionesRouter);
app.use('/api/comisiones/:comisionId/calificaciones', comisionCalifRouter);
app.use('/api/calificaciones', califRouter);
app.use('/api/comisiones/:comisionId/asistencias', comisionAsistRouter);
app.use('/api/asistencias', asistRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api', exportsRouter);
app.use('/api/usuarios', usuariosRouter);
app.get('/api/comisiones/:id/dashboard', verifyToken, dashboardComisionHandler);

app.get('/api/docentes', verifyToken, requireRole('admin'), (req, res) => {
  const docentes = db.prepare(
    "SELECT id, nombre, email FROM usuarios WHERE rol = 'docente' AND estado = 'activo' ORDER BY nombre"
  ).all();
  res.json(docentes);
});

app.get('/api/health', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM usuarios').get();
  res.json({ status: 'ok', usuarios: count });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
