import { useState } from 'react'
import { useModStore } from '../stores/modStore'
import { useSettingsStore } from '../stores/settingsStore'

interface LayoutProps {
  children: React.ReactNode
  view: 'mods' | 'settings' | 'logs'
  onViewChange: (view: 'mods' | 'settings' | 'logs') => void
  onFileDrop: (filePath: string) => void
  importing: boolean
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
      className={`w-5 h-5 transition-all duration-200 ${
        active
          ? 'text-neon-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]'
          : 'text-text-muted hover:text-text'
      }`}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function LogIcon({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-5 h-5 transition-all duration-200 ${
        active
          ? 'text-neon-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]'
          : 'text-text-muted hover:text-text'
      }`}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function UploadIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function SpinnerIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

export default function Layout({
  children,
  view,
  onViewChange,
  onFileDrop,
  importing
}: LayoutProps): JSX.Element {
  const mods = useModStore((s) => s.mods)
  const settings = useSettingsStore((s) => s.settings)
  const [zoneDragOver, setZoneDragOver] = useState(false)

  const enabledCount = mods.filter((m) => m.status === 'enabled').length
  const gameDir = settings?.gameDirectory

  const handleZoneDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setZoneDragOver(true)
  }

  const handleZoneDragLeave = (e: React.DragEvent): void => {
    e.stopPropagation()
    setZoneDragOver(false)
  }

  const handleZoneDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setZoneDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      const filePath = window.electronAPI.getPathForFile(file)
      onFileDrop(filePath)
    }
  }

  const handleZoneClick = async (): Promise<void> => {
    if (importing) return
    const result = await window.electronAPI.openFileDialog([
      { name: 'Archives', extensions: ['zip', '7z', 'rar'] }
    ])
    if (result) {
      onFileDrop(result)
    }
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-background text-text scanlines">
      {/* Top bar */}
      <header
        className="flex items-center gap-3 px-4 py-2 bg-surface border-b border-border"
        style={{ boxShadow: '0 1px 12px rgba(0, 240, 255, 0.08)' }}
      >
        <div
          onClick={handleZoneClick}
          onDragOver={handleZoneDragOver}
          onDragLeave={handleZoneDragLeave}
          onDrop={handleZoneDrop}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded border-2 border-dashed cursor-pointer transition-all duration-200 ${
            zoneDragOver
              ? 'border-neon-cyan/60 bg-neon-cyan/5 shadow-[0_0_16px_rgba(0,240,255,0.15)]'
              : importing
                ? 'border-border/60 bg-surface'
                : 'border-border hover:border-neon-cyan/30 hover:bg-neon-cyan/[0.02]'
          }`}
        >
          <span className={`${zoneDragOver ? 'text-neon-cyan' : 'text-text-muted'} transition-colors`}>
            {importing ? <SpinnerIcon /> : <UploadIcon />}
          </span>
          <span
            className={`text-sm font-medium tracking-wide transition-colors ${
              zoneDragOver ? 'text-neon-cyan' : 'text-text-muted'
            }`}
          >
            {importing ? 'Importing...' : 'Drop mod archive here or click to browse'}
          </span>
        </div>
        <button
          onClick={() => onViewChange(view === 'logs' ? 'mods' : 'logs')}
          className="p-1.5 rounded hover:bg-border/30 transition-colors"
          title="Logs"
        >
          <LogIcon active={view === 'logs'} />
        </button>
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
      <footer
        className="flex items-center justify-between px-4 py-1.5 bg-surface border-t border-border text-xs text-text-muted"
        style={{ boxShadow: '0 -1px 12px rgba(0, 240, 255, 0.06)' }}
      >
        <span>{gameDir ?? 'Game directory not configured'}</span>
        <span>
          {mods.length} mod{mods.length !== 1 ? 's' : ''} &middot; {enabledCount} enabled
        </span>
      </footer>
    </div>
  )
}
