-- Admin page fixes: lock down admin access, let admins clear reports without
-- an alert, record who changes alerts, recalculate stats after a regrade, and
-- stop one hiker's report from marking a whole route as hazardous.

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

-- 4. Regrading recalculates the community figures ------------------------------
--
-- effective_difficulty is blended from the official grade, so it is stale the
-- moment an admin changes that grade.
create or replace function public.routes_regrade_recalc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalc_route_stats(new.id);
  return null;
end;
$$;

drop trigger if exists routes_regrade_recalc on public.routes;
create trigger routes_regrade_recalc
  after update of official_difficulty on public.routes
  for each row
  when (old.official_difficulty is distinct from new.official_difficulty)
  execute function public.routes_regrade_recalc();

-- 5. A route needs two different hikers before it counts as hazardous --------
--
-- The +3 smoothing in calc_hazard_score did not stop a single serious report
-- (severity 3 on a route with one review scores 0.75, "elevated"). The level
-- now stays 'low' unless at least two hikers reported incidents. The window is
-- 12 months to match the recalc-route-stats edge function, which previously
-- disagreed with this function's 24 months. Otherwise unchanged from 0006.
create or replace function public.recalc_route_stats(p_route_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_official   numeric;
  v_perceived  integer[];
  v_completed  boolean[];
  v_count      integer := 0;
  v_avg_rating numeric;
  v_avg_pd     numeric;
  v_completion numeric;
  v_sev        integer[];
  v_reporters  integer := 0;
  v_score      numeric;
  v_level      text;
  v_note       text;
  v_eff        numeric;
  v_top_label  text;
  v_top_users  integer;
begin
  select official_difficulty into v_official from public.routes where id = p_route_id;
  if v_official is null then
    return;
  end if;

  select count(*),
         round(avg(rating)::numeric, 2),
         round(avg(perceived_difficulty)::numeric, 2),
         round(avg(case when completed then 1 else 0 end)::numeric, 3),
         array_agg(perceived_difficulty order by created_at),
         array_agg(completed order by created_at)
    into v_count, v_avg_rating, v_avg_pd, v_completion, v_perceived, v_completed
    from public.reviews
   where route_id = p_route_id;

  v_eff := public.calc_effective_difficulty(v_official, v_perceived, v_completed);

  select array_agg(c.severity), count(distinct r.user_id)
    into v_sev, v_reporters
    from public.review_incidents ri
    join public.reviews r on r.id = ri.review_id
    join public.incident_categories c on c.category = ri.category
   where ri.route_id = p_route_id
     and ri.created_at > now() - interval '12 months';

  v_score := public.calc_hazard_score(v_sev, v_count);
  v_level := case when v_reporters >= 2 then public.calc_hazard_level(v_score) else 'low' end;

  if v_level <> 'low' then
    select c.label, count(distinct r.user_id)
      into v_top_label, v_top_users
      from public.review_incidents ri
      join public.reviews r on r.id = ri.review_id
      join public.incident_categories c on c.category = ri.category
     where ri.route_id = p_route_id
       and ri.created_at > now() - interval '12 months'
     group by c.label
     order by count(*) desc, c.label
     limit 1;

    if v_top_label is not null then
      v_note := v_top_users
                || case when v_top_users = 1 then ' hiker reported: ' else ' hikers reported: ' end
                || lower(v_top_label);
    end if;
  end if;

  update public.routes
     set avg_rating               = v_avg_rating,
         avg_perceived_difficulty = v_avg_pd,
         review_count             = coalesce(v_count, 0),
         completion_rate          = v_completion,
         effective_difficulty     = v_eff,
         community_hazard_level   = v_level,
         community_hazard_note    = v_note,
         stats_updated_at         = now()
   where id = p_route_id;
end;
$$;

-- Apply the new rule to every route now rather than at its next review.
select public.recalc_route_stats(id) from public.routes;

-- 6. Leftovers from the removed weather job -----------------------------------
drop table if exists public.job_runs;
