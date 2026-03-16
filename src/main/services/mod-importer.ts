import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { execFile } from 'child_process'
import { createExtractorFromFile } from 'node-unrar-js'
import { v4 as uuidv4 } from 'uuid'
import type { ImportResult, Mod, ModFile, ModType, OperationProgress } from '../../shared/types'
import { getSetting, insertMod, insertModFiles } from '../database/queries'
import { normalizeFilePath, normalizeStagingDirectory } from './case-normalizer'
import { walkFiles } from './fs-utils'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sevenBin = require('7zip-bin')

/**
 * Some archives contain a single top-level directory that wraps all content.
 * If so, return that directory name so we can "unwrap" it.
 */
function detectSingleRootDir(baseDir: string): string | null {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true })
  if (entries.length === 1 && entries[0].isDirectory()) {
    return entries[0].name
  }
  return null
}

// ---------------------------------------------------------------------------
// Mod-type detection
// ---------------------------------------------------------------------------

interface DetectionResult {
  type: ModType
  /** For REDmod: the mod name from info.json */
  redmodName?: string
}

export function detectModType(extractDir: string, files: string[]): DetectionResult {
  const types = new Set<ModType>()
  let redmodName: string | undefined

  // Check for REDmod: info.json near root with a name field + archives/ directory alongside
  for (const f of files) {
    const base = path.basename(f)
    if (base === 'info.json') {
      const depth = f.split(path.sep).length
      // "near root" means depth <= 2 (e.g. info.json or moddir/info.json)
      if (depth <= 2) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(extractDir, f), 'utf-8'))
          if (content && typeof content.name === 'string') {
            // Check for archives/ directory alongside info.json
            const parentDir = path.dirname(f)
            const archivesDir =
              parentDir === '.'
                ? path.join(extractDir, 'archives')
                : path.join(extractDir, parentDir, 'archives')
            if (fs.existsSync(archivesDir) && fs.statSync(archivesDir).isDirectory()) {
              types.add('redmod')
              redmodName = content.name as string
            }
          }
        } catch {
          // Ignore malformed JSON
        }
      }
    }
  }

  // Archive: .archive files
  if (files.some((f) => f.endsWith('.archive'))) {
    types.add('archive')
  }

  // CET: init.lua
  if (files.some((f) => path.basename(f) === 'init.lua')) {
    types.add('cet')
  }

  // REDscript: .reds files
  if (files.some((f) => f.endsWith('.reds'))) {
    types.add('redscript')
  }

  // TweakXL: .xl, .yaml, .tweak files
  if (files.some((f) => f.endsWith('.xl') || f.endsWith('.yaml') || f.endsWith('.tweak'))) {
    types.add('tweakxl')
  }

  // Red4ext: .dll files under red4ext/plugins/
  if (
    files.some(
      (f) => f.endsWith('.dll') && f.toLowerCase().includes(path.join('red4ext', 'plugins'))
    )
  ) {
    types.add('red4ext')
  }

  if (types.size === 0) return { type: 'unknown' }
  if (types.size === 1) {
    const detectedType = [...types][0]
    return { type: detectedType, redmodName }
  }
  return { type: 'mixed' }
}

// ---------------------------------------------------------------------------
// Deploy-path computation
// ---------------------------------------------------------------------------

