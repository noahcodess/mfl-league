// Loads what the game engine needs to line two teams up: every player's ratings and archetype plus his injury ratings,
// and each team's coach (scheme, personality, coach ratings) for the play callers, then builds both lineups and kick
// teams. Works offline in demo mode with stand-in ratings and default coaches.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { getTeam } from './teams.js';
import { getPlayers } from './players.js';
import { buildLineup } from '../lib/simLineup.js';
import { buildKickTeams } from '../lib/simKickTeams.js';
import { activeInjuries } from './injuries.js';

const chunks = (a, n) => a.length ? [a.slice(0, n), ...chunks(a.slice(n), n)] : [];

// A fresh load is kept for 90 seconds, so the intro can start loading the starters and the game picks them up with no wait.
const recent = new Map();
export function loadLineups(teamIds) {
  const key = teamIds.join('|'), hit = recent.get(key);
  if (hit && Date.now() - hit.at < 90000) return hit.p;
  const p = fetchLineups(teamIds); recent.set(key, { at: Date.now(), p }); p.catch(() => recent.delete(key));
  return p;
}

async function fetchLineups(teamIds) {
  const hurt = await activeInjuries().catch(() => ({}));   // injured players sit; their backups start
  const rosters = teamIds.map((id) => getPlayers(id).filter((p) => !hurt[p.id])), ids = rosters.flat().map((p) => p.id), attrs = {}, inj = {}, coaches = {};
  if (!DEMO) {
    await Promise.all(chunks(ids, 150).flatMap((part) => [
      db.from('player_attributes').select('player_id, ratings, style').in('player_id', part).then(({ data }) => (data || []).forEach((r) => { attrs[r.player_id] = r; })),
      db.from('player_injury_ratings').select('player_id, durability, recovery').in('player_id', part).then(({ data }) => (data || []).forEach((r) => { inj[r.player_id] = r; })),
    ]).concat(db.from('coaches').select('team_id, scheme, ratings, brain').in('team_id', teamIds)
      .then(({ data }) => (data || []).forEach((c) => { coaches[c.team_id] = { scheme: c.scheme, ratings: c.ratings, archetype: c.brain?.archetype }; }))));
  }
  return teamIds.map((id, i) => {
    const lineup = buildLineup(getTeam(id), rosters[i], attrs, inj), out = getPlayers(id).filter((p) => hurt[p.id]);
    if (out.length) lineup.problems.unshift(...out.map((p) => `🩹 ${p.name} is out (${hurt[p.id].label}), so his backup plays`));
    return { ...lineup, injured: out.map((p) => ({ id: p.id, name: p.name, position: p.position, ...hurt[p.id] })), kickTeams: buildKickTeams(lineup), coach: coaches[id] || {} };
  });
}

// Returns { home, away } lineups, or null while loading.
export function useGameLineups(homeId, awayId) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let live = true; setState(null);
    if (homeId && awayId) loadLineups([homeId, awayId]).then(([home, away]) => { if (live) setState({ home, away }); });
    return () => { live = false; };
  }, [homeId, awayId]);
  return state;
}
