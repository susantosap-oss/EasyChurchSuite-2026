import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getDisplays: () => ipcRenderer.invoke('app:get-displays'),
  onDisplaysChanged: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on('displays:changed', listener)
    return () => { ipcRenderer.removeListener('displays:changed', listener) }
  },
  applyNativeSettings: (s: unknown) => ipcRenderer.invoke('settings:apply-native', s),
  getGpuInfo: () => ipcRenderer.invoke('app:gpu-info'),
  relaunch: () => ipcRenderer.send('app:relaunch'),
})
