interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  typeFilter: string | null
  onTypeFilterChange: (type: string | null) => void
  onImportClick: () => void
  onNexusImportClick: () => void
}

const MOD_TYPES = [
  'All Types',
  'Archive',
  'REDmod',
  'CET',
  'REDscript',
  'TweakXL',
  'Red4ext',
  'Mixed',
  'Unknown'
]

export default function SearchBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onImportClick,
  onNexusImportClick
}: SearchBarProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 p-4">
      {/* Search input */}
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search mods..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-cyber pl-10"
        />
      </div>

      {/* Type filter dropdown */}
      <select
        value={typeFilter ?? 'All Types'}
        onChange={(e) =>
          onTypeFilterChange(e.target.value === 'All Types' ? null : e.target.value.toLowerCase())
        }
        className="input-cyber w-auto"
      >
        {MOD_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Import buttons */}
      <button
        onClick={onNexusImportClick}
        className="btn-ghost hover:border-neon-cyan/30 hover:text-neon-cyan whitespace-nowrap"
      >
        Import from Nexus
      </button>
      <button onClick={onImportClick} className="btn-neon-cyan whitespace-nowrap">
        Import Mod
      </button>
    </div>
  )
}