function computeDeployPaths(
  modType: ModType,
  modName: string,
  files: string[],
  extractDir: string,
  redmodName?: string
): Map<string, string | null> {
  const deployMap = new Map<string, string | null>()

  switch (modType) {
    case 'archive':
      for (const f of files) {
        if (f.endsWith('.archive')) {
          deployMap.set(f, path.join('archive', 'pc', 'mod', path.basename(f)))
        } else {
          deployMap.set(f, null)
        }
      }
      break

    case 'redmod': {
      const rmName = redmodName ?? modName
      for (const f of files) {
        deployMap.set(f, path.join('mods', rmName, f))
      }
      break
    }

    case 'cet': {
      // Find the directory containing init.lua
      const initLuaFile = files.find((f) => path.basename(f) === 'init.lua')
      const cetBaseDir = initLuaFile ? path.dirname(initLuaFile) : ''
      for (const f of files) {
        const rel = cetBaseDir && cetBaseDir !== '.' ? path.relative(cetBaseDir, f) : f
        // Only include files that are within or at the same level as init.lua's directory
        if (!rel.startsWith('..')) {
          deployMap.set(
            f,
            path.join('bin', 'x64', 'plugins', 'cyber_engine_tweaks', 'mods', modName, rel)
          )
        } else {
          deployMap.set(f, null)
        }
      }
      break
    }

    case 'redscript':
      for (const f of files) {
        if (f.endsWith('.reds')) {
          deployMap.set(f, path.join('r6', 'scripts', modName, path.basename(f)))
        } else {
          deployMap.set(f, null)
        }
      }
      break

    case 'tweakxl':
      for (const f of files) {
        if (f.endsWith('.xl') || f.endsWith('.yaml') || f.endsWith('.tweak')) {
          deployMap.set(f, path.join('r6', 'tweaks', path.basename(f)))
        } else {
          deployMap.set(f, null)
        }
      }
      break

    case 'red4ext':
      for (const f of files) {
        // Preserve structure relative to red4ext/plugins/
        deployMap.set(f, path.join('red4ext', 'plugins', modName, path.basename(f)))
      }
      break

    case 'mixed':
    case 'unknown':
    default:
      // Preserve original directory structure as-is
      for (const f of files) {
        deployMap.set(f, f)
      }
      break
  }

  return deployMap
}

// ---------------------------------------------------------------------------
// Archive extraction
// ---------------------------------------------------------------------------

function isRarFile(filePath: string): boolean {
  return /\.rar$/i.test(filePath)
}

async function extractRar(
  archivePath: string,
  outputDir: string,
  onProgress?: (progress: OperationProgress) => void
): Promise<void> {
  if (onProgress) {
    onProgress({ operation: 'extract', current: 0, total: 100, label: 'Extracting RAR...' })
  }

  const extractor = await createExtractorFromFile({ filepath: archivePath, targetPath: outputDir })
  const { files } = extractor.extract()

  // Consume the generator to extract all files
  let count = 0
  for (const file of files) {
    count++
    if (onProgress && count % 10 === 0) {
      onProgress({
        operation: 'extract',
        current: 50,
        total: 100,
        label: `Extracting... ${count} files`
      })
    }
    void file
  }

  if (onProgress) {
    onProgress({ operation: 'extract', current: 100, total: 100, label: 'Extraction complete' })
  }
}

function get7zaBinPath(): string {
  let binPath: string = sevenBin.path7za
  // In packaged Electron apps, the binary is inside app.asar but must be
  // spawned from app.asar.unpacked (asar is a file, not a directory).
  if (binPath.includes('app.asar')) {
    binPath = binPath.replace('app.asar', 'app.asar.unpacked')
  }
  return binPath
}

function extract7z(
  archivePath: string,
  outputDir: string,
  onProgress?: (progress: OperationProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const binPath = get7zaBinPath()
    const args = ['x', archivePath, `-o${outputDir}`, '-y', '-r']

    if (onProgress) {
      onProgress({
        operation: 'extract',
        current: 10,
        total: 100,
        label: 'Extracting...'
      })
    }

    execFile(binPath, args, { cwd: os.tmpdir(), maxBuffer: 10 * 1024 * 1024 }, (err, _stdout, stderr) => {
      if (err) {
        const detail = stderr ? `: ${stderr.trim()}` : ''
        reject(new Error(`7z extraction failed${detail}`))
      } else {
        resolve()
      }
    })
  })
}

function extractArchive(
  archivePath: string,
  outputDir: string,
  onProgress?: (progress: OperationProgress) => void
): Promise<void> {
  if (isRarFile(archivePath)) {
    return extractRar(archivePath, outputDir, onProgress)
  }
  return extract7z(archivePath, outputDir, onProgress)
}

