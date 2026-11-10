// Free agent personality types: the label and what it means for an offer. Text only, no logic (the server decides).
export const PERSONALITIES = {
  none: { label: '🤝 Balanced', note: 'Weighs money, role and team about evenly.' },
  ring_chaser: { label: '🏆 Ring chaser', note: 'Takes less to join a winner. Wants more from a bad team.' },
  prove_it: { label: '📝 Prove-it', note: 'Wants a 1-year deal to prove himself. Longer deals cost a lot more.' },
  hometown: { label: '🏠 Hometown', note: 'Gives a discount to the team he grew up rooting for.' },
  starter_only: { label: '🎯 Starter or bust', note: 'Wants to start. A backup role costs way more.' },
  diva: { label: '💎 Knows his worth', note: 'When several teams want him, he waits longer for the best deal.' },
  mercenary: { label: '💰 Money first', note: 'Only the money matters. Role and team don\'t move him.' },
};

export const LEFT_HOW = {
  let_go: 'You let him go without an offer. He wants a lot more from you this offseason.',
  talks_failed: 'Your re-signing talks fell apart. He wants a bit more from you.',
  walked: 'He walked out to test the market. He\'ll listen, but he wants more.',
};
