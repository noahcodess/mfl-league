import React, { useState } from 'react';
import ConfirmButton from './ConfirmButton.jsx';
import GameOdds from './GameOdds.jsx';
import { useSeasonGames, setWeekOrder, setGameTime, setGameWindow, swapWeeks, WINDOWS } from '../data/games.js';
import { currentSeason } from '../data/teams.js';
import { generateSeasonSchedule, bestGamesToPrimetime } from '../data/scheduleMaker.js';
const toInput = (iso) => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

// Commissioner's Desk → Schedule → Regular season games. Generate the 96 games (12 each: 7 conference, 5 other, 6 home),
// then shape each week: drag games into order, send the best matchups to prime time, pick each game's broadcast window
// (Thursday/Saturday/Sunday/Monday night or day games), set kickoff times, or swap whole weeks. Every game shows its rating and each team's chance to win.
export default function SeasonGames({ canControl }) {
  const season = currentSeason();
  const [version, setVersion] = useState(0);
  const [week, setWeek] = useState(1);
  const [drag, setDrag] = useState(null);
  const [error, setError] = useState('');
  const all = useSeasonGames(season, version);
  const games = all && all.filter((g) => g.kind === 'regular');
  const refresh = () => setVersion((v) => v + 1);
  const act = async (fn) => { setError(''); try { await fn(); refresh(); } catch (e) { setError(e.message); } };
  const played = (games || []).some((g) => g.status !== 'scheduled');

  const generate = () => generateSeasonSchedule(season);
  // Best game of each week → Sunday night, next → Monday night, then Thursday and Saturday night; rivalries count as better.
  const bestFirst = () => act(() => bestGamesToPrimetime(season, games));

  if (!games) return <p className="dim">Loading the schedule...</p>;
  if (!games.length) {
    return (
      <section className="card sg-empty">
        <h3>🏈 Season {season} regular season</h3>
        <p>No schedule yet. The generator makes 96 games: every team plays <b>12</b> (<b>7</b> in its conference, <b>5</b> against the other), <b>6 home and 6 away</b>, once a week for 12 weeks. Teams with a better record last season lean toward playing each other.</p>
        <ConfirmButton className="btn big" label="🎲 Generate the schedule" disabled={!canControl} title={`Generate the Season ${season} schedule?`} yes="Generate"
          text="Every coach gets a notice. You can regenerate any time before a game is played." onConfirm={() => act(generate)} />
        {error && <p className="form-error">{error}</p>}
      </section>
    );
  }
  const wk = games.filter((g) => g.week === week);
  const drop = (target) => {
    if (drag == null || drag === target) return;
    const ids = wk.map((g) => g.id);
    ids.splice(ids.indexOf(target), 0, ...ids.splice(ids.indexOf(drag), 1));
    setDrag(null);
    act(() => setWeekOrder(season, week, ids));
  };
  return (
    <div className="sg">
      <div className="sg-tools">
        <button className="btn small" disabled={!canControl} onClick={bestFirst}>⭐ Best matchups to prime time (every week)</button>
        {!played && <ConfirmButton className="btn small ghost" label="🎲 Regenerate" disabled={!canControl} title="Throw this schedule out and make a new one?" yes="Regenerate"
          text="All kickoff times and Thursday picks are lost." onConfirm={() => act(generate)} />}
        <span className="dim">The best games land late in the week: Sunday night, then Monday night. Drag games to reorder a week by hand.</span>
      </div>
      <div className="sg-weeks">{Array.from({ length: 12 }, (_, i) => <button key={i} className={week === i + 1 ? 'on' : ''} onClick={() => setWeek(i + 1)}>W{i + 1}</button>)}</div>
      <div className="sg-weekhead">
        <h3>Week {week}</h3>
        {week > 1 && <button className="btn small ghost" disabled={!canControl} onClick={() => act(() => swapWeeks(season, week, week - 1)).then(() => setWeek(week - 1))}>⬆ Swap with week {week - 1}</button>}
        {week < 12 && <button className="btn small ghost" disabled={!canControl} onClick={() => act(() => swapWeeks(season, week, week + 1)).then(() => setWeek(week + 1))}>⬇ Swap with week {week + 1}</button>}
      </div>
      {error && <p className="form-error">{error}</p>}
      <ol className="sg-list">
        {wk.map((g) => (
          <li key={g.id} draggable={canControl} onDragStart={() => setDrag(g.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(g.id)}
            className={`${drag === g.id ? 'dragging' : ''}${g.prime?.endsWith('night') ? ' prime' : ''}`}>
            <span className="sg-grip" title="Drag to reorder">⠿</span>
            <GameOdds game={g} />
            <span className="sg-controls">
              <select value={g.prime || ''} disabled={!canControl} onChange={(e) => act(() => setGameWindow(g.id, e.target.value))} title="Broadcast window">
                <option value="">📺 Pick a broadcast window</option>
                {WINDOWS.map(([k, label, net]) => <option key={k} value={k}>{label}{net ? ` (${net})` : ' (FOX/CBS)'}</option>)}
              </select>
              <input type="datetime-local" value={toInput(g.starts_at)} disabled={!canControl}
                onChange={(e) => act(() => setGameTime(g.id, e.target.value ? new Date(e.target.value).toISOString() : null))} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
