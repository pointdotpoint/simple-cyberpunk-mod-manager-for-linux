import { useEffect, useRef, useState } from 'react'
import type { Mod } from '../../../shared/types'

interface RenameModDialogProps {
  mod: Mod | null
  onConfirm: (name: string) => Promise<void>
  onCancel: () => void
}

export default function RenameModDialog({
  mod,
  onConfirm,
  onCancel
}: RenameModDialogProps): JSX.Element | null {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(mod?.name ?? '')
    setSaving(false)
    if (mod) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [mod])

  if (!mod) return null

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && trimmedName !== mod.name && !saving

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    if (!canSave) return

    setSaving(true)
    await onConfirm(trimmedName)
    onCancel()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="presentation">
      <form
        onSubmit={handleSubmit}
        className="panel-cyber p-6 max-w-md w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-mod-title"
      >
        <h2 id="rename-mod-title" className="text-lg font-semibold text-text mb-2">
          Rename Mod
        </h2>
        <p className="text-sm text-text-muted mb-4">Choose a new name for “{mod.name}”.</p>
        <label className="block text-sm text-text-muted mb-2" htmlFor="mod-name">
          Mod name
        </label>
        <input
          ref={inputRef}
          id="mod-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancel()
          }}
          className="input-cyber"
          maxLength={200}
          disabled={saving}
        />
        {trimmedName.length === 0 && (
          <p className="text-xs text-red-400 mt-2">A mod name is required.</p>
        )}
        <div className="flex gap-3 justify-end mt-5">
          <button type="button" onClick={onCancel} className="btn-ghost" disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-neon-cyan" disabled={!canSave}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
