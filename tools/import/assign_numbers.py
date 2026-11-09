"""Gives every player a jersey number with modern NFL "drip": lots of single digits for skill players and DBs.

One job: set 'number' on each player in src/data/league.json, unique per team.
Hand-picked numbers (Noah's choices) are placed first; everyone else is seeded by player id,
so re-running gives the same numbers. Ranges follow the NFL's current number rules by position.
"""
import json
import random
from pathlib import Path

LEAGUE = Path(__file__).parents[2] / 'src' / 'data' / 'league.json'

# (low, high, weight) per position: how often each range shows up around the league today.
RANGES = {
    'QB': [(1, 9, 3), (10, 19, 3)],
    'RB': [(0, 9, 4), (20, 39, 4), (40, 49, 1)],
    'WR': [(0, 9, 5), (10, 19, 5), (80, 89, 2)],
    'TE': [(80, 89, 6), (0, 9, 1), (40, 49, 1)],
    'C': [(50, 79, 1)], 'OG': [(60, 79, 3), (50, 59, 1)], 'OT': [(60, 79, 3), (50, 59, 1)],
    'DL': [(90, 99, 5), (50, 79, 3)], 'DT': [(90, 99, 5), (50, 79, 3)],
    'DE': [(90, 99, 5), (40, 59, 2), (0, 9, 1)],
    'LB': [(0, 9, 4), (40, 59, 4), (90, 99, 1)],
    'CB': [(0, 9, 5), (20, 39, 5)],
    'SS': [(0, 9, 4), (20, 49, 5)],
}
HAND_SET = {'snm-01': 15, 'snm-03': 5, 'snm-02': 10, 'snm-05': 88}  # Bojan, Garry Drake, Anthony Hall, James Lara


def pick_number(player, taken):
    rng = random.Random('num-' + player['id'])
    ranges = RANGES.get(player['position'], [(0, 99, 1)])
    order = sorted(ranges, key=lambda r: -rng.random() ** (1 / r[2]))  # weighted shuffle
    for lo, hi, _ in order:
        options = [n for n in range(lo, hi + 1) if n not in taken]
        if options:
            return rng.choice(options)
    return rng.choice([n for n in range(0, 100) if n not in taken])


def main():
    league = json.loads(LEAGUE.read_text(encoding='utf-8'))
    for team in league['teams']:
        roster = [p for p in league['players'] if p['teamId'] == team['id']]
        taken = set()
        for p in roster:
            p['number'] = HAND_SET.get(p['id'])
            if p['number'] is not None:
                taken.add(p['number'])
        # Starters choose first so they get the best numbers.
        for p in sorted(roster, key=lambda p: (p['depth'] != 'starter', p['id'])):
            if p['number'] is None:
                p['number'] = pick_number(p, taken)
                taken.add(p['number'])
    LEAGUE.write_text(json.dumps(league, indent=1, ensure_ascii=False), encoding='utf-8')
    singles = sum(1 for p in league['players'] if p['number'] < 10)
    print('numbered', len(league['players']), 'players;', singles, 'in single digits')


if __name__ == '__main__':
    main()
