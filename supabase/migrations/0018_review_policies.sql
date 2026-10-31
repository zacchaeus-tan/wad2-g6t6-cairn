-- Hikers edit and delete their own reviews, and admins delete anyone's. Same
-- rules as 0004 and 0005, repeated because the live database has differed from
-- those files before, and a missing delete policy fails silently: the request
-- succeeds and removes nothing. Safe to run more than once.

drop policy if exists "Users can update their own reviews" on public.reviews;
create policy "Users can update their own reviews"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own reviews" on public.reviews;
create policy "Users can delete their own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

drop policy if exists "Admins can moderate reviews" on public.reviews;
create policy "Admins can moderate reviews"
  on public.reviews for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists "Users manage notes on their own review" on public.review_incidents;
create policy "Users manage notes on their own review"
  on public.review_incidents for all
  using (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));

drop policy if exists "Admins can moderate incident notes" on public.review_incidents;
create policy "Admins can moderate incident notes"
  on public.review_incidents for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
