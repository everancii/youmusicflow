import { ipcMain, Notification, Tray } from 'electron'
import * as PlatformResolver from '../tools/platformResolver'
import { getSetting } from '../tools/settings'
import { IPCEventNames } from '../types/ipc'

export const formatTooltip = (title: string, artist: string): string => {
  return artist ? `${title} — ${artist}` : title
}

export const truncate = (text: string, max = 30): string => {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// Only notify on a real track *change* — never for the first track after launch
export const shouldNotify = (
  prevTitle: string | null,
  nextTitle: string
): boolean => {
  return prevTitle !== null && prevTitle !== nextTitle
}

export function registerNowPlaying({ tray }: { tray: Tray }) {
  let previousTitle: string | null = null

  ipcMain.on(IPCEventNames.NOW_PLAYING, (event, payload) => {
    // Renderer input is untrusted
    if (!payload || typeof payload.title !== 'string') return
    const title: string = payload.title
    const artist: string =
      typeof payload.artist === 'string' ? payload.artist : ''

    tray.setToolTip(formatTooltip(title, artist))
    if (PlatformResolver.isMacOS()) {
      tray.setTitle(truncate(title))
    }

    if (shouldNotify(previousTitle, title) && getSetting('showNotifications')) {
      new Notification({ title, body: artist, silent: true }).show()
    }
    previousTitle = title
  })
}
