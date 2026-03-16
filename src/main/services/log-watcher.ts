import * as fs from 'fs'
import * as path from 'path'

const watchers = new Map<string, fs.FSWatcher>()
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

const DEBOUNCE_MS = 300

const LOG_DIRS = [
  'bin/x64/plugins/cyber_engine_tweaks/logs',
  'red4ext/logs'
]

export function startWatching(
  gameDir: string,
  onChange: (fileId: string, absolutePath: string) => void
): void {
  stopWatching()

  const { scanLogFiles } = require('./log-reader')

  // Build a lookup from absolute path to file id
  const files = scanLogFiles(gameDir)
  const pathToId = new Map<string, string>()
  for (const f of files) {
    pathToId.set(f.absolutePath, f.id)
  }

  const watchDir = (dirPath: string): void => {
    if (!fs.existsSync(dirPath)) return

    try {
      const watcher = fs.watch(dirPath, { recursive: false }, (_eventType, filename) => {
        if (!filename || !filename.endsWith('.log')) return

        const fullPath = path.join(dirPath, filename)
        const key = fullPath

        // Debounce per file
        const existing = debounceTimers.get(key)
        if (existing) clearTimeout(existing)

        debounceTimers.set(
          key,
          setTimeout(() => {
            debounceTimers.delete(key)
            let fileId = pathToId.get(fullPath)
            if (!fileId) {
              // New file appeared — rescan to get its id
              const updated = scanLogFiles(gameDir)
              const found = updated.find(
                (f: { absolutePath: string }) => f.absolutePath === fullPath
              )
              if (found) {
                fileId = found.id
                pathToId.set(fullPath, fileId)
              }
            }
            if (fileId) {
              onChange(fileId, fullPath)
            }
          }, DEBOUNCE_MS)
        )
      })

      watchers.set(dirPath, watcher)
    } catch {
      // Directory may not be watchable
    }
  }

  // Watch known log directories
  for (const dir of LOG_DIRS) {
    watchDir(path.join(gameDir, dir))
  }

  // Watch game root for *.log files
  watchDir(gameDir)
}

export function stopWatching(): void {
  for (const watcher of watchers.values()) {
    watcher.close()
  }
  watchers.clear()

  for (const timer of debounceTimers.values()) {
    clearTimeout(timer)
  }
  debounceTimers.clear()
}
