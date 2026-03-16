import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import ModList from './components/ModList'
import SettingsView from './components/SettingsView'
import LogsView from './components/LogsView'
import ImportDialog from './components/ImportDialog'
import NexusImportDialog from './components/NexusImportDialog'
import ProgressOverlay from './components/ProgressOverlay'
import ConflictDialog from './components/ConflictDialog'
import Toast from './components/Toast'
import { useModStore } from './stores/modStore'
import { useSettingsStore } from './stores/settingsStore'
import type { OperationProgress, ConflictInfo, EnableResult } from '../../shared/types'

function App(): JSX.Element {
  const [view, setView] = useState<'mods' | 'settings' | 'logs'>('mods')
  const [dragOver, setDragOver] = useState(false)
  const [importPath, setImportPath] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showNexusImport, setShowNexusImport] = useState(false)
  const [progress, setProgress] = useState<OperationProgress | null>(null)
  const [conflicts, setConflicts] = useState<{
    conflicts: ConflictInfo[]
    modId: string
  } | null>(null)

  const fetchMods = useModStore((s) => s.fetchMods)
  const importMod = useModStore((s) => s.importMod)
  const enableModForce = useModStore((s) => s.enableModForce)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  useEffect(() => {
    fetchMods()
    fetchSettings()
    // Listen for progress events
    const cleanup = window.electronAPI.onProgress((p) => {
      setProgress(p)
      // Clear after a delay when complete
      if (p.current >= p.total) {
        setTimeout(() => setProgress(null), 1000)
      }
    })
    return cleanup
  }, [])

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    setDragOver(true)
  }
  const handleDragLeave = (): void => {
    setDragOver(false)
  }
  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setImportPath(window.electronAPI.getPathForFile(file))
      setShowImport(true)
    }
  }

  const handleImportConfirm = async (): Promise<void> => {
    if (!importPath) return
    setImporting(true)
    try {
      await importMod(importPath)
    } finally {
      setImporting(false)
      setShowImport(false)
      setImportPath(null)
    }
  }

  const handleHeaderDrop = async (filePath: string): Promise<void> => {
    setImporting(true)
    try {
      await importMod(filePath)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Layout view={view} onViewChange={setView} onFileDrop={handleHeaderDrop} importing={importing}>
        {view === 'mods' && (
          <ModList
            onConflict={(modId: string, conflicts: ConflictInfo[]) =>
              setConflicts({ modId, conflicts })
            }
            onNexusImportClick={() => setShowNexusImport(true)}
          />
        )}
        {view === 'settings' && <SettingsView />}
        {view === 'logs' && <LogsView />}
      </Layout>

      {/* Drag overlay indicator */}
      {dragOver && (
        <div className="fixed inset-0 bg-neon-cyan/5 border-2 border-dashed border-neon-cyan/40 z-40 flex items-center justify-center pointer-events-none shadow-[inset_0_0_60px_rgba(0,240,255,0.06)]">
          <span className="text-neon-cyan text-xl font-bold tracking-wide">Drop mod archive to import</span>
        </div>
      )}

      <ImportDialog
        open={showImport}
        archivePath={importPath}
        onConfirm={handleImportConfirm}
        onCancel={() => {
          setShowImport(false)
          setImportPath(null)
        }}
        importing={importing}
      />

      <NexusImportDialog
        open={showNexusImport}
        onClose={() => setShowNexusImport(false)}
        onImportComplete={() => fetchMods()}
      />

      {progress && <ProgressOverlay visible={true} {...progress} />}

      <Toast />

      {conflicts && (
        <ConflictDialog
          open={true}
          conflicts={conflicts.conflicts}
          onProceed={() => {
            enableModForce(conflicts.modId)
            setConflicts(null)
          }}
          onCancel={() => setConflicts(null)}
        />
      )}
    </div>
  )
}

export default App
