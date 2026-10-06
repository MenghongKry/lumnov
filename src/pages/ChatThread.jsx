import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtTime, money } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { Empty, Spinner, TopBar } from '../components/Bits'
import TenantCardSheet from '../components/TenantCard'
import Icon from '../components/Icons'

const QUICK = ['Is the room still available?', 'Can I book a room check this week?', 'Are water and electricity included?']

export default function ChatThread() {
  const { id } = useParams()
  const { user } = useAuth()
  const [conv, setConv] = useState(undefined)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [card, setCard] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    let alive = true
    api.getConversation(id).then((c) => alive && setConv(c))
    api.listMessages(id).then((m) => alive && setMsgs(m))
    const add = (m) => setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    const off = api.subscribeMessages(id, add)
    return () => { alive = false; off && off() }
  }, [id])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

  if (conv === undefined) return <><TopBar title="Chat" back="/chat" /><Spinner /></>
  if (conv === null) return <><TopBar title="Chat" back="/chat" /><Empty title="Conversation not found" /></>

  const isTenant = user.id === conv.tenant_id
  const other = isTenant ? conv.landlord : conv.tenant

  const send = async (body) => {
    const b = (body ?? text).trim()
    if (!b) return
    setText('')
    const m = await api.sendMessage(id, b)
    setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
  }

  return (
    <>
      <TopBar title={other?.full_name || 'Chat'} back="/chat" right={!isTenant && (
        <button className="icon-btn" aria-label="Renter details" onClick={() => setCard(true)}><Icon name="id" /></button>
      )} />
      <div className="chat-ctx">
        <Link to={`/r/${conv.listing?.code}`} className="row grow" style={{ color: 'inherit' }}>
          <img className="thumb" style={{ width: 44, height: 44 }} src={conv.listing?.photos?.[0]} alt="" />
          <div className="grow">
            <div style={{ fontWeight: 700, fontSize: 14 }}>{conv.listing?.title}</div>
            <div className="tiny">{money(conv.listing?.price_usd)}/month · {conv.listing?.code}</div>
          </div>
        </Link>
        {isTenant && <Link to={`/r/${conv.listing?.code}/book`} className="btn sm">Book check</Link>}
      </div>

      <div className="thread">
        <div className="safety-tip">Lumnov tip: never send a deposit before you've seen the room in person.</div>
        {msgs.map((m) => (
          <div key={m.id} className={`bubble${m.sender_id === user.id ? ' me' : ''}`}>
            {m.body}
            <time>{fmtTime(m.created_at)}</time>
          </div>
        ))}
        {msgs.length === 0 && isTenant && (
          <div className="stack" style={{ marginTop: 12 }}>
            <p className="tiny center">Start with a quick question:</p>
            {QUICK.map((q) => <button key={q} className="pill" style={{ alignSelf: 'center' }} onClick={() => send(q)}>{q}</button>)}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send() }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" aria-label="Message" />
        <button className="btn" style={{ borderRadius: 999, padding: '10px 18px' }} disabled={!text.trim()}>Send</button>
      </form>

      {card && <TenantCardSheet tenantId={conv.tenant_id} onClose={() => setCard(false)} />}
    </>
  )
}
