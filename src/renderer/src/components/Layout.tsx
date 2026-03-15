import { useModStore } from '../stores/modStore'
import { useSettingsStore } from '../stores/settingsStore'

interface LayoutProps {
  children: React.ReactNode
  view: 'mods' | 'settings'
  onViewChange: (view: 'mods' | 'settings') => void
}

function GearIcon({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-5 h-5 ${active ? 'text-neon-cyan' : 'text-text-muted hover:text-text'} transition-colors`}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export default function Layout({ children, view, onViewChange }: LayoutProps): JSX.Element {
  const mods = useModStore((s) => s.mods)
  const settings = useSettingsStore((s) => s.settings)

  const enabledCount = mods.filter((m) => m.status === 'enabled').length
  const gameDir = settings?.gameDirectory

  return (
    <div className="min-h-screen h-screen flex flex-col bg-background text-text">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
        <h1 className="text-lg font-semibold tracking-wide">
          <span className="text-neon-cyan">CP2077</span>{' '}
          <span className="text-text">Mod Manager</span>
        </h1>
        <button
          onClick={() => onViewChange(view === 'settings' ? 'mods' : 'settings')}
          className="p-1.5 rounded hover:bg-border/30 transition-colors"
          title="Settings"
        >
          <GearIcon active={view === 'settings'} />
        </button>
      </header>

      {/* Main area */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Bottom status bar */}
      <footer className="flex items-center justify-between px-4 py-1.5 bg-surface border-t border-border text-xs text-text-muted">
        <span>{gameDir ?? 'Game directory not configured'}</span>
        <span>
          {mods.length} mod{mods.length !== 1 ? 's' : ''} &middot; {enabledCount} enabled
        </span>
      </footer>
    </div>
  )
}
