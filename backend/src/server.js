import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import db from './db/connection.js';
import authRouter from './routes/auth.js';
import alumnosRouter from './routes/alumnos.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/alumnos', alumnosRouter);

app.get('/api/health', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM usuarios').get();
  res.json({ status: 'ok', usuarios: count });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
