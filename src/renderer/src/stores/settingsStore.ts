import { create } from 'zustand'
import { useToastStore } from './toastStore'
import type { Settings } from '../../../shared/types'

interface SettingsStore {
  settings: Settings | null
  loading: boolean

  fetchSettings: () => Promise<void>
  detectGame: () => Promise<string | null>
  browseDirectory: () => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>
}

const toast = () => useToastStore.getState()

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true })
    try {
      const settings = await window.electronAPI.getSettings()
      set({ settings, loading: false })
    } catch (err) {
      set({ loading: false })
      toast().addToast('error', `Failed to load settings: ${err}`)
    }
  },

  detectGame: async () => {
    try {
      const path = await window.electronAPI.detectGame()
      if (path) {
        await get().fetchSettings()
        toast().addToast('success', `Game found: ${path}`)
      } else {
        toast().addToast(
          'error',
          'Could not auto-detect Cyberpunk 2077. Use Browse to set the directory manually.'
        )
      }
      return path
    } catch (err) {
      toast().addToast('error', `Failed to detect game: ${err}`)
      return null
    }
  },

  browseDirectory: async () => {
    try {
      const path = await window.electronAPI.browseDirectory()
      if (path) {
        await get().fetchSettings()
      }
      return path
    } catch (err) {
      toast().addToast('error', `Failed to set game directory: ${err}`)
      return null
    }
  },

  setSetting: async (key: string, value: string) => {
    try {
      await window.electronAPI.setSetting(key, value)
      await get().fetchSettings()
    } catch (err) {
      toast().addToast('error', `Failed to save setting: ${err}`)
    }
  }
}))
