"""Reads the Discord roster posts in raw/ and writes src/data/league.json.

One job: turn the posts into clean league data. Problems are noted in
`notes` on each record; check_league.py turns them into the report.
"""
import json
import re
from pathlib import Path

RAW = Path(__file__).parent / 'raw'
OUT = Path(__file__).parents[2] / 'src' / 'data' / 'league.json'
CAP_LIMIT = 4_000_000
TEAM_ALIASES = {'Plain Pigs': 'Plains Pigs'}
POSITIONS = ['QB', 'WR', 'C', 'TE', 'RB', 'OG', 'OT', 'DL', 'DT', 'DE', 'CB', 'LB', 'SS']
SECTIONS = [
    ('Starting Lineup ~ Roster Expanded', 'starter_info'),
    ('Backups Lineup ~ Roster Expanded', 'backup_info'),
    ('Starting Lineup', 'starter'),
    ('Backups Lineup', 'backup'),
    ('Draft Picks', 'picks'),
]
HEADER = re.compile(r'^(?:\d+\.\s*)?(?::\w+LOGO:\s*)?(?P<team>.+?)\s+(?P<sec>' + '|'.join(re.escape(s) for s, _ in SECTIONS) + ')')
PLAYER = re.compile(r'^(?P<pos>' + '|'.join(POSITIONS) + r'):\s*(?P<rest>.*)$')
PICK = re.compile(r'^(?P<code>[A-Z]+)\s+S(?P<season>\d+)\s+(?P<round>\d)(?:st|nd|rd|th)\s+Round Pick', re.I)
META = re.compile(r'^(?P<key>Offense|Defense|Overall):\s*(?P<stars>[^#]*)#(?P<rank>\d+)')
CAP = re.compile(r'^Salary Cap:\s*\$(?P<used>[\d.]+)M\s*/\s*\$(?P<limit>[\d.]+)M')


def stars(text):
    """Star string -> number (half stars allowed) or None when blank."""
    full = text.count('\u2b50') + text.count('\U0001f31f')
    half = text.count('\u2728')
    if full == 0 and half == 0:
        return None
    return full + 0.5 * half


def money(text):
    m = re.search(r'\$?([\d.]+)\s*([KM])', text)
    if not m:
        return None
    return round(float(m.group(1)) * (1_000 if m.group(2) == 'K' else 1_000_000))


def parse_info(rest):
    """'A: 27 | C: 2Y $500K | :HappyEmoji:' -> age, years, salary, mood, notes."""
    notes = []
    age = re.search(r'\b(?:A|Age):\s*(\d+)', rest)
    con = re.search(r'C:\s*(\d+)Y\s*(\$?[\d.]+\s*[KM])', rest)
    mood = re.search(r':(\w+)Emoji:', rest)
    if age and 'Age:' in rest:
        notes.append('age written as "Age:" instead of "A:"')
    if con and not con.group(2).startswith('$'):
        notes.append('salary missing the $ sign')
    return {
        'age': int(age.group(1)) if age else None,
        'years': int(con.group(1)) if con else None,
        'salary': money(con.group(2)) if con else None,
        'mood': mood.group(1).lower() if mood else None,
        'notes': notes,
    }


def read_posts():
    """All raw files -> {team name: {section: [lines]}} plus team meta."""
    teams = {}
    for path in sorted(RAW.glob('*.txt')):
        team, sec = None, None
        for raw in path.read_text(encoding='utf-8').splitlines():
            line = raw.strip()
            if not line:
                continue
            h = HEADER.match(line)
            if h:
                name = TEAM_ALIASES.get(h.group('team').strip(), h.group('team').strip())
                team = teams.setdefault(name, {'meta': {}, 'name_variants': set(), 'source': path.name})
                team['name_variants'].add(h.group('team').strip())
                sec = next(key for label, key in SECTIONS if h.group('sec').startswith(label))
                team.setdefault(sec, [])
                continue
            if team is None:
                continue
            m, c = META.match(line), CAP.match(line)
            if m:
                team['meta'][m.group('key').lower()] = {'stars': stars(m.group('stars')), 'rank': int(m.group('rank'))}
            elif c:
                team['meta']['cap_used_reported'] = round(float(c.group('used')) * 1_000_000)
            elif sec:
                team[sec].append(line)
    return teams


