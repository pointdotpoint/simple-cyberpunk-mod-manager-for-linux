import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Mod, ScanResult } from '../../shared/types'
import { getAllTrackedDeployPaths, insertMod, insertModFiles } from '../database/queries'
import { walkFiles } from './fs-utils'

interface ScannedMod {
  name: string
  type: Mod['type']
  /** Deploy paths relative to game root */
  files: string[]
}

function scanArchiveMods(gameDir: string): ScannedMod[] {
  const modDir = path.join(gameDir, 'archive', 'pc', 'mod')
  if (!fs.existsSync(modDir)) return []

  const results: ScannedMod[] = []
  const entries = fs.readdirSync(modDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.archive')) continue
    const deployPath = path.join('archive', 'pc', 'mod', entry.name)
    const name = path.basename(entry.name, '.archive')
    results.push({ name, type: 'archive', files: [deployPath] })
  }
  return results
}

function scanCetMods(gameDir: string): ScannedMod[] {
  const cetDir = path.join(gameDir, 'bin', 'x64', 'plugins', 'cyber_engine_tweaks', 'mods')
  if (!fs.existsSync(cetDir)) return []

  const results: ScannedMod[] = []
  const entries = fs.readdirSync(cetDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const subdir = path.join(cetDir, entry.name)
    const initLua = path.join(subdir, 'init.lua')
    if (!fs.existsSync(initLua)) continue

    const relFiles = walkFiles(subdir)
    const deployBase = path.join('bin', 'x64', 'plugins', 'cyber_engine_tweaks', 'mods', entry.name)
    const files = relFiles.map((f) => path.join(deployBase, f))
    results.push({ name: entry.name, type: 'cet', files })
  }
  return results
}

function scanRedscriptMods(gameDir: string): ScannedMod[] {
  const scriptsDir = path.join(gameDir, 'r6', 'scripts')
  if (!fs.existsSync(scriptsDir)) return []

  const results: ScannedMod[] = []
  const entries = fs.readdirSync(scriptsDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const subdir = path.join(scriptsDir, entry.name)
    const relFiles = walkFiles(subdir)
    if (relFiles.length === 0) continue

    const deployBase = path.join('r6', 'scripts', entry.name)
    const files = relFiles.map((f) => path.join(deployBase, f))
    results.push({ name: entry.name, type: 'redscript', files })
  }
  return results
}

function scanTweakxlMods(gameDir: string): ScannedMod[] {
  const tweaksDir = path.join(gameDir, 'r6', 'tweaks')
  if (!fs.existsSync(tweaksDir)) return []

  const results: ScannedMod[] = []
  const entries = fs.readdirSync(tweaksDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subdir = path.join(tweaksDir, entry.name)
      const relFiles = walkFiles(subdir)
      if (relFiles.length === 0) continue
      const deployBase = path.join('r6', 'tweaks', entry.name)
      const files = relFiles.map((f) => path.join(deployBase, f))
      results.push({ name: entry.name, type: 'tweakxl', files })
    } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
      const deployPath = path.join('r6', 'tweaks', entry.name)
      const name = path.basename(entry.name, '.yaml')
      results.push({ name, type: 'tweakxl', files: [deployPath] })
    }
  }
  return results
}

function scanRed4extMods(gameDir: string): ScannedMod[] {
  const pluginsDir = path.join(gameDir, 'red4ext', 'plugins')
  if (!fs.existsSync(pluginsDir)) return []

  const results: ScannedMod[] = []
  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const subdir = path.join(pluginsDir, entry.name)
    const relFiles = walkFiles(subdir)
    if (relFiles.length === 0) continue

    const deployBase = path.join('red4ext', 'plugins', entry.name)
    const files = relFiles.map((f) => path.join(deployBase, f))
    results.push({ name: entry.name, type: 'red4ext', files })
  }
  return results
}

export function scanExistingMods(gameDir: string): ScanResult {
  const result: ScanResult = { discovered: 0, skipped: 0, errors: [] }
  const trackedPaths = getAllTrackedDeployPaths()

  const scanners = [
    scanArchiveMods,
    scanCetMods,
    scanRedscriptMods,
    scanTweakxlMods,
    scanRed4extMods
  ]

  for (const scanner of scanners) {
    let mods: ScannedMod[]
    try {
      mods = scanner(gameDir)
    } catch (err) {
      result.errors.push(`Scanner failed: ${(err as Error).message}`)
      continue
    }

    for (const scanned of mods) {
      // Idempotency: skip if all deploy paths are already tracked
      const allTracked = scanned.files.every((f) => trackedPaths.has(f))
      if (allTracked) {
        result.skipped++
        continue
      }

      try {
        const modId = uuidv4()
        const now = new Date().toISOString()

        // Compute total file size
        let totalSize = 0
        for (const deployPath of scanned.files) {
          try {
            totalSize += fs.statSync(path.join(gameDir, deployPath)).size
          } catch {
            // file may have been removed
          }
        }

        const mod: Mod = {
          id: modId,
          name: scanned.name,
          type: scanned.type,
          status: 'enabled',
          source: 'scanned',
          sourceArchive: null,
          fileSize: totalSize,
          fileCount: scanned.files.length,
          importedAt: now,
          updatedAt: now
        }

        insertMod(mod)

        const modFiles = scanned.files.map((deployPath) => ({
          modId,
          stagingPath: '',
          deployPath,
          fileHash: null
        }))

        insertModFiles(modFiles)

        // Mark these paths as tracked for subsequent iterations
        for (const f of scanned.files) {
          trackedPaths.add(f)
        }

        result.discovered++
      } catch (err) {
        result.errors.push(`Failed to register ${scanned.name}: ${(err as Error).message}`)
      }
    }
  }

  return result
}
