// A conference's logo (Overworld or Nether). size in px. Shows nothing for an unknown conference.
import React from 'react';

const KNOWN = new Set(['Overworld', 'Nether']);
export const confLogoSrc = (conf) => (KNOWN.has(conf) ? `${import.meta.env.BASE_URL}img/conf/${conf}.png` : null);

// A game's conference tag: one logo for a conference game, both for a game across conferences.
export function ConfMatch({ home, away, size = 18 }) {
  if (!confLogoSrc(home?.conference) || !confLogoSrc(away?.conference)) return null;
  const same = home.conference === away.conference;
  return <span className="conf-match">{same ? <><ConfLogo conf={home.conference} size={size} />{home.conference} game</> : <><ConfLogo conf={away.conference} size={size} /><ConfLogo conf={home.conference} size={size} />Overworld vs Nether</>}</span>;
}

export default function ConfLogo({ conf, size = 28, className = '' }) {
  const src = confLogoSrc(conf);
  return src ? <img className={`conf-logo ${className}`} src={src} alt={`${conf} Conference`} width={size} height={size} loading="lazy" /> : null;
}
