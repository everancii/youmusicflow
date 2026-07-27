import { BrowserWindow, globalShortcut } from 'electron'
import { IPCEventNames } from '../types/ipc'

export function registerMediaKeys(mainWindow: BrowserWindow) {
  if (globalShortcut.isRegistered('MediaPlayPause')) return

  globalShortcut.register('MediaPlayPause', () => {
    mainWindow.webContents.send(IPCEventNames.PLAY_PAUSE)
  })

  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow.webContents.send(IPCEventNames.PREV)
  })

  globalShortcut.register('MediaNextTrack', () => {
    mainWindow.webContents.send(IPCEventNames.NEXT)
  })
}

export function unregisterMediaKeys() {
  globalShortcut.unregister('MediaPlayPause')
  globalShortcut.unregister('MediaPreviousTrack')
  globalShortcut.unregister('MediaNextTrack')
}