def slots(lines):
    """Lineup lines -> list of (position, slot number, rest-of-line); empty slots kept."""
    out, count = [], {}
    for line in lines:
        p = PLAYER.match(line)
        if not p:
            continue
        pos = p.group('pos')
        count[pos] = count.get(pos, 0) + 1
        out.append((pos, count[pos], p.group('rest').strip()))
    return out


def team_code(team):
    codes = [PICK.match(l).group('code').upper() for l in team.get('picks', []) if PICK.match(l)]
    return max(set(codes), key=codes.count) if codes else None


def build():
    posts = read_posts()
    league = {'meta': {'capLimit': CAP_LIMIT, 'currentSeason': 8, 'phase': 'offseason', 'source': 'Discord roster posts'}, 'teams': [], 'players': [], 'picks': [], 'vacancies': []}
    for name, t in posts.items():
        code = team_code(t)
        tid = code.lower()
        league['teams'].append({
            'id': tid, 'code': code, 'name': name,
            'offense': t['meta'].get('offense'), 'defense': t['meta'].get('defense'), 'overall': t['meta'].get('overall'),
            'capUsedReported': t['meta'].get('cap_used_reported'),
            'nameVariants': sorted(t['name_variants']), 'source': t['source'],
        })
        info = {}
        for sec in ('starter_info', 'backup_info'):
            for pos, n, rest in slots(t.get(sec, [])):
                if rest:
                    nm = rest.split('|')[0].strip()
                    info.setdefault(nm, []).append({'sec': sec, 'pos': pos, 'slot': n, **parse_info(rest), 'used': False})
        num = 0
        for depth in ('starter', 'backup'):
            exp_slots = {(p, n): r.split('|')[0].strip() for p, n, r in slots(t.get(depth + '_info', [])) if r}
            for pos, n, rest in slots(t.get(depth, [])):
                if not rest:
                    league['vacancies'].append({'teamId': tid, 'position': pos, 'slot': n, 'depth': depth})
                    continue
                nm = rest.split('|')[0].strip()
                parts = rest.split('|')
                rating = stars(parts[1]) if len(parts) > 1 else None
                cands = info.get(nm, [])
                pick = next((c for c in cands if not c['used'] and c['sec'] == depth + '_info' and c['pos'] == pos), None) \
                    or next((c for c in cands if not c['used']), None)
                notes = []
                if pick:
                    pick['used'] = True
                    notes += pick['notes']
                    if pick['sec'] != depth + '_info' or pick['pos'] != pos:
                        notes.append(f"contract found under {pick['sec'].split('_')[0]} {pick['pos']} in the expanded list")
                else:
                    notes.append('no age or contract in the expanded list')
                if exp_slots.get((pos, n)) not in (None, nm):
                    notes.append(f"expanded list shows {exp_slots[(pos, n)]} in this slot")
                num += 1
                league['players'].append({
                    'id': f'{tid}-{num:02d}', 'teamId': tid, 'name': nm, 'position': pos, 'depth': depth, 'slot': n,
                    'stars': rating, 'elite': '\U0001f31f' in rest,
                    'age': pick['age'] if pick else None,
                    'contract': {'years': pick['years'], 'total': pick['salary']} if pick and pick['salary'] is not None else None,
                    'mood': pick['mood'] if pick else None, 'notes': notes,
                })
        for nm, lst in info.items():
            for c in lst:
                if not c['used']:
                    num += 1
                    league['players'].append({
                        'id': f'{tid}-{num:02d}', 'teamId': tid, 'name': nm, 'position': c['pos'], 'depth': c['sec'].split('_')[0], 'slot': c['slot'],
                        'stars': None, 'elite': False, 'age': c['age'],
                        'contract': {'years': c['years'], 'total': c['salary']} if c['salary'] is not None else None,
                        'mood': c['mood'], 'notes': c['notes'] + ['only in the expanded list, not in the lineup post'],
                    })
        for line in t.get('picks', []):
            p = PICK.match(line)
            if p:
                league['picks'].append({'ownerId': tid, 'originalCode': p.group('code').upper(), 'season': int(p.group('season')), 'round': int(p.group('round'))})
    OUT.write_text(json.dumps(league, indent=1, ensure_ascii=False), encoding='utf-8')
    return league


if __name__ == '__main__':
    lg = build()
    print(f"{len(lg['teams'])} teams, {len(lg['players'])} players, {len(lg['picks'])} picks, {len(lg['vacancies'])} empty depth slots")
