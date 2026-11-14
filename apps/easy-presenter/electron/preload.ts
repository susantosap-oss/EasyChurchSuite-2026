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
  // Phone remote
  remoteSendState: (json: string) => ipcRenderer.send('remote:state', json),
  remoteInfo: () => ipcRenderer.invoke('remote:info'),
  remoteRegenerate: () => ipcRenderer.invoke('remote:regenerate'),
  onRemoteCommand: (cb: (cmd: unknown) => void) => {
    const listener = (_e: unknown, cmd: unknown) => cb(cmd)
    ipcRenderer.on('remote:command', listener)
    return () => { ipcRenderer.removeListener('remote:command', listener) }
  },
  onRemoteClients: (cb: (clients: unknown) => void) => {
    const listener = (_e: unknown, clients: unknown) => cb(clients)
    ipcRenderer.on('remote:clients', listener)
    return () => { ipcRenderer.removeListener('remote:clients', listener) }
  },
})
