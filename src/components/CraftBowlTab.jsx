import React, { useRef, useState } from 'react';
import CraftBowlTile from './CraftBowlTile.jsx';
import CraftBowlEditor from './CraftBowlEditor.jsx';
import { useCraftBowlPlans, randomizePlan, AHEAD } from '../data/craftBowlPlans.js';
import { useStadiums } from '../data/stadiums.js';
import { getTeams, currentSeason } from '../data/teams.js';

// Commissioner's Desk → Craft Bowl: this season's and the next 6 Craft Bowls as tiles. Tap one to edit its logo, colors and
// stadium. The dice spins the tile through stadium names (fast, then slowing) and lands on the server's pick.
export default function CraftBowlTab({ canControl }) {
  const plans = useCraftBowlPlans(), stadiums = useStadiums();
  const [sel, setSel] = useState(currentSeason()), [roll, setRoll] = useState({ season: null, shown: null }), timer = useRef(null);
  if (!plans) return <p className="dim">Loading the Craft Bowls…</p>;
  const list = plans.filter((p) => p.season >= currentSeason() && p.season <= currentSeason() + AHEAD), plan = list.find((p) => p.season === sel) || list[0];
  const onRoll = (season) => new Promise((resolve, reject) => {
    const ids = getTeams().map((t) => t.id), answer = randomizePlan(season, ids);
    let n = 0, wait = 55, landed = null;
    answer.then((r) => { landed = r; }, (e) => { clearTimeout(timer.current); setRoll({ season: null, shown: null }); reject(e); });
    const tick = () => {
      n += 1; setRoll({ season, shown: ids[Math.floor(Math.random() * ids.length)] });
      if (landed && !landed.id) { setRoll({ season: null, shown: null }); reject(new Error('No stadium is free for that season.')); return; }
      if (n > 14 && landed?.id) {   // slow down, then stop on the pick
        wait *= 1.28;
        if (wait > 420) { setRoll({ season, shown: landed.id }); timer.current = setTimeout(async () => { await landed.done(); setRoll({ season: null, shown: null }); resolve(landed.id); }, 650); return; }
      }
      timer.current = setTimeout(tick, wait);
    };
    tick();
  });
  return (
    <div className="cb-tab">
      <p className="dim">🏆 The next {AHEAD} Craft Bowls plus this season's. Each one: logo, colors (the playoff bracket wears them) and a stadium. A stadium can't host again within 3 seasons.</p>
      <div className="cb-grid">
        {list.map((p) => <CraftBowlTile key={p.season} plan={p} stadiums={stadiums} on={plan?.season === p.season} onClick={() => setSel(p.season)}
          rolling={roll.season === p.season} shown={roll.season === p.season ? roll.shown : undefined} />)}
      </div>
      {plan && <CraftBowlEditor plan={plan} plans={plans} stadiums={stadiums} canControl={canControl} onRoll={onRoll} rolling={roll.season === plan.season} />}
    </div>
  );
}
