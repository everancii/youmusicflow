import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('settingsAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  updateSetting: (key: string, value: unknown) =>
    ipcRenderer.send('update-setting', key, value)
})
