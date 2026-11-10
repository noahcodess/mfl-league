-- Season results and the draft order.
-- team_seasons keeps every team's record and playoff finish, season by season (the start of the league's history:
-- Craft Bowls, legacy and the player decision brain will read from it). Season 7: the Axolotls (LSC) won Craft Bowl VII
-- over the Crimson Dragons (CRF).
-- Draft order: teams that missed the playoffs first (worst record first, worse point differential breaks ties), then
-- playoff teams by how far they got, the Craft Bowl loser 15th and the champion last. Same order every round.
-- Rookies: all 21 or 22, about 68% at 21.

create table public.team_seasons (
  team_id text not null references public.teams(id) on update cascade,
  season int not null,
  wins int not null, losses int not null, conf_wins int not null, conf_losses int not null,
  points_for int not null, points_against int not null,
  seed int,
  playoff text not null check (playoff in ('missed', 'divisional', 'conference', 'craft_bowl_loss', 'champion')),
  primary key (team_id, season)
);
alter table public.team_seasons enable row level security;
create policy "anyone reads season results" on public.team_seasons for select to anon, authenticated using (true);

insert into public.team_seasons values
  ('lsc', 7, 11, 1, 6, 1, 321, 203, 1, 'champion'),
  ('tga', 7, 11, 1, 6, 1, 299, 210, 2, 'conference'),
  ('snm', 7, 9, 3, 5, 2, 287, 199, 3, 'divisional'),
  ('flf', 7, 8, 4, 5, 2, 266, 237, 4, 'divisional'),
  ('ddc', 7, 6, 6, 3, 4, 273, 246, null, 'missed'),
  ('pln', 7, 3, 9, 2, 5, 220, 277, null, 'missed'),
  ('ocn', 7, 2, 10, 1, 6, 174, 279, null, 'missed'),
  ('drf', 7, 2, 10, 0, 7, 175, 292, null, 'missed'),
  ('crf', 7, 11, 1, 7, 0, 310, 214, 1, 'craft_bowl_loss'),
  ('void', 7, 10, 2, 5, 2, 350, 212, 2, 'conference'),
  ('edc', 7, 7, 5, 4, 3, 254, 232, 3, 'divisional'),
  ('ntw', 7, 6, 6, 5, 2, 253, 239, 4, 'divisional'),
  ('wsl', 7, 5, 7, 3, 4, 224, 259, null, 'missed'),
  ('ocm', 7, 4, 8, 3, 4, 194, 271, null, 'missed'),
  ('wrf', 7, 1, 11, 1, 6, 194, 289, null, 'missed'),
  ('dst', 7, 0, 12, 0, 7, 142, 277, null, 'missed');

create table public.draft_order (
  season int not null, slot int not null, team_id text not null references public.teams(id) on update cascade,
  primary key (season, slot), unique (season, team_id)
);
alter table public.draft_order enable row level security;
create policy "anyone reads the draft order" on public.draft_order for select to anon, authenticated using (true);

-- Builds a draft's order from the season before it.
create or replace function public.set_draft_order(p_season int) returns int
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.team_seasons where season = p_season - 1) then raise exception 'No results for Season %', p_season - 1; end if;
  delete from public.draft_order where season = p_season;
  insert into public.draft_order (season, slot, team_id)
  select p_season, row_number() over (order by
      case playoff when 'missed' then 0 when 'divisional' then 1 when 'conference' then 2 when 'craft_bowl_loss' then 3 else 4 end,
      wins, points_for - points_against, random()), team_id
  from public.team_seasons where season = p_season - 1;
  return (select count(*) from public.draft_order where season = p_season);
end $$;
revoke execute on function public.set_draft_order(int) from public, anon, authenticated;

select public.set_draft_order(8);

-- Rookie ages: 21 or 22, about 68% at 21.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.generate_draft_class(integer,integer)'::regprocedure);
  execute replace(d, 'age := (array[21, 21, 21, 21, 22, 22, 22, 22, 23, 23])[1 + floor(random() * 10)::int];',
                     'age := case when random() < 0.68 then 21 else 22 end;');
end $$;
update public.players set age = case when random() < 0.68 then 21 else 22 end where status = 'prospect';
update public.players set college_stats = jsonb_set(college_stats, '{class}', to_jsonb(case when age >= 22 then 'Senior' else 'Junior (early entry)' end))
  where status = 'prospect';
