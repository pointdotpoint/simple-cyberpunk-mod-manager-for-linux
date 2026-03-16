import type { Mod, ModFile, ModSource, ModStatus } from '../../shared/types'
import { getDb } from './connection'

// Row types matching the SQL schema (snake_case)
interface ModRow {
  id: string
  name: string
  type: string
  status: string
  source: string
  source_archive: string | null
  file_size: number | null
  file_count: number | null
  imported_at: string
  updated_at: string
}

interface ModFileRow {
  id: number
  mod_id: string
  staging_path: string
  deploy_path: string | null
  file_hash: string | null
}

interface ConflictRow {
  mod_id: string
  mod_name: string
  deploy_path: string
}

// --- Conversion helpers ---

function rowToMod(row: ModRow): Mod {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Mod['type'],
    status: row.status as ModStatus,
    source: (row.source ?? 'imported') as ModSource,
    sourceArchive: row.source_archive,
    fileSize: row.file_size,
    fileCount: row.file_count,
    importedAt: row.imported_at,
    updatedAt: row.updated_at
  }
}

function rowToModFile(row: ModFileRow): ModFile {
  return {
    id: row.id,
    modId: row.mod_id,
    stagingPath: row.staging_path,
    deployPath: row.deploy_path,
    fileHash: row.file_hash
  }
}

// --- Mod CRUD ---

export function getAllMods(): Mod[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM mods').all() as ModRow[]
  return rows.map(rowToMod)
}

export function getMod(id: string): Mod | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM mods WHERE id = ?').get(id) as
    | ModRow
    | undefined
  return row ? rowToMod(row) : null
}

export function insertMod(mod: Mod): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO mods (id, name, type, status, source, source_archive, file_size, file_count, imported_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    mod.id,
    mod.name,
    mod.type,
    mod.status,
    mod.source,
    mod.sourceArchive,
    mod.fileSize,
    mod.fileCount,
    mod.importedAt,
    mod.updatedAt
  )
}

export function updateModStatus(id: string, status: ModStatus): void {
  const db = getDb()
  db.prepare(
    'UPDATE mods SET status = ?, updated_at = ? WHERE id = ?'
  ).run(status, new Date().toISOString(), id)
}

export function deleteMod(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM mods WHERE id = ?').run(id)
}

// --- ModFile CRUD ---

export function getModFiles(modId: string): ModFile[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM mod_files WHERE mod_id = ?')
    .all(modId) as ModFileRow[]
  return rows.map(rowToModFile)
}

export function insertModFile(file: Omit<ModFile, 'id'>): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO mod_files (mod_id, staging_path, deploy_path, file_hash)
     VALUES (?, ?, ?, ?)`
  ).run(file.modId, file.stagingPath, file.deployPath, file.fileHash)
}

export function insertModFiles(files: Omit<ModFile, 'id'>[]): void {
  const db = getDb()
  const stmt = db.prepare(
    `INSERT INTO mod_files (mod_id, staging_path, deploy_path, file_hash)
     VALUES (?, ?, ?, ?)`
  )
  const insertMany = db.transaction((items: Omit<ModFile, 'id'>[]) => {
    for (const file of items) {
      stmt.run(file.modId, file.stagingPath, file.deployPath, file.fileHash)
    }
  })
  insertMany(files)
}

// --- Conflict detection ---

export function getConflictingFiles(
  deployPaths: string[],
  excludeModId?: string
): { modId: string; modName: string; deployPath: string }[] {
  if (deployPaths.length === 0) return []

  const db = getDb()
  const placeholders = deployPaths.map(() => '?').join(', ')

  let sql = `
    SELECT mf.deploy_path, mf.mod_id, m.name AS mod_name
    FROM mod_files mf
    JOIN mods m ON m.id = mf.mod_id
    WHERE mf.deploy_path IN (${placeholders})
  `
  const params: (string | undefined)[] = [...deployPaths]

  if (excludeModId) {
    sql += ' AND mf.mod_id != ?'
    params.push(excludeModId)
  }

  const rows = db.prepare(sql).all(...params) as ConflictRow[]
  return rows.map((row) => ({
    modId: row.mod_id,
    modName: row.mod_name,
    deployPath: row.deploy_path
  }))
}

// --- Settings ---

export function getSetting(key: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row ? row.value : null
}

export function setSetting(key: string, value: string): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value)
}

// --- Scanner helpers ---

export function getAllTrackedDeployPaths(): Set<string> {
  const db = getDb()
  const rows = db
    .prepare('SELECT deploy_path FROM mod_files WHERE deploy_path IS NOT NULL')
    .all() as { deploy_path: string }[]
  return new Set(rows.map((r) => r.deploy_path))
}

export function updateModFileStagingPath(fileId: number, stagingPath: string): void {
  const db = getDb()
  db.prepare('UPDATE mod_files SET staging_path = ? WHERE id = ?').run(stagingPath, fileId)
}
