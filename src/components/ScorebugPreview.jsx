import React from 'react';
import Scorebug from './Scorebug.jsx';
import MiniScorebug from './MiniScorebug.jsx';
import { broadcastFor } from '../data/broadcast.js';

// [window, label, home conference] — day games go to FOX or CBS by the home team's conference.
const PROGRAMS = [['sun_day', 'FOX', 'Overworld'], ['sun_day', 'CBS', 'Nether'], ['thu_night', 'TNF (NBC)'], ['sun_night', 'SNF (NBC)'],
  ['mon_night', 'ESPN (Saturday and Monday night)']];

// Game page: every program's scorebug for this matchup, the broadcast one and the coaching room one, to compare the designs.
export default function ScorebugPreview({ home, away, st }) {
  return (
    <section className="card sbp">
      <h3>Scorebugs</h3>
      <p className="dim">Five designs. The broadcast bug has room above it for stat pop-outs later. The smaller one is what coaches see.</p>
      {PROGRAMS.map(([win, label, conf]) => {
        const bc = broadcastFor({ window: win }, { ...home, conference: conf || home.conference });
        return (
          <div key={label} className="sbp-row">
            <small>{label}</small>
            <Scorebug bc={bc} home={home} away={away} st={st} />
            <MiniScorebug bc={bc} home={home} away={away} st={st} />
          </div>
        );
      })}
    </section>
  );
}
