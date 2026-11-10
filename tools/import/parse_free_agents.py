"""Reads the commissioner's Free Agent list post (raw/Free Agents.txt) and writes supabase/seed/07_free_agents.sql.

One job: load the unsigned players into the database as free agents, each with a hidden potential.
- Free agents are mostly low ceilings (that's why nobody signed them), except a few hand-picked hidden gems.
- The list post is older than the rosters: a name already on a roster at the same position (and not older on the list)
  is the same guy, signed since, so he's skipped. Any other name clash gets a new, unique name, like rename_duplicates.py.
- Portraits need nothing here: the site draws every player's pixel art from his id.
Also adds them to src/data/league.json (the site's offline copy), like rename_duplicates.py does.
Seeded, so re-running gives the same result. Potential stays in the database only, never in league.json.
"""
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT / 'tools' / 'league'))
from rename_duplicates import NAMES  # noqa: E402  (same name pools as the roster renames)

RAW = Path(__file__).parent / 'raw' / 'Free Agents.txt'
LEAGUE = ROOT / 'src' / 'data' / 'league.json'
OUT = ROOT / 'supabase' / 'seed' / '07_free_agents.sql'
LINE = re.compile(r'^(?P<pos>QB|RB|WR|TE|OT|OG|C|DL|DT|DE|LB|CB|SS):\s*(?P<name>[^|]+?)\s*\|\s*(?P<stars>[^|]*)\|\s*Age:\s*(?P<age>\d+)')

# Noah's call: three hidden gems with 4.5-star ceilings. Young, so they have room to get there.
GEMS = {('QB', 'Carter Monroe'): 4.5, ('OT', 'Terrell Mack'): 4.5, ('LB', 'Treyson McKinley'): 4.5}
NON_GEM_CAP = 4.0
# Age after this offseason's birthday -> (extra stars, weights). Smaller than rostered players' growth.
GROWTH = {
    22: ([0.0, 0.5, 1.0, 1.5], [2, 4, 3, 1]),
    23: ([0.0, 0.5, 1.0], [3, 4, 2]),
    24: ([0.0, 0.5, 1.0], [5, 3, 1]),
    25: ([0.0, 0.5], [6, 2]),
}


def stars(text):
    return text.count('⭐') + text.count('\U0001f31f') + 0.5 * text.count('✨')


def parse():
    out = []
    for raw in RAW.read_text(encoding='utf-8').splitlines():
        m = LINE.match(raw.strip())
        if m:
            out.append({'id': f'fa-{len(out) + 1:03d}', 'position': m['pos'], 'name': m['name'].strip(),
                        'stars': stars(m['stars']), 'age': int(m['age']), 'nationality': 'USA'})
    return out


def potential(p):
    if (p['position'], p['orig']) in GEMS:
        return GEMS[(p['position'], p['orig'])]
    rng = random.Random('fa-potential-' + p['id'])
    options, weights = GROWTH.get(p['age'] + 1, ([0.0], [1]))
    return min(max(NON_GEM_CAP, p['stars']), p['stars'] + rng.choices(options, weights)[0])


def rename_clashes(fas, league_names):
    used = set(league_names)
    used_last = {n.split()[-1] for n in league_names}
    changes = []
    # Best-rated keeps a name that's twice in the list; anyone sharing a rostered player's name gets a new one.
    order = sorted(fas, key=lambda p: (-p['stars'], p['id']))
    for p in order:
        if p['name'] not in used:
            used.add(p['name'])
            continue
        rng = random.Random('fa-rename-' + p['id'])
        countries = list(NAMES)
        for tries in range(600):
            country = rng.choices(countries, [NAMES[c][0] for c in countries])[0]
            name = f'{rng.choice(NAMES[country][1])} {rng.choice(NAMES[country][2])}'
            if name not in used and (tries >= 300 or name.split()[-1] not in used_last):
                break
        used.add(name)
        used_last.add(name.split()[-1])
        changes.append((p['id'], p['name'], name, country))
        p['name'], p['nationality'] = name, country
    return changes


def main():
    league = json.loads(LEAGUE.read_text(encoding='utf-8'))
    others = [p for p in league['players'] if not p['id'].startswith('fa-')]  # ignore this list's own earlier run
    fas, signed = [], []
    rostered = {(p['name'], p['position']): p for p in others}
    for p in parse():
        p['orig'] = p['name']
        match = rostered.get((p['name'], p['position']))
        (signed if match and (match['age'] or 0) >= p['age'] else fas).append(p)
    changes = rename_clashes(fas, [p['name'] for p in others])
    rows = [[p['id'], p['name'], p['position'], p['stars'], p['age'], p['nationality'], potential(p)] for p in fas]
    data = json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace("'", "''")
    league['players'] = others + [{
        'id': p['id'], 'teamId': None, 'name': p['name'], 'position': p['position'], 'depth': None, 'slot': None,
        'stars': p['stars'], 'elite': False, 'age': p['age'], 'contract': None, 'mood': 'normal', 'notes': [],
        'nationality': p['nationality'], 'number': None, 'status': 'free_agent'} for p in fas]
    LEAGUE.write_text(json.dumps(league, indent=1, ensure_ascii=False), encoding='utf-8')
    OUT.write_text(
        "-- Free agents from the commissioner's list (status free_agent, no team). Re-running replaces them.\n"
        "delete from public.player_potential where player_id like 'fa-%';\n"
        "delete from public.player_traits where player_id like 'fa-%';\n"
        "delete from public.players where id like 'fa-%' and team_id is null;\n"
        "insert into public.players (id, team_id, name, position, stars, age, nationality, mood, status)\n"
        f"select v->>0, null, v->>1, v->>2, (v->>3)::numeric, (v->>4)::int, v->>5, 'normal', 'free_agent' from jsonb_array_elements('{data}') v;\n"
        "insert into public.player_potential (player_id, potential)\n"
        f"select v->>0, (v->>6)::numeric from jsonb_array_elements('{data}') v\n"
        "on conflict (player_id) do update set potential = excluded.potential;\n", encoding='utf-8')
    print(len(fas), 'free agents;', len(signed), 'skipped (already on a roster):', ', '.join(p['name'] for p in signed))
    for c in changes:
        print(f'  renamed {c[0]} {c[1]} -> {c[2]} ({c[3]})')
    pots = [r[6] for r in rows]
    print('  potential spread:', {k: pots.count(k) for k in sorted(set(pots))})
    print('  growing:', sum(1 for r in rows if r[6] > r[3]), '| maxed:', sum(1 for r in rows if r[6] == r[3]))


if __name__ == '__main__':
    main()
