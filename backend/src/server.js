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
import { verifyToken } from './middleware/auth.js';

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
app.get('/api/comisiones/:id/dashboard', verifyToken, dashboardComisionHandler);

app.get('/api/health', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM usuarios').get();
  res.json({ status: 'ok', usuarios: count });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
