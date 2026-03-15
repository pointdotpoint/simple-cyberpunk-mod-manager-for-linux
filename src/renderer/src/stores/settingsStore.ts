import { create } from 'zustand'
import type { Settings } from '../../../shared/types'

interface SettingsStore {
  settings: Settings | null
  loading: boolean

  fetchSettings: () => Promise<void>
  detectGame: () => Promise<string | null>
  browseDirectory: () => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true })
    try {
      const settings = await window.electronAPI.getSettings()
      set({ settings, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  detectGame: async () => {
    const path = await window.electronAPI.detectGame()
    if (path) {
      await get().fetchSettings()
    }
    return path
  },

  browseDirectory: async () => {
    const path = await window.electronAPI.browseDirectory()
    if (path) {
      await get().fetchSettings()
    }
    return path
  },

  setSetting: async (key: string, value: string) => {
    await window.electronAPI.setSetting(key, value)
    await get().fetchSettings()
  },
}))
