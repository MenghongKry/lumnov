// REAL backend: Supabase (Auth + Postgres + Storage + Realtime).
// Every function here mirrors mockApi.js so pages don't care which one runs.
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_DEMO } from './config'

export const supabase = IS_DEMO ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const sb = () => supabase

const PROFILE_COLS = 'id, full_name, phone, fb_profile_url, role, id_status, created_at'
const LISTING_SELECT = `*, landlord:profiles!listings_landlord_id_fkey(${PROFILE_COLS})`
const LISTING_LITE = 'id, code, title, area, address, photos, map_url, price_usd'
const BOOKING_SELECT = `*, listing:listings(${LISTING_LITE}),
  tenant:profiles!bookings_tenant_id_fkey(${PROFILE_COLS}),
  landlord:profiles!bookings_landlord_id_fkey(${PROFILE_COLS})`
const CONV_SELECT = `*, listing:listings(${LISTING_LITE}),
  tenant:profiles!conversations_tenant_id_fkey(${PROFILE_COLS}),
  landlord:profiles!conversations_landlord_id_fkey(${PROFILE_COLS})`

function check({ data, error }) { if (error) throw new Error(error.message); return data }
async function myId() {
  const { data } = await sb().auth.getUser()
  if (!data.user) throw new Error('Please sign in first')
  return data.user.id
}
const ext = (f) => (f.name.split('.').pop() || 'jpg').toLowerCase()
const fileName = (prefix, f) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext(f)}`

async function loadProfile(user) {
  if (!user) return null
  const p = check(await sb().from('profiles').select(PROFILE_COLS).eq('id', user.id).maybeSingle())
  return p ? { ...p, email: user.email } : null
}

// ---------- AUTH ----------
export async function getSessionUser() {
  const { data } = await sb().auth.getSession()
  return loadProfile(data.session?.user)
}
export function onAuthChange(cb) {
  const { data } = sb().auth.onAuthStateChange((_evt, session) => {
    // don't await Supabase calls inside this callback (can deadlock) — defer them
    setTimeout(async () => cb(await loadProfile(session?.user)), 0)
  })
  return () => data.subscription.unsubscribe()
}
export async function signUp({ email, password, fullName, phone, role }) {
  const data = check(await sb().auth.signUp({ email, password, options: { data: { full_name: fullName, phone, role } } }))
  if (!data.session) throw new Error('Account created. Check your email to confirm, then sign in.')
  return loadProfile(data.user)
}
export async function signIn({ email, password }) {
  const data = check(await sb().auth.signInWithPassword({ email, password }))
  return loadProfile(data.user)
}
export async function demoSignIn() { throw new Error('Demo accounts only exist in demo mode') }
export async function signOut() { await sb().auth.signOut() }

// ---------- PROFILE ----------
export async function updateMyProfile({ full_name, phone, fb_profile_url }) {
  const id = await myId()
  check(await sb().from('profiles').update({ full_name, phone, fb_profile_url }).eq('id', id))
  return getSessionUser()
}
export async function uploadMyId(file) {
  const id = await myId()
  const me = await getSessionUser()
  const path = `${id}/${fileName('id', file)}`
  check(await sb().storage.from('private-docs').upload(path, file))
  check(await sb().from('verification_docs').insert({ owner_id: id, kind: me.role === 'landlord' ? 'landlord_id' : 'tenant_id', path }))
  check(await sb().from('profiles').update({ id_status: 'pending' }).eq('id', id))
  return getSessionUser()
}
export async function getTenantCard(tenantId) {
  const p = check(await sb().from('profiles').select(PROFILE_COLS).eq('id', tenantId).single())
  const rows = check(await sb().from('bookings').select('status').eq('tenant_id', tenantId))
  return { ...p, visits: rows.filter((r) => r.status === 'visited').length, noShows: rows.filter((r) => r.status === 'no_show').length }
}

// ---------- LISTINGS ----------
export async function listVerified({ area = '', maxPrice = 0, q = '' } = {}) {
  let query = sb().from('listings').select(LISTING_SELECT).eq('status', 'verified').order('created_at', { ascending: false })
  if (area) query = query.eq('area', area)
  if (maxPrice) query = query.lte('price_usd', maxPrice)
  if (q) query = query.or(`title.ilike.%${q}%,area.ilike.%${q}%,code.ilike.%${q}%`)
  return check(await query)
}
export async function getListingByCode(code) {
  return check(await sb().from('listings').select(LISTING_SELECT).ilike('code', code).maybeSingle())
}
export async function myListings() {
  const id = await myId()
  return check(await sb().from('listings').select(LISTING_SELECT).eq('landlord_id', id).order('created_at', { ascending: false }))
}
async function uploadPublicPhotos(id, files, prefix = 'photo') {
  const urls = []
  for (const f of files) {
    const path = `${id}/${fileName(prefix, f)}`
    check(await sb().storage.from('listing-photos').upload(path, f))
    urls.push(sb().storage.from('listing-photos').getPublicUrl(path).data.publicUrl)
  }
  return urls
}
export async function createListing(data, { photos = [], idFile = null, proofFile = null } = {}) {
  const id = await myId()
  const photoUrls = await uploadPublicPhotos(id, photos)
  const listing = check(await sb().from('listings').insert({
    landlord_id: id, title: data.title, area: data.area, address: data.address, price_usd: Number(data.price_usd),
    room_type: data.room_type, description: data.description, amenities: data.amenities || [], map_url: data.map_url || null,
    photos: photoUrls, status: 'pending',
  }).select().single())
  for (const [file, kind] of [[idFile, 'landlord_id'], [proofFile, 'right_to_rent']]) {
    if (!file) continue
    const path = `${id}/${fileName(kind, file)}`
    check(await sb().storage.from('private-docs').upload(path, file))
    check(await sb().from('verification_docs').insert({ owner_id: id, listing_id: listing.id, kind, path }))
  }
  return listing
}
export async function logEvent(listingId, type, source = 'app') {
  await sb().from('events').insert({ listing_id: listingId, type, source }) // fire-and-forget
}
export async function listingStats(listingIds) {
  const out = {}
  listingIds.forEach((id) => { out[id] = { view: 0, click_chat: 0, click_book: 0, bookings: 0 } })
  if (!listingIds.length) return out
  const ev = check(await sb().from('events').select('listing_id, type').in('listing_id', listingIds).limit(10000))
  ev.forEach((e) => { out[e.listing_id][e.type]++ })
  const bk = check(await sb().from('bookings').select('listing_id').in('listing_id', listingIds))
  bk.forEach((b) => { out[b.listing_id].bookings++ })
  return out
}

// ---------- BOOKINGS ----------
export async function createBooking({ listingId, slot, note }) {
  const id = await myId()
  return check(await sb().from('bookings').insert({ listing_id: listingId, tenant_id: id, slot, note }).select().single())
}
export async function myBookings() {
  const id = await myId()
  return check(await sb().from('bookings').select(BOOKING_SELECT).eq('tenant_id', id).order('slot', { ascending: false }))
}
export async function landlordRequests() {
  const id = await myId()
  return check(await sb().from('bookings').select(BOOKING_SELECT).eq('landlord_id', id).order('slot', { ascending: true }))
}
export async function getBooking(id) {
  return check(await sb().from('bookings').select(BOOKING_SELECT).eq('id', id).maybeSingle())
}
export async function updateBooking(id, patch) {
  return check(await sb().from('bookings').update(patch).eq('id', id).select(BOOKING_SELECT).single())
}

// ---------- CHAT ----------
export async function getOrCreateConversation(listingId) {
  const id = await myId()
  const existing = check(await sb().from('conversations').select('*').eq('listing_id', listingId).eq('tenant_id', id).maybeSingle())
  if (existing) return existing
  return check(await sb().from('conversations').insert({ listing_id: listingId, tenant_id: id }).select().single())
}
export async function myConversations() {
  const convs = check(await sb().from('conversations').select(CONV_SELECT).order('created_at', { ascending: false }))
  if (!convs.length) return []
  const msgs = check(await sb().from('messages').select('*').in('conversation_id', convs.map((c) => c.id)).order('created_at', { ascending: false }).limit(500))
  const last = {}
  msgs.forEach((m) => { if (!last[m.conversation_id]) last[m.conversation_id] = m })
  return convs.map((c) => ({ ...c, last_message: last[c.id] || null }))
    .sort((a, b) => (b.last_message?.created_at || b.created_at).localeCompare(a.last_message?.created_at || a.created_at))
}
export async function getConversation(id) {
  return check(await sb().from('conversations').select(CONV_SELECT).eq('id', id).maybeSingle())
}
export async function listMessages(conversationId) {
  return check(await sb().from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }))
}
export async function sendMessage(conversationId, body) {
  const id = await myId()
  return check(await sb().from('messages').insert({ conversation_id: conversationId, sender_id: id, body }).select().single())
}
export function subscribeMessages(conversationId, cb) {
  const ch = sb().channel(`messages:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (p) => cb(p.new))
    .subscribe()
  return () => { sb().removeChannel(ch) }
}

