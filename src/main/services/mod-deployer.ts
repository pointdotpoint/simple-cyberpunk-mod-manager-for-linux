import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { EnableResult, ConflictInfo } from '../../shared/types'
import {
  getMod,
  getModFiles,
  getConflictingFiles,
  updateModStatus,
  deleteMod as deleteModFromDb,
  getSetting,
  updateModFileStagingPath
} from '../database/queries'

const DEFAULT_STAGING_DIR = path.join(
  process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local/share'),
  'cp2077-mod-manager',
  'staging'
)

function getStagingDir(): string {
  return getSetting('staging_directory') ?? DEFAULT_STAGING_DIR
}

function removeEmptyDirs(filePath: string, stopAt: string): void {
  let dir = path.dirname(filePath)
  while (dir !== stopAt && dir.startsWith(stopAt)) {
    const entries = fs.readdirSync(dir)
    if (entries.length === 0) {
      fs.rmdirSync(dir)
      dir = path.dirname(dir)
    } else {
      break
    }
  }
}

export function enableMod(modId: string, force?: boolean): EnableResult {
  const mod = getMod(modId)
  if (!mod) throw new Error(`Mod not found: ${modId}`)
  if (mod.status === 'enabled') throw new Error(`Mod is already enabled: ${modId}`)

  const modFiles = getModFiles(modId)

  const gameDir = getSetting('game_directory')
  if (!gameDir) throw new Error('Game directory is not set')

  const stagingDir = getStagingDir()

  const deployPaths = modFiles
    .map((f) => f.deployPath)
    .filter((p): p is string => p !== null)

  if (!force) {
    const conflictRows = getConflictingFiles(deployPaths, modId)

    if (conflictRows.length > 0) {
      // Group conflicts by modId
      const grouped = new Map<string, ConflictInfo>()
      for (const row of conflictRows) {
        if (!grouped.has(row.modId)) {
          grouped.set(row.modId, {
            modId: row.modId,
            modName: row.modName,
            conflictingFiles: []
          })
        }
        grouped.get(row.modId)!.conflictingFiles.push(row.deployPath)
      }
      return { success: false, conflicts: Array.from(grouped.values()) }
    }
  }

  // Copy files from staging to game directory
  const copiedFiles: string[] = []
  try {
    for (const modFile of modFiles) {
      if (!modFile.deployPath) continue

      const src = path.join(stagingDir, modId, modFile.stagingPath)
      const dest = path.join(gameDir, modFile.deployPath)

      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(src, dest)
      copiedFiles.push(dest)
    }
  } catch (err) {
    // Rollback: delete all already-copied files
    for (const copied of copiedFiles) {
      try {
        fs.unlinkSync(copied)
      } catch {
        // ignore cleanup errors
      }
    }
    throw err
  }

  updateModStatus(modId, 'enabled')
  return { success: true }
}

export function disableMod(modId: string): void {
  const mod = getMod(modId)
  if (!mod) throw new Error(`Mod not found: ${modId}`)
  if (mod.status === 'disabled') throw new Error(`Mod is already disabled: ${modId}`)

  const modFiles = getModFiles(modId)

  const gameDir = getSetting('game_directory')
  if (!gameDir) throw new Error('Game directory is not set')

  const stagingDir = getStagingDir()

  for (const modFile of modFiles) {
    if (!modFile.deployPath) continue

    const dest = path.join(gameDir, modFile.deployPath)

    if (mod.source === 'scanned' && modFile.stagingPath === '') {
      // Scanned mod with no staging copy: move from game dir to staging
      const stagingTarget = path.join(stagingDir, modId, modFile.deployPath)
      try {
        fs.mkdirSync(path.dirname(stagingTarget), { recursive: true })
        fs.renameSync(dest, stagingTarget)
        removeEmptyDirs(dest, gameDir)
        updateModFileStagingPath(modFile.id, modFile.deployPath)
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw err
        }
      }
    } else {
      // Imported mod or scanned mod already in staging: delete from game dir
      try {
        fs.unlinkSync(dest)
        removeEmptyDirs(dest, gameDir)
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw err
        }
      }
    }
  }

  updateModStatus(modId, 'disabled')
}

export function deleteMod(modId: string): void {
  const mod = getMod(modId)
  if (!mod) throw new Error(`Mod not found: ${modId}`)

  if (mod.status === 'enabled') {
    disableMod(modId)
  }

  const stagingDir = getStagingDir()
  const modStagingDir = path.join(stagingDir, modId)
  fs.rmSync(modStagingDir, { recursive: true, force: true })

  deleteModFromDb(modId)
}

export function bulkEnable(ids: string[]): EnableResult[] {
  return ids.map((id) => enableMod(id))
}

export function bulkDisable(ids: string[]): void {
  for (const id of ids) {
    disableMod(id)
  }
}

export function bulkDelete(ids: string[]): void {
  for (const id of ids) {
    deleteMod(id)
  }
}
