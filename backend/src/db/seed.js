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
const docente  = db.prepare("SELECT id FROM usuarios WHERE email = 'docente@demo.com'").get();
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

// --- Alumnos e inscripciones ---
const insertAlumno = db.prepare(`
  INSERT INTO alumnos (dni, nombre, apellido, email)
  VALUES (@dni, @nombre, @apellido, @email)
  ON CONFLICT(dni) DO NOTHING
`);
const alumnos = [
  { dni: '40111222', nombre: 'Lucía',     apellido: 'Gómez',   email: 'lucia@mail.com'  },
  { dni: '40333444', nombre: 'Marcos',    apellido: 'Herrera', email: 'marcos@mail.com' },
  { dni: '40555666', nombre: 'Valentina', apellido: 'Ríos',    email: 'vale@mail.com'   },
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

// --- Calificaciones de prueba ---
// Lucía: buena alumna (promedio ~8.5) → sin riesgo
// Marcos: notas bajas (promedio ~4) + mala asistencia → riesgo ambos
// Valentina: notas bajas (promedio ~4.5) + buena asistencia → riesgo baja_nota
const lucia   = db.prepare("SELECT id FROM alumnos WHERE dni = '40111222'").get();
const marcos  = db.prepare("SELECT id FROM alumnos WHERE dni = '40333444'").get();
const vale    = db.prepare("SELECT id FROM alumnos WHERE dni = '40555666'").get();

const inscLucia  = db.prepare('SELECT id FROM inscripciones WHERE alumno_id = ? AND comision_id = ?').get(lucia.id, comisionA.id);
const inscMarcos = db.prepare('SELECT id FROM inscripciones WHERE alumno_id = ? AND comision_id = ?').get(marcos.id, comisionA.id);
const inscVale   = db.prepare('SELECT id FROM inscripciones WHERE alumno_id = ? AND comision_id = ?').get(vale.id, comisionA.id);

const insertNota = db.prepare(`
  INSERT INTO calificaciones (inscripcion_id, periodo, nota)
  VALUES (@inscripcion_id, @periodo, @nota)
  ON CONFLICT DO NOTHING
`);

const notas = [
  { inscripcion_id: inscLucia.id,  periodo: '1er Cuatrimestre', nota: 9   },
  { inscripcion_id: inscLucia.id,  periodo: '2do Cuatrimestre', nota: 8   },
  { inscripcion_id: inscMarcos.id, periodo: '1er Cuatrimestre', nota: 4   },
  { inscripcion_id: inscMarcos.id, periodo: '2do Cuatrimestre', nota: 4   },
  { inscripcion_id: inscVale.id,   periodo: '1er Cuatrimestre', nota: 5   },
  { inscripcion_id: inscVale.id,   periodo: '2do Cuatrimestre', nota: 4   },
];
for (const n of notas) {
  insertNota.run(n);
}
console.log(`✓ calificaciones cargadas (${notas.length} registros)`);

// --- Asistencias de prueba ---
// 4 clases: Lucía asiste a todas (100%), Marcos a 1 de 4 (25%), Valentina a 4 de 4 (100%)
const insertAsist = db.prepare(`
  INSERT INTO asistencias (inscripcion_id, fecha, presente)
  VALUES (@inscripcion_id, @fecha, @presente)
  ON CONFLICT(inscripcion_id, fecha) DO UPDATE SET presente = excluded.presente
`);

const fechas = ['2026-06-02', '2026-06-09', '2026-06-16', '2026-06-23'];
for (const fecha of fechas) {
  insertAsist.run({ inscripcion_id: inscLucia.id,  fecha, presente: 1 });
  insertAsist.run({ inscripcion_id: inscMarcos.id, fecha, presente: fecha === '2026-06-02' ? 1 : 0 });
  insertAsist.run({ inscripcion_id: inscVale.id,   fecha, presente: 1 });
}
console.log(`✓ asistencias cargadas (${fechas.length} fechas × 3 alumnos)`);

console.log('\nSeed completado.');
