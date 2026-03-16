import { useEffect } from 'react'
import { useLogStore } from '../stores/logStore'
import { useSettingsStore } from '../stores/settingsStore'
import LogToolbar from './LogToolbar'
import LogContent from './LogContent'

export default function LogsView(): JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const scanLogs = useLogStore((s) => s.scanLogs)
  const readLogs = useLogStore((s) => s.readLogs)
  const autoRefresh = useLogStore((s) => s.autoRefresh)
  const appendLines = useLogStore((s) => s.appendLines)

  const gameDir = settings?.gameDirectory

  // Initial load
  useEffect(() => {
    if (!gameDir) return
    scanLogs().then(() => readLogs())
  }, [gameDir])

  // Auto-refresh watcher
  useEffect(() => {
    if (!gameDir || !autoRefresh) return

    window.electronAPI.startLogWatch()

    const cleanup = window.electronAPI.onLogUpdate((event) => {
      appendLines(event.fileId, event.newLines)
    })

    return () => {
      cleanup()
      window.electronAPI.stopLogWatch()
    }
  }, [gameDir, autoRefresh])

  if (!gameDir) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center text-text-muted gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="w-12 h-12 opacity-30"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <p className="text-sm">No game directory configured</p>
        <p className="text-xs">Set your game directory in Settings to view logs</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <LogToolbar />
      <LogContent />
    </div>
  )
}
