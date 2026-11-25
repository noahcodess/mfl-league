import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import StarRating from './StarRating.jsx';
import { confClass } from './ConfStandings.jsx';
import { getTeams, getConferences, currentSeason } from '../data/teams.js';
import { useSeasonGames } from '../data/games.js';
import { records } from '../lib/seasonStats.js';
import { rankRows } from '../lib/tiebreak.js';
import { links } from '../lib/router.js';
import ConfLogo from './ConfLogo.jsx';

const PLAYOFF = { champion: '🏆', craft_bowl_loss: '🥈', conference: 'Conf', divisional: 'Div' };

// League feed: each conference (in its colors) in order by record, ties broken the league's way (tiebreak.js). Once this
// season's games are being played it's this season's records; before that, last season's.
export default function StandingsCard({ results, season }) {
  const conferences = getConferences();
  const [conf, setConf] = useState(conferences[0]);
  const games = useSeasonGames(currentSeason()), finals = (games || []).filter((g) => g.kind === 'regular' && g.status === 'final');
  const confOf = Object.fromEntries(getTeams().map((t) => [t.id, t.conference])), last = Object.fromEntries((results || []).map((r) => [r.teamId, r]));
  const now = finals.length > 0, rec = now ? records([{ games: finals.map((g) => ({ home: g.home, away: g.away, homeScore: g.home_score, awayScore: g.away_score, status: 'final' })) }]) : null;
  const rows = getTeams().filter((t) => t.conference === conf).map((t) => {
    if (now) return { id: t.id, ...(rec[t.id] || { w: 0, l: 0, pf: 0, pa: 0, games: [] }) };
    const r = last[t.id]; return { id: t.id, w: r?.wins ?? 0, l: r?.losses ?? 0, pf: r?.pf ?? 0, pa: r?.pa ?? 0, playoff: r?.playoff, has: !!r };
  });
  const ranked = rankRows(rows, confOf, now ? currentSeason() : season || 1), teams = Object.fromEntries(getTeams().map((t) => [t.id, t]));
  return (
    <article className={`feed-card conf-card ${confClass(conf)}`}>
      <header><span className="feed-icon"><ConfLogo conf={conf} size={30} /></span><div><b>Conference standings</b><small>{now ? `Season ${currentSeason()} · in order by record` : `Season ${season || currentSeason() - 1} final records`}</small></div></header>
      <div className="seg feed-seg conf-tabs">{conferences.map((c) => <button key={c} className={`${c === conf ? 'on' : ''} ${confClass(c)}`} onClick={() => setConf(c)}><ConfLogo conf={c} size={20} />{c}</button>)}</div>
      <ol className="feed-standings">
        {ranked.map((r, i) => {
          const t = teams[r.id];
          return (
            <li key={r.id}>
              <span className={`fs-rank${i < 4 ? ' top' : ''}`}>{i + 1}</span>
              <a href={links.team(r.id)} className="fs-team"><TeamBadge team={t} size="sm" /><b>{t?.name}</b></a>
              <span className="fs-rec">{now || r.has ? `${r.w}-${r.l}` : '-'}{PLAYOFF[r.playoff] && <em>{PLAYOFF[r.playoff]}</em>}</span>
              <StarRating value={t?.overall?.stars} />
            </li>
          );
        })}
      </ol>
    </article>
  );
}
