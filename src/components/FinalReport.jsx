// The end-of-game show, after the clock hits 0 and the bug says FINAL: the network's transition, FINAL with the score,
// the plays of the game replayed (2 to 5), then up to three ranking moves (a team climbing the league's offense or
// defense, or its conference standings, using every game played so far). As the last transition covers the screen it
// hands off to the game page (onFinal), which finishes on the score, FINAL and the Player of the Game.
import React, { useEffect, useMemo, useRef } from 'react';
import BreakShow from './BreakShow.jsx';
import PlaySlide from './PlaySlide.jsx';
import RankClimb from './RankClimb.jsx';
import { playsOfTheGame } from '../lib/playsOfGame.js';
import { clipFor } from '../lib/replayClip.js';
import { rankMoves } from '../lib/finalRanks.js';
import { playerOfGame } from '../lib/playerOfGame.js';
import { createShowAudio } from '../lib/showAudio.js';
import { getTeams } from '../data/teams.js';
import { finalText } from '../data/gameState.js';

// game: the finished game. teams: { home, away }. sideOf: player id → side. film: { lineups, looks, seed }. finale: { match,
// season, onFinal }. snd: the broadcast's sound settings.
export default function FinalReport({ game, teams, sideOf, bc, film, finale, snd }) {
  const last = game.plays[game.plays.length - 1], score = { ...last.after.score }, label = finalText(4 + (game.overtimes || 0)).toUpperCase();
  const sfx = useRef(null);
  useEffect(() => { sfx.current = createShowAudio(); return () => sfx.current?.close(); }, []);
  useEffect(() => { sfx.current?.setVolume(snd?.on ? (snd.vol ?? 0.7) : 0); }, [snd?.on, snd?.vol]);
  const best = useMemo(() => (film.lineups ? playsOfTheGame(game.plays).map((p) => ({ p, clip: clipFor(p, film.lineups, film.seed) })) : []), [game.plays, film.lineups, film.seed]);
  const moves = useMemo(() => rankMoves(finale.season?.weeks || [], { id: finale.match.id, home: teams.home.id, away: teams.away.id }, score, getTeams()).filter(Boolean), [finale.season]); // eslint-disable-line react-hooks/exhaustive-deps
  const potg = useMemo(() => {
    const rows = Object.entries(game.players || {}).map(([id, s]) => ({ player_id: id, team_id: teams[sideOf[id]]?.id, stats: s })).filter((r) => r.team_id);
    return playerOfGame(rows, score.home >= score.away ? teams.home.id : teams.away.id);
  }, [game.players]); // eslint-disable-line react-hooks/exhaustive-deps
  const title = () => (
    <div className="ht-title fr-title">
      <img className="ht-net" src={bc.prime ? bc.show.logo : bc.net.logo} alt="" />
      <h2 className="hf">{label}</h2>
      <div className="ht-score">
        {['away', 'home'].map((k) => <div key={k} className={`ht-team ${k}${score[k] > score[k === 'home' ? 'away' : 'home'] ? ' won' : ''}`} style={{ '--tc': teams[k].color }}><img src={teams[k].logo} alt="" /><b className="hf">{score[k]}</b><span>{teams[k].code}</span></div>)}
      </div>
      <small>Week {finale.match.week} · {teams.home.name} host {teams.away.name}</small>
    </div>
  );
  const steps = [
    { ms: 5600, render: title },
    ...(best.length ? [{ sting: true }, ...best.map(({ p, clip }, k) => ({ ms: clip.ms, render: () => <PlaySlide label={`Plays of the game · ${k + 1} of ${best.length}`} play={p} clip={clip} teams={teams} looks={film.looks} /> }))] : []),
    ...(moves.length ? [{ sting: true }, ...moves.map((m, k) => ({ ms: 6200, render: () => <RankClimb key={k} m={m} sfx={sfx.current} /> }))] : []),
  ];
  const handOff = () => finale.onFinal?.({ score, label, potg, home: teams.home.id, away: teams.away.id, net: bc.net.key });
  return <BreakShow net={bc.net} steps={steps} onReveal={handOff} className="ht fr" />;
}
