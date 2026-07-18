import bcrypt from 'bcryptjs'
import request from 'supertest'
import db from '../db/connection.js'
import app from '../app.js'

// bcrypt cost 4: mismo algoritmo que producción pero ~60x más rápido.
// Los hashes resultantes son válidos — solo es menos resistente a fuerza bruta,
// lo cual no importa en un entorno de test aislado.
const HASH_COST = 4

export function seedDb() {
  db.exec(`
    DELETE FROM asistencias;
    DELETE FROM calificaciones;
    DELETE FROM inscripciones;
    DELETE FROM comisiones;
    DELETE FROM alumnos;
    DELETE FROM cursos;
    DELETE FROM usuarios;
  `)

  const adminId = db.prepare(
    "INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)"
  ).run('Admin', 'admin@test.com', bcrypt.hashSync('admin1234', HASH_COST), 'admin').lastInsertRowid

  const docenteId = db.prepare(
    "INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)"
  ).run('Docente Uno', 'docente@test.com', bcrypt.hashSync('docente1234', HASH_COST), 'docente').lastInsertRowid

  // Docente sin comisiones asignadas — sirve para probar acceso denegado
  const docente2Id = db.prepare(
    "INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)"
  ).run('Docente Dos', 'docente2@test.com', bcrypt.hashSync('docente21234', HASH_COST), 'docente').lastInsertRowid

  const cursoId = db.prepare(
    "INSERT INTO cursos (nombre) VALUES (?)"
  ).run('Matemática').lastInsertRowid

  // comision1 asignada a docenteId; comision2 a docente2Id con cupo 1
  const comisionId = db.prepare(
    "INSERT INTO comisiones (curso_id, docente_id, nombre, turno, cupo, anio) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(cursoId, docenteId, 'Comisión A', 'mañana', 30, 2026).lastInsertRowid

  const comision2Id = db.prepare(
    "INSERT INTO comisiones (curso_id, docente_id, nombre, turno, cupo, anio) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(cursoId, docente2Id, 'Comisión B', 'tarde', 1, 2026).lastInsertRowid

  const alumnoId = db.prepare(
    "INSERT INTO alumnos (dni, nombre, apellido) VALUES (?, ?, ?)"
  ).run('11111111', 'Juan', 'García').lastInsertRowid

  const alumno2Id = db.prepare(
    "INSERT INTO alumnos (dni, nombre, apellido) VALUES (?, ?, ?)"
  ).run('22222222', 'Ana', 'López').lastInsertRowid

  const inscripcionId = db.prepare(
    "INSERT INTO inscripciones (alumno_id, comision_id) VALUES (?, ?)"
  ).run(alumnoId, comisionId).lastInsertRowid

  return {
    adminId, docenteId, docente2Id,
    cursoId, comisionId, comision2Id,
    alumnoId, alumno2Id, inscripcionId,
  }
}

// Hace login y devuelve el token JWT. Centraliza las credenciales de prueba.
export async function getToken(email) {
  const passwords = {
    'admin@test.com':    'admin1234',
    'docente@test.com':  'docente1234',
    'docente2@test.com': 'docente21234',
  }
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: passwords[email] })
  return res.body.token
}
