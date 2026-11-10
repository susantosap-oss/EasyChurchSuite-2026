'use client'

import { useState } from 'react'
import { SidebarLeft } from './SidebarLeft'
import { SlidePreviewPanel } from './SlidePreviewPanel'
import { OutputPreview } from './OutputPreview'
import { BottomBar } from './BottomBar'

export function OperatorLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen w-screen bg-surface-dark overflow-hidden">
      {/* Left sidebar: playlist / library */}
      <SidebarLeft collapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(v => !v)} />

      {/* Center: slide thumbnails */}
      <main className="flex-1 flex flex-col min-w-0">
        <SlidePreviewPanel />
        <BottomBar />
      </main>

      {/* Right: live output preview */}
      <aside className="w-80 flex-shrink-0 border-l border-surface-light bg-surface-mid">
        <OutputPreview />
      </aside>
    </div>
  )
}
