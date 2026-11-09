-- Security: who can read and change what, plus the commissioner key functions.

-- Helpers ------------------------------------------------------------------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where user_id = auth.uid()
$$;

create or replace function public.my_team_id() returns text
language sql stable security definer set search_path = '' as $$
  select team_id from public.profiles where user_id = auth.uid()
$$;

-- True only for the commissioner AND only after he has entered his key (12-hour unlock).
create or replace function public.is_commissioner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.commish_unlocks u on u.user_id = p.user_id
    where p.user_id = auth.uid() and p.role = 'commissioner' and u.expires_at > now()
  )
$$;

-- Commissioner key ---------------------------------------------------------
create or replace function public.commish_key_status() returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.my_role() is distinct from 'commissioner' then raise exception 'not allowed'; end if;
  return case when exists (select 1 from public.commish_key) then 'set' else 'unset' end;
end $$;

-- First-time setup: the commissioner's browser generates the key, shows it once, and sends it here to be hashed.
create or replace function public.set_commish_key(new_key text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.my_role() is distinct from 'commissioner' then raise exception 'not allowed'; end if;
  if exists (select 1 from public.commish_key) then raise exception 'key already set'; end if;
  if length(new_key) < 20 or new_key !~ '[A-Z]' or new_key !~ '[0-9]' or new_key !~ '[^A-Za-z0-9]' then
    raise exception 'key too weak';
  end if;
  insert into public.commish_key (id, key_hash) values (1, extensions.crypt(new_key, extensions.gen_salt('bf', 10)));
  insert into public.commish_unlocks (user_id, expires_at) values (auth.uid(), now() + interval '12 hours')
    on conflict (user_id) do update set expires_at = excluded.expires_at;
  return true;
end $$;

-- Every login after that: check the key. 5 wrong tries locks it for 15 minutes.
create or replace function public.unlock_commish(key text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  locked timestamptz;
  h text;
begin
  if public.my_role() is distinct from 'commissioner' then raise exception 'not allowed'; end if;
  select locked_until into locked from public.commish_attempts where user_id = auth.uid();
  if locked is not null and locked > now() then raise exception 'locked'; end if;
  select key_hash into h from public.commish_key where id = 1;
  if h is null then raise exception 'no key set'; end if;
  if extensions.crypt(key, h) = h then
    delete from public.commish_attempts where user_id = auth.uid();
    insert into public.commish_unlocks (user_id, expires_at) values (auth.uid(), now() + interval '12 hours')
      on conflict (user_id) do update set expires_at = excluded.expires_at;
    return true;
  end if;
  insert into public.commish_attempts (user_id, failed) values (auth.uid(), 1)
    on conflict (user_id) do update set
      failed = case when public.commish_attempts.failed + 1 >= 5 then 0 else public.commish_attempts.failed + 1 end,
      locked_until = case when public.commish_attempts.failed + 1 >= 5 then now() + interval '15 minutes' else null end;
  return false;
end $$;

create or replace function public.lock_commish() returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.commish_unlocks where user_id = auth.uid()
$$;

create or replace function public.clear_must_change() returns void
language sql volatile security definer set search_path = '' as $$
  update public.profiles set must_change_password = false where user_id = auth.uid()
$$;

-- Only signed-in users may call these; anonymous visitors may not.
revoke execute on function public.my_role(), public.my_team_id(), public.is_commissioner(), public.commish_key_status(),
  public.set_commish_key(text), public.unlock_commish(text), public.lock_commish(), public.clear_must_change() from public, anon;
grant execute on function public.my_role(), public.my_team_id(), public.is_commissioner(), public.commish_key_status(),
  public.set_commish_key(text), public.unlock_commish(text), public.lock_commish(), public.clear_must_change() to authenticated;

-- Read rules ---------------------------------------------------------------
create policy "anyone reads league settings" on public.league_settings for select to anon, authenticated using (true);
create policy "anyone reads teams" on public.teams for select to anon, authenticated using (true);
create policy "anyone reads players" on public.players for select to anon, authenticated using (true);
create policy "anyone reads picks" on public.picks for select to anon, authenticated using (true);
create policy "signed-in users read import issues" on public.import_issues for select to authenticated using (true);
create policy "own team or commissioner reads potential" on public.player_potential for select to authenticated using (
  public.is_commissioner()
  or exists (select 1 from public.players p where p.id = player_id and p.team_id = public.my_team_id())
);
create policy "read own profile, commissioner reads all" on public.profiles for select to authenticated using (
  user_id = auth.uid() or public.is_commissioner()
);

-- Write rules: the unlocked commissioner only (coach edits come later through checked functions) ---------
create policy "commissioner writes settings" on public.league_settings for all to authenticated using (public.is_commissioner()) with check (public.is_commissioner());
create policy "commissioner writes teams" on public.teams for all to authenticated using (public.is_commissioner()) with check (public.is_commissioner());
create policy "commissioner writes players" on public.players for all to authenticated using (public.is_commissioner()) with check (public.is_commissioner());
create policy "commissioner writes potential" on public.player_potential for all to authenticated using (public.is_commissioner()) with check (public.is_commissioner());
create policy "commissioner writes picks" on public.picks for all to authenticated using (public.is_commissioner()) with check (public.is_commissioner());
create policy "commissioner writes import issues" on public.import_issues for all to authenticated using (public.is_commissioner()) with check (public.is_commissioner());
