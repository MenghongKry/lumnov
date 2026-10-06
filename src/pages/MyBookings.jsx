import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { BOOKING_STATUS, fmtSlot } from '../lib/format'
import { Empty, Spinner, StatusChip, TopBar } from '../components/Bits'

export default function MyBookings() {
  const [rows, setRows] = useState(null)
  useEffect(() => { api.myBookings().then(setRows) }, [])

  const upcoming = rows?.filter((b) => ['requested', 'confirmed'].includes(b.status) && new Date(b.slot) > Date.now() - 3 * 3600000) || []
  const past = rows?.filter((b) => !upcoming.includes(b)) || []

  return (
    <>
      <TopBar title="My bookings" />
      <main className="page">
        {!rows ? <Spinner /> : rows.length === 0 ? (
          <Empty icon="calendar" title="No room checks yet">
            Find a verified room and book a free check.<br />
            <Link to="/" className="btn sm" style={{ marginTop: 14 }}>Browse rooms</Link>
          </Empty>
        ) : (
          <>
            <div className="section-title" style={{ marginTop: 4 }}>Upcoming</div>
            {upcoming.length ? upcoming.map((b) => <BookingRow key={b.id} b={b} />) : <p className="muted small">Nothing upcoming.</p>}
            {past.length > 0 && <>
              <div className="section-title">Past</div>
              {past.map((b) => <BookingRow key={b.id} b={b} />)}
            </>}
          </>
        )}
      </main>
    </>
  )
}

function BookingRow({ b }) {
  return (
    <Link to={`/bookings/${b.id}`} className="card list-row" style={{ display: 'flex' }}>
      <img className="thumb" src={b.listing?.photos?.[0]} alt="" />
      <div className="grow">
        <div style={{ fontWeight: 700 }}>{b.listing?.title}</div>
        <div className="tiny">{fmtSlot(b.slot)} · {b.listing?.area}</div>
        <div style={{ marginTop: 6 }}><StatusChip map={BOOKING_STATUS} status={b.status} /></div>
      </div>
    </Link>
  )
}
