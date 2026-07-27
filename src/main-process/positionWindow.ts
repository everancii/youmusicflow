import { BrowserWindow, Tray, screen } from 'electron'
import * as PlatformResolver from '../tools/platformResolver'
import { getTrayPosition, TrayPosition } from '../tools/getTrayPosition'
import { getSetting } from '../tools/settings'

// Creation defaults — positioning uses the live window size (window is resizable)
export const DEFAULT_WINDOW_WIDTH = 375
export const DEFAULT_WINDOW_HEIGHT = 667

interface PositionContext {
  mainWindow: BrowserWindow
  tray: Tray
  offset: { x: number; y: number }
}

export function updateWindowPosition({ mainWindow, tray, offset }: PositionContext) {
  const [windowWidth, windowHeight] = mainWindow.getSize()

  if (PlatformResolver.isWindows()) {
    const trayBounds = tray.getBounds()
    const display = screen.getDisplayMatching(trayBounds)
    const workArea = display.workArea
    const displayBounds = display.bounds

    const trayPosition = getTrayPosition({ trayBounds, displayBounds })

    // Default position (Bottom-Right of work area)
    let x = workArea.x + workArea.width - windowWidth
    let y = workArea.y + workArea.height - windowHeight

    const windowPositionSetting = getSetting('windowPosition')

    if (windowPositionSetting && windowPositionSetting !== 'auto') {
      switch (windowPositionSetting) {
        case 'top-left':
          x = workArea.x
          y = workArea.y
          break
        case 'top-right':
          x = workArea.x + workArea.width - windowWidth
          y = workArea.y
          break
        case 'bottom-left':
          x = workArea.x
          y = workArea.y + workArea.height - windowHeight
          break
        case 'bottom-right':
          x = workArea.x + workArea.width - windowWidth
          y = workArea.y + workArea.height - windowHeight
          break
      }
    } else {
      switch (trayPosition) {
        case TrayPosition.Left:
          // Taskbar on Left: Window at Bottom-Left (near taskbar)
          x = workArea.x
          y = workArea.y + workArea.height - windowHeight
          break

        case TrayPosition.Right:
          // Taskbar on Right: Window at Bottom-Right (near taskbar)
          x = workArea.x + workArea.width - windowWidth
          y = workArea.y + workArea.height - windowHeight
          break

        case TrayPosition.Top:
          // Taskbar on Top: Window at Top-Right
          x = workArea.x + workArea.width - windowWidth
          y = workArea.y
          break

        case TrayPosition.Bottom:
          // Taskbar on Bottom: Window at Bottom-Right
          x = workArea.x + workArea.width - windowWidth
          y = workArea.y + workArea.height - windowHeight
          break
      }
    }

    mainWindow.setPosition(Math.round(x), Math.round(y))
  } else {
    const trayBounds = tray.getBounds()
    const display = screen.getDisplayMatching(trayBounds)
    const displayBounds = display.bounds
    const trayPosition = getTrayPosition({ trayBounds, displayBounds })

    let x = trayBounds.x + trayBounds.width / 2 - windowWidth / 2
    let y = trayBounds.y + trayBounds.height + offset.y

    if (trayPosition === TrayPosition.Top) {
      x = trayBounds.x + trayBounds.width / 2 - windowWidth / 2
      y = trayBounds.y + trayBounds.height + offset.y
    }

    // Ensure the window is within display bounds
    if (x < displayBounds.x) x = displayBounds.x
    if (x + windowWidth > displayBounds.x + displayBounds.width) {
      x = displayBounds.x + displayBounds.width - windowWidth
    }

    mainWindow.setPosition(Math.round(x), Math.round(y))
  }
}

export function positionOnTrayClickMac({ mainWindow, tray, offset }: PositionContext) {
  const [windowWidth] = mainWindow.getSize()
  mainWindow.setPosition(
    tray.getBounds().x - windowWidth + offset.x,
    tray.getBounds().y + tray.getBounds().height + offset.y
  )
}
