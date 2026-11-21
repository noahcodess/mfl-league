// Fan support: how much a team's town believes in it, 1-100%. Built like the fan meters in management games (Football Manager's
// supporter confidence, Madden's fan happiness): fans remember the last three seasons (the latest counts most), react to this
// season more and more as games pile up, forgive a bad year more easily when the team has been winning (loyal fans), get a
// little hope from a new coach, and a Craft Bowl history keeps a hard core around. The top end is squeezed, so 100% takes a
// dynasty. Pure math, no data loading (data/fanSupport.js feeds it).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const PLAYOFF = { missed: 0, divisional: 4, conference: 8, craft_bowl_loss: 11, champion: 16 };
export const MEMORY = 3;                       // seasons the fans remember
const WEIGHTS = [0.6, 0.27, 0.13];             // last season, the one before, three back

// One season's grade, 1-100: record first, then how they won (points per game), then how far they went.
// r: { w, l, pf, pa, playoff }
export function seasonGrade(r) {
  const g = (r?.w || 0) + (r?.l || 0);
  if (!g) return null;
  const pd = clamp((r.pf - r.pa) / g / 14, -1, 1);
  return clamp(10 + 74 * (r.w / g) + 9 * pd + (PLAYOFF[r.playoff] || 0), 1, 100);
}

// What the fans expect from the roster on paper (team overall stars, 2.5-5): talent gives a little hope.
const talentGrade = (stars) => clamp(20 + ((stars ?? 3.5) - 2.5) / 2.5 * 75, 5, 95);

// history: past seasons newest first [{ w, l, pf, pa, playoff }] (only the last three count).
// now: this season so far { w, l, pf, pa, streak (+3 = won 3 straight, -2 = lost 2), playoff }.
// stars: roster overall. titles: Craft Bowls won. newCoach: { human: true, games } when a person took over this season.
// Returns { value (1-100), parts: { memory, season, hope, loyalty, streak, talent }, mood }.
export function fanSupport({ history = [], now = null, stars = 3.5, titles = 0, newCoach = null }) {
  const past = history.slice(0, MEMORY).map(seasonGrade).filter((x) => x != null);
  const memory = past.length ? past.reduce((a, s, i) => a + s * WEIGHTS[i], 0) / WEIGHTS.slice(0, past.length).reduce((a, b) => a + b, 0) : 50;
  const talent = talentGrade(stars), tw = past.length ? 0.15 : 0.5;
  const base = memory * (1 - tw) + talent * tw;                       // where the fans start the season
  const g = (now?.w || 0) + (now?.l || 0), cur = g ? seasonGrade(now) : base;
  let w = 0.85 * Math.min(1, g / 8);                                   // this season takes over as it goes (about a season to turn things around)
  if (cur < base) w *= 1 - 0.7 * clamp((memory - 50) / 35, 0, 1);     // years of winning buy patience: one bad year only dents it
  const season = (cur - base) * w;
  const streak = now?.streak ? Math.sign(now.streak) * Math.min(4, Math.max(0, Math.abs(now.streak) - 1)) : 0;
  const hope = newCoach?.human ? 7 * clamp(1 - (newCoach.games || 0) / 12, 0, 1) : 0;
  const loyalty = Math.min(6, titles * 2);
  const raw = base + season + streak + hope + loyalty;
  const squeezed = raw > 82 ? 82 + (raw - 82) * 0.645 : raw;          // the last stretch is hard: 100% needs a dynasty
  const value = Math.round(clamp(squeezed, 1, 100));
  return { value, mood: moodOf(value), parts: { memory: Math.round(memory), season: Math.round(season), hope: Math.round(hope), loyalty, streak, talent: Math.round(talent) } };
}

export const moodOf = (v) => (v >= 90 ? 'Electric' : v >= 75 ? 'Rocking' : v >= 60 ? 'Believing' : v >= 45 ? 'Hopeful' : v >= 30 ? 'Restless' : v >= 15 ? 'Fed up' : 'Empty seats');
export const moodColor = (v) => (v >= 75 ? '#2fbf71' : v >= 60 ? '#8fcf3c' : v >= 45 ? '#f2c230' : v >= 30 ? '#f2902f' : '#e5484d');
