"""Gives every duplicate-named player a brand new name, mostly from outside the US.

One job: when a name appears more than once in the league, the best-rated player keeps it and
the others get a new, unique name and a matching country. Updates src/data/league.json and writes
supabase/seed/06_renames.sql. Seeded, so re-running gives the same names.
"""
import json
import random
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parents[2]
LEAGUE = ROOT / 'src' / 'data' / 'league.json'
OUT = ROOT / 'supabase' / 'seed' / '06_renames.sql'

# Country -> (how often it's picked, first names, last names)
NAMES = {
    'Nigeria': (5, ['Chukwuemeka', 'Oluwaseun', 'Babatunde', 'Emeka', 'Tobi', 'Femi', 'Chidi', 'Kelechi'], ['Okafor', 'Adeyemi', 'Nwosu', 'Balogun', 'Okonkwo', 'Eze', 'Adebayo', 'Obi']),
    'Ghana': (2, ['Kwame', 'Kofi', 'Yaw', 'Kwabena'], ['Mensah', 'Asante', 'Boateng', 'Owusu']),
    'Jamaica': (2, ['Damar', 'Andre', 'Rohan', 'Kemar'], ['Campbell', 'Barrett', 'McKenzie', 'Grant']),
    'Haiti': (1, ['Jean-Pierre', 'Wesley', 'Ricardo'], ['Pierre-Louis', 'Toussaint', 'Joseph']),
    'Samoa': (3, ['Tavita', 'Sione', 'Iosefa', 'Malakai'], ['Fuimaono', 'Tuilagi', 'Leiataua', 'Aumua']),
    'Tonga': (2, ['Viliami', 'Tevita', 'Siaosi'], ['Havili', 'Fifita', 'Tupou']),
    'Canada': (4, ['Liam', 'Owen', 'Brody', 'Carter', 'Nolan'], ['Tremblay', 'Gagnon', 'MacDonald', 'Bouchard', 'Sinclair']),
    'England': (3, ['Harry', 'Alfie', 'Jack', 'Reece'], ['Whitmore', 'Ashworth', 'Pemberton', 'Fairbanks']),
    'Australia': (3, ['Lachlan', 'Cooper', 'Jayden', 'Hamish'], ['Kowalczyk', 'Brennan', 'Ashby', 'Gallagher']),
    'Ireland': (2, ['Cian', 'Declan', 'Ronan'], ['O\'Sullivan', 'Byrne', 'Doherty']),
    'Germany': (3, ['Lukas', 'Jonas', 'Moritz', 'Felix'], ['Schneider', 'Becker', 'Hoffmann', 'Vogel']),
    'Sweden': (1, ['Axel', 'Viktor', 'Oskar'], ['Lindqvist', 'Bergström', 'Holm']),
    'Poland': (1, ['Kacper', 'Mateusz', 'Jakub'], ['Nowak', 'Wiśniewski', 'Zieliński']),
    'Serbia': (1, ['Nikola', 'Stefan', 'Marko'], ['Jovanović', 'Petrović', 'Nikolić']),
    'France': (2, ['Mathis', 'Hugo', 'Théo'], ['Lefebvre', 'Moreau', 'Girard']),
    'Mexico': (3, ['Diego', 'Santiago', 'Emiliano', 'Mateo'], ['Herrera', 'Villanueva', 'Castañeda', 'Ibarra']),
    'Brazil': (2, ['Thiago', 'Gabriel', 'Rafael'], ['Oliveira', 'Carvalho', 'Pereira']),
    'Japan': (1, ['Kenta', 'Haruto', 'Ryo'], ['Takahashi', 'Nakamura', 'Sato']),
    'USA': (4, ['Trey', 'Jaxon', 'Malik', 'Brooks', 'Dante', 'Kade', 'Zion', 'Tate'], ['Holloway', 'Pruitt', 'Vance', 'Crenshaw', 'Whitfield', 'Beasley', 'Galloway', 'Rhodes']),
}


def main():
    league = json.loads(LEAGUE.read_text(encoding='utf-8'))
    players = league['players']
    used = {p['name'] for p in players}
    used_last = {p['name'].split()[-1] for p in players}
    groups = defaultdict(list)
    for p in players:
        groups[p['name']].append(p)
    # Also catches the same name twice on one team (e.g. Darius Coleman at OG and SS).
    to_rename = []
    for ps in groups.values():
        if len(ps) > 1:
            keep = max(ps, key=lambda p: (p['stars'] or 0, p['depth'] == 'starter', -int(p['id'].split('-')[1])))
            to_rename += [p for p in ps if p is not keep]
    countries = list(NAMES)
    weights = [NAMES[c][0] for c in countries]
    changes = []
    for p in sorted(to_rename, key=lambda p: p['id']):
        rng = random.Random('rename-' + p['id'])
        for _ in range(200):
            country = rng.choices(countries, weights)[0]
            _, firsts, lasts = NAMES[country]
            name = f'{rng.choice(firsts)} {rng.choice(lasts)}'
            if name not in used and name.split()[-1] not in used_last:
                break
        used.add(name)
        used_last.add(name.split()[-1])
        changes.append([p['id'], p['name'], name, country])
        p['name'], p['nationality'] = name, country
    LEAGUE.write_text(json.dumps(league, indent=1, ensure_ascii=False), encoding='utf-8')
    data = json.dumps([[c[0], c[2], c[3]] for c in changes], ensure_ascii=False, separators=(',', ':')).replace("'", "''")
    OUT.write_text("update public.players p set name = v->>1, nationality = v->>2\n"
                   f"from jsonb_array_elements('{data}') v where p.id = v->>0;\n"
                   "delete from public.import_issues where kind = 'duplicate' or text like '%is listed twice on this roster%';\n", encoding='utf-8')
    for c in changes:
        print(f'{c[0]:8} {c[1]:20} -> {c[2]} ({c[3]})')
    intl = sum(1 for p in players if p.get('nationality', 'USA') != 'USA')
    print(len(changes), 'renamed;', intl, 'international players now')


if __name__ == '__main__':
    main()
