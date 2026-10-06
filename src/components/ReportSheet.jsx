import { useState } from 'react'
import Sheet from './Sheet'
import { api } from '../lib/api'
import { REPORT_REASONS } from '../lib/config'

export default function ReportSheet({ listing, onClose }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    await api.reportListing(listing.id, reason, details)
    setBusy(false); setDone(true)
  }

  return (
    <Sheet onClose={onClose} label="Report this listing">
      {done ? (
        <div className="center" style={{ padding: '10px 0' }}>
          <h3>Thank you</h3>
          <p className="muted">Our team will check {listing.code} within 24 hours. If you already lost money, please also contact the police.</p>
          <button className="btn block" onClick={onClose}>Close</button>
        </div>
      ) : (
        <>
          <h3>Report this listing</h3>
          <p className="muted small" style={{ marginTop: 0 }}>Something wrong with {listing.code}? Tell us — reports are private.</p>
          <div className="stack">
            {REPORT_REASONS.map((r) => (
              <label key={r} className="row" style={{ background: reason === r ? 'var(--brand-soft)' : '#faf7f5', borderRadius: 10, padding: '11px 12px', cursor: 'pointer', marginTop: 8 }}>
                <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} style={{ accentColor: 'var(--brand)' }} />
                <span className="small" style={{ fontWeight: 600 }}>{r}</span>
              </label>
            ))}
          </div>
          <label className="field" style={{ marginTop: 14 }}>
            <span>Details (optional)</span>
            <textarea className="input" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What happened?" />
          </label>
          <button className="btn block" disabled={!reason || busy} onClick={submit}>{busy ? 'Sending…' : 'Send report'}</button>
        </>
      )}
    </Sheet>
  )
}
