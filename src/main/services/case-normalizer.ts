import * as fs from 'fs'
import * as path from 'path'

/**
 * Normalize a file path by lowercasing directory components but preserving the filename.
 * Example: "Archive/PC/Mod/myMod.archive" → "archive/pc/mod/myMod.archive"
 */
export function normalizeFilePath(filePath: string): string {
  const dir = path.dirname(filePath)
  const file = path.basename(filePath)
  if (dir === '.') return file
  const normalizedDir = dir
    .split(path.sep)
    .map((d) => d.toLowerCase())
    .join(path.sep)
  return path.join(normalizedDir, file)
}

/**
 * Given a base directory, rename all subdirectories to lowercase.
 * Walk bottom-up so nested renames don't break parent paths.
 */
export function normalizeStagingDirectory(baseDir: string): void {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true })

  // First, recurse into subdirectories (depth-first)
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(baseDir, entry.name)
      normalizeStagingDirectory(fullPath)
    }
  }

  // Then rename directories in this level to lowercase (bottom-up)
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const lowerName = entry.name.toLowerCase()
      if (lowerName !== entry.name) {
        const oldPath = path.join(baseDir, entry.name)
        const newPath = path.join(baseDir, lowerName)
        fs.renameSync(oldPath, newPath)
      }
    }
  }
}
