import { create } from 'zustand'
import { useToastStore } from './toastStore'
import type { LogFileInfo, LogLine, LogSource, LogLevel } from '../../../shared/types'

interface LogStore {
  logFiles: LogFileInfo[]
  logLines: LogLine[]
  loading: boolean
  searchQuery: string
  sourceFilter: LogSource | null
  levelFilter: LogLevel | null
  autoRefresh: boolean

  scanLogs: () => Promise<void>
  readLogs: (fileId?: string | null) => Promise<void>
  searchLogs: (pattern: string) => Promise<void>
  setSourceFilter: (source: LogSource | null) => void
  setLevelFilter: (level: LogLevel | null) => void
  setSearchQuery: (query: string) => void
  toggleAutoRefresh: () => void
  appendLines: (fileId: string, newLines: LogLine[]) => void
}

const toast = () => useToastStore.getState()

export const useLogStore = create<LogStore>((set, get) => ({
  logFiles: [],
  logLines: [],
  loading: false,
  searchQuery: '',
  sourceFilter: null,
  levelFilter: null,
  autoRefresh: false,

  scanLogs: async () => {
    set({ loading: true })
    try {
      const logFiles = await window.electronAPI.scanLogs()
      set({ logFiles, loading: false })
    } catch (err) {
      set({ loading: false })
      toast().addToast('error', `Failed to scan logs: ${err}`)
    }
  },

  readLogs: async (fileId?: string | null) => {
    set({ loading: true })
    try {
      const results = await window.electronAPI.readLogs(fileId ?? null, 1000)
      const allLines = results.flatMap((r) => r.lines)
      set({ logLines: allLines, loading: false })
    } catch (err) {
      set({ loading: false })
      toast().addToast('error', `Failed to read logs: ${err}`)
    }
  },

  searchLogs: async (pattern: string) => {
    if (!pattern) {
      await get().readLogs()
      return
    }
    set({ loading: true })
    try {
      const results = await window.electronAPI.searchLogs(pattern, get().sourceFilter)
      const allLines = results.flatMap((r) => r.matches)
      set({ logLines: allLines, loading: false })
    } catch (err) {
      set({ loading: false })
      toast().addToast('error', `Failed to search logs: ${err}`)
    }
  },

  setSourceFilter: (source) => set({ sourceFilter: source }),
  setLevelFilter: (level) => set({ levelFilter: level }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleAutoRefresh: () => {
    set((state) => ({ autoRefresh: !state.autoRefresh }))
  },

  appendLines: (fileId, newLines) => {
    set((state) => {
      // Replace lines for this file with the new tail
      const otherLines = state.logLines.filter((l) => l.fileId !== fileId)
      return { logLines: [...otherLines, ...newLines] }
    })
  }
}))
