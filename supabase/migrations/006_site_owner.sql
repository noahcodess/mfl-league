-- Site owner (Noah): can SEE everything the commissioner sees (all potentials, every account) but change nothing,
-- and never needs the commissioner key. All write rules stay commissioner-only.
alter table public.profiles add column site_owner boolean not null default false;

create or replace function public.is_site_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select site_owner from public.profiles where user_id = auth.uid()), false)
$$;
revoke execute on function public.is_site_owner() from public, anon;
grant execute on function public.is_site_owner() to authenticated;

drop policy "own team or commissioner reads potential" on public.player_potential;
create policy "own team, commissioner or site owner reads potential" on public.player_potential for select to authenticated using (
  public.is_commissioner() or public.is_site_owner()
  or exists (select 1 from public.players p where p.id = player_id and p.team_id = public.my_team_id())
);

drop policy "read own profile, commissioner reads all" on public.profiles;
create policy "read own profile, commissioner or site owner reads all" on public.profiles for select to authenticated using (
  user_id = auth.uid() or public.is_commissioner() or public.is_site_owner()
);
