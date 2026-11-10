-- Street free agents: brand new players generated each offseason so rosters can always be filled, season after season.
-- Mostly American; the international share adapts so the league drifts toward ~18% international over a few seasons.

create or replace function public.random_name(p_country text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare firsts text[]; lasts text[];
begin
  case p_country
    when 'Nigeria' then firsts := '{Chukwuemeka,Oluwaseun,Babatunde,Emeka,Tobi,Femi,Chidi,Kelechi,Uchenna,Ifeanyi}'; lasts := '{Okafor,Adeyemi,Nwosu,Balogun,Okonkwo,Eze,Adebayo,Obi,Nnamdi,Uzoma,Ogunleye}';
    when 'Ghana' then firsts := '{Kwame,Kofi,Yaw,Kwabena,Kojo}'; lasts := '{Mensah,Asante,Boateng,Owusu,Appiah,Darko}';
    when 'Jamaica' then firsts := '{Damar,Andre,Rohan,Kemar,Shane}'; lasts := '{Campbell,Barrett,McKenzie,Grant,Ellis,Thompson}';
    when 'Samoa' then firsts := '{Tavita,Sione,Iosefa,Malakai,Pita}'; lasts := '{Fuimaono,Tuilagi,Leiataua,Aumua,Sopoaga}';
    when 'Tonga' then firsts := '{Viliami,Tevita,Siaosi,Lisiate}'; lasts := '{Havili,Fifita,Tupou,Kioa,Mahe}';
    when 'Canada' then firsts := '{Liam,Owen,Brody,Carter,Nolan,Ethan,Logan}'; lasts := '{Tremblay,Gagnon,MacDonald,Bouchard,Sinclair,Roy,Pelletier}';
    when 'England' then firsts := '{Harry,Alfie,Jack,Reece,Callum,George}'; lasts := '{Whitmore,Ashworth,Pemberton,Fairbanks,Holloway,Thornton}';
    when 'Australia' then firsts := '{Lachlan,Cooper,Jayden,Hamish,Riley}'; lasts := '{Brennan,Ashby,Gallagher,Kowalczyk,Fitzgerald,Barker}';
    when 'Germany' then firsts := '{Lukas,Jonas,Moritz,Felix,Niklas,Leon}'; lasts := '{Schneider,Becker,Hoffmann,Vogel,Krause,Wagner,Brandt}';
    when 'Mexico' then firsts := '{Diego,Santiago,Emiliano,Mateo,Alejandro}'; lasts := '{Herrera,Villanueva,Castañeda,Ibarra,Salazar,Rojas}';
    when 'Brazil' then firsts := '{Thiago,Gabriel,Rafael,Lucas,Bruno}'; lasts := '{Oliveira,Carvalho,Pereira,Souza,Almeida}';
    when 'France' then firsts := '{Mathis,Hugo,Théo,Enzo,Lucas}'; lasts := '{Lefebvre,Moreau,Girard,Fontaine,Lambert}';
    else firsts := '{Trey,Jaxon,Malik,Brooks,Dante,Kade,Zion,Tate,Jalen,Marcus,Devin,Caleb,Isaiah,Tyler,Cole,Bryce,Dillon,Andre,Cameron,Xavier,Jordan,Darius,Elijah,Mason,Hunter,Wyatt,Jaylen,Trent,Reggie,Nate,Colby,Austin,Damon,Keon,Tre,Grant,Chase,Miles,Quinton,Rashad}';
         lasts := '{Holloway,Pruitt,Vance,Crenshaw,Whitfield,Beasley,Galloway,Rhodes,Simmons,Dawson,Hayes,Tucker,Mercer,Boone,Fletcher,Gaines,Hardy,Lockett,Mabry,Nolan,Owens,Pace,Quarles,Rowe,Sutton,Tillman,Underwood,Vaughn,Wade,Yates,Ballard,Carver,Dorsey,Easley,Frazier,Hollis,Ingram,Jeter,Kirby,Lyle,Manning,Norwood,Oakes,Pridgen,Rucker,Stroud,Talley,Upshaw,Whitlock,Bynum,Cromartie,Dukes,Eubanks,Funches,Gentry,Haskins,Irby,Jamison,Kearse,Lattimore}';
  end case;
  return firsts[1 + floor(random() * array_length(firsts, 1))::int] || ' ' || lasts[1 + floor(random() * array_length(lasts, 1))::int];
end $$;

create or replace function public.generate_free_agents(p_count int) returns int
language plpgsql security definer set search_path = '' as $$
declare
  season int := public.setting_int('current_season');
  intl_now numeric := (select count(*) filter (where nationality <> 'USA')::numeric / greatest(count(*), 1) from public.players where status <> 'retired');
  intl_chance numeric := least(0.35, greatest(0.10, (0.18 - intl_now) * 3 + 0.10));
  countries text[] := '{Nigeria,Nigeria,Ghana,Jamaica,Samoa,Samoa,Tonga,Canada,Canada,England,Australia,Germany,Mexico,Mexico,Brazil,France}';
  pos text; country text; nm text; age int; stars numeric; pot numeric; i int; tries int; pid text; made int := 0;
begin
  for i in 1 .. p_count loop
    -- Position: wherever the league has the most open roster spots right now.
    select rt.position into pos from public.roster_template rt
      order by (16 * (rt.starters + rt.backups) - (select count(*) from public.players x where x.position = rt.position and x.status = 'active' and x.team_id is not null)
                - (select count(*) from public.players x where x.position = rt.position and x.status = 'free_agent')) + random() * 3 desc limit 1;
    country := case when random() < intl_chance then countries[1 + floor(random() * array_length(countries, 1))::int] else 'USA' end;
    tries := 0;
    loop
      nm := public.random_name(country);
      exit when not exists (select 1 from public.players where name = nm) or tries > 20;
      tries := tries + 1;
    end loop;
    age := 21 + floor(random() * 6)::int;
    stars := (array[1.5, 2, 2, 2, 2.5, 2.5, 2.5, 2.5, 3, 3, 3, 3.5])[1 + floor(random() * 12)::int];
    pot := least(5, stars + case when age <= 22 then (array[1, 1.5, 2])[1 + floor(random() * 3)::int]
                               when age <= 24 then (array[0, 0.5, 1, 1.5])[1 + floor(random() * 4)::int] else 0 end);
    pid := format('fa%s-%s', season, substr(md5(random()::text), 1, 6));
    insert into public.players (id, team_id, name, position, depth, slot, stars, elite, age, mood, nationality, notes, status)
    values (pid, null, nm, pos, null, null, stars, false, age, 'normal', country, '{}', 'free_agent');
    insert into public.player_potential (player_id, potential) values (pid, pot);
    made := made + 1;
  end loop;
  return made;
end $$;

revoke execute on function public.random_name(text), public.generate_free_agents(int), public.wants_to_test_market(public.players),
  public.assign_number(text, text), public.place_depth(text, text), public.join_team(text, text) from public, anon, authenticated;
