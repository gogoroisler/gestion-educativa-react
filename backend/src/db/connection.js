import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

// import.meta.url reemplaza a __dirname, que no existe en ES Modules.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = path.resolve(process.cwd(), process.env.DB_PATH || './data/gestion_educativa.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const db = new Database(dbPath);

// SQLite no valida foreign keys por defecto; hay que activarlo en cada conexión.
db.pragma('foreign_keys = ON');

// Todas las sentencias del schema usan IF NOT EXISTS, así que ejecutarlo
// en cada arranque es seguro: crea las tablas la primera vez y no hace
// nada si ya existen.
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

export default db;
