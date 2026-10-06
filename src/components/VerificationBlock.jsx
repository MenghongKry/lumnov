import Icon from './Icons'
import { fmtDate } from '../lib/format'
import { PUBLIC_HOST } from '../lib/config'

// The trust panel at the top of every listing. Shows exactly what was checked —
// never "100% safe".
export default function VerificationBlock({ l }) {
  if (l.status !== 'verified') {
    return (
      <div className="not-verified">
        <div className="row" style={{ fontWeight: 800, fontSize: 17 }}><Icon name="info" /> Not verified yet</div>
        <p className="small" style={{ margin: '6px 0 0' }}>This listing is waiting for the Lumnov check. Renters can't see it until it's verified.</p>
      </div>
    )
  }
  const expired = l.expires_at && new Date(l.expires_at) < new Date()
  const items = [
    { ok: l.docs_checked, title: 'Landlord identity checked', text: `${l.landlord?.full_name || 'Landlord'}'s ID matches the person renting this room.` },
    { ok: l.docs_checked, title: 'Right to rent checked', text: 'We saw a title, lease or utility bill for this address.' },
    { ok: l.room_checked, title: l.room_checked ? 'Room visited by Lumnov' : 'Room visit scheduled', text: l.room_checked ? 'Our team visited and took the photos below.' : 'Our team will visit before your room check.' },
    { ok: l.tenant_confirmed_count > 0, title: 'Confirmed by renters', text: l.tenant_confirmed_count > 0 ? `${l.tenant_confirmed_count} renter${l.tenant_confirmed_count > 1 ? 's' : ''} said the room matched the listing.` : 'No renter has confirmed yet.' },
  ]
  return (
    <section className="verify-box" aria-label="Verification">
      <div className="verify-head">
        <div className="big"><Icon name="shield" size={22} /> Verified by Lumnov</div>
        <div className="sub">
          {expired ? 'Verification expired — ask the landlord to re-verify.' : `Checked ${fmtDate(l.verified_at)} · valid until ${fmtDate(l.expires_at)}`}
        </div>
      </div>
      <ul className="verify-list">
        {items.map((it) => (
          <li key={it.title}>
            <div className={`st ${it.ok ? 'ok' : 'wait'}`}><Icon name={it.ok ? 'check' : 'clock'} size={15} stroke={3} /></div>
            <div><b>{it.title}</b><span>{it.text}</span></div>
          </li>
        ))}
      </ul>
      <div className="verify-foot">
        <b>Stay safe:</b> only trust pages on <b>{PUBLIC_HOST}</b> with code <b>{l.code}</b>. Booking a room check is free — never pay before you've seen the room.
      </div>
    </section>
  )
}
