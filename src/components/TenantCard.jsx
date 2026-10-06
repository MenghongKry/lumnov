import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { fmtDate } from '../lib/format'
import { Avatar } from './Bits'
import Icon from './Icons'
import Sheet from './Sheet'

// "Tenant details card" — what a landlord sees about a renter before accepting.
export function TenantCardBody({ tenantId }) {
  const [t, setT] = useState(null)
  useEffect(() => { api.getTenantCard(tenantId).then(setT) }, [tenantId])
  if (!t) return <p className="muted small">Loading…</p>
  return (
    <div>
      <div className="row">
        <Avatar name={t.full_name} />
        <div className="grow">
          <b>{t.full_name}</b>
          <div className="tiny">On Lumnov since {fmtDate(t.created_at)}</div>
        </div>
        {t.id_status === 'verified'
          ? <span className="chip ok"><Icon name="check" size={12} stroke={3} /> ID verified</span>
          : <span className="chip warn">ID not verified</span>}
      </div>
      <dl className="kv" style={{ marginTop: 14 }}>
        <dt>Phone</dt><dd>{t.phone ? <a href={`tel:${t.phone.replace(/\s/g, '')}`}>{t.phone}</a> : '—'}</dd>
        <dt>Room checks done</dt><dd>{t.visits}</dd>
        <dt>No-shows</dt><dd style={{ color: t.noShows ? 'var(--bad)' : undefined }}>{t.noShows}</dd>
      </dl>
    </div>
  )
}

export default function TenantCardSheet({ tenantId, onClose }) {
  return (
    <Sheet onClose={onClose} label="Tenant details">
      <h3>Renter details</h3>
      <TenantCardBody tenantId={tenantId} />
      <button className="btn secondary block" style={{ marginTop: 18 }} onClick={onClose}>Close</button>
    </Sheet>
  )
}
