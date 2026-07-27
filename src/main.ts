import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import { createMenuTemplate } from './ui/menuTemplate'
import * as offsetCalclator from './tools/offsetCalclator'
import * as PlatformResolver from './tools/platformResolver'
import { createContextTemplate } from './ui/contextTemplate'
import path from 'path'
import { getSetting } from './tools/settings'
import { createMainWindow } from './main-process/createMainWindow'
import { createTray } from './main-process/createTray'
import { createSettingsWindow } from './main-process/createSettingsWindow'
import { registerIpc } from './main-process/registerIpc'
import { registerNowPlaying } from './main-process/nowPlaying'
import {
  registerMediaKeys,
  unregisterMediaKeys
} from './main-process/registerShortcuts'
import {
  updateWindowPosition as positionMainWindow,
  positionOnTrayClickMac
} from './main-process/positionWindow'

// Auto-update removed: Microsoft Store handles updates for appx distribution

let mainWindow: BrowserWindow

if (process.platform === 'darwin') {
  app.name = 'YouMusicFlow'
  app.setName('YouMusicFlow')
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.on('ready', () => {
  if (!gotTheLock) return

  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, '../assets', 'icon.png')
    const image = nativeImage.createFromPath(iconPath)
    if (!image.isEmpty()) {
      app.dock.setIcon(image)
    }
  }

  const { mainWindow: window, updateDockVisibility } = createMainWindow()
  mainWindow = window

  const offset = offsetCalclator.getOffset()

  Menu.setApplicationMenu(Menu.buildFromTemplate(createMenuTemplate(app)))

  let tray: Tray
  const updateWindowPosition = () =>
    positionMainWindow({ mainWindow, tray, offset })

  tray = createTray({
    onClick: () => {
      if (PlatformResolver.isMacOS()) {
        positionOnTrayClickMac({ mainWindow, tray, offset })
      } else {
        updateWindowPosition()
      }
      mainWindow.show()
    },
    onRightClick: () => {
      tray.popUpContextMenu(Menu.buildFromTemplate(createContextTemplate(app)))
    }
  })

  // Initial position
  updateWindowPosition()

  registerNowPlaying({ tray })

  if (getSetting('enableMediaKeys') !== false) {
    registerMediaKeys(mainWindow)
  }

  createSettingsWindow(app)

  registerIpc({
    app,
    mainWindow,
    updateDockVisibility,
    updateWindowPosition,
    registerMediaKeys: () => registerMediaKeys(mainWindow),
    unregisterMediaKeys
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
