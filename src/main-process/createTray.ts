import { Tray, nativeTheme } from 'electron'
import path from 'path'
import * as PlatformResolver from '../tools/platformResolver'
import { getNativeIconName } from '../tools/getNativeIconName'

interface TrayHandlers {
  onClick: () => void
  onRightClick: () => void
}

export function createTray({ onClick, onRightClick }: TrayHandlers) {
  const tray = new Tray(path.join(__dirname, '../../assets', getNativeIconName()))

  // macOS: swap tray icon live when the system theme changes
  nativeTheme.on('updated', () => {
    if (PlatformResolver.isMacOS()) {
      tray.setImage(path.join(__dirname, '../../assets', getNativeIconName()))
    }
  })

  tray.setToolTip('YouMusicFlow')

  tray.on('click', onClick)
  tray.on('right-click', onRightClick)

  return tray
}
