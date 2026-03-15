import { useSettingsStore } from '../stores/settingsStore'

export default function SettingsView(): JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const detectGame = useSettingsStore((s) => s.detectGame)
  const browseDirectory = useSettingsStore((s) => s.browseDirectory)

  const gameDir = settings?.gameDirectory

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Game Directory */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Cyberpunk 2077 Installation
          </h2>
          {gameDir ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-green-400"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-neon-yellow"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          )}
        </div>

        <p className={`text-sm mb-4 ${gameDir ? 'text-text' : 'text-text-muted'}`}>
          {gameDir ?? 'Not detected'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={detectGame}
            className="px-3 py-1.5 text-sm rounded border border-border text-text-muted hover:bg-border/30 transition-colors"
          >
            Auto-detect
          </button>
          <button
            onClick={browseDirectory}
            className="px-3 py-1.5 text-sm rounded border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
          >
            Browse...
          </button>
        </div>
      </div>

      {/* About */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">
          About
        </h2>
        <p className="text-sm text-text">CP2077 Mod Manager</p>
        <p className="text-sm text-text-muted mt-1">
          A Linux-first mod manager for Cyberpunk 2077. Manages mod archives using a staging
          directory pattern for safe, reversible deployments.
        </p>
        <p className="text-xs text-text-muted mt-2">Version 1.0.0</p>
      </div>
    </div>
  )
}
