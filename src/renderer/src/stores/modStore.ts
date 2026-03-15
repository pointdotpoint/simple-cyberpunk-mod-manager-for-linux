import { create } from 'zustand'
import type { Mod, EnableResult } from '../../../shared/types'

type SortColumn = 'name' | 'type' | 'fileSize' | 'importedAt'

interface ModStore {
  mods: Mod[]
  selectedIds: Set<string>
  lastSelectedId: string | null
  loading: boolean
  error: string | null
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

export const useModStore = create<ModStore>((set, get) => ({
  mods: [],
  selectedIds: new Set(),
  lastSelectedId: null,
  loading: false,
  error: null,
  searchQuery: '',
  typeFilter: null,
  sortColumn: 'name',
  sortDirection: 'asc',

  fetchMods: async () => {
    set({ loading: true, error: null })
    try {
      const mods = await window.electronAPI.listMods()
      set({ mods, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  importMod: async (archivePath: string) => {
    set({ loading: true, error: null })
    try {
      await window.electronAPI.importMod(archivePath)
      await get().fetchMods()
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  enableMod: async (id: string) => {
    const result = await window.electronAPI.enableMod(id)
    await get().fetchMods()
    return result
  },

  enableModForce: async (id: string) => {
    await window.electronAPI.enableModForce(id)
    await get().fetchMods()
  },

  disableMod: async (id: string) => {
    await window.electronAPI.disableMod(id)
    await get().fetchMods()
  },

  deleteMod: async (id: string) => {
    await window.electronAPI.deleteMod(id)
    set((state) => {
      const selectedIds = new Set(state.selectedIds)
      selectedIds.delete(id)
      return { selectedIds }
    })
    await get().fetchMods()
  },

  bulkEnable: async (ids: string[]) => {
    await window.electronAPI.bulkEnable(ids)
    await get().fetchMods()
  },

  bulkDisable: async (ids: string[]) => {
    await window.electronAPI.bulkDisable(ids)
    await get().fetchMods()
  },

  bulkDelete: async (ids: string[]) => {
    await window.electronAPI.bulkDelete(ids)
    set((state) => {
      const selectedIds = new Set(state.selectedIds)
      for (const id of ids) selectedIds.delete(id)
      return { selectedIds }
    })
    await get().fetchMods()
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
  },
}))
