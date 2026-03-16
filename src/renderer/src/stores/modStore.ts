import { create } from 'zustand'
import { useToastStore } from './toastStore'
import type { Mod, EnableResult } from '../../../shared/types'

type SortColumn = 'name' | 'type' | 'fileSize' | 'importedAt'

interface ModStore {
  mods: Mod[]
  selectedIds: Set<string>
  lastSelectedId: string | null
  loading: boolean
  searchQuery: string
  typeFilter: string | null
  sortColumn: SortColumn
  sortDirection: 'asc' | 'desc'

  // Actions
  fetchMods: () => Promise<void>
  importMod: (archivePath: string) => Promise<void>
  enableMod: (id: string) => Promise<EnableResult>
  enableModForce: (id: string) => Promise<void>
  disableMod: (id: string) => Promise<void>
  deleteMod: (id: string) => Promise<void>
  bulkEnable: (ids: string[]) => Promise<void>
  bulkDisable: (ids: string[]) => Promise<void>
  bulkDelete: (ids: string[]) => Promise<void>

  // Selection
  selectMod: (id: string) => void
  toggleSelect: (id: string) => void
  selectRange: (id: string) => void
  selectAll: () => void
  clearSelection: () => void

  // Filtering/Sorting
  setSearchQuery: (query: string) => void
  setTypeFilter: (type: string | null) => void
  setSort: (column: SortColumn) => void
}

const toast = () => useToastStore.getState()

export const useModStore = create<ModStore>((set, get) => ({
  mods: [],
  selectedIds: new Set(),
  lastSelectedId: null,
  loading: false,
  searchQuery: '',
  typeFilter: null,
  sortColumn: 'importedAt',
  sortDirection: 'desc',

  fetchMods: async () => {
    set({ loading: true })
    try {
      const mods = await window.electronAPI.listMods()
      set({ mods, loading: false })
    } catch (err) {
      set({ loading: false })
      toast().addToast('error', `Failed to load mods: ${err}. Try restarting the app.`)
    }
  },

  importMod: async (archivePath: string) => {
    set({ loading: true })
    try {
      await window.electronAPI.importMod(archivePath)
      await get().fetchMods()
      toast().addToast('success', 'Mod imported successfully')
    } catch (err) {
      set({ loading: false })
      toast().addToast('error', `Failed to import mod: ${err}`)
    }
  },

  enableMod: async (id: string) => {
    try {
      const result = await window.electronAPI.enableMod(id)
      await get().fetchMods()
      if (result.success) {
        toast().addToast('success', 'Mod enabled')
      }
      return result
    } catch (err) {
      toast().addToast('error', `Failed to enable mod: ${err}`)
      return { success: false, conflicts: [] }
    }
  },

  enableModForce: async (id: string) => {
    try {
      await window.electronAPI.enableModForce(id)
      await get().fetchMods()
      toast().addToast('success', 'Mod enabled (conflicts overridden)')
    } catch (err) {
      toast().addToast('error', `Failed to enable mod: ${err}`)
    }
  },

  disableMod: async (id: string) => {
    try {
      await window.electronAPI.disableMod(id)
      await get().fetchMods()
      toast().addToast('success', 'Mod disabled')
    } catch (err) {
      toast().addToast('error', `Failed to disable mod: ${err}`)
    }
  },

  deleteMod: async (id: string) => {
    try {
      await window.electronAPI.deleteMod(id)
      set((state) => {
        const selectedIds = new Set(state.selectedIds)
        selectedIds.delete(id)
        return { selectedIds }
      })
      await get().fetchMods()
      toast().addToast('success', 'Mod deleted')
    } catch (err) {
      toast().addToast('error', `Failed to delete mod: ${err}`)
    }
  },

  bulkEnable: async (ids: string[]) => {
    try {
      await window.electronAPI.bulkEnable(ids)
      await get().fetchMods()
      toast().addToast('success', `${ids.length} mods enabled`)
    } catch (err) {
      toast().addToast('error', `Failed to enable mods: ${err}`)
    }
  },

  bulkDisable: async (ids: string[]) => {
    try {
      await window.electronAPI.bulkDisable(ids)
      await get().fetchMods()
      toast().addToast('success', `${ids.length} mods disabled`)
    } catch (err) {
      toast().addToast('error', `Failed to disable mods: ${err}`)
    }
  },

  bulkDelete: async (ids: string[]) => {
    try {
      await window.electronAPI.bulkDelete(ids)
      set((state) => {
        const selectedIds = new Set(state.selectedIds)
        for (const id of ids) selectedIds.delete(id)
        return { selectedIds }
      })
      await get().fetchMods()
      toast().addToast('success', `${ids.length} mods deleted`)
    } catch (err) {
      toast().addToast('error', `Failed to delete mods: ${err}`)
    }
  },

  selectMod: (id: string) => {
    set({ selectedIds: new Set([id]), lastSelectedId: id })
  },

  toggleSelect: (id: string) => {
    set((state) => {
      const selectedIds = new Set(state.selectedIds)
      if (selectedIds.has(id)) {
        selectedIds.delete(id)
      } else {
        selectedIds.add(id)
      }
      return { selectedIds, lastSelectedId: id }
    })
  },

  selectRange: (id: string) => {
    const { mods, lastSelectedId } = get()
    if (!lastSelectedId) {
      set({ selectedIds: new Set([id]), lastSelectedId: id })
      return
    }
    const startIdx = mods.findIndex((m) => m.id === lastSelectedId)
    const endIdx = mods.findIndex((m) => m.id === id)
    if (startIdx === -1 || endIdx === -1) {
      set({ selectedIds: new Set([id]), lastSelectedId: id })
      return
    }
    const lo = Math.min(startIdx, endIdx)
    const hi = Math.max(startIdx, endIdx)
    const rangeIds = mods.slice(lo, hi + 1).map((m) => m.id)
    set((state) => {
      const selectedIds = new Set(state.selectedIds)
      for (const rid of rangeIds) selectedIds.add(rid)
      return { selectedIds }
    })
  },

  selectAll: () => {
    const { mods } = get()
    set({ selectedIds: new Set(mods.map((m) => m.id)) })
  },

  clearSelection: () => {
    set({ selectedIds: new Set(), lastSelectedId: null })
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setTypeFilter: (type: string | null) => {
    set({ typeFilter: type })
  },

  setSort: (column: SortColumn) => {
    set((state) => {
      if (state.sortColumn === column) {
        return { sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' }
      }
      return { sortColumn: column, sortDirection: 'asc' }
    })
  }
}))
