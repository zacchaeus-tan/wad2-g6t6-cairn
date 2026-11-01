-- Admin page, phase 1: alerts that admins publish on a route, plus write
-- access to routes so admins can change a route's safety status.
--
-- Automated sources (weather, disaster feeds) will insert alerts as
-- 'pending' later; an admin approves them to 'active' before hikers see them.

create table if not exists public.route_alerts (
  id           uuid primary key default gen_random_uuid(),
  route_id     uuid not null references public.routes(id) on delete cascade,
  source       text not null default 'manual',
  severity     text not null default 'warning',
  title        text not null,
  message      text,
  status       text not null default 'active',
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,
  external_ref text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.route_alerts drop constraint if exists route_alerts_source_check;
alter table public.route_alerts add constraint route_alerts_source_check
  check (source in ('manual','community','weather','gdacs','doc'));

alter table public.route_alerts drop constraint if exists route_alerts_severity_check;
alter table public.route_alerts add constraint route_alerts_severity_check
  check (severity in ('info','warning','danger'));

alter table public.route_alerts drop constraint if exists route_alerts_status_check;
alter table public.route_alerts add constraint route_alerts_status_check
  check (status in ('pending','active','dismissed','expired'));

alter table public.route_alerts drop constraint if exists route_alerts_window_check;
alter table public.route_alerts add constraint route_alerts_window_check
  check (ends_at is null or ends_at > starts_at);

create index if not exists route_alerts_route_id_idx on public.route_alerts (route_id);
create index if not exists route_alerts_status_idx on public.route_alerts (status);

-- An automated job must not raise the same external event twice for a route.
create unique index if not exists route_alerts_external_uniq
  on public.route_alerts (route_id, source, external_ref)
  where external_ref is not null;

drop trigger if exists route_alerts_touch_updated_at on public.route_alerts;
create trigger route_alerts_touch_updated_at
  before update on public.route_alerts
  for each row execute function public.touch_updated_at();

alter table public.route_alerts enable row level security;

-- Hikers only see alerts an admin has published and that are in their window.
drop policy if exists "Anyone can view live alerts" on public.route_alerts;
create policy "Anyone can view live alerts"
  on public.route_alerts for select
  using (status = 'active' and starts_at <= now() and (ends_at is null or ends_at > now()));

drop policy if exists "Admins can view all alerts" on public.route_alerts;
create policy "Admins can view all alerts"
  on public.route_alerts for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists "Only admins can modify alerts" on public.route_alerts;
create policy "Only admins can modify alerts"
  on public.route_alerts for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Routes were read-only from the browser; admins now set safety status here.
alter table public.routes
  add column if not exists safety_status_note text;

drop policy if exists "Admins can update routes" on public.routes;
create policy "Admins can update routes"
  on public.routes for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
