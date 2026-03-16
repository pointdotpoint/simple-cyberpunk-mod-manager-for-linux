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
      <div
        className="panel-cyber p-6 max-w-md w-full mx-4"
        style={{ boxShadow: '0 0 25px rgba(240, 240, 0, 0.06), 0 0 50px rgba(240, 240, 0, 0.03)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-neon-yellow drop-shadow-[0_0_6px_rgba(240,240,0,0.5)]"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h2
            className="text-lg font-semibold text-neon-yellow"
            style={{ textShadow: '0 0 8px rgba(240, 240, 0, 0.3)' }}
          >
            File Conflicts Detected
          </h2>
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
          <button onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button onClick={onProceed} className="btn-neon-yellow">
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
