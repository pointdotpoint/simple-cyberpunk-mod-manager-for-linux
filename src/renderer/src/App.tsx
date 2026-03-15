import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import ModList from './components/ModList'
import { useModStore } from './stores/modStore'
import { useSettingsStore } from './stores/settingsStore'

function App(): JSX.Element {
  const [view, setView] = useState<'mods' | 'settings'>('mods')
  const fetchMods = useModStore((s) => s.fetchMods)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  useEffect(() => {
    fetchMods()
    fetchSettings()
  }, [])

  return (
    <Layout view={view} onViewChange={setView}>
      {view === 'mods' ? (
        <ModList />
      ) : (
        <div className="p-4 text-text-muted">Settings placeholder</div>
      )}
    </Layout>
  )
}

export default App
