-- Once a route is marked completed it is locked: the user can no longer change
-- it back to 'saved' or delete it. Replaces the single "for all" policy from
-- 0012 with one policy per action. Deleting the user's account still removes
-- the rows, since the foreign key cascade does not go through RLS.

drop policy if exists "Users manage their own saved routes" on public.user_routes;

drop policy if exists "Users read their own saved routes" on public.user_routes;
create policy "Users read their own saved routes"
  on public.user_routes for select
  using (auth.uid() = user_id);

drop policy if exists "Users save routes" on public.user_routes;
create policy "Users save routes"
  on public.user_routes for insert
  with check (auth.uid() = user_id);

-- using checks the row before the update, so only 'saved' rows can change
drop policy if exists "Users update routes not yet completed" on public.user_routes;
create policy "Users update routes not yet completed"
  on public.user_routes for update
  using (auth.uid() = user_id and status = 'saved')
  with check (auth.uid() = user_id);

drop policy if exists "Users remove routes not yet completed" on public.user_routes;
create policy "Users remove routes not yet completed"
  on public.user_routes for delete
  using (auth.uid() = user_id and status = 'saved');
