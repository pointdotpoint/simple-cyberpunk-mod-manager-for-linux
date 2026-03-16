import { ipcMain, BrowserWindow } from 'electron'
import { importMod } from '../services/mod-importer'
import { enableMod, disableMod, deleteMod, bulkEnable, bulkDisable, bulkDelete } from '../services/mod-deployer'
import { scanExistingMods } from '../services/mod-scanner'
import { getAllMods, getSetting } from '../database/queries'

export function registerModHandlers(): void {
  ipcMain.handle('mods:list', () => getAllMods())

  ipcMain.handle('mods:import', async (_event, archivePath: string) => {
    const win = BrowserWindow.getFocusedWindow()
    return importMod(archivePath, (progress) => {
      win?.webContents.send('operation:progress', progress)
    })
  })

  ipcMain.handle('mods:enable', (_event, id: string) => enableMod(id))
  ipcMain.handle('mods:enable-force', (_event, id: string) => enableMod(id, true))
  ipcMain.handle('mods:disable', (_event, id: string) => disableMod(id))
  ipcMain.handle('mods:delete', (_event, id: string) => deleteMod(id))
  ipcMain.handle('mods:bulk-enable', (_event, ids: string[]) => bulkEnable(ids))
  ipcMain.handle('mods:bulk-disable', (_event, ids: string[]) => bulkDisable(ids))
  ipcMain.handle('mods:bulk-delete', (_event, ids: string[]) => bulkDelete(ids))

  ipcMain.handle('mods:scan', () => {
    const gameDir = getSetting('game_directory')
    if (!gameDir) throw new Error('Game directory is not set')
    return scanExistingMods(gameDir)
  })
}
