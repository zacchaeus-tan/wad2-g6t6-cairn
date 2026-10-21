-- Quiz question 5: the longest trek the user has done.
-- 1 = day hikes only, 2 = overnight (2 days), 3 = 3 days or more.
-- Compared with the route's duration_days in src/lib/matching.js.

alter table public.profiles
  add column if not exists longest_trek_days integer;

alter table public.profiles drop constraint if exists profiles_longest_trek_days_check;
alter table public.profiles add constraint profiles_longest_trek_days_check
  check (longest_trek_days is null or longest_trek_days between 1 and 3);
