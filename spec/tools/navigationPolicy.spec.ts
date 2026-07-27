import { isAllowedNavigation } from '../../src/tools/navigationPolicy'

describe('isAllowedNavigation', () => {
  test.each([
    'https://music.youtube.com/watch?v=abc123',
    'https://music.youtube.com/',
    'https://accounts.google.com/signin',
    'https://accounts.youtube.com/accounts/SetSID',
    'https://consent.youtube.com/m',
    'https://consent.google.com/ml',
    'https://www.youtube.com/signin_passive',
    'https://myaccount.google.com/'
  ])('allows %s', url => {
    expect(isAllowedNavigation(url)).toBe(true)
  })

  test.each([
    'https://twitter.com/intent/tweet?url=x',
    'https://www.facebook.com/sharer',
    'https://example.com',
    'https://music.youtube.com.evil.com/phish',
    'https://evilmusic.youtube.com',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'ftp://music.youtube.com',
    'not a url',
    ''
  ])('rejects %s', url => {
    expect(isAllowedNavigation(url)).toBe(false)
  })
})
