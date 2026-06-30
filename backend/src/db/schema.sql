-- Schema de la base de datos: gestion-educativa-react
-- SQLite no aplica foreign keys por defecto; se activan al abrir la conexión
-- con `PRAGMA foreign_keys = ON;` (esto va en el código de conexión, no acá).

CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'docente')),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cursos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE comisiones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  curso_id INTEGER NOT NULL REFERENCES cursos(id),
  docente_id INTEGER REFERENCES usuarios(id),
  nombre TEXT NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('mañana', 'tarde', 'noche')),
  cupo INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE alumnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dni TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT,
  fecha_nacimiento TEXT,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabla intermedia para la relación muchos-a-muchos alumno <-> comisión.
-- Calificaciones y asistencias cuelgan de la inscripción, no del par
-- alumno+comisión directo, para que una baja y un reingreso no mezclen datos.
CREATE TABLE inscripciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alumno_id INTEGER NOT NULL REFERENCES alumnos(id),
  comision_id INTEGER NOT NULL REFERENCES comisiones(id),
  fecha_inscripcion TEXT NOT NULL DEFAULT (datetime('now')),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo'))
);

-- Índice único parcial: evita dos inscripciones ACTIVAS del mismo alumno en
-- la misma comisión, pero permite historial (inscripciones inactivas viejas)
-- si el alumno se da de baja y se vuelve a inscribir más adelante.
CREATE UNIQUE INDEX idx_inscripcion_activa_unica
  ON inscripciones(alumno_id, comision_id)
  WHERE estado = 'activo';

-- periodo es texto libre a propósito (ver BACKLOG.md): cada institución
-- estructura el año distinto (cuatrimestres, trimestres, parciales sueltos).
CREATE TABLE calificaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inscripcion_id INTEGER NOT NULL REFERENCES inscripciones(id),
  periodo TEXT NOT NULL,
  nota REAL NOT NULL CHECK (nota >= 0 AND nota <= 10),
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE asistencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inscripcion_id INTEGER NOT NULL REFERENCES inscripciones(id),
  fecha TEXT NOT NULL,
  presente INTEGER NOT NULL CHECK (presente IN (0, 1)),
  UNIQUE (inscripcion_id, fecha)
);

-- Índices sobre las foreign keys: SQLite no las indexa automáticamente
-- (a diferencia de la PK), y el dashboard va a hacer joins frecuentes
-- alumno -> inscripcion -> calificaciones/asistencias.
CREATE INDEX idx_comisiones_curso ON comisiones(curso_id);
CREATE INDEX idx_inscripciones_alumno ON inscripciones(alumno_id);
CREATE INDEX idx_inscripciones_comision ON inscripciones(comision_id);
CREATE INDEX idx_calificaciones_inscripcion ON calificaciones(inscripcion_id);
CREATE INDEX idx_asistencias_inscripcion ON asistencias(inscripcion_id);
