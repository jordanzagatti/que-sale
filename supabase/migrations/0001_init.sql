-- ¿Qué Sale? · Fase 0
-- Ejecutar en Supabase (SQL Editor o `supabase db push`).
-- Requiere PostGIS y pg_trgm (Supabase las soporta en el plan free).

create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_geography_from_latlng()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location :=
      st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  else
    new.location := null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  city text not null default 'CABA',
  province text not null default 'Ciudad Autónoma de Buenos Aires',
  home_latitude double precision,
  home_longitude double precision,
  home_location geography(point, 4326),
  preferences jsonb not null default '{}'::jsonb,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Invitado'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Los usuarios creados antes de esta migración también necesitan su perfil.
insert into public.profiles (id, email, display_name)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Invitado'
  )
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  series_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  slug text not null unique,
  title text not null,
  normalized_title text,
  description text,
  category text not null default 'Otros',
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  all_day boolean not null default false,
  venue_name text,
  address text,
  neighborhood text,
  city text not null default 'CABA',
  province text not null default 'Ciudad Autónoma de Buenos Aires',
  city_code text,
  country_code text not null default 'AR',
  latitude double precision,
  longitude double precision,
  location geography(point, 4326),
  location_precision text not null default 'city'
    check (location_precision in ('exact', 'street', 'city')),
  price_text text,
  price_min numeric,
  price_max numeric,
  currency text not null default 'ARS',
  is_free boolean,
  image_url text,
  source text not null,
  source_id text,
  source_url text,
  ticket_url text,
  organizer text,
  fingerprint text not null unique,
  status text not null default 'active'
    check (status in ('active', 'cancelled', 'postponed', 'hidden')),
  is_private boolean not null default false,
  share_token uuid not null default gen_random_uuid(),
  featured boolean not null default false,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists events_set_location on public.events;
create trigger events_set_location
before insert or update of latitude, longitude on public.events
for each row execute function public.set_geography_from_latlng();

create index if not exists events_starts_at_idx
  on public.events (starts_at);
create index if not exists events_city_starts_at_idx
  on public.events (city, starts_at);
create index if not exists events_category_starts_at_idx
  on public.events (category, starts_at);
create index if not exists events_status_starts_at_idx
  on public.events (status, starts_at);
create index if not exists events_location_gist_idx
  on public.events using gist (location);
create index if not exists events_title_trgm_idx
  on public.events using gin (title gin_trgm_ops);
create index if not exists events_description_trgm_idx
  on public.events using gin (description gin_trgm_ops);
create index if not exists events_search_idx
  on public.events using gin (
    to_tsvector(
      'spanish',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(venue_name, '') || ' ' ||
      coalesce(neighborhood, '') || ' ' ||
      coalesce(city, '')
    )
  );

-- Mapea el mismo evento en distintas fuentes (Ticketek, Ticketmaster, sede).
create table if not exists public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  source text not null,
  source_id text not null,
  source_url text,
  raw jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists event_sources_event_idx
  on public.event_sources (event_id);

-- Candidatos del pipeline experimental. No se sirven en la app.
create table if not exists public.events_staging (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text,
  payload jsonb,
  slug text not null,
  title text not null,
  normalized_title text,
  description text,
  category text not null default 'Otros',
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue_name text,
  address text,
  neighborhood text,
  city text not null default 'CABA',
  province text not null default 'Ciudad Autónoma de Buenos Aires',
  city_code text,
  latitude double precision,
  longitude double precision,
  location geography(point, 4326),
  location_precision text not null default 'city',
  price_text text,
  price_min numeric,
  currency text not null default 'ARS',
  is_free boolean,
  image_url text,
  source_url text,
  ticket_url text,
  fingerprint text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  review_notes text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

drop trigger if exists events_staging_set_location on public.events_staging;
create trigger events_staging_set_location
before insert or update of latitude, longitude on public.events_staging
for each row execute function public.set_geography_from_latlng();

create unique index if not exists events_staging_source_unique
  on public.events_staging (source, source_id);
create index if not exists events_staging_status_idx
  on public.events_staging (status, first_seen_at);
create index if not exists events_staging_fingerprint_idx
  on public.events_staging (fingerprint);

-- ---------------------------------------------------------------------------
-- User product tables
-- ---------------------------------------------------------------------------

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  notify boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_searches_user_idx
  on public.saved_searches (user_id, created_at desc);

drop trigger if exists saved_searches_updated_at on public.saved_searches;
create trigger saved_searches_updated_at
before update on public.saved_searches
for each row execute function public.set_updated_at();

create table if not exists public.attendance (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  status text not null default 'going'
    check (status in ('going', 'interested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists attendance_event_idx
  on public.attendance (event_id, status);
create index if not exists attendance_user_idx
  on public.attendance (user_id, created_at desc);

drop trigger if exists attendance_updated_at on public.attendance;
create trigger attendance_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('venue', 'category', 'city')),
  value text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, value)
);

create index if not exists follows_user_idx
  on public.follows (user_id, kind);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, event_id, kind)
);

