export const money = (n) => `$${Number(n || 0).toLocaleString('en-US')}`

export const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtShort = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
export const fmtSlot = (d) => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function ago(d) {
  const s = Math.round((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'

export const BOOKING_STATUS = {
  requested: { label: 'Waiting for landlord', tone: 'warn' },
  confirmed: { label: 'Confirmed', tone: 'ok' },
  declined: { label: 'Declined', tone: 'bad' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  visited: { label: 'Visited', tone: 'ok' },
  no_show: { label: 'No-show', tone: 'bad' },
}

export const LISTING_STATUS = {
  draft: { label: 'Draft', tone: 'muted' },
  pending: { label: 'Waiting for Lumnov check', tone: 'warn' },
  verified: { label: 'Verified', tone: 'ok' },
  rejected: { label: 'Not approved', tone: 'bad' },
  expired: { label: 'Verification expired', tone: 'bad' },
}
