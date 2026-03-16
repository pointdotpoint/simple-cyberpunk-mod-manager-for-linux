import { ipcMain, BrowserWindow } from 'electron'
import { getSetting } from '../database/queries'
import { scanLogFiles, readLogTail, searchLogFiles } from '../services/log-reader'
import { startWatching, stopWatching } from '../services/log-watcher'
import type { LogSource } from '../../shared/types'

export function registerLogHandlers(): void {
  ipcMain.handle('logs:scan', () => {
    const gameDir = getSetting('game_directory')
    if (!gameDir) return []
    return scanLogFiles(gameDir)
  })

  ipcMain.handle('logs:read', (_event, fileId: string | null, tail: number = 1000) => {
    const gameDir = getSetting('game_directory')
    if (!gameDir) return []

    const files = scanLogFiles(gameDir)
    const targets = fileId ? files.filter((f) => f.id === fileId) : files

    return targets.map((f) => readLogTail(f.absolutePath, f.id, f.source, f.fileName, tail))
  })

  ipcMain.handle(
    'logs:search',
    (_event, pattern: string, sourceFilter: LogSource | null) => {
      const gameDir = getSetting('game_directory')
      if (!gameDir) return []
      return searchLogFiles(gameDir, pattern, sourceFilter)
    }
  )

  ipcMain.handle('logs:watch-start', (event) => {
    const gameDir = getSetting('game_directory')
    if (!gameDir) return

    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return

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
  })

  ipcMain.handle('logs:watch-stop', () => {
    stopWatching()
  })
}

export function cleanupLogWatchers(): void {
  stopWatching()
}
