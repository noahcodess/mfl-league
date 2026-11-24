-- 101b: one-time cleanup. Last night's TEST-mode awards and ceremony (made before 101's reset trigger existed) leaked
-- into today's TEST session; this clears them, and any old Rookie of the Year rows (now split into two awards).
delete from public.season_awards where in_test or award = 'roy';
delete from public.award_ceremony where in_test;
