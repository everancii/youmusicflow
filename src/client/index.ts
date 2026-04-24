import { ipcRenderer } from 'electron'
import * as Controls from './controls'

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
