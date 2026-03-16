import { app, BrowserWindow, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { registerModHandlers } from './ipc/mods'
import { registerSettingsHandlers } from './ipc/settings'
import { registerGameDetectionHandlers } from './ipc/game-detection'
import { registerNexusHandlers } from './ipc/nexus'
import { registerLogHandlers, cleanupLogWatchers } from './ipc/logs'
import { closeDb } from './database/connection'
import { getSetting, setSetting, getAllMods } from './database/queries'
import { detectGameDirectory } from './services/game-finder'
import { scanExistingMods } from './services/mod-scanner'

const isDev = !app.isPackaged

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerModHandlers()
  registerSettingsHandlers()
  registerGameDetectionHandlers()
  registerNexusHandlers()
  registerLogHandlers()

  // Auto-detect game directory on first launch
  if (!getSetting('game_directory')) {
    const detected = detectGameDirectory()
    if (detected) {
      setSetting('game_directory', detected)
    }
  }

  // Scan existing mods on first launch (fresh DB with no mods)
  const gameDir = getSetting('game_directory')
  if (gameDir && getAllMods().length === 0) {
    scanExistingMods(gameDir)
  }

  createWindow()

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupLogWatchers()
    closeDb()
    app.quit()
  }
})
