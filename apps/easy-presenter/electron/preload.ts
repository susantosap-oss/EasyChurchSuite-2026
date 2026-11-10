import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  sendSlideCommand: (data: unknown) => ipcRenderer.send('slide:command', data),
  onSlideCommand: (cb: (data: unknown) => void) => {
    ipcRenderer.on('slide:command', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('slide:command')
  },
  getDisplays: () => ipcRenderer.invoke('app:get-displays'),
})
