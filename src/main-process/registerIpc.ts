import { App, BrowserWindow, ipcMain } from 'electron'
import { getSettings, updateSetting } from '../tools/settings'

interface IpcDeps {
  app: App
  mainWindow: BrowserWindow
  updateDockVisibility: (hide: boolean) => void
  updateWindowPosition: () => void
  registerMediaKeys: () => void
  unregisterMediaKeys: () => void
}

export function registerIpc({
  app,
  mainWindow,
  updateDockVisibility,
  updateWindowPosition,
  registerMediaKeys,
  unregisterMediaKeys
}: IpcDeps) {
  ipcMain.handle('get-platform', () => {
    return process.platform
  })

  ipcMain.handle('get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  ipcMain.on('update-setting', (event, key, value) => {
    updateSetting(key, value)

    // Apply changes immediately where possible
    if (key === 'alwaysOnTop') {
      mainWindow.setAlwaysOnTop(value)
    }

    if (key === 'startOnLogin') {
      app.setLoginItemSettings({
        openAtLogin: value
      })
    }

    if (key === 'windowPosition') {
      updateWindowPosition()
    }

    if (key === 'hideDockIcon') {
      updateDockVisibility(value)
    }

    if (key === 'enableMediaKeys') {
      if (value) {
        registerMediaKeys()
      } else {
        unregisterMediaKeys()
      }
    }
  })
}
