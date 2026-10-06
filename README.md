# Lumnov — MVP web app

Verified rooms you can trust in Phnom Penh.
**Stack:** React (Vite) · Supabase (Auth, Postgres, Storage, Realtime) · Vercel

---

## 1. Run it right now (demo mode, no backend)

```bash
npm install
npm run dev
```

Open http://localhost:5173. With no Supabase keys, the app runs in **demo mode**: sample landlords, rooms, bookings and chats are saved in your browser. Use the **demo buttons** on the sign-in screen (Renter / Landlord / Lumnov admin). Use **Start story** in the top banner to begin from the social-media post, and **Reset** to restore the sample data.

## 2. Connect Supabase (real backend)

1. Create a project at supabase.com.
2. **SQL Editor** → paste all of `supabase/schema.sql` → **Run**. This creates the tables, security rules, storage buckets and realtime setup. It's safe to run again.
3. **Authentication → Providers → Email**: for a class demo, turn **off** "Confirm email" so sign-up works immediately.
4. Copy `.env.example` to `.env.local` and fill in values from **Project Settings → API**:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_PUBLIC_URL=https://your-app.vercel.app
   ```
5. `npm run dev`, then sign up once as a landlord and once as a renter.
6. Make yourself admin: SQL Editor →
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

## 3. Deploy to Vercel

1. Push this folder to GitHub, then import it in Vercel. Vercel auto-detects Vite.
2. Add the three `VITE_…` environment variables in Vercel → Settings → Environment Variables.
3. Deploy. `vercel.json` already routes `/r/LMN-1001`-style short links to the app.
4. Set `VITE_PUBLIC_URL` to your real domain so QR codes point to it.

## 4. Shareable one-file demo

```bash
npm run build:demo   # → dist-demo/index.html (demo data, works offline)
```

---

## Pages

| Route | Page | Who |
|---|---|---|
| `/demo/post/:code` | Social post mockup (story start: badge + link in the post) | Demo |
| `/` | Listings: verified rooms, area/price filters, search by code | Public |
| `/r/:code` | **Listing detail + verification block** (what the QR/link opens) | Public |
| `/login` | Sign in / create account (renter or landlord) | Public |
| *(sheet)* | Sign-in pop-up, shown only when the user taps Chat or Book | Public |
| `/r/:code/book` | Book a free room check (day + time + note) | Renter |
| `/bookings` | My bookings (upcoming / past) | Renter |
| `/bookings/:id` | Booking detail: status, progress, visit checklist, "Did the room match?" feedback, landlord accept/decline/visited | Both |
| `/chat` | Chat inbox | Both |
| `/chat/:id` | Chat thread (realtime), quick questions, safety tip | Both |
| `/profile` | Profile + **Get verified** (ID upload) + sign out | Both |
| `/landlord` | My listings & badge: status, verification levels, views → chats → book taps → bookings, **badge kit** (badge PNG, photo with badge, post text with link) | Landlord |
| `/landlord/new` | Add a room in 3 steps: details → photos → ID + right-to-rent proof | Landlord |
| `/landlord/requests` | Booking requests: New / Confirmed / Past, accept/decline, tenant details card | Landlord |
| `/admin` | Lumnov check queue: Level 1 documents, Level 2 visit photos, publish badge, approve IDs, reports | Lumnov team |

Sheets (pop-ups): sign in, tenant details card, report this listing.

## Verification levels

1. **Documents.** Landlord ID plus right-to-rent proof (title, lease, EDC/PPWSA bill, sangkat letter). An admin ticks it, then the badge can be published.
2. **Room visit.** A checker uploads their own photos and ticks "visited". Renters see "Photos taken by Lumnov".
3. **Confirmed by renters.** After a visit, the renter answers "Did the room match?" and the count shows on the listing.

Verification expires after 6 months, and the listing shows "Checked [date] · valid until [date]".

## Security (in `schema.sql`)

- Row Level Security on every table. Users only see their own bookings, chats and documents.
- Landlords **cannot verify themselves**: triggers reset verification fields unless the user is an admin.
- Users cannot change their own role or ID status.
- ID documents go in the **private** `private-docs` bucket. Only the owner and admins can read them, through short-lived signed links.
- Room photos go in the public `listing-photos` bucket.
- Unknown codes (`/r/LMN-9999`) show a red "not a verified listing — badge may be fake" warning.

## Project structure

```
src/
  lib/api.js           picks demo or Supabase backend
  lib/supabaseApi.js   real backend calls
  lib/mockApi.js       demo backend (browser storage + sample data)
  lib/badge.js         QR, badge PNG, photo-with-badge generator
  context/AuthContext  session + "sign in only when needed" sheet
  components/          VerificationBlock, sheets, layout, icons
  pages/               one file per screen (landlord/, admin/ subfolders)
supabase/schema.sql    tables, RLS, triggers, storage, realtime
```

## Next steps (not in this MVP)

- Khmer / English language toggle
- Phone OTP login (needs an SMS provider such as Twilio) or Telegram login
- Rich link previews per listing (would need Next.js or a small edge function)
- Reminder notifications before room checks
