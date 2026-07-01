import bcrypt from 'bcryptjs';
import db from './connection.js';

const usuarios = [
  { nombre: 'Admin', email: 'admin@demo.com', password: 'admin1234', rol: 'admin' },
  { nombre: 'Docente Demo', email: 'docente@demo.com', password: 'docente1234', rol: 'docente' },
];

const insert = db.prepare(`
  INSERT INTO usuarios (nombre, email, password_hash, rol)
  VALUES (@nombre, @email, @password_hash, @rol)
  ON CONFLICT(email) DO NOTHING
`);

for (const u of usuarios) {
  const password_hash = bcrypt.hashSync(u.password, 10);
  insert.run({ nombre: u.nombre, email: u.email, password_hash, rol: u.rol });
  console.log(`✓ ${u.rol}: ${u.email} / ${u.password}`);
}

console.log('Seed completado.');
