import { nativeTheme } from 'electron'
import * as PlatformResolver from './platformResolver'

export function getNativeIconName() {
  if (!PlatformResolver.isMacOS()) {
    return 'icon_dark.png'
  }
  return nativeTheme.shouldUseDarkColors ? 'icon_dark.png' : 'icon_light.png'
}
