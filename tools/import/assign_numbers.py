"""Gives every player a jersey number, following NFL number rules by position.

One job: add 'number' to each player in src/data/league.json. Numbers are unique per team,
and the same roster always gets the same numbers (seeded by player id), so re-running is safe.
Players who already have a number keep it.
"""
import json
import random
from pathlib import Path

LEAGUE = Path(__file__).parents[2] / 'src' / 'data' / 'league.json'

# Allowed ranges per position (NFL rules since 2021), most typical range first.
RANGES = {
    'QB': [(1, 19)], 'RB': [(20, 49), (1, 19), (80, 89)], 'WR': [(10, 19), (80, 89), (1, 9)],
    'TE': [(80, 89), (40, 49)], 'C': [(50, 79)], 'OG': [(60, 79), (50, 59)], 'OT': [(60, 79), (50, 59)],
    'DL': [(90, 99), (50, 79)], 'DT': [(90, 99), (50, 79)], 'DE': [(90, 99), (50, 59), (40, 49)],
    'LB': [(40, 59), (90, 99)], 'CB': [(20, 39), (1, 19)], 'SS': [(20, 49), (1, 19)],
}


def pick_number(player, taken):
    rng = random.Random(player['id'])
    for lo, hi in RANGES.get(player['position'], [(1, 99)]):
        options = [n for n in range(lo, hi + 1) if n not in taken]
        if options:
            return rng.choice(options)
    return rng.choice([n for n in range(0, 100) if n not in taken])


def main():
    league = json.loads(LEAGUE.read_text(encoding='utf-8'))
    for team in league['teams']:
        roster = [p for p in league['players'] if p['teamId'] == team['id']]
        taken = {p['number'] for p in roster if p.get('number') is not None}
        # Starters choose first so they get the most typical numbers.
        for p in sorted(roster, key=lambda p: (p['depth'] != 'starter', p['id'])):
            if p.get('number') is None:
                p['number'] = pick_number(p, taken)
                taken.add(p['number'])
    LEAGUE.write_text(json.dumps(league, indent=1, ensure_ascii=False), encoding='utf-8')
    print('numbered', sum(1 for p in league['players'] if p.get('number') is not None), 'players')


if __name__ == '__main__':
    main()
