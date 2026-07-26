import * as controls from '../../src/client/controls'
import { JSDOM } from 'jsdom'

describe('client/controls.ts', () => {
  describe('playPause()' , () => {
    test('true', () => {
      const DOM = new JSDOM(`<html><body><button id="play-pause-button"></button></body></html>`)
      expect(controls.playPause(DOM.window.document)).toBe(true)
    })
    test('false', () => {
      const DOM = new JSDOM(`<html><body></body></html>`)
      expect(controls.playPause(DOM.window.document)).toBe(false)
    })
  })

  describe('prevTrack', () => {
    test('clicks player-bar previous button when present', () => {
      const DOM = new JSDOM(`<html><body>
        <ytmusic-player-bar>
          <button class="previous-button"></button>
          <button class="next-button"></button>
        </ytmusic-player-bar>
        <ytmusic-player-queue-item></ytmusic-player-queue-item>
        <ytmusic-player-queue-item selected></ytmusic-player-queue-item>
      </body></html>`)
      const barButton = DOM.window.document.querySelector('ytmusic-player-bar .previous-button') as HTMLElement
      const clicked = jest.fn()
      barButton.addEventListener('click', clicked)
      expect(controls.prevTrack(DOM.window.document)).toBe(true)
      expect(clicked).toHaveBeenCalledTimes(1)
    })
    test('falls back to queue walk when player bar is absent', () => {
      const DOM = new JSDOM(`<html><body>
        <ytmusic-player-queue-item><ytmusic-play-button-renderer></ytmusic-play-button-renderer></ytmusic-player-queue-item>
        <ytmusic-player-queue-item selected></ytmusic-player-queue-item>
      </body></html>`)
      const queueButton = DOM.window.document.querySelector('ytmusic-play-button-renderer') as HTMLElement
      const clicked = jest.fn()
      queueButton.addEventListener('click', clicked)
      expect(controls.prevTrack(DOM.window.document)).toBe(true)
      expect(clicked).toHaveBeenCalledTimes(1)
    })
    test('false when neither player bar nor queue present', () => {
      const DOM = new JSDOM(`<html><body></body></html>`)
      expect(controls.prevTrack(DOM.window.document)).toBe(false)
    })
  })

  describe('nextTrack', () => {
    test('clicks player-bar next button when present', () => {
      const DOM = new JSDOM(`<html><body>
        <ytmusic-player-bar>
          <button class="previous-button"></button>
          <button class="next-button"></button>
        </ytmusic-player-bar>
      </body></html>`)
      const barButton = DOM.window.document.querySelector('ytmusic-player-bar .next-button') as HTMLElement
      const clicked = jest.fn()
      barButton.addEventListener('click', clicked)
      expect(controls.nextTrack(DOM.window.document)).toBe(true)
      expect(clicked).toHaveBeenCalledTimes(1)
    })
    test('falls back to queue walk when player bar is absent', () => {
      const DOM = new JSDOM(`<html><body>
        <ytmusic-player-queue-item selected></ytmusic-player-queue-item>
        <ytmusic-player-queue-item><ytmusic-play-button-renderer></ytmusic-play-button-renderer></ytmusic-player-queue-item>
      </body></html>`)
      const queueButton = DOM.window.document.querySelector('ytmusic-play-button-renderer') as HTMLElement
      const clicked = jest.fn()
      queueButton.addEventListener('click', clicked)
      expect(controls.nextTrack(DOM.window.document)).toBe(true)
      expect(clicked).toHaveBeenCalledTimes(1)
    })
    test('false when neither player bar nor queue present', () => {
      const DOM = new JSDOM(`<html><body></body></html>`)
      expect(controls.nextTrack(DOM.window.document)).toBe(false)
    })
  })
})
