jest.mock('electron', () => ({
  ipcMain: { on: jest.fn() },
  Notification: jest.fn(),
  Tray: jest.fn()
}))
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({ get: jest.fn(), set: jest.fn(), store: {} }))
})

import { formatTooltip, truncate, shouldNotify } from '../../src/main-process/nowPlaying'

describe('formatTooltip', () => {
  it('joins title and artist with em dash', () => {
    expect(formatTooltip('Song', 'Artist')).toBe('Song — Artist')
  })

  it('returns title alone when artist is empty', () => {
    expect(formatTooltip('Song', '')).toBe('Song')
  })
})

describe('truncate', () => {
  it('keeps short strings untouched', () => {
    expect(truncate('Short title')).toBe('Short title')
  })

  it('truncates long strings with ellipsis at default 30', () => {
    const long = 'x'.repeat(40)
    const result = truncate(long)
    expect(result.length).toBe(30)
    expect(result.endsWith('…')).toBe(true)
  })

  it('respects a custom max', () => {
    expect(truncate('abcdef', 4)).toBe('abc…')
  })
})

describe('shouldNotify', () => {
  it('is false for the first track after launch', () => {
    expect(shouldNotify(null, 'Song A')).toBe(false)
  })

  it('is false when the title has not changed', () => {
    expect(shouldNotify('Song A', 'Song A')).toBe(false)
  })

  it('is true on a real track change', () => {
    expect(shouldNotify('Song A', 'Song B')).toBe(true)
  })
})
