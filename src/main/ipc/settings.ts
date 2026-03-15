import { ipcMain } from 'electron'
import { getSetting, setSetting } from '../database/queries'
import type { Settings } from '../../shared/types'
import * as path from 'path'
import * as os from 'os'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', (): Settings => {
    const defaultStaging = path.join(
      process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local/share'),
      'cp2077-mod-manager', 'staging'
    )
    return {
      gameDirectory: getSetting('game_directory'),
      stagingDirectory: getSetting('staging_directory') || defaultStaging
    }
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    setSetting(key, value)
  })
}