// ---------- REPORTS ----------
export async function reportListing(listingId, reason, details) {
  const { data } = await sb().auth.getUser()
  check(await sb().from('reports').insert({ listing_id: listingId, reporter_id: data.user?.id || null, reason, details }))
}

// ---------- ADMIN ----------
async function signDocs(docs) {
  if (!docs.length) return []
  const signed = check(await sb().storage.from('private-docs').createSignedUrls(docs.map((d) => d.path), 600))
  return docs.map((d, i) => ({ ...d, url: signed[i]?.signedUrl }))
}
export async function adminQueue() {
  const listings = check(await sb().from('listings').select(LISTING_SELECT)
    .or('status.eq.pending,and(status.eq.verified,room_checked.eq.false)').order('created_at'))
  const landlordIds = [...new Set(listings.map((l) => l.landlord_id))]
  const listingDocs = listings.length ? await signDocs(check(await sb().from('verification_docs').select('*')
    .or(`listing_id.in.(${listings.map((l) => l.id).join(',')}),and(kind.eq.landlord_id,owner_id.in.(${landlordIds.join(',')}))`))) : []
  const people = check(await sb().from('profiles').select(PROFILE_COLS).eq('id_status', 'pending'))
  const peopleDocs = people.length ? await signDocs(check(await sb().from('verification_docs').select('*')
    .in('owner_id', people.map((p) => p.id)).is('listing_id', null))) : []
  const reports = check(await sb().from('reports').select(`*, listing:listings(${LISTING_LITE})`).order('created_at', { ascending: false }))
  return {
    listings: listings.map((l) => ({ ...l, docs: listingDocs.filter((d) => d.listing_id === l.id || (d.owner_id === l.landlord_id && d.kind === 'landlord_id')) })),
    people: people.map((p) => ({ ...p, docs: peopleDocs.filter((d) => d.owner_id === p.id) })),
    reports,
  }
}
export async function adminUpdateListing(id, patch) {
  const p = { ...patch }
  if (patch.status === 'verified') {
    p.verified_at = new Date().toISOString()
    p.expires_at = new Date(Date.now() + 182 * 86400000).toISOString()
  }
  return check(await sb().from('listings').update(p).eq('id', id).select().single())
}
export async function adminUploadCheckerPhotos(id, files) {
  const me = await myId()
  const urls = await uploadPublicPhotos(me, files, 'lumnov-check')
  const l = check(await sb().from('listings').select('lumnov_photos').eq('id', id).single())
  return check(await sb().from('listings').update({ lumnov_photos: [...(l.lumnov_photos || []), ...urls] }).eq('id', id).select().single())
}
export async function adminSetIdStatus(userId, status) {
  check(await sb().from('profiles').update({ id_status: status }).eq('id', userId))
}
export function resetDemo() {}
