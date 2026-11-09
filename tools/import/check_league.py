"""Checks src/data/league.json and writes the problems list.

One job: find data problems. Writes src/data/importIssues.json (shown on
the site's Data Check page) and tools/import/Import Report.md.
"""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parents[2]
LEAGUE = ROOT / 'src' / 'data' / 'league.json'
ISSUES = ROOT / 'src' / 'data' / 'importIssues.json'
REPORT = Path(__file__).parent / 'Import Report.md'


def cap_hit(p):
    c = p.get('contract')
    return c['total'] / c['years'] if c and c['years'] else 0


def check(league):
    teams = {t['id']: t for t in league['teams']}
    codes = {t['code'] for t in league['teams']}
    issues = []
    add = lambda kind, team, text, level='fix': issues.append({'kind': kind, 'teamId': team, 'text': text, 'level': level})

    for p in league['players']:
        for n in p['notes']:
            add('player', p['teamId'], f"{p['name']} ({p['position']}): {n}")
        if p['age'] is not None and not 18 <= p['age'] <= 45:
            add('player', p['teamId'], f"{p['name']} ({p['position']}): age listed as {p['age']}")

    for t in league['teams']:
        ps = [p for p in league['players'] if p['teamId'] == t['id']]
        if all(p['stars'] is None for p in ps):
            add('ratings', t['id'], 'Star ratings and moods are missing (lost when the post was pasted as text)', 'need')
        if len(t['nameVariants']) > 1:
            add('team', t['id'], 'Team name spelled more than one way: ' + ', '.join(t['nameVariants']))
        # Our cap math is the real cap (contract total / years). Discord's posted totals are ignored.
        hit = sum(cap_hit(p) for p in ps)
        if hit > league['meta']['capLimit']:
            add('cap', t['id'], f"Over the cap: contracts add up to ${hit/1e6:.2f}M a year", 'need')
        names = defaultdict(list)
        for p in ps:
            names[p['name']].append(p['position'])
        for nm, pos in names.items():
            if len(pos) > 1:
                add('team', t['id'], f"{nm} is listed twice on this roster ({', '.join(pos)})")

    league_names = defaultdict(set)
    for p in league['players']:
        league_names[p['name']].add(teams[p['teamId']]['code'])
    dupes = {n: sorted(c) for n, c in league_names.items() if len(c) > 1}
    for n, c in sorted(dupes.items()):
        add('duplicate', None, f"{n} appears on {len(c)} teams: {', '.join(c)}", 'ask')

    seasons = sorted({p['season'] for p in league['picks']})
    for p in league['picks']:
        if p['originalCode'] not in codes:
            add('pick', p['ownerId'], f"Pick code {p['originalCode']} S{p['season']} round {p['round']} matches no team (typo?)")
        if p['season'] < 8:
            add('pick', p['ownerId'], f"Holds a season {p['season']} pick ({p['originalCode']} round {p['round']}) while every other list starts at season 8", 'ask')
    owners = defaultdict(list)
    for p in league['picks']:
        owners[(p['originalCode'], p['season'], p['round'])].append(teams[p['ownerId']]['code'])
    for (code, s, r), who in owners.items():
        if len(who) > 1:
            add('pick', None, f"{code} S{s} round {r} is listed by {', '.join(who)}")
    for code in codes:
        for s in range(8, 13):
            for r in (1, 2, 3):
                if (code, s, r) not in owners:
                    add('pick', None, f"{code} S{s} round {r} is not on anyone's list", 'ask')
    return issues, dupes, seasons


def write(league, issues, dupes):
    ISSUES.write_text(json.dumps(issues, indent=1, ensure_ascii=False), encoding='utf-8')
    teams = {t['id']: t for t in league['teams']}
    lines = ['# Import Report', '', f"{len(league['teams'])} teams, {len(league['players'])} players, {len(league['picks'])} draft picks, {len(league['vacancies'])} empty depth slots.", '']
    for kind, title in [('ratings', 'Missing ratings'), ('cap', 'Over the salary cap'), ('player', 'Player data problems'), ('team', 'Roster problems'), ('pick', 'Draft pick problems'), ('duplicate', 'Same name on more than one team')]:
        rows = [i for i in issues if i['kind'] == kind]
        if not rows:
            continue
        lines += [f'## {title} ({len(rows)})', '']
        lines += [f"- {teams[i['teamId']]['name'] + ': ' if i['teamId'] else ''}{i['text']}" for i in rows]
        lines.append('')
    REPORT.write_text('\n'.join(lines), encoding='utf-8')


if __name__ == '__main__':
    lg = json.loads(LEAGUE.read_text(encoding='utf-8'))
    iss, dup, seas = check(lg)
    write(lg, iss, dup)
    from collections import Counter
    print(len(iss), 'issues', dict(Counter(i['kind'] for i in iss)), 'seasons', seas)
