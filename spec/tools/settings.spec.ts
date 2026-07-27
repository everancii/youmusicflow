jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    store: {}
  }))
})

import { isValidSetting } from '../../src/tools/settings'

describe('tools/settings.ts', () => {
  describe('isValidSetting()', () => {
    test.each(['startOnLogin', 'alwaysOnTop', 'hideDockIcon', 'enableMediaKeys'])(
      'accepts boolean values for %s',
      key => {
        expect(isValidSetting(key, true)).toBe(true)
        expect(isValidSetting(key, false)).toBe(true)
      }
    )

    test.each(['auto', 'top-left', 'top-right', 'bottom-left', 'bottom-right'])(
      'accepts windowPosition %s',
      position => {
        expect(isValidSetting('windowPosition', position)).toBe(true)
      }
    )

    test('rejects unknown keys', () => {
      expect(isValidSetting('evilKey', true)).toBe(false)
      expect(isValidSetting(undefined, true)).toBe(false)
    })

    test('rejects invalid windowPosition values', () => {
      expect(isValidSetting('windowPosition', 'diagonal')).toBe(false)
      expect(isValidSetting('windowPosition', true)).toBe(false)
    })

    test('rejects non-boolean values for boolean keys', () => {
      expect(isValidSetting('alwaysOnTop', 'yes')).toBe(false)
      expect(isValidSetting('enableMediaKeys', 1)).toBe(false)
      expect(isValidSetting('startOnLogin', undefined)).toBe(false)
    })
  })
})
