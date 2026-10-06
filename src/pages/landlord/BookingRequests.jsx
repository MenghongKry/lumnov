import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { BOOKING_STATUS, ago, fmtSlot } from '../../lib/format'
import { Avatar, Empty, Spinner, StatusChip, TopBar } from '../../components/Bits'
import TenantCardSheet from '../../components/TenantCard'
import Icon from '../../components/Icons'

const TABS = [
  ['new', 'New', (b) => b.status === 'requested'],
  ['upcoming', 'Confirmed', (b) => b.status === 'confirmed'],
  ['past', 'Past', (b) => !['requested', 'confirmed'].includes(b.status)],
]

export default function BookingRequests() {
  const [rows, setRows] = useState(null)
  const [tab, setTab] = useState('new')
  const [card, setCard] = useState(null)
  const [busy, setBusy] = useState('')

  const load = () => api.landlordRequests().then(setRows)
  useEffect(() => { load() }, [])

  const act = async (b, status) => {
    setBusy(b.id); await api.updateBooking(b.id, { status }); await load(); setBusy('')
  }
  const filter = TABS.find((t) => t[0] === tab)[2]
  const list = rows?.filter(filter) || []

  return (
    <>
      <TopBar title="Booking requests" />
      <main className="page">
        <div className="seg" style={{ marginBottom: 16 }}>
          {TABS.map(([k, label, fn]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {label}{rows && k !== 'past' ? ` (${rows.filter(fn).length})` : ''}
            </button>
          ))}
        </div>

        {!rows ? <Spinner /> : list.length === 0 ? (
          <Empty icon="inbox" title={tab === 'new' ? 'No new requests' : 'Nothing here yet'}>
            Requests appear when renters book a free room check from your verified listing.
          </Empty>
        ) : list.map((b) => (
          <div key={b.id} className="card" style={{ marginBottom: 12 }}>
            <div className="row">
              <Avatar name={b.tenant?.full_name} sm />
              <div className="grow">
                <div className="row" style={{ gap: 6 }}>
                  <b>{b.tenant?.full_name}</b>
                  {b.tenant?.id_status === 'verified' && <span className="chip ok" style={{ padding: '2px 7px' }}><Icon name="check" size={11} stroke={3} /> ID</span>}
                </div>
                <div className="tiny">requested {ago(b.created_at)}</div>
              </div>
              <button className="btn ghost sm" onClick={() => setCard(b.tenant_id)}>Details</button>
            </div>

            <Link to={`/bookings/${b.id}`} style={{ color: 'inherit', display: 'block', marginTop: 12 }}>
              <div className="row" style={{ background: '#faf7f5', borderRadius: 10, padding: 10 }}>
                <Icon name="calendar" size={20} style={{ color: 'var(--brand)' }} />
                <div className="grow">
                  <b>{fmtSlot(b.slot)}</b>
                  <div className="tiny">{b.listing?.title} · {b.listing?.code}</div>
                </div>
                {tab === 'past' && <StatusChip map={BOOKING_STATUS} status={b.status} />}
              </div>
              {b.note && <p className="small muted" style={{ margin: '10px 0 0' }}>“{b.note}”</p>}
            </Link>

            {b.status === 'requested' && (
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn danger sm grow" disabled={busy === b.id} onClick={() => act(b, 'declined')}>Decline</button>
                <button className="btn ok sm grow" disabled={busy === b.id} onClick={() => act(b, 'confirmed')}>Accept time</button>
              </div>
            )}
            {b.status === 'confirmed' && (
              <Link to={`/bookings/${b.id}`} className="btn secondary sm block" style={{ marginTop: 12 }}>Open booking</Link>
            )}
          </div>
        ))}
      </main>
      {card && <TenantCardSheet tenantId={card} onClose={() => setCard(null)} />}
    </>
  )
}
