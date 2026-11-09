"""Gives every player a hidden potential (the highest star rating he can ever reach).

One job: write supabase/seed/05_potentials.sql. Potential never goes in league.json,
because that file ships inside the public website; the database keeps it hidden.

Rules (from docs/Player Development.md, plus Noah's Nov 9 notes):
- Players grow about +1 star per offseason until they hit potential, so the youngest have the most room.
- 26 and older are maxed out (potential = current stars). 5.0 is the ceiling.
- 5-star potential stays rare for players who aren't already 4.5+.
- Hand-set potentials (Noah's choices) always win.
Ages come straight from league.json, which already has the Season 8 offseason (+1) ages. Seeded by player id, so re-running gives the same result.
"""
import json
import random
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parents[2]
LEAGUE = ROOT / 'src' / 'data' / 'league.json'
OUT = ROOT / 'supabase' / 'seed' / '05_potentials.sql'

# New age -> (possible extra stars, weights)
GROWTH = {
    22: ([1.0, 1.5, 2.0, 2.5], [2, 3, 3, 2]),
    23: ([0.5, 1.0, 1.5, 2.0], [2, 3, 3, 1]),
    24: ([0.0, 0.5, 1.0, 1.5], [2, 3, 3, 1]),
    25: ([0.0, 0.5, 1.0], [5, 3, 1]),
}
HAND_SET = {'snm-01': 4.5}  # Bojan Kovacic


def potential(p, age):
    if p['id'] in HAND_SET:
        return HAND_SET[p['id']]
    stars = p['stars']
    if stars is None:
        return None
    rng = random.Random('potential-' + p['id'])
    options, weights = GROWTH.get(age, ([0.0], [1]))
    pot = min(5.0, stars + rng.choices(options, weights)[0])
    if pot == 5.0 and stars <= 3.5 and rng.random() < 0.6:
        pot = 4.5
    return pot


def main():
    league = json.loads(LEAGUE.read_text(encoding='utf-8'))
    rows, growth = [], defaultdict(list)
    for p in league['players']:
        age = p['age'] if p['age'] is not None and p['age'] < 60 else None
        pot = potential(p, age)
        if pot is None:
            continue
        rows.append([p['id'], pot])
        growth[p['teamId']].append(pot - p['stars'])
    data = json.dumps(rows, separators=(',', ':'))
    OUT.write_text(
        "insert into public.player_potential (player_id, potential)\n"
        f"select v->>0, (v->>1)::numeric from jsonb_array_elements('{data}') v\n"
        "on conflict (player_id) do update set potential = excluded.potential;\n", encoding='utf-8')
    fives = sum(1 for r in rows if r[1] == 5.0)
    print(len(rows), 'potentials;', fives, 'at 5.0')
    for team, g in sorted(growth.items()):
        print(f'  {team}: {sum(g):.1f} stars of growth left ({sum(1 for x in g if x > 0)} players still growing)')


if __name__ == '__main__':
    main()
