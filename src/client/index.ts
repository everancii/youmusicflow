import { contextBridge, ipcRenderer } from 'electron'
import * as Controls from './controls'
import { IPCEventNames } from '../types/ipc'

// Retry bridge for the offline fallback page (preload persists across navigations)
contextBridge.exposeInMainWorld('appShell', {
  retry: () => ipcRenderer.send('retry-load')
})

const style = document.createElement('style')
style.textContent = `
  *::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
  }
  html, body {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
`
const injectStyle = () => {
  if (document.documentElement) {
    document.documentElement.appendChild(style)
  }
}

injectStyle()
document.addEventListener('DOMContentLoaded', injectStyle)

ipcRenderer.on('play/pause', () => {
  Controls.playPause(document)
})

ipcRenderer.on('prev', () => {
  Controls.prevTrack(document)
})

ipcRenderer.on('next', () => {
  Controls.nextTrack(document)
})

// Poll mediaSession metadata and report track changes to main
let lastTrack = ''
setInterval(() => {
  const metadata = navigator.mediaSession && navigator.mediaSession.metadata
  if (!metadata) return
  const title = metadata.title || ''
  const artist = metadata.artist || ''
  if (!title) return
  const key = title + ' — ' + artist
  if (key === lastTrack) return
  lastTrack = key
  ipcRenderer.send(IPCEventNames.NOW_PLAYING, { title, artist })
}, 1000)
