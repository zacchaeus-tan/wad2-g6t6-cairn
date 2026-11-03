-- Google sign-ins send the person's name as full_name (or name), not display_name.
-- Same as 0011 otherwise: age, gender and country stay null until they finish their profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, age, gender, country, about)
  values (
    new.id,
    left(coalesce(
      nullif(trim(meta->>'display_name'), ''),
      nullif(trim(meta->>'full_name'), ''),
      nullif(trim(meta->>'name'), ''),
      split_part(new.email, '@', 1)
    ), 60),
    case when meta->>'age' ~ '^\d{1,3}$' and (meta->>'age')::int between 13 and 120
         then (meta->>'age')::int end,
    case when meta->>'gender' in ('female','male','non_binary','prefer_not_to_say')
         then meta->>'gender' end,
    nullif(trim(meta->>'country'), ''),
    nullif(left(trim(meta->>'about'), 500), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
