import * as fs from 'fs'
import * as path from 'path'

/** Recursively collect all file paths relative to `baseDir`. */
export function walkFiles(baseDir: string, rel = ''): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(path.join(baseDir, rel), { withFileTypes: true })
  for (const entry of entries) {
    const entryRel = rel ? path.join(rel, entry.name) : entry.name
    if (entry.isDirectory()) {
      results.push(...walkFiles(baseDir, entryRel))
    } else {
      results.push(entryRel)
    }
  }
  return results
}
