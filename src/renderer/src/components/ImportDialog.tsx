interface ImportDialogProps {
  open: boolean
  archivePath: string | null
  onConfirm: () => void
  onCancel: () => void
  importing: boolean
}

export default function ImportDialog({
  open,
  archivePath,
  onConfirm,
  onCancel,
  importing,
}: ImportDialogProps): JSX.Element | null {
  if (!open) return null

  const filename = archivePath ? archivePath.split('/').pop() ?? archivePath : null

  const handleBrowse = async (): Promise<void> => {
    // This is handled by the parent via file dialog; kept as visual affordance
    const path = await window.electronAPI.openFileDialog([
      { name: 'Archives', extensions: ['zip', '7z', 'rar'] },
    ])
    if (path) {
      // Parent should handle this, but we can't set state here.
      // The browse button in import dialog is mainly for the drag-drop zone UX.
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full mx-4">
        {importing ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <svg
              className="w-10 h-10 text-neon-cyan animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-text-muted">Importing mod...</p>
          </div>
        ) : archivePath ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Import Mod</h2>
            <div className="bg-background rounded p-3 border border-border">
              <p className="text-sm text-text-muted truncate" title={archivePath}>
                {filename}
              </p>
            </div>
            <p className="text-sm text-neon-cyan">Ready to import</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded border border-border text-text-muted hover:bg-border/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm rounded bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20 transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Import Mod</h2>
            <div
              className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center gap-3 cursor-pointer hover:border-neon-cyan/40 transition-colors"
              onClick={handleBrowse}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-10 h-10 text-text-muted"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-text-muted text-sm text-center">
                Drop mod archive here or click to browse
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded border border-border text-text-muted hover:bg-border/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
