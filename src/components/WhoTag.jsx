import React from 'react';
import { whoTag } from '../lib/botBrain.js';

// The little tag next to a coach's name: 👤 Player, 🤖 Bot, or 🪑 Interim (a reserved team's seat-holder).
export default function WhoTag({ human, reserved }) {
  const t = whoTag({ human, reserved });
  return <span className={`who-tag ${t.cls}`}>{t.label}</span>;
}
