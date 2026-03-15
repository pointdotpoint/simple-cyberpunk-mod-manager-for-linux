import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types'

const api: ElectronAPI = {
  listMods: () => ipcRenderer.invoke('mods:list'),
  importMod: (archivePath) => ipcRenderer.invoke('mods:import', archivePath),
  enableMod: (id) => ipcRenderer.invoke('mods:enable', id),
  enableModForce: (id) => ipcRenderer.invoke('mods:enable-force', id),
  disableMod: (id) => ipcRenderer.invoke('mods:disable', id),
  deleteMod: (id) => ipcRenderer.invoke('mods:delete', id),
  bulkEnable: (ids) => ipcRenderer.invoke('mods:bulk-enable', ids),
  bulkDisable: (ids) => ipcRenderer.invoke('mods:bulk-disable', ids),
  bulkDelete: (ids) => ipcRenderer.invoke('mods:bulk-delete', ids),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  detectGame: () => ipcRenderer.invoke('game:detect'),
  browseDirectory: () => ipcRenderer.invoke('game:browse'),
  openFileDialog: (filters) => ipcRenderer.invoke('dialog:open-file', filters),
  onProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: any) => callback(progress)
    ipcRenderer.on('operation:progress', handler)
    return () => ipcRenderer.removeListener('operation:progress', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
