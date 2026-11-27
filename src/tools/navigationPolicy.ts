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

// Google also signs in through country-specific account hosts: after a password it passes
// the session through `accounts.google.tn`, `accounts.google.co.uk`, `accounts.google.com.ua`
// and the like, depending on the network's country. The shape is recognised instead of a
// list: `accounts.google.` and a country suffix of one or two labels.
const COUNTRY_ACCOUNT_HOST =
  /^accounts\.google\.(?:[a-z]{2}|(?:com|co)\.[a-z]{2})$/

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
  return (
    ALLOWED_HOSTS.has(parsed.hostname) ||
    COUNTRY_ACCOUNT_HOST.test(parsed.hostname)
  )
}
