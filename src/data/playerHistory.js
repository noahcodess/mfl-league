// A player's career on the site: every team he's been on and the deals he signed there (oldest first), his draft spot,
// and his trades (including the ones from before the site, loaded from the commissioner's trade posts).
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { contractOf } from './contracts.js';

const toDeal = (c) => ({ teamId: c.team_id, source: c.source, status: c.status, perYear: c.per_year, total: c.total, firstSeason: c.first_season, lastSeason: c.last_season });

// Back-to-back deals with the same team are one stint.
function toStints(deals) {
  const stints = [];
  deals.forEach((d) => {
    const last = stints[stints.length - 1];
    if (last && last.teamId === d.teamId) { last.deals.push(d); last.to = Math.max(last.to, d.lastSeason); }
    else stints.push({ teamId: d.teamId, from: d.firstSeason, to: d.lastSeason, deals: [d] });
  });
  return stints;
}

const toMove = (m) => ({ id: m.id, from: m.from_team, to: m.to_team, at: m.happened_at, season: m.season, note: m.note });

// Returns null while loading, then { stints, drafted, moves } where drafted = { season, round, pick, teamId } or null
// and moves = trades, newest first.
export function usePlayerHistory(player) {
  const [history, setHistory] = useState(null);
  useEffect(() => {
    let live = true;
    const drafted = player.draftPick ? { season: player.draftSeason, round: player.draftRound, pick: player.draftPick, teamId: player.draftedBy } : null;
    if (DEMO) {
      const c = contractOf(player);
      setHistory({ stints: c && player.teamId ? toStints([{ ...c, teamId: player.teamId, status: 'active' }]) : [], drafted,
        moves: player.teamId === 'snm' ? [{ id: 1, from: 'wrf', to: 'snm', at: '2025-11-11T20:07:00Z', note: 'Traded for DT Christopher Diaz and a Season 9 2nd-round pick' }] : [] });
      return undefined;
    }
    Promise.all([
      db.from('contracts').select('team_id, source, status, per_year, total, first_season, last_season').eq('player_id', player.id).order('first_season').order('id'),
      db.from('player_moves').select('*').eq('player_id', player.id).order('happened_at', { ascending: false }),
    ]).then(([deals, moves]) => {
      if (live) setHistory({ stints: toStints((deals.data || []).map(toDeal)), drafted, moves: (moves.data || []).map(toMove) });
    });
    return () => { live = false; };
  }, [player.id]);
  return history;
}

export const DEAL_SOURCE = { draft: 'Rookie deal', free_agency: 'Signed in free agency', resign: 'Re-signed', import: 'On the roster when the site started' };
export const DEAL_STATUS = { active: 'Current deal', expired: 'Ended', released: 'Released', retired: 'Retired' };
