import { useState, useCallback, useEffect } from 'react'
import { useLogStore } from '../stores/logStore'
import type { LogSource, LogLevel } from '../../../shared/types'

export default function LogToolbar(): JSX.Element {
  const searchQuery = useLogStore((s) => s.searchQuery)
  const sourceFilter = useLogStore((s) => s.sourceFilter)
  const levelFilter = useLogStore((s) => s.levelFilter)
  const autoRefresh = useLogStore((s) => s.autoRefresh)
  const logFiles = useLogStore((s) => s.logFiles)
  const setSearchQuery = useLogStore((s) => s.setSearchQuery)
  const setSourceFilter = useLogStore((s) => s.setSourceFilter)
  const setLevelFilter = useLogStore((s) => s.setLevelFilter)
  const toggleAutoRefresh = useLogStore((s) => s.toggleAutoRefresh)
  const searchLogs = useLogStore((s) => s.searchLogs)

  const [inputValue, setInputValue] = useState(searchQuery)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue)
      searchLogs(inputValue)
    }, 500)
    return () => clearTimeout(timer)
  }, [inputValue])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        setSearchQuery(inputValue)
        searchLogs(inputValue)
      }
    },
    [inputValue]
  )

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-surface border-b border-border">
      {/* Search input */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search logs (regex)..."
          className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-neon-cyan/50 font-mono"
        />
      </div>

      {/* Source filter */}
      <select
        value={sourceFilter ?? ''}
        onChange={(e) => setSourceFilter((e.target.value || null) as LogSource | null)}
        className="bg-background border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-neon-cyan/50"
      >
        <option value="">All Sources</option>
        <option value="cet">CET</option>
        <option value="red4ext">RED4ext</option>
        <option value="game">Game</option>
      </select>

      {/* Level filter */}
      <select
        value={levelFilter ?? ''}
        onChange={(e) => setLevelFilter((e.target.value || null) as LogLevel | null)}
        className="bg-background border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-neon-cyan/50"
      >
        <option value="">All Levels</option>
        <option value="error">Error</option>
        <option value="warn">Warn</option>
        <option value="info">Info</option>
        <option value="debug">Debug</option>
      </select>

      {/* Auto-refresh toggle */}
      <button
        onClick={toggleAutoRefresh}
        className={`p-1.5 rounded transition-colors ${
          autoRefresh
            ? 'text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20'
            : 'text-text-muted hover:text-text hover:bg-border/30'
        }`}
        title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          {autoRefresh ? (
            <>
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </>
          ) : (
            <polygon points="5 3 19 12 5 21 5 3" />
          )}
        </svg>
      </button>

      {/* File count */}
      <span className="text-xs text-text-muted whitespace-nowrap">
        {logFiles.length} file{logFiles.length !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
