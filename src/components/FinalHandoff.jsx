// The end of the end-of-game show, on the game page: it fades in over the broadcast's last transition, the winner's logo
// pops, the score counts up, FINAL stamps in and the Player of the Game rises at the bottom. Then it all glides into the
// page's own score and Player of the Game card as the backdrop clears, leaving the final page ready to scroll.
// data: from FinalReport ({ score, label, potg, home, away }). onDone: when it's gone.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Headshot from './Headshot.jsx';
import { getTeam } from '../data/teams.js';
import { getAllPlayers } from '../data/players.js';
import { createShowAudio } from '../lib/showAudio.js';

const FLY_AT = 3300, FLY_MS = 900;
const soundPrefs = () => { try { return { on: true, vol: 0.7, ...JSON.parse(localStorage.getItem('mfl-crowd-sound') || '{}') }; } catch { return { on: true, vol: 0.7 }; } };   // the broadcast's sound switch

function useCount(to, delay) {   // the score counting up
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now() + delay;
    const step = (ms) => { const k = Math.min(1, Math.max(0, (ms - t0) / 800)); setV(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, delay]);
  return v;
}

const flyTo = (el, target) => {   // glide an element onto another one's spot
  if (!el || !target) { if (el) el.style.opacity = '0'; return; }
  const a = el.getBoundingClientRect(), b = target.getBoundingClientRect();
  el.style.transition = `transform ${FLY_MS}ms cubic-bezier(.6,0,.2,1), opacity ${FLY_MS}ms ease-in`;
  el.style.transformOrigin = 'top left';
  el.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width}, ${b.height / a.height})`;
  el.style.opacity = '0';
};

export default function FinalHandoff({ data, onDone }) {
  const home = { ...getTeam(data.home), logo: data.logos?.home || getTeam(data.home).logo }, away = { ...getTeam(data.away), logo: data.logos?.away || getTeam(data.away).logo }, win = data.score.home >= data.score.away ? 'home' : 'away';
  const star = data.potg && getAllPlayers().find((p) => p.id === data.potg.player_id), starTeam = star && getTeam(data.potg.team_id);
  const [fly, setFly] = useState(false), hero = useRef(null), card = useRef(null);
  const sa = useCount(data.score.away, 700), sh = useCount(data.score.home, 700);
  useEffect(() => {
    const sfx = createShowAudio(['applause', 'cheer']), t = [], pr = soundPrefs();   // never the award show's sounds
    sfx?.setVolume(pr.on ? pr.vol : 0);
    t.push(setTimeout(() => sfx?.play('cheer', { gain: 0.45 }), 450));
    t.push(setTimeout(() => {   // into the page
      window.scrollTo({ top: 0 }); setFly(true);
      requestAnimationFrame(() => { flyTo(hero.current, document.querySelector('.gp-hero')); flyTo(card.current, document.querySelector('.gf-potg')); });
    }, FLY_AT));
    t.push(setTimeout(() => onDone?.(), FLY_AT + FLY_MS + 80));
    return () => { t.forEach(clearTimeout); setTimeout(() => sfx?.close(), 1500); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const side = (t, k, v) => (
    <div className={`fh-team ${k}${k === win ? ' won' : ''}`} style={{ '--tc': t.color }}>
      <img src={t.logo} alt="" /><b>{v}</b><span>{t.name}</span>
    </div>
  );
  return createPortal(
    <div className={`fh${fly ? ' fly' : ''}`} style={{ '--wc': (win === 'home' ? home : away).color }}>
      <div className="fh-bg" aria-hidden="true" />
      <div className="fh-hero" ref={hero}>
        <div className="fh-match">{side(away, 'away', sa)}<span className="fh-at">at</span>{side(home, 'home', sh)}</div>
        <p className="fh-final">{data.label}</p>
      </div>
      {star && (
        <div className="fh-potg" ref={card} style={{ '--tc': starTeam?.color }}>
          <small>⭐ Player of the Game</small>
          <div className="fh-card"><Headshot player={star} team={starTeam} size={96} /><div><b>{star.name}</b><span>{data.potg.feat}</span><em>{data.potg.line}</em></div></div>
        </div>
      )}
    </div>, document.body);
}
