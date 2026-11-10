'use client'

export function BottomBar() {
  return (
    <div className="h-10 border-t border-surface-light bg-surface-mid flex items-center px-4 gap-4 flex-shrink-0">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="font-medium text-white">EasyPresenter</span>
        <span>v0.1.0</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>Yohanes 3:16 — TB</span>
        <span>Slide 1/6</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Ready
        </span>
      </div>
    </div>
  )
}
