import bcrypt from 'bcryptjs';
import db from './connection.js';

// --- Usuarios ---
const insertUsuario = db.prepare(`
  INSERT INTO usuarios (nombre, email, password_hash, rol)
  VALUES (@nombre, @email, @password_hash, @rol)
  ON CONFLICT(email) DO NOTHING
`);

const usuarios = [
  { nombre: 'Admin', email: 'admin@demo.com', password: 'admin1234', rol: 'admin' },
  { nombre: 'Docente Demo', email: 'docente@demo.com', password: 'docente1234', rol: 'docente' },
];

for (const u of usuarios) {
  const password_hash = bcrypt.hashSync(u.password, 10);
  insertUsuario.run({ nombre: u.nombre, email: u.email, password_hash, rol: u.rol });
  console.log(`✓ usuario (${u.rol}): ${u.email} / ${u.password}`);
}

// --- Cursos ---
const insertCurso = db.prepare(`
  INSERT INTO cursos (nombre, descripcion)
  VALUES (@nombre, @descripcion)
  ON CONFLICT DO NOTHING
`);

const cursos = [
  { nombre: 'Matemática', descripcion: 'Álgebra y análisis matemático' },
  { nombre: 'Lengua y Literatura', descripcion: null },
  { nombre: 'Historia', descripcion: null },
];

for (const c of cursos) {
  insertCurso.run(c);
  console.log(`✓ curso: ${c.nombre}`);
}

// --- Comisiones ---
const docente = db.prepare("SELECT id FROM usuarios WHERE email = 'docente@demo.com'").get();
const mateMat  = db.prepare("SELECT id FROM cursos WHERE nombre = 'Matemática'").get();
const lengua   = db.prepare("SELECT id FROM cursos WHERE nombre = 'Lengua y Literatura'").get();

const insertComision = db.prepare(`
  INSERT INTO comisiones (curso_id, docente_id, nombre, turno, cupo, anio)
  VALUES (@curso_id, @docente_id, @nombre, @turno, @cupo, @anio)
  ON CONFLICT DO NOTHING
`);

const comisiones = [
  { curso_id: mateMat.id, docente_id: docente.id, nombre: 'Comisión A', turno: 'mañana', cupo: 30, anio: 2026 },
  { curso_id: mateMat.id, docente_id: docente.id, nombre: 'Comisión B', turno: 'tarde',  cupo: 25, anio: 2026 },
  { curso_id: lengua.id,  docente_id: null,        nombre: 'Comisión A', turno: 'mañana', cupo: 28, anio: 2026 },
];

for (const c of comisiones) {
  insertComision.run(c);
  console.log(`✓ comisión: ${c.nombre} (turno ${c.turno})`);
}

// --- Alumnos e inscripciones de prueba ---
const insertAlumno = db.prepare(`
  INSERT INTO alumnos (dni, nombre, apellido, email)
  VALUES (@dni, @nombre, @apellido, @email)
  ON CONFLICT(dni) DO NOTHING
`);

const alumnos = [
  { dni: '40111222', nombre: 'Lucía',   apellido: 'Gómez',     email: 'lucia@mail.com'   },
  { dni: '40333444', nombre: 'Marcos',  apellido: 'Herrera',   email: 'marcos@mail.com'  },
  { dni: '40555666', nombre: 'Valentina', apellido: 'Ríos',    email: 'vale@mail.com'    },
];

for (const a of alumnos) {
  insertAlumno.run(a);
  console.log(`✓ alumno: ${a.apellido}, ${a.nombre}`);
}

const comisionA = db.prepare("SELECT id FROM comisiones WHERE nombre = 'Comisión A' AND curso_id = ?").get(mateMat.id);

const insertInscripcion = db.prepare(`
  INSERT INTO inscripciones (alumno_id, comision_id)
  VALUES (@alumno_id, @comision_id)
  ON CONFLICT DO NOTHING
`);

for (const a of alumnos) {
  const alumno = db.prepare('SELECT id FROM alumnos WHERE dni = ?').get(a.dni);
  insertInscripcion.run({ alumno_id: alumno.id, comision_id: comisionA.id });
  console.log(`✓ inscripción: ${a.apellido} → Matemática Comisión A`);
}

console.log('\nSeed completado.');
