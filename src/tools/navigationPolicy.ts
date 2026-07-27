// Hosts allowed to load inside the app window. Everything else opens externally.
// Google auth flows navigate in-window — blocking them would break login.
const ALLOWED_HOSTS = new Set([
  'music.youtube.com',
  'accounts.google.com',
  'accounts.youtube.com',
  'consent.youtube.com',
  'consent.google.com',
  'www.youtube.com',
  'myaccount.google.com'
])

export const isAllowedNavigation = (url: string): boolean => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false
  }
  return ALLOWED_HOSTS.has(parsed.hostname)
}
