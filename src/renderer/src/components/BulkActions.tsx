interface BulkActionsProps {
  selectedCount: number
  onEnableAll: () => void
  onDisableAll: () => void
  onDeleteAll: () => void
  onClearSelection: () => void
}

export default function BulkActions({
  selectedCount,
  onEnableAll,
  onDisableAll,
  onDeleteAll,
  onClearSelection
}: BulkActionsProps): JSX.Element {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 mx-4 card-cyber"
      style={{ boxShadow: '0 0 12px rgba(0, 240, 255, 0.04)' }}
    >
      <span className="text-text text-sm font-medium">{selectedCount} selected</span>

      <button
        onClick={onEnableAll}
        className="px-3 py-1 text-sm text-neon-cyan hover:bg-neon-cyan/10 hover:shadow-neon-cyan rounded transition-all duration-200"
      >
        Enable All
      </button>

      <button
        onClick={onDisableAll}
        className="px-3 py-1 text-sm text-text-muted hover:bg-surface rounded transition-colors"
      >
        Disable All
      </button>

      <button onClick={onDeleteAll} className="btn-danger">
        Delete All
      </button>

      <button
        onClick={onClearSelection}
        className="px-3 py-1 text-sm text-text-muted hover:bg-surface rounded transition-colors ml-auto"
      >
        Clear selection
      </button>
    </div>
  )
}
