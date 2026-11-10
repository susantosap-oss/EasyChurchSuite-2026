'use client'

import { useState } from 'react'
import { LowerThirdsDesigner } from './LowerThirds/LowerThirdsDesigner'
import { PTZPanel } from './PTZ/PTZPanel'
import { StageDisplayControl } from './StageDisplay/StageDisplayControl'
import { LiveControlPanel } from './LiveControl/LiveControlPanel'

type Tab = 'live' | 'lower-thirds' | 'ptz' | 'stage'

export function StudioLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('live')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'live',          label: 'Live Control',   icon: '📡' },
    { id: 'lower-thirds',  label: 'Lower Thirds',   icon: '🎬' },
    { id: 'ptz',           label: 'PTZ Cameras',    icon: '🎥' },
    { id: 'stage',         label: 'Stage Display',  icon: '🎵' },
  ]

  return (
    <div className="flex flex-col h-screen bg-surface-dark">
      {/* Title bar area */}
      <div className="flex items-center bg-surface-mid border-b border-surface-border px-4 h-11 flex-shrink-0">
        <span className="text-sm font-bold text-white mr-6">EasyStudio</span>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-studio-blue text-white'
                  : 'text-slate-400 hover:text-white hover:bg-surface-light'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <StatusBar />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'live'         && <LiveControlPanel />}
        {activeTab === 'lower-thirds' && <LowerThirdsDesigner />}
        {activeTab === 'ptz'          && <PTZPanel />}
        {activeTab === 'stage'        && <StageDisplayControl />}
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-500">
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-studio-green" />
        Overlay: Hidden
      </span>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
        Stage: Off
      </span>
    </div>
  )
}
