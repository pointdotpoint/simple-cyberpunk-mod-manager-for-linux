import { contextBridge, ipcRenderer } from 'electron'

// Placeholder: expose APIs to renderer via contextBridge here
// Example:
// contextBridge.exposeInMainWorld('api', {
//   send: (channel: string, data: unknown) => ipcRenderer.send(channel, data),
//   on: (channel: string, callback: (...args: unknown[]) => void) =>
//     ipcRenderer.on(channel, (_event, ...args) => callback(...args))
// })

// Suppress unused import warnings
void contextBridge
void ipcRenderer
