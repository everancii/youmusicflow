import { BrowserWindow, Tray, screen } from 'electron'
import * as PlatformResolver from '../tools/platformResolver'
import { getTrayPosition, TrayPosition } from '../tools/getTrayPosition'
import { getSetting } from '../tools/settings'

export const WINDOW_WIDTH = 375
export const WINDOW_HEIGHT = 667

interface PositionContext {
  mainWindow: BrowserWindow
  tray: Tray
  offset: { x: number; y: number }
}

export function updateWindowPosition({ mainWindow, tray, offset }: PositionContext) {
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

export function positionOnTrayClickMac({ mainWindow, tray, offset }: PositionContext) {
  mainWindow.setPosition(
    tray.getBounds().x - WINDOW_WIDTH + offset.x,
    tray.getBounds().y + tray.getBounds().height + offset.y
  )
}