create index if not exists notification_log_user_idx
  on public.notification_log (user_id, sent_at desc);

create table if not exists public.ingestion_runs (
  id bigint generated always as identity primary key,
  source text not null,
  mode text not null check (mode in ('safe', 'experimental')),
  status text not null default 'running'
    check (status in ('running', 'ok', 'error')),
  fetched integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  skipped integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ingestion_runs_started_idx
  on public.ingestion_runs (started_at desc);

create table if not exists public.geocode_cache (
  key text primary key,
  address text not null,
  city text,
  province text,
  latitude double precision not null,
  longitude double precision not null,
  location geography(point, 4326),
  provider text not null default 'georef',
  updated_at timestamptz not null default now()
);

drop trigger if exists geocode_cache_set_location on public.geocode_cache;
create trigger geocode_cache_set_location
before insert or update of latitude, longitude on public.geocode_cache
for each row execute function public.set_geography_from_latlng();

-- Config para el cron de recordatorios (app_url + secreto). No es pública.
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Monetización (Fase 4). Se deja lista desde el inicio.
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_id uuid references public.events (id) on delete cascade,
  kind text not null default 'event'
    check (kind in ('event', 'venue', 'banner')),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'active', 'paused', 'finished')),
  title text,
  image_url text,
  target_url text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  budget_cents integer,
  amount_paid_cents integer not null default 0,
  payment_provider text default 'mercadopago',
  payment_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists promotions_updated_at on public.promotions;
create trigger promotions_updated_at
before update on public.promotions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Views & RPCs
-- ---------------------------------------------------------------------------

-- Es una vista de solo agregados: corre con los privilegios del owner para
-- poder contar asistencias de todos, pero no expone filas individuales.
create or replace view public.event_attendance_counts
as
select
  event_id,
  count(*) filter (where status = 'going') as going_count,
  count(*) filter (where status = 'interested') as interested_count
from public.attendance
group by event_id;

create or replace function public.nearby_events(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 10000,
  p_from timestamptz default now(),
  p_to timestamptz default now() + interval '90 days',
  p_limit integer default 100
)
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  category text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue_name text,
  address text,
  neighborhood text,
  city text,
  province text,
  latitude double precision,
  longitude double precision,
  price_text text,
  price_min numeric,
  currency text,
  is_free boolean,
  image_url text,
  source text,
  source_url text,
  ticket_url text,
  featured boolean,
  tags text[],
  distance_m double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    e.id,
    e.slug,
    e.title,
    e.description,
    e.category,
    e.starts_at,
    e.ends_at,
    e.venue_name,
    e.address,
    e.neighborhood,
    e.city,
    e.province,
    e.latitude,
    e.longitude,
    e.price_text,
    e.price_min,
    e.currency,
    e.is_free,
    e.image_url,
    e.source,
    e.source_url,
    e.ticket_url,
    e.featured,
    e.tags,
    st_distance(
      e.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) as distance_m
  from public.events e
  where
    e.status = 'active'
    and e.location is not null
    and e.starts_at >= p_from
    and e.starts_at <= p_to
    and st_dwithin(
      e.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      greatest(p_radius_m, 100)
    )
  order by distance_m asc, e.starts_at asc
  limit least(greatest(p_limit, 1), 500);
$$;

