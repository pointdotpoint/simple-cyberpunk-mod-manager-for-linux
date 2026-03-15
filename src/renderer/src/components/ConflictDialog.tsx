import type { ConflictInfo } from '../../../shared/types'

interface ConflictDialogProps {
  open: boolean
  conflicts: ConflictInfo[]
  onProceed: () => void
  onCancel: () => void
}

export default function ConflictDialog({
  open,
  conflicts,
  onProceed,
  onCancel,
}: ConflictDialogProps): JSX.Element | null {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-neon-yellow"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h2 className="text-lg font-semibold text-neon-yellow">File Conflicts Detected</h2>
        </div>

        <p className="text-sm text-text-muted mb-4">
          Proceeding will overwrite these files from other enabled mods:
        </p>

        <div className="max-h-60 overflow-auto mb-4 space-y-3">
          {conflicts.map((conflict) => (
            <div key={conflict.modId} className="bg-background rounded p-3 border border-border">
              <p className="text-sm font-medium text-text mb-1">{conflict.modName}</p>
              <ul className="text-xs text-text-muted space-y-0.5">
                {conflict.conflictingFiles.map((file) => (
                  <li key={file} className="truncate" title={file}>
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded border border-border text-text-muted hover:bg-border/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 text-sm rounded bg-neon-yellow/10 border border-neon-yellow/40 text-neon-yellow hover:bg-neon-yellow/20 transition-colors"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
