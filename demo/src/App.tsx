import { useState } from 'react'
import CounterCard from './components/CounterCard'
import HeaderCard from './components/HeaderCard'
import ToggleSwitch from './components/ToggleSwitch'

export default function App() {
  const [compactMode, setCompactMode] = useState(false)

  return (
    <div className={`page ${compactMode ? 'is-compact' : ''}`}>
      <HeaderCard title="Figma Sync POC" subtitle="Simple React page with two components" />
      <HeaderCard title="What's New" subtitle="Latest updates and announcements" />
      <div className="grid">
        <CounterCard />
        <div className="card">
          <h2>Settings</h2>
          <p className="muted">A common toggle widget.</p>
          <div className="stack">
            <ToggleSwitch label="Compact mode" checked={compactMode} onCheckedChange={setCompactMode} />
          </div>
        </div>
      </div>
    </div>
  )
}
