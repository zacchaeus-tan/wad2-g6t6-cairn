-- Route pages now show weather warnings straight from the forecast, so route
-- alerts are kept for trail notices (closures, damage, hazard reports) and the
-- check-weather job that queued weather alerts has been removed.

-- Stop the daily call to the removed function, if it was scheduled.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where command ilike '%check-weather%';
  end if;
end $$;

-- Take down the weather alerts it left behind, so they leave the admin queue
-- and route pages. 'expired' keeps them in the table as a record.
update public.route_alerts
set status = 'expired'
where source = 'weather'
  and status in ('pending', 'active');
