-- Admin page fixes: lock down admin access, let admins clear reports without
-- an alert, record who changes alerts, and stop one hiker's report from marking
-- a whole route as hazardous.

-- 1. Only the project owner can grant admin access -----------------------------
--
-- Hikers may update their own profile (the quiz saves there), and that policy
-- did not stop them setting is_admin on themselves. Browser requests run as
-- 'anon' or 'authenticated'; the SQL Editor and the service role do not, so
-- admins are still granted from the dashboard.
create or replace function public.profiles_protect_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
    elsif new.is_admin is distinct from old.is_admin then
      raise exception 'Admin access can only be changed by the project owner.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_admin on public.profiles;
create trigger profiles_protect_admin
  before insert or update on public.profiles
  for each row execute function public.profiles_protect_admin();

-- 2. Reports an admin has looked at ------------------------------------------
--
-- One row per report the admin marked "Reviewed, no action". The report stays
-- hidden until something newer comes in. report_ref is 'route-hazard',
-- 'difficulty' or 'point:<point id>:<category>', as built in src/lib/alertDrafts.js.
create table if not exists public.admin_report_reviews (
  route_id    uuid not null references public.routes(id) on delete cascade,
  report_ref  text not null,
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null default auth.uid(),
  primary key (route_id, report_ref)
);

alter table public.admin_report_reviews enable row level security;

drop policy if exists "Admins manage report reviews" on public.admin_report_reviews;
create policy "Admins manage report reviews"
  on public.admin_report_reviews for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 3. Who last changed an alert ----------------------------------------------
alter table public.route_alerts
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create or replace function public.route_alerts_set_updated_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists route_alerts_set_updated_by on public.route_alerts;
create trigger route_alerts_set_updated_by
  before update on public.route_alerts
  for each row execute function public.route_alerts_set_updated_by();

-- 4. A route needs two different hikers before it counts as hazardous --------
--
-- The recalc-route-stats edge function now applies this rule, and it is what
-- writes these columns: the SQL stats functions from 0006 are not in the live
-- database. It only runs when a review changes, so clear the routes it would
-- now rate 'low' here. Same 12-month window as the edge function.
update public.routes as rt
   set community_hazard_level = 'low',
       community_hazard_note  = null
 where rt.community_hazard_level <> 'low'
   and (
     select count(distinct r.user_id)
       from public.review_incidents ri
       join public.reviews r on r.id = ri.review_id
      where r.route_id = rt.id
        and ri.created_at > now() - interval '12 months'
   ) < 2;

-- 5. Leftovers from the removed weather job -----------------------------------
drop table if exists public.job_runs;
