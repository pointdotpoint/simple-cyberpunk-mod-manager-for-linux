import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { ElectronAPI } from '../shared/types'

const api: ElectronAPI = {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  listMods: () => ipcRenderer.invoke('mods:list'),
  importMod: (archivePath) => ipcRenderer.invoke('mods:import', archivePath),
  enableMod: (id) => ipcRenderer.invoke('mods:enable', id),
  enableModForce: (id) => ipcRenderer.invoke('mods:enable-force', id),
  disableMod: (id) => ipcRenderer.invoke('mods:disable', id),
  deleteMod: (id) => ipcRenderer.invoke('mods:delete', id),
  bulkEnable: (ids) => ipcRenderer.invoke('mods:bulk-enable', ids),
  bulkDisable: (ids) => ipcRenderer.invoke('mods:bulk-disable', ids),
  bulkDelete: (ids) => ipcRenderer.invoke('mods:bulk-delete', ids),
  scanMods: () => ipcRenderer.invoke('mods:scan'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  detectGame: () => ipcRenderer.invoke('game:detect'),
  browseDirectory: () => ipcRenderer.invoke('game:browse'),
  openFileDialog: (filters) => ipcRenderer.invoke('dialog:open-file', filters),
  nexusDownload: (url) => ipcRenderer.invoke('nexus:download', url),
  onProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: any) => callback(progress)
    ipcRenderer.on('operation:progress', handler)
    return () => ipcRenderer.removeListener('operation:progress', handler)
  },
  scanLogs: () => ipcRenderer.invoke('logs:scan'),
  readLogs: (fileId, tail) => ipcRenderer.invoke('logs:read', fileId, tail),
  searchLogs: (pattern, sourceFilter) => ipcRenderer.invoke('logs:search', pattern, sourceFilter),
  startLogWatch: () => ipcRenderer.invoke('logs:watch-start'),
  stopLogWatch: () => ipcRenderer.invoke('logs:watch-stop'),
  onLogUpdate: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('logs:update', handler)
    return () => ipcRenderer.removeListener('logs:update', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
