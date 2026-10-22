-- Admin page, phase 2: the check-weather job suggests alerts from forecasts.
--
-- The job inserts alerts as 'pending' and skips any it has raised before, so
-- an admin who dismisses one is not asked about it again. That needs a real
-- unique constraint: PostgREST's upsert cannot target the partial index 0012
-- created. Manual alerts have no external_ref, and nulls never clash, so they
-- are unaffected.
drop index if exists public.route_alerts_external_uniq;
alter table public.route_alerts drop constraint if exists route_alerts_external_key;
alter table public.route_alerts add constraint route_alerts_external_key
  unique (route_id, source, external_ref);

-- One row per run of a scheduled job, so the admin page can show when each
-- one last ran and whether it worked.
create table if not exists public.job_runs (
  id          uuid primary key default gen_random_uuid(),
  job         text not null,
  status      text not null default 'running',
  trigger     text not null default 'schedule',
  summary     jsonb,
  error       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.job_runs drop constraint if exists job_runs_status_check;
alter table public.job_runs add constraint job_runs_status_check
  check (status in ('running','success','error'));

alter table public.job_runs drop constraint if exists job_runs_trigger_check;
alter table public.job_runs add constraint job_runs_trigger_check
  check (trigger in ('schedule','manual'));

create index if not exists job_runs_job_started_idx on public.job_runs (job, started_at desc);

-- Written only by edge functions using the service role (no write policy on purpose).
alter table public.job_runs enable row level security;

drop policy if exists "Admins can view job runs" on public.job_runs;
create policy "Admins can view job runs"
  on public.job_runs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
