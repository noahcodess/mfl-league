import React, { useState } from 'react';
import StandingsCard from '../components/StandingsCard.jsx';
import RecordsCard from '../components/RecordsCard.jsx';
import FeedPlayersCard from '../components/FeedPlayersCard.jsx';
import FeedTradesCard from '../components/FeedTradesCard.jsx';
import LeagueLog from '../components/LeagueLog.jsx';
import PlayerModal from '../components/PlayerModal.jsx';
import { useLeagueNews } from '../data/leagueNews.js';
import { getTeams, getTeam, currentSeason, PHASE_NAMES, currentPhase, leagueEvents } from '../data/teams.js';
import { getAllPlayers, getFreeAgents } from '../data/players.js';

// League: a news feed. Standings, record holders, recent trades, the trade block, the best players and league news.
// One scrolling column on phones (like a feed), two or three columns on bigger screens.
export default function LeaguePage() {
  const news = useLeagueNews();
  const [open, setOpen] = useState(null);
  return (
    <div className="league-feed">
      <div className="page-head feed-head">
        <h1>League</h1>
        <p className="dim">Season {currentSeason()} · {PHASE_NAMES[currentPhase()]} · {getTeams().length} teams · {getAllPlayers().filter((p) => p.teamId).length} players · {getFreeAgents().length} free agents</p>
      </div>
      {!news ? <p className="dim">Loading the latest...</p> : (
        <div className="feed">
          <StandingsCard results={news.results} season={news.season} />
          <FeedTradesCard moves={news.moves} onOpen={setOpen} />
          <RecordsCard results={news.results} season={news.season} />
          <FeedPlayersCard icon="📋" title="On the trade block" sub="Teams willing to deal these players" players={news.block} onOpen={setOpen} empty="Nobody is on the block right now." />
          <FeedPlayersCard icon="⭐" title="Top 10 players" sub="League rank: stars first, then ratings" players={news.top} onOpen={setOpen} ranked />
          <article className="feed-card"><header><span className="feed-icon">📰</span><div><b>League news</b><small>Signings, retirements, the draft and more</small></div></header>
            <LeagueLog events={leagueEvents()} limit={12} />
          </article>
        </div>
      )}
      {open && <PlayerModal player={open} team={getTeam(open.teamId)} onClose={() => setOpen(null)} />}
    </div>
  );
}
