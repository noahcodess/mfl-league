// Trades: the offers a coach can see (the commissioner sees all), untouchables, the trade block, and every trade button.
import { useEffect, useState } from 'react';
import { db } from './supabase.js';
import { DEMO } from './demo.js';
import { store } from './store.js';
import { toPlayer } from './loadLeague.js';
import { demoTrades } from './tradesDemo.js';
import { currentSeason } from './teams.js';

const clean = (msg = '') => (msg.includes('not allowed') ? 'Only the commissioner can do this.' : msg.replace(/^.*?ERROR:\s*/, '') || 'Could not reach the league server.');
async function call(fn, args) {
  if (DEMO) return {};
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(clean(error.message));
  return data;
}

const toItem = (i) => ({ id: i.id, side: i.side, player: i.player ? toPlayer(i.player) : null,
  pick: i.pick ? { id: i.pick.id, season: i.pick.season, round: i.pick.round, originalCode: i.pick.original_code, ownerId: i.pick.owner_id } : null });

// Newest first: { id, season, from, to, status, note, createdAt, decidedBy, botAt, botVerdict, give: [items], get: [items] }.
export function useTrades(viewerKey, version = 0) {
  const [trades, setTrades] = useState(null);
  useEffect(() => {
    let live = true;
    if (DEMO) { setTrades(demoTrades()); return undefined; }
    db.from('trades').select('*, items:trade_items(*, player:players(*), pick:picks(*))').order('id', { ascending: false }).limit(150)
      .then(({ data }) => {
        if (!live) return;
        setTrades((data || []).map((t) => {
          const items = (t.items || []).map(toItem);
          return { id: t.id, season: t.season, from: t.from_team, to: t.to_team, status: t.status, note: t.note, createdAt: t.created_at, decidedBy: t.decided_by,
            botAt: t.bot_decide_at, botVerdict: t.bot_verdict,
            give: items.filter((i) => i.side === 'give'), get: items.filter((i) => i.side === 'get') };
        }));
      });
    return () => { live = false; };
  }, [viewerKey, version]);
  return trades;
}

// { untouchables: Set(playerId), block: Map(playerId -> addedAt), open: bool, mode: 'auto'|'open'|'closed' }
export function useTradeMarks(version = 0) {
  const [marks, setMarks] = useState({ untouchables: new Set(), block: new Map(), open: false, mode: 'auto' });
  useEffect(() => {
    let live = true;
    if (DEMO) { setMarks({ untouchables: new Set(), block: new Map(), open: true, mode: 'auto' }); return undefined; }
    Promise.all([db.from('untouchables').select('player_id'), db.from('trade_block').select('player_id, added_at'), db.rpc('trades_open'),
      db.from('league_settings').select('value').eq('key', 'trade_window').maybeSingle()])
      .then(([u, b, o, m]) => {
        if (live) setMarks({ untouchables: new Set((u.data || []).map((r) => r.player_id)), block: new Map((b.data || []).map((r) => [r.player_id, r.added_at])), open: o.data === true, mode: m.data?.value || 'auto' });
      });
    return () => { live = false; };
  }, [version]);
  return marks;
}

// A team's players and still-usable picks (this season's draft or later), for the trade builder.
export const teamAssets = (teamId) => ({
  players: store.league.players.filter((p) => p.teamId === teamId && (p.status ?? 'active') === 'active').sort((a, b) => b.stars - a.stars),
  picks: store.league.picks.filter((k) => k.ownerId === teamId && k.season >= currentSeason()).map((k) => ({ ...k, id: k.id ?? `${k.originalCode}-${k.season}-${k.round}` })).sort((a, b) => a.season - b.season || a.round - b.round),
});

const asItem = (x) => (x.position ? { player: x.id } : { pick: x.id });
export const proposeTrade = (to, give, get, note) => call('propose_trade', { p_to: to, p_give: give.map(asItem), p_get: get.map(asItem), p_note: note || null });
export const respondTrade = (id, accept) => call('respond_trade', { p_trade: id, p_accept: accept });
export const cancelTrade = (id) => call('cancel_trade', { p_trade: id });
export const commishTrade = (id, accept) => call('commish_trade', { p_trade: id, p_accept: accept });
export const toggleUntouchable = (playerId) => call('toggle_untouchable', { p_player: playerId });
export const toggleTradeBlock = (playerId) => call('toggle_trade_block', { p_player: playerId });
export const setTradeWindow = (mode) => call('set_trade_window', { p_mode: mode });

// Opens the trade builder from anywhere (a player card, the draft room...). TradeLauncher listens for this.
export const openTradeBuilder = (detail = {}) => window.dispatchEvent(new CustomEvent('mfl-trade', { detail }));
