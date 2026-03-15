import { ipcMain, dialog, BrowserWindow } from 'electron'
import { detectGameDirectory } from '../services/game-finder'
import { setSetting } from '../database/queries'

export function registerGameDetectionHandlers(): void {
  ipcMain.handle('game:detect', () => {
    const dir = detectGameDirectory()
    if (dir) {
      setSetting('game_directory', dir)
    }
    return dir
  })

  ipcMain.handle('game:browse', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Cyberpunk 2077 Game Directory'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const dir = result.filePaths[0]
    setSetting('game_directory', dir)
    return dir
  })

  // Generic file dialog for importing mods
  ipcMain.handle('dialog:open-file', async (_event, filters?: { name: string; extensions: string[] }[]) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: filters || [{ name: 'Archives', extensions: ['zip', '7z', 'rar'] }],
      title: 'Select Mod Archive'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}
