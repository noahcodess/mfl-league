"""Adds each team's conference to src/data/league.json from raw/Conferences.txt.

One job: conferences. Run after parse_rosters.py (npm run import does both).
"""
import json
import re
from pathlib import Path

RAW = Path(__file__).parent / 'raw' / 'Conferences.txt'
LEAGUE = Path(__file__).parents[2] / 'src' / 'data' / 'league.json'


def conference_blocks():
    """Walks the post keeping track of which conference header came last."""
    text = RAW.read_text(encoding='utf-8')
    out, conf = {}, None
    for raw in text.splitlines():
        if 'OverworldConferenceLOGO' in raw:
            conf = 'Overworld'
        elif 'NetherConferenceLOGO' in raw:
            conf = 'Nether'
        else:
            name = re.sub(r':\w+LOGO:', '', raw).strip()
            if name and conf and not name.startswith('@'):
                out[name] = conf
    return out


if __name__ == '__main__':
    league = json.loads(LEAGUE.read_text(encoding='utf-8'))
    confs = conference_blocks()
    missing = []
    for t in league['teams']:
        t['conference'] = confs.get(t['name'])
        if not t['conference']:
            missing.append(t['name'])
    LEAGUE.write_text(json.dumps(league, indent=1, ensure_ascii=False), encoding='utf-8')
    print('conferences added', {c: sum(1 for t in league['teams'] if t['conference'] == c) for c in ('Overworld', 'Nether')}, 'missing:', missing)
