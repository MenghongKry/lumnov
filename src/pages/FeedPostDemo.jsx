import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { listingLink } from '../lib/config'
import { stampedPhotoPng } from '../lib/badge'
import { roomPhoto } from '../lib/placeholders'
import { Avatar } from '../components/Bits'

// Story start for demos: a generic social-media rental feed (not a real site).
// The badged post shows how a renter on a phone reaches Lumnov: tap the link.
export default function FeedPostDemo() {
  const { code } = useParams()
  const [l, setL] = useState(null)
  const [img, setImg] = useState(null)

  useEffect(() => {
    api.getListingByCode(code).then(async (x) => {
      setL(x)
      if (x) setImg(await stampedPhotoPng(x.photos[0], x.code, listingLink(x.code), { verifiedAt: x.verified_at }))
    })
  }, [code])

  return (
    <div className="feed">
      <div className="row between" style={{ padding: '0 14px 10px' }}>
        <b style={{ fontSize: 20 }}>Rooms for rent · Phnom Penh</b>
        <Link to="/" className="tiny">Exit demo</Link>
      </div>

      {/* An ordinary post: no way to check anything */}
      <article className="post">
        <div className="post-head"><Avatar name="Room Rent PP" sm /><div><b>Room Rent PP</b><div className="tiny">2 h · Group post</div></div></div>
        <div className="post-text">Room near RUPP $90!!! Very cheap, many people want. Send $50 deposit by ABA to keep the room today 🙏</div>
        <img src={roomPhoto(10, 1)} alt="Room photo" style={{ width: '100%' }} />
        <div className="post-actions"><span>Like</span><span>Comment</span><span>Share</span></div>
      </article>

      {l && (
        <article className="post">
          <div className="post-head"><Avatar name={l.landlord?.full_name} sm /><div><b>{l.landlord?.full_name}</b><div className="tiny">1 h · Group post</div></div></div>
          <div className="post-text">
            ✅ Verified by Lumnov — {l.code}<br />
            {l.title}, {l.area} · ${l.price_usd}/month<br />
            Check the landlord &amp; room here: <Link to={`/r/${l.code}?src=link`}>{listingLink(l.code).replace(/^https?:\/\//, '')}</Link><br />
            Book a free room check. Never pay before viewing.
          </div>
          <Link to={`/r/${l.code}?src=qr`} aria-label="Open verified listing">
            {img ? <img src={img} alt="Room photo with Verified by Lumnov badge" style={{ width: '100%' }} /> : <div style={{ aspectRatio: '4/3', background: '#ddd' }} />}
          </Link>
          <div className="post-actions"><span>Like</span><span>Comment</span><span>Share</span></div>
        </article>
      )}

      <div className="coach">
        <b>Demo:</b> you're a renter scrolling a rental group. Tap the <b>link in the post</b> — that's how someone on a phone reaches Lumnov (they can't scan a QR on their own screen).
      </div>
    </div>
  )
}
