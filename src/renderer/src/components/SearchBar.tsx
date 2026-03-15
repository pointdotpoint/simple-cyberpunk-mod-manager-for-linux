interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  typeFilter: string | null
  onTypeFilterChange: (type: string | null) => void
  onImportClick: () => void
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
  onImportClick
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
          className="w-full pl-10 pr-3 py-2 bg-surface text-text placeholder-text-muted border border-border rounded focus:outline-none focus:border-neon-cyan/50"
        />
      </div>

      {/* Type filter dropdown */}
      <select
        value={typeFilter ?? 'All Types'}
        onChange={(e) =>
          onTypeFilterChange(e.target.value === 'All Types' ? null : e.target.value.toLowerCase())
        }
        className="px-3 py-2 bg-surface text-text border border-border rounded focus:outline-none focus:border-neon-cyan/50"
      >
        {MOD_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Import button */}
      <button
        onClick={onImportClick}
        className="px-4 py-2 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20 rounded whitespace-nowrap transition-colors"
      >
        Import Mod
      </button>
    </div>
  )
}
