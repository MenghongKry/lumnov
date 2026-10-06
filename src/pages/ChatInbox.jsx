import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ago } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { Avatar, Empty, Spinner, TopBar } from '../components/Bits'

export default function ChatInbox() {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  useEffect(() => { api.myConversations().then(setRows) }, [])

  return (
    <>
      <TopBar title="Chat" />
      <main className="page flush">
        {!rows ? <Spinner /> : rows.length === 0 ? (
          <Empty icon="chat" title="No messages yet">
            {user.role === 'landlord' ? 'Renters who message you about your rooms will appear here.' : 'Open a verified room and tap Chat to ask the landlord a question.'}
          </Empty>
        ) : (
          <div className="chat-list">
            {rows.map((c) => {
              const other = user.id === c.tenant_id ? c.landlord : c.tenant
              const mine = c.last_message?.sender_id === user.id
              return (
                <Link key={c.id} to={`/chat/${c.id}`}>
                  <Avatar name={other?.full_name} />
                  <div className="grow">
                    <div className="row between">
                      <b>{other?.full_name}</b>
                      <span className="tiny">{ago(c.last_message?.created_at || c.created_at)}</span>
                    </div>
                    <div className="tiny" style={{ color: 'var(--brand-dark)', fontWeight: 600 }}>{c.listing?.title} · {c.listing?.code}</div>
                    <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.last_message ? `${mine ? 'You: ' : ''}${c.last_message.body}` : 'No messages yet'}
                    </div>
                  </div>
                  <img className="thumb" style={{ width: 46, height: 46 }} src={c.listing?.photos?.[0]} alt="" />
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
