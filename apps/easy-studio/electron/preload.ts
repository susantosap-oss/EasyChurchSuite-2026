import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('studioAPI', {
  sendOverlay: (data: unknown) => ipcRenderer.send('overlay:command', data),
  onOverlayCommand: (cb: (data: unknown) => void) => {
    ipcRenderer.on('overlay:command', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('overlay:command')
  },
  showOverlayWindow: (show: boolean) => ipcRenderer.invoke('overlay:show', show),
  showStageWindow: (show: boolean) => ipcRenderer.invoke('stage:show', show),
  sendPtzCommand: (cameraId: string, payload: number[]) =>
    ipcRenderer.invoke('ptz:send', { cameraId, payload }),
  recallPreset: (cameraId: string, presetId: number) =>
    ipcRenderer.invoke('ptz:recall-preset', { cameraId, presetId }),
  addCamera: (config: unknown) => ipcRenderer.invoke('ptz:add-camera', config),
  removeCamera: (id: string) => ipcRenderer.invoke('ptz:remove-camera', id),
  getDisplays: () => ipcRenderer.invoke('app:get-displays'),
  sendStageUpdate: (data: unknown) => ipcRenderer.send('stage:update', data),
  onStageUpdate: (cb: (data: unknown) => void) => {
    ipcRenderer.on('stage:update', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('stage:update')
  },
})
