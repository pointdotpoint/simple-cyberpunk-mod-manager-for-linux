import { useMemo } from 'react'
import { useModStore } from '../stores/modStore'
import SearchBar from './SearchBar'
import BulkActions from './BulkActions'
import ModRow from './ModRow'
import type { Mod, ConflictInfo } from '../../../shared/types'

type SortColumn = 'name' | 'type' | 'fileSize' | 'importedAt'

const SORT_LABELS: Record<SortColumn, string> = {
  name: 'Name',
  type: 'Type',
  fileSize: 'Size',
  importedAt: 'Date'
}

function sortMods(mods: Mod[], column: SortColumn, direction: 'asc' | 'desc'): Mod[] {
  const sorted = [...mods].sort((a, b) => {
    let cmp = 0
    switch (column) {
      case 'name':
        cmp = a.name.localeCompare(b.name)
        break
      case 'type':
        cmp = a.type.localeCompare(b.type)
        break
      case 'fileSize':
        cmp = (a.fileSize ?? 0) - (b.fileSize ?? 0)
        break
      case 'importedAt':
        cmp = a.importedAt.localeCompare(b.importedAt)
        break
    }
    return direction === 'asc' ? cmp : -cmp
  })
  return sorted
}

interface ModListProps {
  onConflict?: (modId: string, conflicts: ConflictInfo[]) => void
  onNexusImportClick?: () => void
}

export default function ModList({ onConflict, onNexusImportClick }: ModListProps): JSX.Element {
  const mods = useModStore((s) => s.mods)
  const selectedIds = useModStore((s) => s.selectedIds)
  const searchQuery = useModStore((s) => s.searchQuery)
  const typeFilter = useModStore((s) => s.typeFilter)
  const sortColumn = useModStore((s) => s.sortColumn)
  const sortDirection = useModStore((s) => s.sortDirection)

  const setSearchQuery = useModStore((s) => s.setSearchQuery)
  const setTypeFilter = useModStore((s) => s.setTypeFilter)
  const setSort = useModStore((s) => s.setSort)
  const selectMod = useModStore((s) => s.selectMod)
  const toggleSelect = useModStore((s) => s.toggleSelect)
  const selectRange = useModStore((s) => s.selectRange)
  const clearSelection = useModStore((s) => s.clearSelection)
  const importMod = useModStore((s) => s.importMod)
  const enableMod = useModStore((s) => s.enableMod)
  const disableMod = useModStore((s) => s.disableMod)
  const bulkEnable = useModStore((s) => s.bulkEnable)
  const bulkDisable = useModStore((s) => s.bulkDisable)
  const bulkDelete = useModStore((s) => s.bulkDelete)

  const filteredMods = useMemo(() => {
    let result = mods

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((m) => m.name.toLowerCase().includes(q))
    }

    if (typeFilter) {
      result = result.filter((m) => m.type === typeFilter)
    }

    return sortMods(result, sortColumn, sortDirection)
  }, [mods, searchQuery, typeFilter, sortColumn, sortDirection])

  const handleImportClick = async (): Promise<void> => {
    const filePath = await window.electronAPI.openFileDialog([
      { name: 'Archives', extensions: ['zip', '7z', 'rar'] }
    ])
    if (filePath) {
      await importMod(filePath)
    }
  }

  const handleRowSelect = (modId: string, e: React.MouseEvent): void => {
    if (e.shiftKey) {
      selectRange(modId)
    } else if (e.ctrlKey || e.metaKey) {
      toggleSelect(modId)
    } else {
      selectMod(modId)
    }
  }

  const handleToggleEnable = async (mod: Mod): Promise<void> => {
    if (mod.status === 'enabled') {
      await disableMod(mod.id)
    } else {
      const result = await enableMod(mod.id)
      if (!result.success && result.conflicts?.length) {
        onConflict?.(mod.id, result.conflicts)
      }
    }
  }

  const selectedArray = Array.from(selectedIds)

  const enabledFilteredIds = useMemo(
    () => filteredMods.filter((m) => m.status === 'enabled').map((m) => m.id),
    [filteredMods]
  )
  const isFiltered = !!(searchQuery || typeFilter)

  const handleDisableAll = (): void => {
    if (enabledFilteredIds.length > 0) {
      bulkDisable(enabledFilteredIds)
    }
  }

  const sortColumns: SortColumn[] = ['name', 'type', 'fileSize', 'importedAt']

  return (
    <div className="flex flex-col h-full">
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onImportClick={handleImportClick}
        onNexusImportClick={onNexusImportClick ?? (() => {})}
      />

      {enabledFilteredIds.length > 0 && (
        <div className="flex items-center px-4 pb-2">
          <button
            onClick={handleDisableAll}
            className="px-3 py-1 text-sm text-text-muted hover:bg-surface hover:text-warning rounded transition-colors"
          >
            {isFiltered
              ? `Disable ${enabledFilteredIds.length} filtered mod${enabledFilteredIds.length === 1 ? '' : 's'}`
              : `Disable all ${enabledFilteredIds.length} mod${enabledFilteredIds.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {selectedIds.size > 1 && (
        <BulkActions
          selectedCount={selectedIds.size}
          onEnableAll={() => bulkEnable(selectedArray)}
          onDisableAll={() => bulkDisable(selectedArray)}
          onDeleteAll={() => bulkDelete(selectedArray)}
          onClearSelection={clearSelection}
        />
      )}

      {filteredMods.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-muted font-light tracking-wide">
          No mods found. Import a mod to get started.
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-text-muted text-sm bg-surface/50">
                <th className="px-4 py-2 w-16">Toggle</th>
                {sortColumns.map((col) => (
                  <th
                    key={col}
                    onClick={() => setSort(col)}
                    className={`px-4 py-2 cursor-pointer hover:text-text select-none transition-colors ${
                      sortColumn === col ? 'text-neon-cyan' : ''
                    }`}
                  >
                    {SORT_LABELS[col]}{' '}
                    {sortColumn === col && (
                      <span>{sortDirection === 'asc' ? '\u25B2' : '\u25BC'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMods.map((mod) => (
                <ModRow
                  key={mod.id}
                  mod={mod}
                  selected={selectedIds.has(mod.id)}
                  onSelect={(e) => handleRowSelect(mod.id, e)}
                  onToggleEnable={() => handleToggleEnable(mod)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
