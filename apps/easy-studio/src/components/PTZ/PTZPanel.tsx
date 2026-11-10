'use client'

import { useState, useCallback, useRef } from 'react'
import type { CameraConfig, PTZPreset } from '@easychurch/ptz'

export function PTZPanel() {
  const [cameras, setCameras] = useState<CameraConfig[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  const [presets, setPresets] = useState<PTZPreset[]>([])
  const [isAddingCamera, setIsAddingCamera] = useState(false)
  const [newCamera, setNewCamera] = useState<Omit<CameraConfig, 'id'>>({
    name: '', host: '', port: 52381, protocol: 'udp',
  })
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const addCamera = async () => {
    if (!newCamera.name || !newCamera.host) return
    const cam: CameraConfig = { ...newCamera, id: crypto.randomUUID() }
    const result = await window.studioAPI?.addCamera(cam)
    if ((result as { ok: boolean })?.ok) {
      setCameras(prev => [...prev, cam])
      setSelectedCamera(cam.id)
      setIsAddingCamera(false)
      setNewCamera({ name: '', host: '', port: 52381, protocol: 'udp' })
    }
  }

  const sendPtz = useCallback((payload: number[]) => {
    if (!selectedCamera) return
    window.studioAPI?.sendPtzCommand(selectedCamera, payload)
  }, [selectedCamera])

  const recallPreset = (presetId: number) => {
    if (!selectedCamera) return
    window.studioAPI?.recallPreset?.(selectedCamera, presetId)
  }

  // PTZ D-pad with hold support
  const startMove = (payload: number[]) => {
    sendPtz(payload)
    holdTimer.current = setInterval(() => sendPtz(payload), 100)
  }
  const stopMove = () => {
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = null }
    // VISCA panTiltStop
    sendPtz([0x01, 0x06, 0x01, 0x03, 0x03, 0x03, 0x03])
  }

  // suppress unused variable warning
  void presets
  void setPresets

  return (
    <div className="h-full flex">
      {/* Camera list */}
      <div className="w-56 border-r border-surface-border bg-surface-mid p-3 flex flex-col">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Cameras</div>
        {cameras.map(cam => (
          <button
            key={cam.id}
            onClick={() => setSelectedCamera(cam.id)}
            className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
              selectedCamera === cam.id
                ? 'bg-studio-blue text-white'
                : 'bg-surface-dark text-slate-300 hover:bg-surface-light'
            }`}
          >
            <div className="text-xs font-medium">{cam.name}</div>
            <div className="text-xs text-slate-500">{cam.host}:{cam.port}</div>
          </button>
        ))}
        <button
          onClick={() => setIsAddingCamera(true)}
          className="w-full mt-2 py-2 text-xs text-slate-400 border border-dashed border-surface-border rounded-lg hover:border-studio-blue hover:text-studio-blue transition-colors"
        >
          + Add Camera
        </button>

        {isAddingCamera && (
          <div className="mt-3 p-3 bg-surface-dark rounded-lg border border-surface-border space-y-2">
            <input value={newCamera.name} onChange={e => setNewCamera(c => ({ ...c, name: e.target.value }))}
              placeholder="Camera name" className="w-full px-2 py-1.5 bg-surface-mid border border-surface-border rounded text-xs text-white placeholder-slate-600 focus:outline-none" />
            <input value={newCamera.host} onChange={e => setNewCamera(c => ({ ...c, host: e.target.value }))}
              placeholder="192.168.1.100" className="w-full px-2 py-1.5 bg-surface-mid border border-surface-border rounded text-xs text-white placeholder-slate-600 focus:outline-none" />
            <div className="flex gap-2">
              <input type="number" value={newCamera.port} onChange={e => setNewCamera(c => ({ ...c, port: parseInt(e.target.value) || 52381 }))}
                className="w-20 px-2 py-1.5 bg-surface-mid border border-surface-border rounded text-xs text-white focus:outline-none" />
              <select value={newCamera.protocol} onChange={e => setNewCamera(c => ({ ...c, protocol: e.target.value as 'tcp'|'udp' }))}
                className="flex-1 px-2 py-1.5 bg-surface-mid border border-surface-border rounded text-xs text-white focus:outline-none">
                <option value="udp">UDP</option>
                <option value="tcp">TCP</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={addCamera} className="flex-1 py-1.5 bg-studio-blue text-white text-xs rounded transition-colors">Add</button>
              <button onClick={() => setIsAddingCamera(false)} className="flex-1 py-1.5 bg-surface-light text-slate-400 text-xs rounded transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* PTZ controls */}
      <div className="flex-1 p-6 flex flex-col items-center gap-6">
        {!selectedCamera ? (
          <div className="text-slate-600 text-sm mt-20">Select a camera to control</div>
        ) : (
          <>
            {/* D-pad */}
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-4 text-center">Pan / Tilt</div>
              <div className="grid grid-cols-3 gap-2 w-40">
                <div />
                <PtzButton label="▲" onStart={() => startMove([0x01,0x06,0x01,0x09,0x09,0x03,0x01])} onEnd={stopMove} />
                <div />
                <PtzButton label="◄" onStart={() => startMove([0x01,0x06,0x01,0x09,0x09,0x01,0x03])} onEnd={stopMove} />
                <PtzButton label="⌂" onStart={() => sendPtz([0x01,0x06,0x04])} onEnd={() => {}} />
                <PtzButton label="►" onStart={() => startMove([0x01,0x06,0x01,0x09,0x09,0x02,0x03])} onEnd={stopMove} />
                <div />
                <PtzButton label="▼" onStart={() => startMove([0x01,0x06,0x01,0x09,0x09,0x03,0x02])} onEnd={stopMove} />
                <div />
              </div>
            </div>

            {/* Zoom */}
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 text-center">Zoom</div>
              <div className="flex gap-3">
                <PtzButton label="W-" onStart={() => startMove([0x01,0x04,0x07,0x33])} onEnd={() => sendPtz([0x01,0x04,0x07,0x00])} />
                <PtzButton label="AF" onStart={() => sendPtz([0x01,0x04,0x38,0x02])} onEnd={() => {}} />
                <PtzButton label="T+" onStart={() => startMove([0x01,0x04,0x07,0x23])} onEnd={() => sendPtz([0x01,0x04,0x07,0x00])} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Presets */}
      <div className="w-64 border-l border-surface-border bg-surface-mid p-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Presets</div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => recallPreset(n - 1)}
              onContextMenu={e => { e.preventDefault(); sendPtz([0x01,0x04,0x3F,0x01,(n-1)&0xFF]) }}
              disabled={!selectedCamera}
              title={`Left-click: Recall | Right-click: Store`}
              className="aspect-square flex items-center justify-center rounded-lg bg-surface-dark border border-surface-border hover:border-studio-blue disabled:opacity-30 text-slate-300 font-bold text-sm transition-colors"
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3">Left-click: Recall<br/>Right-click: Store preset</p>
      </div>
    </div>
  )
}

function PtzButton({ label, onStart, onEnd }: { label: string; onStart: () => void; onEnd: () => void }) {
  return (
    <button
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={e => { e.preventDefault(); onStart() }}
      onTouchEnd={onEnd}
      className="w-12 h-12 flex items-center justify-center rounded-lg bg-surface-mid border border-surface-border hover:bg-surface-light active:bg-studio-blue text-white font-bold select-none transition-colors"
    >
      {label}
    </button>
  )
}
