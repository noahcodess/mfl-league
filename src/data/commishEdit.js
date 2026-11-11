// Commissioner edits: team details, team logos (upload to storage, then point the team at it), and any player field.
import { db } from './supabase.js';
import { DEMO } from './demo.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, ''));

async function rpc(fn, args) {
  if (DEMO) return {};
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}

export const updateTeam = (teamId, t) => rpc('commish_update_team', {
  p_team: teamId, p_location: t.location, p_nickname: t.nickname, p_code: t.code, p_conference: t.conference, p_color: t.color, p_accent: t.accent,
});

// blob = a checked PNG from prepareLogo. A new file name every time so browsers don't show the old logo from cache.
export async function uploadTeamLogo(teamId, blob) {
  if (DEMO) return;
  const path = `${teamId}-${Date.now()}.png`;
  const { error } = await db.storage.from('team-logos').upload(path, blob, { contentType: 'image/png', upsert: false });
  if (error) throw new Error(error.message.includes('row-level') ? 'Only the commissioner can upload logos.' : error.message);
  const { data } = db.storage.from('team-logos').getPublicUrl(path);
  await rpc('set_team_logo', { p_team: teamId, p_url: data.publicUrl });
}

export const resetTeamLogo = (teamId) => rpc('set_team_logo', { p_team: teamId, p_url: null });

// fields: any of name, number, position, age, stars, potential, height_in, weight_lb, depth, team ('' = free agency), per_year, years_left.
export const updatePlayer = (playerId, fields) => rpc('commish_update_player', { p_player: playerId, p: fields });

// The commissioner can read potentials; null if not rated.
export async function playerPotential(playerId) {
  if (DEMO) return null;
  const { data } = await db.from('player_potential').select('potential').eq('player_id', playerId).maybeSingle();
  return data?.potential == null ? null : Number(data.potential);
}
