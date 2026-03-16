import { useState } from 'react'

interface NexusImportDialogProps {
  open: boolean
  onClose: () => void
  onImportComplete: () => void
}

const NEXUS_URL_RE = /^https?:\/\/(www\.)?nexusmods\.com\/[^/]+\/mods\/\d+/

export default function NexusImportDialog({
  open,
  onClose,
  onImportComplete
}: NexusImportDialogProps): JSX.Element | null {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'downloading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const isValidUrl = NEXUS_URL_RE.test(url.trim())

  const handleDownload = async (): Promise<void> => {
    setStatus('downloading')
    setError(null)
    try {
      await window.electronAPI.nexusDownload(url.trim())
      setStatus('idle')
      setUrl('')
      onImportComplete()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('cancelled')) {
        setStatus('idle')
      } else {
        setStatus('error')
        setError(message)
      }
    }
  }

  const handleClose = (): void => {
    if (status !== 'downloading') {
      setUrl('')
      setStatus('idle')
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="panel-cyber p-6 max-w-lg w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">Import from Nexus Mods</h2>

        {status === 'downloading' ? (
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
            <p className="text-text-muted text-sm text-center">
              Download will start automatically.
              <br />
              If a browser window appears, you may need to log in.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <label className="text-sm text-text-muted">Nexus Mods URL</label>
              <input
                type="text"
                placeholder="https://www.nexusmods.com/cyberpunk2077/mods/12345"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValidUrl) handleDownload()
                }}
                className="input-cyber"
                autoFocus
              />
              {url && !isValidUrl && (
                <p className="text-xs text-red-400">
                  Enter a valid Nexus Mods URL (e.g.
                  https://www.nexusmods.com/cyberpunk2077/mods/12345)
                </p>
              )}
              {error && (
                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded p-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <button onClick={handleClose} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={handleDownload}
                disabled={!isValidUrl}
                className="btn-neon-cyan disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Open Nexus
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
