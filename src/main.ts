import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  screen,
  globalShortcut,
  ipcMain,
  nativeImage
} from 'electron'
import { createMenuTemplate } from './ui/menuTemplate'
import * as offsetCalclator from './tools/offsetCalclator'
import * as PlatformResolver from './tools/platformResolver'
import { getTrayPosition, TrayPosition } from './tools/getTrayPosition'
import { getNativeIconName } from './tools/getNativeIconName'
import { createContextTemplate } from './ui/contextTemplate'
import path from 'path'
import { IPCEventNames } from './types/ipc'
import { getSettings, updateSetting, getSetting } from './tools/settings'

import './tools/auto-update'

let mainWindow: BrowserWindow
let settingsWindow: BrowserWindow | null = null
let tray: Tray

const WINDOW_WIDTH = 375
const WINDOW_HEIGHT = 667

if (process.platform === 'darwin') {
  app.name = 'Minimal YouTube Music Player'
  app.setName('Minimal YouTube Music Player')
}

app.on('ready', () => {
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, '../assets', 'icon.png')
    const image = nativeImage.createFromPath(iconPath)
    app.dock.setIcon(image)
  }

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    transparent: true,
    frame: false,
    resizable: false,
    show: false,
    icon: path.join(__dirname, '../assets', PlatformResolver.isWindows() ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, './client/index.js'),
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

  // Block ads and trackers
  const filter = {
    urls: [
      '*://*.doubleclick.net/*',
      '*://*.google-analytics.com/*',
      '*://*.googlesyndication.com/*',
      '*://*.googleadservices.com/*',
      '*://*.googletagservices.com/*'
    ]
  }

  mainWindow.webContents.session.webRequest.onBeforeRequest(
    filter,
    (details, callback) => {
      callback({ cancel: true })
    }
  )

  mainWindow.loadURL('https://music.youtube.com')

  // if (process.env.NODE_ENV !== 'production') {
  //   mainWindow.webContents.openDevTools()
  // }

  tray = new Tray(
    path.join(__dirname, '../assets', getNativeIconName())
  )
  const offset = offsetCalclator.getOffset()

  mainWindow.on('blur', () => {
    mainWindow.hide()
  })

  Menu.setApplicationMenu(Menu.buildFromTemplate(createMenuTemplate(app)))

  tray.setToolTip('Minimal YouTube Music Player')

  const updateWindowPosition = () => {
    if (PlatformResolver.isWindows()) {
      const trayBounds = tray.getBounds()
      const display = screen.getDisplayMatching(trayBounds)
      const workArea = display.workArea
      const displayBounds = display.bounds
      
      const trayPosition = getTrayPosition({ trayBounds, displayBounds })
      
      // Default position (Bottom-Right of work area)
      let x = workArea.x + workArea.width - WINDOW_WIDTH
      let y = workArea.y + workArea.height - WINDOW_HEIGHT

      const windowPositionSetting = getSetting('windowPosition')

      if (windowPositionSetting && windowPositionSetting !== 'auto') {
        switch (windowPositionSetting) {
          case 'top-left':
            x = workArea.x
            y = workArea.y
            break
          case 'top-right':
            x = workArea.x + workArea.width - WINDOW_WIDTH
            y = workArea.y
            break
          case 'bottom-left':
            x = workArea.x
            y = workArea.y + workArea.height - WINDOW_HEIGHT
            break
          case 'bottom-right':
            x = workArea.x + workArea.width - WINDOW_WIDTH
            y = workArea.y + workArea.height - WINDOW_HEIGHT
            break
        }
      } else {
        switch (trayPosition) {
          case TrayPosition.Left:
            // Taskbar on Left: Window at Bottom-Left (near taskbar)
            x = workArea.x
            y = workArea.y + workArea.height - WINDOW_HEIGHT
            break
          
          case TrayPosition.Right:
            // Taskbar on Right: Window at Bottom-Right (near taskbar)
            x = workArea.x + workArea.width - WINDOW_WIDTH
            y = workArea.y + workArea.height - WINDOW_HEIGHT
            break
            
          case TrayPosition.Top:
            // Taskbar on Top: Window at Top-Right
            x = workArea.x + workArea.width - WINDOW_WIDTH
            y = workArea.y
            break
            
          case TrayPosition.Bottom:
            // Taskbar on Bottom: Window at Bottom-Right
            x = workArea.x + workArea.width - WINDOW_WIDTH
            y = workArea.y + workArea.height - WINDOW_HEIGHT
            break
        }
      }
      
      mainWindow.setSize(WINDOW_WIDTH, WINDOW_HEIGHT)
      mainWindow.setPosition(Math.round(x), Math.round(y))
    } else {
      const trayBounds = tray.getBounds()
      const display = screen.getDisplayMatching(trayBounds)
      const displayBounds = display.bounds
      const trayPosition = getTrayPosition({ trayBounds, displayBounds })

      let x = trayBounds.x + trayBounds.width / 2 - WINDOW_WIDTH / 2
      let y = trayBounds.y + trayBounds.height + offset.y

      if (trayPosition === TrayPosition.Top) {
        x = trayBounds.x + trayBounds.width / 2 - WINDOW_WIDTH / 2
        y = trayBounds.y + trayBounds.height + offset.y
      }

      // Ensure the window is within display bounds
      if (x < displayBounds.x) x = displayBounds.x
      if (x + WINDOW_WIDTH > displayBounds.x + displayBounds.width) {
        x = displayBounds.x + displayBounds.width - WINDOW_WIDTH
      }

      mainWindow.setPosition(Math.round(x), Math.round(y))
    }
  }

  // Initial position
  updateWindowPosition()

  tray.on('click', () => {
    if (PlatformResolver.isMacOS()) {
      mainWindow.setPosition(
        tray.getBounds().x - 375 + offset.x,
        tray.getBounds().y + tray.getBounds().height + offset.y
      )
    } else {
      updateWindowPosition()
    }
    mainWindow.show()
  })

  tray.on('right-click', () => {
    tray.popUpContextMenu(Menu.buildFromTemplate(createContextTemplate(app)))
  })

  globalShortcut.register('MediaPlayPause', () => {
    mainWindow.webContents.send(IPCEventNames.PLAY_PAUSE)
  })

  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow.webContents.send(IPCEventNames.PREV)
  })

  globalShortcut.register('MediaNextTrack', () => {
    mainWindow.webContents.send(IPCEventNames.NEXT)
  })

  // Settings Window Handlers
  // @ts-ignore
  app.on('open-settings', () => {
    if (settingsWindow) {
      settingsWindow.focus()
      return
    }

    settingsWindow = new BrowserWindow({
      width: 400,
      height: 500,
      title: 'Settings',
      resizable: false,
      minimizable: false,
      maximizable: false,
      autoHideMenuBar: true,
      icon: path.join(__dirname, '../assets', PlatformResolver.isWindows() ? 'icon.ico' : 'icon.png'),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false // For simple settings window
      }
    })

    settingsWindow.loadFile(path.join(__dirname, './settings/index.html'))

    settingsWindow.on('closed', () => {
      settingsWindow = null
    })
  })

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
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
