import { ipcMain, BrowserWindow } from 'electron'
import { getSetting } from '../database/queries'
import { scanLogFiles, readLogTail, searchLogFiles } from '../services/log-reader'
import { startWatching, stopWatching } from '../services/log-watcher'
import {
  isJournalAvailable,
  readJournalLogs,
  searchJournalLogs,
  JOURNAL_FILE_ID,
  JOURNAL_FILE_INFO
} from '../services/journal-reader'
import type { LogSource } from '../../shared/types'

let journalPollInterval: ReturnType<typeof setInterval> | null = null

export function registerLogHandlers(): void {
  ipcMain.handle('logs:scan', () => {
    const gameDir = getSetting('game_directory')
    const files = gameDir ? scanLogFiles(gameDir) : []
    if (isJournalAvailable()) {
      files.push({ ...JOURNAL_FILE_INFO, modifiedAt: new Date().toISOString() })
    }
    return files
  })

  ipcMain.handle('logs:read', async (_event, fileId: string | null, tail: number = 1000) => {
    const gameDir = getSetting('game_directory')
    const results = []

    if (gameDir) {
      const files = scanLogFiles(gameDir)
      const targets = fileId && fileId !== JOURNAL_FILE_ID ? files.filter((f) => f.id === fileId) : fileId ? [] : files
      results.push(...targets.map((f) => readLogTail(f.absolutePath, f.id, f.source, f.fileName, tail)))
    }

    if (isJournalAvailable() && (fileId === null || fileId === JOURNAL_FILE_ID)) {
      results.push(await readJournalLogs())
    }

    return results
  })

  ipcMain.handle(
    'logs:search',
    async (_event, pattern: string, sourceFilter: LogSource | null) => {
      const gameDir = getSetting('game_directory')
      const results = gameDir ? searchLogFiles(gameDir, pattern, sourceFilter) : []

      if (isJournalAvailable() && (sourceFilter === null || sourceFilter === 'system')) {
        const journalResult = await searchJournalLogs(pattern)
        if (journalResult) {
          results.push(journalResult)
        }
      }

      return results
    }
  )

  ipcMain.handle('logs:watch-start', (event) => {
    const gameDir = getSetting('game_directory')
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return

    if (gameDir) {
      startWatching(gameDir, (fileId, absolutePath) => {
        const files = scanLogFiles(gameDir)
        const file = files.find((f) => f.id === fileId)
        if (!file) return

        const result = readLogTail(absolutePath, fileId, file.source, file.fileName, 100)
        window.webContents.send('logs:update', {
          fileId,
          newLines: result.lines
        })
      })
    }

    // Poll journal every 5 seconds
    if (isJournalAvailable()) {
      if (journalPollInterval) clearInterval(journalPollInterval)
      journalPollInterval = setInterval(async () => {
        try {
          const result = await readJournalLogs()
          if (result.lines.length > 0 && !window.isDestroyed()) {
            window.webContents.send('logs:update', {
              fileId: JOURNAL_FILE_ID,
              newLines: result.lines
            })
          }
        } catch {
          // Ignore polling errors
        }
      }, 5000)
    }
  })

  ipcMain.handle('logs:watch-stop', () => {
    stopWatching()
    if (journalPollInterval) {
      clearInterval(journalPollInterval)
      journalPollInterval = null
    }
  })
}

export function cleanupLogWatchers(): void {
  stopWatching()
  if (journalPollInterval) {
    clearInterval(journalPollInterval)
    journalPollInterval = null
  }
}
