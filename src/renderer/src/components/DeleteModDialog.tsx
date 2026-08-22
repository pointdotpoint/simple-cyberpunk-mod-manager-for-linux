import { useEffect, useState } from 'react'
import type { Mod } from '../../../shared/types'

interface DeleteModDialogProps {
  mod: Mod | null
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export default function DeleteModDialog({
  mod,
  onConfirm,
  onCancel
}: DeleteModDialogProps): JSX.Element | null {
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setDeleting(false)
  }, [mod])

  if (!mod) return null

  const handleDelete = async (): Promise<void> => {
    setDeleting(true)
    await onConfirm()
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="presentation">
      <div
        className="panel-cyber p-6 max-w-md w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-mod-title"
      >
        <h2 id="delete-mod-title" className="text-lg font-semibold text-red-400 mb-2">
          Delete Mod?
        </h2>
        <p className="text-sm text-text-muted">
          Delete “{mod.name}”? Its staged files will be removed as well.
        </p>
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={onCancel} className="btn-ghost" disabled={deleting}>
            Cancel
          </button>
          <button onClick={handleDelete} className="btn-danger" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