-- Búsqueda full-text + fuzzy para el buscador.
create or replace function public.search_events(
  p_query text default '',
  p_city text default null,
  p_category text default null,
  p_from timestamptz default now(),
  p_to timestamptz default now() + interval '90 days',
  p_limit integer default 100
)
returns setof public.events
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select e.*
  from public.events e
  where
    e.status = 'active'
    and e.starts_at >= p_from
    and e.starts_at <= p_to
    and (p_city is null or e.city = p_city)
    and (p_category is null or e.category = p_category)
    and (
      coalesce(trim(p_query), '') = ''
      or to_tsvector(
        'spanish',
        coalesce(e.title, '') || ' ' ||
        coalesce(e.description, '') || ' ' ||
        coalesce(e.venue_name, '') || ' ' ||
        coalesce(e.neighborhood, '') || ' ' ||
        coalesce(e.city, '')
      ) @@ plainto_tsquery('spanish', p_query)
      or e.title % p_query
    )
  order by e.starts_at asc
  limit least(greatest(p_limit, 1), 500);
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_sources enable row level security;
alter table public.events_staging enable row level security;
alter table public.saved_searches enable row level security;
alter table public.attendance enable row level security;
alter table public.follows enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_log enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.geocode_cache enable row level security;
alter table public.app_config enable row level security;
alter table public.promotions enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;

-- events (lectura pública de eventos activos). Los privados no se listan públicamente
drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
for select to anon, authenticated using (status = 'active' and is_private = false);

drop policy if exists "events_creator_read" on public.events;
create policy "events_creator_read" on public.events
for select to authenticated using (created_by = (select auth.uid()));

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events
for insert to authenticated with check (created_by = (select auth.uid()));

drop policy if exists "events_creator_update" on public.events;
create policy "events_creator_update" on public.events
for update to authenticated using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

-- saved_searches
drop policy if exists "saved_searches_own" on public.saved_searches;
create policy "saved_searches_own" on public.saved_searches
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- attendance
drop policy if exists "attendance_own" on public.attendance;
create policy "attendance_own" on public.attendance
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- follows
drop policy if exists "follows_own" on public.follows;
create policy "follows_own" on public.follows
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- push_subscriptions
drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- notification_log
drop policy if exists "notification_log_read_own" on public.notification_log;
create policy "notification_log_read_own" on public.notification_log
for select to authenticated using ((select auth.uid()) = user_id);

-- promotions: sin lectura pública por ahora. La tabla se usará recién en la
-- fase de monetización; cualquier vista pública debe exponer solo columnas
-- seguras (nunca payment_id, presupuesto ni metadata interna).

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select on public.events to anon, authenticated;
grant insert, update on public.events to authenticated;
grant select on public.event_attendance_counts to anon, authenticated;
grant select on public.event_attendance_counts to service_role;

grant select, insert, update, delete on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from authenticated;
grant update (
  email,
  display_name,
  avatar_url,
  city,
  province,
  home_latitude,
  home_longitude,
  home_location,
  preferences
) on public.profiles to authenticated;
grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, insert, update, delete on public.attendance to authenticated;
grant select, insert, update, delete on public.follows to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select on public.notification_log to authenticated;

grant all on public.profiles to service_role;
grant all on public.events to service_role;
grant all on public.event_sources to service_role;
grant all on public.events_staging to service_role;
grant all on public.saved_searches to service_role;
grant all on public.attendance to service_role;
grant all on public.follows to service_role;
grant all on public.push_subscriptions to service_role;
grant all on public.notification_log to service_role;
grant all on public.ingestion_runs to service_role;
grant all on public.geocode_cache to service_role;
grant all on public.app_config to service_role;
grant all on public.promotions to service_role;
grant all on public.ingestion_runs_id_seq to service_role;

-- Solo el creador puede ver la lista de asistentes
create or replace function public.get_event_attendees(p_event_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.user_id,
    coalesce(p.display_name, 'Invitado') as display_name,
    p.avatar_url,
    a.status
  from public.attendance a
  left join public.profiles p on p.id = a.user_id
  where a.event_id = p_event_id
    and exists (
      select 1 from public.events e
      where e.id = p_event_id
        and e.created_by = auth.uid()
    )
  order by a.created_at asc;
$$;

revoke all on function public.get_event_attendees(uuid) from public;
grant execute on function public.get_event_attendees(uuid) to authenticated;

grant execute on function public.nearby_events to anon, authenticated, service_role;
grant execute on function public.search_events to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime (opcional, para contadores de asistencia)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.attendance;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
