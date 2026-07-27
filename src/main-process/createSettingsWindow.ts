import { App, BrowserWindow } from 'electron'
import path from 'path'
import * as PlatformResolver from '../tools/platformResolver'

export function createSettingsWindow(app: App) {
  let settingsWindow: BrowserWindow | null = null

  // @ts-ignore — custom app event emitted from the tray context menu
  app.on('open-settings', () => {
    if (settingsWindow) {
      settingsWindow.focus()
      return
    }

    settingsWindow = new BrowserWindow({
      width: 400,
      height: 550,
      title: 'Settings',
      resizable: true, // Allow resizing to find perfect fit
      minimizable: false,
      maximizable: false,
      autoHideMenuBar: true,
      icon: path.join(__dirname, '../../assets', PlatformResolver.isWindows() ? 'icon.ico' : 'icon.png'),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, '../settings/preload.js')
      }
    })

    settingsWindow.loadFile(path.join(__dirname, '../settings/index.html'))

    settingsWindow.on('closed', () => {
      settingsWindow = null
    })
  })
}
