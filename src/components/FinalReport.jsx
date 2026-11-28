// The end-of-game show, after the clock hits 0 and the camera holds on the field: the network's transition, FINAL with
// the score (to applause), the plays of the game replayed (always), then one graphic, sometimes two, picked by what
// mattered most (postGameSlides): the matchup of the game, the game flow, a storyline, a drastic ranking jump or the final
// numbers. Never more than three after the score. As the last transition covers the screen it hands off to the game page
// (onFinal), which finishes on the score, FINAL and the Player of the Game. No award-show sounds here.
import React, { useEffect, useMemo, useRef } from 'react';
import BreakShow from './BreakShow.jsx';
import PlaySlide from './PlaySlide.jsx';
import RankClimb from './RankClimb.jsx';
import { StoryCard } from './HalftimeCards.jsx';
import { PostNumbers, PostMatchup, PostFlow } from './PostGameCards.jsx';
import { playsOfTheGame } from '../lib/playsOfGame.js';
import { clipFor } from '../lib/replayClip.js';
import { rankMoves } from '../lib/finalRanks.js';
import { pickPostGame, gameFlow } from '../lib/postGameSlides.js';
import { teamLines } from '../lib/halftimeStats.js';
import { gameWhen, isPlayoffGame } from '../lib/playoffRounds.js';
import { playerOfGame } from '../lib/playerOfGame.js';
import { createShowAudio } from '../lib/showAudio.js';
import { getTeams } from '../data/teams.js';
import { finalText } from '../data/gameState.js';

const MS = { rank: 6000, matchup: 6800, flow: 6800, story: 5800, numbers: 7200 };

// game: the finished game. teams: { home, away }. sideOf: player id → side. people: id → player. film: { lineups, looks,
// seed }. finale: { match, season, onFinal }. snd: the broadcast's sound settings.
export default function FinalReport({ game, teams, sideOf, people, bc, film, finale, snd }) {
  const last = game.plays[game.plays.length - 1], score = { ...last.after.score }, label = finalText(4 + (game.overtimes || 0)).toUpperCase();
  const win = score.home > score.away ? 'home' : 'away', sfx = useRef(null);
  useEffect(() => { sfx.current = createShowAudio(['applause', 'cheer']); const t = setTimeout(() => sfx.current?.play('applause', { gain: 0.5, fadeAfter: 3 }), 900); return () => { clearTimeout(t); sfx.current?.close(); }; }, []);
  useEffect(() => { sfx.current?.setVolume(snd?.on ? (snd.vol ?? 0.7) : 0); }, [snd?.on, snd?.vol]);
  const best = useMemo(() => (film.lineups ? playsOfTheGame(game.plays).map((p) => ({ p, clip: clipFor(p, film.lineups, film.seed) })) : []), [game.plays, film.lineups, film.seed]);
  const { story, picks } = useMemo(() => {
    const moves = rankMoves(finale.season?.weeks || [], { id: finale.match.id, home: teams.home.id, away: teams.away.id }, score, getTeams(), isPlayoffGame(finale.match));
    const out = pickPostGame(game.plays, sideOf, score, game.overtimes || 0, moves);
    const dev = import.meta.env.DEV && new URLSearchParams(window.location.search).get('devpost');   // dev: ?devpost=rank,flow forces those graphics
    if (dev) out.picks = dev.split(',').map((k) => (k === 'rank' && moves[0] ? { kind: k, m: { ...moves[0], rows: [...moves[0].rows].sort((a, b) => (b.id === moves[0].team) - (a.id === moves[0].team)), from: 7, to: 1 } } : k === 'flow' ? { kind: k, flow: gameFlow(game.plays), win, deficit: 12, changes: 0 } : { kind: k })).filter((x) => x.kind !== 'rank' || x.m);
    return out;
  }, [finale.season]); // eslint-disable-line react-hooks/exhaustive-deps
  const potg = useMemo(() => {
    const rows = Object.entries(game.players || {}).map(([id, s]) => ({ player_id: id, team_id: teams[sideOf[id]]?.id, stats: s })).filter((r) => r.team_id);
    return playerOfGame(rows, score.home >= score.away ? teams.home.id : teams.away.id);
  }, [game.players]); // eslint-disable-line react-hooks/exhaustive-deps
  const title = () => (
    <div className="ht-title fr-title">
      <img className="ht-net" src={bc.prime ? bc.show.logo : bc.net.logo} alt="" />
      <h2 className="hf">{label}</h2>
      <div className="ht-score">
        {['away', 'home'].map((k) => <div key={k} className={`ht-team ${k}${k === win ? ' won' : ''}`} style={{ '--tc': teams[k].color }}><img src={teams[k].logo} alt="" /><b className="hf">{score[k]}</b><span>{teams[k].code}</span></div>)}
      </div>
      <small>{gameWhen(finale.match)} · {teams.home.name} {finale.match.kind === 'craft_bowl' ? 'vs' : 'host'} {teams.away.name}</small>
    </div>
  );
  const graphic = (pk) => ({
    rank: () => <RankClimb m={pk.m} sfx={sfx.current} />,
    matchup: () => <PostMatchup pick={pk} teams={teams} people={people} win={win} />,
    flow: () => <PostFlow pick={pk} teams={teams} />,
    story: () => <StoryCard st={pk.st} people={people} teams={teams} after />,
    numbers: () => <PostNumbers lines={teamLines(story.teams, bc.prime ? bc.show.key : bc.net.key)} teams={teams} />,
  }[pk.kind]);
  const steps = [
    { ms: 5600, render: title },
    ...(best.length ? [{ sting: true }, ...best.map(({ p, clip }, k) => ({ ms: clip.ms, render: () => <PlaySlide label={`Highlights · ${k + 1} of ${best.length}`} play={p} clip={clip} teams={teams} looks={film.looks} /> }))] : []),
    ...picks.flatMap((pk) => [{ sting: true }, { ms: MS[pk.kind], render: graphic(pk) }]),
  ];
  const handOff = () => finale.onFinal?.({ score, label, potg, home: teams.home.id, away: teams.away.id, net: bc.net.key });
  return <BreakShow net={bc.net} steps={steps} onReveal={handOff} className="ht fr" />;
}
