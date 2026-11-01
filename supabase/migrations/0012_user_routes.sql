-- Saved and completed routes. One row per user per route: saving a route
-- creates it with status 'saved'; finishing the route updates the same row
-- to 'completed'.

create table if not exists public.user_routes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  route_id     uuid not null references public.routes(id) on delete cascade,
  status       text not null default 'saved',
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, route_id)
);

alter table public.user_routes drop constraint if exists user_routes_status_check;
alter table public.user_routes add constraint user_routes_status_check
  check (status in ('saved','completed'));

create index if not exists user_routes_route_id_idx on public.user_routes (route_id);

-- Keeps completed_at in step with status so the client only has to set status.
create or replace function public.user_routes_set_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists user_routes_set_timestamps on public.user_routes;
create trigger user_routes_set_timestamps
  before insert or update on public.user_routes
  for each row execute function public.user_routes_set_timestamps();

alter table public.user_routes enable row level security;

drop policy if exists "Users manage their own saved routes" on public.user_routes;
create policy "Users manage their own saved routes"
  on public.user_routes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
