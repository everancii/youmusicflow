import { app, BrowserWindow, nativeImage, shell } from 'electron'
import path from 'path'
import * as PlatformResolver from '../tools/platformResolver'
import { getSetting } from '../tools/settings'
import { isAllowedNavigation } from '../tools/navigationPolicy'
import { WINDOW_WIDTH, WINDOW_HEIGHT } from './positionWindow'

export function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    transparent: true,
    frame: false,
    resizable: false,
    show: false,
    icon: path.join(__dirname, '../../assets', PlatformResolver.isWindows() ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../client/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    },
    alwaysOnTop: getSetting('alwaysOnTop') as boolean
  })

  // Apply login settings
  app.setLoginItemSettings({
    openAtLogin: getSetting('startOnLogin') as boolean
  })

  const updateDockVisibility = (hide: boolean) => {
    if (process.platform === 'darwin' && app.dock) {
      if (hide) {
        app.dock.hide()
      } else {
        app.dock.show()
        // Delay setting icon slightly to ensure dock has shown
        setTimeout(() => {
          const iconPath = path.join(__dirname, '../../assets', 'icon.png')
          const image = nativeImage.createFromPath(iconPath)
          if (app.dock && !image.isEmpty()) {
            app.dock.setIcon(image)
          }
        }, 200)
      }
    }
  }

  // Apply dock icon setting
  updateDockVisibility(getSetting('hideDockIcon') as boolean)

  mainWindow.loadURL('https://music.youtube.com')

  // Keep the window on YTM/auth origins; everything else goes to the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) {
      return { action: 'allow' }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Offline fallback — ignore ERR_ABORTED (-3, fired by normal cancelled loads)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      mainWindow.loadFile(path.join(__dirname, '../offline/offline.html'))
    }
  })

  const injectCSS = () => {
    mainWindow.webContents.insertCSS(`
      html, body {
        scrollbar-width: none !important; /* Firefox */
      }
      * {
        -ms-overflow-style: none !important; /* IE/Edge */
      }
      ::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
      }
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
      }
    `)
  }

  mainWindow.webContents.on('did-finish-load', injectCSS)
  mainWindow.webContents.on('did-navigate', injectCSS)
  mainWindow.webContents.on('did-navigate-in-page', injectCSS)
  mainWindow.webContents.on('dom-ready', injectCSS)

  mainWindow.on('blur', () => {
    mainWindow.hide()
  })

  return { mainWindow, updateDockVisibility }
}
