-- 072: The two domes get bigger. Bounce House (Rams) goes to 82,000 and Prismarine Stadium (Guardians) to 75,000.
-- The Bone Yard (Skeletons) sat right at that size, so it drops 5,000 to 71,000 to make room.
update public.stadiums set capacity = 82000, updated_at = now() where team_id = 'ddc';
update public.stadiums set capacity = 75000, updated_at = now() where team_id = 'ocm';
update public.stadiums set capacity = 71000, updated_at = now() where team_id = 'ntw';
