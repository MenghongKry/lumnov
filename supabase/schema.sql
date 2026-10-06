-- =====================================================================
-- Lumnov MVP — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → Run (one time).
-- Tables, Row Level Security (RLS), triggers, storage buckets, realtime.
-- =====================================================================

-- ---------- Helpers ----------
create extension if not exists pgcrypto;

-- ---------- PROFILES (one row per user) ----------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null default '',
  phone          text,
  fb_profile_url text,
  role           text not null default 'tenant' check (role in ('tenant','landlord','admin')),
  id_status      text not null default 'none' check (id_status in ('none','pending','verified','rejected')),
  created_at     timestamptz not null default now()
);

-- is_admin() is SECURITY DEFINER so RLS policies can call it without recursion.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Trusted = a Lumnov admin, or the database itself (SQL editor, service role, our own
-- SECURITY DEFINER triggers). App users always run as 'authenticated' or 'anon'.
create or replace function public.is_trusted() returns boolean
language sql stable as $$
  select current_user not in ('authenticated', 'anon') or public.is_admin();
$$;

-- Create a profile automatically when someone signs up.
-- Role comes from sign-up metadata, but only tenant/landlord are allowed (never admin).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    case when new.raw_user_meta_data->>'role' = 'landlord' then 'landlord' else 'tenant' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Users may edit their name/phone, but never their own role or ID status.
create or replace function public.protect_profile_fields() returns trigger
language plpgsql as $$
begin
  if not public.is_trusted() then
    new.role := old.role;
    -- a user may only move themselves from none/rejected -> pending (after uploading an ID)
    if new.id_status <> old.id_status and not (new.id_status = 'pending' and old.id_status in ('none','rejected')) then
      new.id_status := old.id_status;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
for each row execute function public.protect_profile_fields();

-- ---------- LISTINGS ----------
create sequence if not exists public.listing_code_seq start 1001;

create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null default ('LMN-' || nextval('public.listing_code_seq')::text),
  landlord_id     uuid not null references public.profiles(id) on delete cascade,
  title           text not null,
  area            text not null,                 -- e.g. Toul Kork
  address         text,
  price_usd       integer not null check (price_usd >= 0),
  room_type       text not null default 'Room',  -- Room / Studio / Apartment
  description     text,
  amenities       text[] not null default '{}',
  photos          text[] not null default '{}',  -- public URLs (listing-photos bucket)
  lumnov_photos   text[] not null default '{}',  -- photos taken by our checker
  map_url         text,
  status          text not null default 'pending'
                  check (status in ('draft','pending','verified','rejected','expired')),
  docs_checked    boolean not null default false, -- Level 1: ID + right-to-rent docs
  room_checked    boolean not null default false, -- Level 2: on-site visit
  tenant_confirmed_count integer not null default 0, -- Level 3: renters who said "room matched"
  verified_at     timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- Landlords cannot verify themselves: only admins change verification fields.
create or replace function public.protect_listing_fields() returns trigger
language plpgsql as $$
begin
  if not public.is_trusted() then
    if tg_op = 'INSERT' then
      new.status := case when new.status = 'draft' then 'draft' else 'pending' end;
      new.docs_checked := false; new.room_checked := false;
      new.verified_at := null; new.expires_at := null;
      new.tenant_confirmed_count := 0; new.lumnov_photos := '{}';
    else
      new.docs_checked := old.docs_checked; new.room_checked := old.room_checked;
      new.verified_at := old.verified_at; new.expires_at := old.expires_at;
      new.tenant_confirmed_count := old.tenant_confirmed_count;
      new.lumnov_photos := old.lumnov_photos; new.landlord_id := old.landlord_id;
      -- landlord may only move draft/rejected/expired -> pending
      if new.status <> old.status and not (new.status = 'pending' and old.status in ('draft','rejected','expired')) then
        new.status := old.status;
      end if;
    end if;
  end if;
  if new.status = 'verified' and new.verified_at is null then
    new.verified_at := now();
    new.expires_at := now() + interval '6 months';
  end if;
  return new;
end $$;

drop trigger if exists protect_listing on public.listings;
create trigger protect_listing before insert or update on public.listings
for each row execute function public.protect_listing_fields();

-- ---------- PRIVATE VERIFICATION DOCUMENTS (ID cards, titles, bills) ----------
create table if not exists public.verification_docs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid references public.listings(id) on delete cascade,
  kind        text not null check (kind in ('tenant_id','landlord_id','right_to_rent')),
  path        text not null,          -- path inside the private-docs bucket
  created_at  timestamptz not null default now()
);

-- ---------- BOOKINGS (free room-check appointments) ----------
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  tenant_id    uuid not null references public.profiles(id) on delete cascade,
  landlord_id  uuid references public.profiles(id) on delete cascade,
  slot         timestamptz not null,
  note         text,
  status       text not null default 'requested'
               check (status in ('requested','confirmed','declined','cancelled','visited','no_show')),
  room_matched boolean,
  rating       integer check (rating between 1 and 5),
  review       text,
  created_at   timestamptz not null default now()
);

