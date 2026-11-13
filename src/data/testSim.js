// "Test to season": turns TEST mode on, then runs the rest of the offseason for real inside TEST: every step, every free agency
// round, the whole draft (simmed, no reveals), a fresh schedule with the best games in primetime, and training camp to Week 1.
// say(text) reports each stage for the loading screen. Leaving TEST mode undoes all of it.
import { db } from './supabase.js';
import { enterSandbox } from './sandbox.js';
import { advanceOffseason } from './leagueEngine.js';
import { runFaRound } from './freeAgency.js';
import { startDraft, simDraft } from './draftActions.js';
import { generateSeasonSchedule, bestGamesToPrimetime } from './scheduleMaker.js';
import { FA_WINDOW } from './teams.js';

const STEP_NAMES = ['Birthday & Farewell', 'Re-signing', 'Free agency', 'the draft step', 'Training camp'];
const KEYS = ['phase', 'offseason_step', 'fa_round', 'fa_rounds', 'current_season', 'sandbox'];

async function settings() {
  const { data, error } = await db.from('league_settings').select('key, value').in('key', KEYS);
  if (error) throw new Error('Could not read the league settings.');
  return Object.fromEntries(data.map((r) => [r.key, r.value]));
}

async function ensureSchedule(season, say) {
  const games = ((await db.rpc('season_games', { p_season: season })).data || []).filter((g) => g.kind === 'regular');
  if (games.length) return;
  say('Making the Week 1 to 12 schedule');
  await generateSeasonSchedule(season);
  say('Sending the best games to primetime');
  await bestGamesToPrimetime(season);
}

export async function simToSeason(say) {
  let s = await settings();
  if (s.sandbox !== true) { say('Turning on TEST mode (saving the real league)'); await enterSandbox(); s = await settings(); }
  for (let guard = 0; guard < 12 && s.phase === 'offseason'; guard += 1) {
    const step = s.offseason_step ?? 0;
    if (step === FA_WINDOW) {
      while ((s.fa_round ?? 0) < (s.fa_rounds ?? 4)) { say(`Free agency round ${(s.fa_round ?? 0) + 1} of ${s.fa_rounds ?? 4}`); await runFaRound(); s = await settings(); }
      const room = (await db.from('draft_room').select('status').eq('season', s.current_season).maybeSingle()).data;
      if (room?.status !== 'done') {
        say('Simming the draft (every pick, no reveals)');
        if (!room) await startDraft();
        await simDraft();
      }
    }
    if (step === 4) await ensureSchedule(s.current_season, say);
    say(`Running ${STEP_NAMES[step] || `step ${step + 1}`}`);
    await advanceOffseason();
    s = await settings();
  }
  if (s.phase === 'offseason') throw new Error('The sim stopped before the season started. Check the Offseason tab.');
  await ensureSchedule(s.current_season, say);
  return s;
}
