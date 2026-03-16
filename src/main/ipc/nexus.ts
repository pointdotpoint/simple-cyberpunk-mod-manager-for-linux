import * as fs from 'fs'
import { ipcMain, BrowserWindow } from 'electron'
import { parseNexusUrl, openNexusDownloadWindow } from '../services/nexus-downloader'
import { importMod } from '../services/mod-importer'
import type { OperationProgress } from '../../shared/types'

export function registerNexusHandlers(): void {
  ipcMain.handle('nexus:download', async (_event, url: string) => {
    parseNexusUrl(url)

    const win = BrowserWindow.getFocusedWindow()
    const sendProgress = (progress: OperationProgress): void => {
      win?.webContents.send('operation:progress', progress)
    }

    const downloadPath = await new Promise<string>((resolve, reject) => {
      const cleanup = openNexusDownloadWindow(
        url,
        sendProgress,
        (filePath) => resolve(filePath),
        () => reject(new Error('Download was cancelled'))
      )

      // Store cleanup in case we need it (the window handles its own cleanup on close)
      void cleanup
    })

    try {
      const result = await importMod(downloadPath, sendProgress)
      return result
    } finally {
      try {
        fs.unlinkSync(downloadPath)
      } catch {
        // Temp file cleanup is best-effort
      }
    }
  })
}
