import Database from 'better-sqlite3'
import path from 'path'
import os from 'os'
import fs from 'fs'

const DB_DIR =
  process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local/share')
const DB_PATH = path.join(DB_DIR, 'cp2077-mod-manager', 'mods.db')

let db: Database.Database | null = null

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS mods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'disabled',
      source_archive TEXT,
      file_size INTEGER,
      file_count INTEGER,
      imported_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mod_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mod_id TEXT NOT NULL REFERENCES mods(id) ON DELETE CASCADE,
      staging_path TEXT NOT NULL,
      deploy_path TEXT,
      file_hash TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mod_files_deploy_path ON mod_files(deploy_path);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

export function getDb(): Database.Database {
  if (db) return db

  // Ensure the directory exists
  const dbDir = path.dirname(DB_PATH)
  fs.mkdirSync(dbDir, { recursive: true })

  db = new Database(DB_PATH)

  // Enable WAL mode and foreign keys
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)

  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
