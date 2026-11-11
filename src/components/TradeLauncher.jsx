import React, { useEffect, useState } from 'react';
import TradeBuilder from './TradeBuilder.jsx';

// Listens for "open the trade builder" from anywhere on the site (player cards, the draft room, the trades page) and shows it.
export default function TradeLauncher({ myTeamId }) {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const on = (e) => setOpen(e.detail || {});
    window.addEventListener('mfl-trade', on);
    return () => window.removeEventListener('mfl-trade', on);
  }, []);
  if (!open || !myTeamId) return null;
  return <TradeBuilder myTeamId={myTeamId} partnerId={open.teamId} withPlayer={open.player} onClose={() => setOpen(null)}
    onSent={() => window.dispatchEvent(new CustomEvent('mfl-trade-sent'))} />;
}
