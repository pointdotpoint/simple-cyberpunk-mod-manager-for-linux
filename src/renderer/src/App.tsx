import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import ModList from './components/ModList'
import SettingsView from './components/SettingsView'
import ImportDialog from './components/ImportDialog'
import ProgressOverlay from './components/ProgressOverlay'
import ConflictDialog from './components/ConflictDialog'
import { useModStore } from './stores/modStore'
import { useSettingsStore } from './stores/settingsStore'
import type { OperationProgress, ConflictInfo } from '../../shared/types'

function App(): JSX.Element {
  const [view, setView] = useState<'mods' | 'settings'>('mods')
  const [dragOver, setDragOver] = useState(false)
  const [importPath, setImportPath] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
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
      // In Electron, file.path gives the full path
      setImportPath((file as unknown as { path: string }).path || file.name)
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

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Layout view={view} onViewChange={setView}>
        {view === 'mods' ? <ModList /> : <SettingsView />}
      </Layout>

      {/* Drag overlay indicator */}
      {dragOver && (
        <div className="fixed inset-0 bg-neon-cyan/5 border-2 border-dashed border-neon-cyan/40 z-40 flex items-center justify-center pointer-events-none">
          <span className="text-neon-cyan text-xl">Drop mod archive to import</span>
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

      {progress && <ProgressOverlay visible={true} {...progress} />}

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
