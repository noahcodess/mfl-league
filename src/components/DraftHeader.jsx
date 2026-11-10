import React, { useState } from 'react';
import { leagueLogo } from '../data/logos.js';
import { alertsState, askForAlerts } from '../data/draftTurn.js';
import { roundOf } from '../lib/draftClock.js';
import { whenText } from '../data/schedule.js';

// The draft room's title bar: MFL DRAFT, the season, where the draft is at, plus pick alerts and stage mode buttons.
export default function DraftHeader({ season, info, draftAt, isCoach, stage, onStage }) {
  const [alerts, setAlerts] = useState(alertsState());
  const status = info.phase === 'pre' ? (draftAt ? `Draft night · ${whenText(draftAt)}` : 'Draft night not set yet')
    : info.phase === 'done' ? `Complete · ${info.made} picks`
      : `${roundOf(info.current)} · #${info.current?.pick_no ?? '-'} of ${info.total}`;
  return (
    <header className="dhead">
      <img className="dhead-logo" src={leagueLogo.light} alt="" />
      <div className="dhead-title">
        <h1><span className="shine">MFL DRAFT</span></h1>
        <div className="dhead-season">SEASON {season}</div>
      </div>
      <div className="dhead-status">
        {(info.phase === 'live' || info.phase === 'paused') && <span className={`live-pill${info.phase === 'paused' ? ' paused' : ''}`}>{info.phase === 'paused' ? 'PAUSED' : 'LIVE'}</span>}
        <span>{status}</span>
      </div>
      {!stage && (
        <div className="dhead-btns">
          {isCoach && alerts === 'default' && <button className="btn small ghost" onClick={async () => setAlerts(await askForAlerts())}>🔔 Turn on pick alerts</button>}
          <button className="btn small ghost" onClick={onStage}>📺 Stage mode</button>
        </div>
      )}
      {stage && <button className="btn small ghost dhead-exit" onClick={onStage}>Exit stage</button>}
    </header>
  );
}