// ---------------------------------------------------------------------------
// Copy files recursively from src to dest
// ---------------------------------------------------------------------------

function copyRecursive(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true })
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

export async function importMod(
  archivePath: string,
  onProgress?: (progress: OperationProgress) => void
): Promise<ImportResult> {
  // Ensure absolute path for WASM-based extractors
  archivePath = path.resolve(archivePath)

  // 1. Create temp directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp2077-mod-'))

  try {
    // 2. Extract archive to temp dir
    if (onProgress) {
      onProgress({ operation: 'extract', current: 0, total: 100, label: 'Starting extraction...' })
    }
    await extractArchive(archivePath, tmpDir, onProgress)

    // 3. Determine the effective extraction root (unwrap single root dir if present)
    let extractRoot = tmpDir
    const singleRoot = detectSingleRootDir(tmpDir)
    if (singleRoot) {
      extractRoot = path.join(tmpDir, singleRoot)
    }

    // 4. Walk extracted files and detect mod type
    const relativeFiles = walkFiles(extractRoot)
    if (relativeFiles.length === 0) {
      throw new Error('Archive appears to be empty or extraction failed.')
    }

    const detection = detectModType(extractRoot, relativeFiles)

    // 5. Generate UUID and mod name
    const modId = uuidv4()
    const modName = path.basename(archivePath, path.extname(archivePath))

    // 6. Determine staging directory
    const customStagingDir = getSetting('stagingDirectory')
    const defaultStagingBase = path.join(
      process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'),
      'cp2077-mod-manager',
      'staging'
    )
    const stagingBase = customStagingDir ?? defaultStagingBase
    const stagingDir = path.join(stagingBase, modId)

    // 7. Copy extracted files to staging directory
    if (onProgress) {
      onProgress({ operation: 'staging', current: 50, total: 100, label: 'Copying to staging...' })
    }
    copyRecursive(extractRoot, stagingDir)

    // 8. Normalize directory names to lowercase
    normalizeStagingDirectory(stagingDir)

    // 9. Walk the staging dir to get the normalized file list
    const stagedFiles = walkFiles(stagingDir)

    // 10. Compute total file size
    let totalSize = 0
    for (const f of stagedFiles) {
      totalSize += fs.statSync(path.join(stagingDir, f)).size
    }

    // 11. Compute deploy paths based on detected type
    const deployMap = computeDeployPaths(
      detection.type,
      modName,
      stagedFiles,
      stagingDir,
      detection.redmodName
    )

    // 12. Build mod record
    const now = new Date().toISOString()
    const mod: Mod = {
      id: modId,
      name: modName,
      type: detection.type,
      status: 'disabled',
      source: 'imported',
      sourceArchive: path.basename(archivePath),
      fileSize: totalSize,
      fileCount: stagedFiles.length,
      importedAt: now,
      updatedAt: now
    }

    // 13. Build mod file records
    const modFiles: Omit<ModFile, 'id'>[] = stagedFiles.map((f) => {
      const deployPath = deployMap.get(f) ?? null
      return {
        modId,
        stagingPath: f,
        deployPath: deployPath ? normalizeFilePath(deployPath) : null,
        fileHash: null
      }
    })

    // 14. Insert into database
    if (onProgress) {
      onProgress({
        operation: 'database',
        current: 90,
        total: 100,
        label: 'Saving to database...'
      })
    }
    insertMod(mod)
    insertModFiles(modFiles)

    // 15. Build result (files need an id field; use 0 as placeholder since DB assigns it)
    const resultFiles: ModFile[] = modFiles.map((f, i) => ({
      id: i + 1,
      ...f
    }))

    if (onProgress) {
      onProgress({ operation: 'complete', current: 100, total: 100, label: 'Import complete' })
    }

    return { mod, files: resultFiles }
  } finally {
    // 16. Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}
