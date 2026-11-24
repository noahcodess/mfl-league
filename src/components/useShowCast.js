// The award show's cast, built from its slides: each award's three nominees as stage sprites (players in their team's
// home uniform, coaches in their coach art), every team logo the graphics need, and each Game of the Year finalist's two
// teams. ready: false until the uniforms are loaded.
import { useEffect, useState } from 'react';
import { db } from '../data/supabase.js';
import { DEMO } from '../data/demo.js';
import { getAllPlayers } from '../data/players.js';
import { getTeam } from '../data/teams.js';
import { homeKit } from '../data/jerseys.js';
import { helmetDesign } from '../data/drip.js';
import { useCoaches } from '../data/coaches.js';
import { coachLooks } from '../lib/coachLooks.js';
import { coachUrl } from '../lib/coachDraw.js';
import { makeNominee } from '../lib/stageActors.js';

const image = (src) => { const i = new Image(); i.src = src; return i; };

export default function useShowCast(slides) {
  const coaches = useCoaches(), [cast, setCast] = useState({ nominees: {}, logos: {}, games: {}, teamName: () => '', ready: false });
  useEffect(() => {
    if (!slides.length || !coaches) return undefined;
    let live = true;
    (async () => {
      const players = Object.fromEntries(getAllPlayers().map((p) => [p.id, p])), nominees = {}, teamIds = new Set(), kits = {};
      const people = slides.filter((s) => s.kind === 'finalists' && !s.game);
      people.forEach((s) => s.onStage.forEach((e) => e.team && teamIds.add(e.team)));
      await Promise.all([...teamIds].map(async (id) => { const t = getTeam(id); if (t) kits[id] = await homeKit(t).catch(() => null); }));
      people.forEach((s) => {
        nominees[s.key] = s.onStage.map((e) => {
          const team = getTeam(e.team), coach = s.key === 'coy' ? coaches[e.team] : null;
          return makeNominee(e, { player: players[e.id], kit: kits[e.team] || { helmet: '#888', jersey: team?.color || '#555', numbers: '#fff', pants: '#ddd', socks: '#555', mask: '#222', stripe: '#fff', trim: '#fff' },
            design: helmetDesign(team), team, coachImg: coach || s.key === 'coy' ? image(coachUrl(coachLooks(coach || { team_id: e.team }, team))) : null });
        });
      });
      const gameIds = slides.filter((s) => s.kind === 'finalists' && s.game).flatMap((s) => s.onStage.map((e) => Number(e.id))).filter(Boolean), games = {};
      if (gameIds.length && !DEMO) {
        const { data } = await db.from('games').select('id, home_team, away_team, home_score, away_score, week').in('id', gameIds);
        (data || []).forEach((g) => { games[g.id] = { home: g.home_team, away: g.away_team, hs: g.home_score, as: g.away_score, week: g.week }; teamIds.add(g.home_team); teamIds.add(g.away_team); });
      }
      slides.forEach((s) => (s.onStage || []).forEach((e) => e.team && teamIds.add(e.team)));
      const logos = Object.fromEntries([...teamIds].map((id) => [id, getTeam(id)?.logo]).filter(([, l]) => l).map(([id, l]) => [id, image(l)]));
      if (live) setCast({ nominees, logos, games, teamName: (id) => getTeam(id)?.name || '', ready: true });
    })().catch(() => live && setCast((c) => ({ ...c, ready: true })));
    return () => { live = false; };
  }, [slides, coaches]);
  return cast;
}