-- Fill landlord_id from the listing, and control who may change what.
create or replace function public.booking_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare is_tenant boolean; is_landlord boolean;
begin
  if tg_op = 'INSERT' then
    select landlord_id into new.landlord_id from public.listings where id = new.listing_id;
    new.status := 'requested'; new.room_matched := null; new.rating := null; new.review := null;
    return new;
  end if;
  if public.is_admin() or auth.uid() is null then return new; end if;
  is_tenant := auth.uid() = old.tenant_id;
  is_landlord := auth.uid() = old.landlord_id;
  new.listing_id := old.listing_id; new.tenant_id := old.tenant_id; new.landlord_id := old.landlord_id;
  if is_landlord then
    new.room_matched := old.room_matched; new.rating := old.rating; new.review := old.review; new.slot := old.slot;
    if new.status not in ('confirmed','declined','visited','no_show') then new.status := old.status; end if;
  elsif is_tenant then
    if new.status <> old.status and not (new.status = 'cancelled' and old.status in ('requested','confirmed')) then
      new.status := old.status;
    end if;
    -- feedback only after the visit
    if old.status not in ('confirmed','visited') then
      new.room_matched := old.room_matched; new.rating := old.rating; new.review := old.review;
    end if;
  end if;
  -- Level 3: count renters who confirmed the room matched
  if new.room_matched is true and old.room_matched is distinct from true then
    update public.listings set tenant_confirmed_count = tenant_confirmed_count + 1 where id = new.listing_id;
  end if;
  return new;
end $$;

drop trigger if exists booking_rules on public.bookings;
create trigger booking_rules before insert or update on public.bookings
for each row execute function public.booking_rules();

-- ---------- CHAT ----------
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  tenant_id   uuid not null references public.profiles(id) on delete cascade,
  landlord_id uuid references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (listing_id, tenant_id)
);

create or replace function public.conversation_fill() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select landlord_id into new.landlord_id from public.listings where id = new.listing_id;
  return new;
end $$;

drop trigger if exists conversation_fill on public.conversations;
create trigger conversation_fill before insert on public.conversations
for each row execute function public.conversation_fill();

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (length(body) between 1 and 2000),
  created_at      timestamptz not null default now()
);

-- ---------- REPORTS + EVENTS (pilot funnel) ----------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason      text not null,
  details     text,
  created_at  timestamptz not null default now()
);

create table if not exists public.events (
  id          bigint generated always as identity primary key,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  type        text not null check (type in ('view','click_chat','click_book')),
  source      text,            -- qr / link / app
  created_at  timestamptz not null default now()
);

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles          enable row level security;
alter table public.listings          enable row level security;
alter table public.verification_docs enable row level security;
alter table public.bookings          enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.reports           enable row level security;
alter table public.events            enable row level security;

-- profiles: yourself, admins, any landlord (shown publicly on listings),
-- and tenants who booked or chatted with you.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or role = 'landlord' or public.is_admin()
  or exists (select 1 from public.bookings b where b.tenant_id = profiles.id and b.landlord_id = auth.uid())
  or exists (select 1 from public.conversations c where c.tenant_id = profiles.id and c.landlord_id = auth.uid())
);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- listings: verified ones are public; landlords see their own; admins see all
drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings for select using (
  status = 'verified' or landlord_id = auth.uid() or public.is_admin()
);
drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings for insert with check (
  landlord_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('landlord','admin'))
);
drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings for update
  using (landlord_id = auth.uid() or public.is_admin());

-- verification docs: owner + admins only
drop policy if exists docs_select on public.verification_docs;
create policy docs_select on public.verification_docs for select using (owner_id = auth.uid() or public.is_admin());
drop policy if exists docs_insert on public.verification_docs;
create policy docs_insert on public.verification_docs for insert with check (owner_id = auth.uid());

-- bookings: the tenant, the landlord, admins
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select using (
  tenant_id = auth.uid() or landlord_id = auth.uid() or public.is_admin()
);
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert with check (tenant_id = auth.uid());
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update using (
  tenant_id = auth.uid() or landlord_id = auth.uid() or public.is_admin()
);

-- conversations + messages: participants only
drop policy if exists conv_select on public.conversations;
create policy conv_select on public.conversations for select using (
  tenant_id = auth.uid() or landlord_id = auth.uid() or public.is_admin()
);
drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert with check (tenant_id = auth.uid());

drop policy if exists msg_select on public.messages;
create policy msg_select on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = messages.conversation_id
          and (c.tenant_id = auth.uid() or c.landlord_id = auth.uid() or public.is_admin()))
);
drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from public.conversations c where c.id = messages.conversation_id
    and (c.tenant_id = auth.uid() or c.landlord_id = auth.uid()))
);

-- reports: anyone can file; admins read
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert with check (reporter_id is null or reporter_id = auth.uid());
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select using (public.is_admin());

-- events: anyone can log; landlord of the listing + admins read
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert with check (true);
drop policy if exists events_select on public.events;
create policy events_select on public.events for select using (
  public.is_admin() or exists (select 1 from public.listings l where l.id = events.listing_id and l.landlord_id = auth.uid())
);

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('private-docs', 'private-docs', false)
  on conflict (id) do nothing;

-- Files go in a folder named after the uploader's user id: <uid>/<file>
drop policy if exists photos_upload on storage.objects;
create policy photos_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists docs_upload on storage.objects;
create policy docs_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'private-docs' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists docs_read on storage.objects;
create policy docs_read on storage.objects for select to authenticated using (
  bucket_id = 'private-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

-- ---------- REALTIME (chat + booking updates) ----------
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; end $$;

-- ---------- MAKE YOURSELF ADMIN (run after you sign up) ----------
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
