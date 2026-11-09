"""Turns src/data/league.json into SQL that loads the Supabase database.

One job: write supabase/seed/*.sql (teams, players, picks, issues, settings).
Each file replaces that table's rows, so re-running after a fresh import is safe.
"""
import json
from pathlib import Path

ROOT = Path(__file__).parents[2]
DATA = ROOT / 'src' / 'data'
OUT = ROOT / 'supabase' / 'seed'
BATCH = 300


def q(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace("'", "''")


def load(table, rows, columns):
    return f"insert into public.{table} ({', '.join(columns)})\nselect {', '.join(columns)} from jsonb_populate_recordset(null::public.{table}, '{q(rows)}');\n"


def load_rows(table, rows, columns, types):
    """Compact form: each row is a JSON array, unpacked by position (keeps the SQL small)."""
    arr = [[r[c] for c in columns] for r in rows]
    cols = ', '.join(f"(v->>{i})::{t}" if t != 'text[]' else f"array(select jsonb_array_elements_text(v->{i}))" for i, t in enumerate(types))
    return f"insert into public.{table} ({', '.join(columns)})\nselect {cols} from jsonb_array_elements('{q(arr)}') v;\n"


PLAYER_TYPES = ['text', 'text', 'text', 'text', 'text', 'int', 'numeric', 'boolean', 'int', 'int', 'int', 'text', 'text[]']


def main():
    league = json.loads((DATA / 'league.json').read_text(encoding='utf-8'))
    styles = json.loads((DATA / 'teamStyles.json').read_text(encoding='utf-8'))
    issues = json.loads((DATA / 'importIssues.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True, exist_ok=True)
    teams = [{
        'id': t['id'], 'code': t['code'], 'name': t['name'], 'conference': t['conference'],
        'color': styles[t['code']]['color'], 'accent': styles[t['code']]['accent'],
        'offense_stars': (t['offense'] or {}).get('stars'), 'offense_rank': (t['offense'] or {}).get('rank'),
        'defense_stars': (t['defense'] or {}).get('stars'), 'defense_rank': (t['defense'] or {}).get('rank'),
        'overall_stars': (t['overall'] or {}).get('stars'), 'overall_rank': (t['overall'] or {}).get('rank'),
        'cap_used_reported': t['capUsedReported'],
    } for t in league['teams']]
    players = [{
        'id': p['id'], 'team_id': p['teamId'], 'name': p['name'], 'position': p['position'], 'depth': p['depth'],
        'slot': p['slot'], 'stars': p['stars'], 'elite': p['elite'], 'age': p['age'],
        'contract_years': (p['contract'] or {}).get('years'), 'contract_total': (p['contract'] or {}).get('total'),
        'mood': p['mood'], 'notes': p['notes'],
    } for p in league['players']]
    picks = [{'owner_id': p['ownerId'], 'original_code': p['originalCode'], 'season': p['season'], 'round': p['round']} for p in league['picks']]
    iss = [{'kind': i['kind'], 'team_id': i['teamId'], 'text': i['text'], 'level': i['level']} for i in issues]
    settings = [{'key': 'cap_limit', 'value': league['meta']['capLimit']}, {'key': 'current_season', 'value': league['meta']['currentSeason']},
                {'key': 'phase', 'value': 'regular_season'}]

    files = {'01_reset.sql': 'delete from public.import_issues; delete from public.picks; delete from public.player_potential; delete from public.players; delete from public.teams; delete from public.league_settings;\n',
             '02_teams.sql': load('teams', teams, list(teams[0])) + load('league_settings', settings, ['key', 'value'])}
    for n in range(0, len(players), BATCH):
        files[f'03_players_{n // BATCH + 1}.sql'] = load_rows('players', players[n:n + BATCH], list(players[0]), PLAYER_TYPES)
    files['04_picks_issues.sql'] = load_rows('picks', picks, list(picks[0]), ['text', 'text', 'int', 'int']) + load_rows('import_issues', iss, list(iss[0]), ['text', 'text', 'text', 'text'])
    for old in OUT.glob('*.sql'):
        old.unlink()
    for name, sql in files.items():
        (OUT / name).write_text(sql, encoding='utf-8')
    print({k: len(v) for k, v in files.items()})


if __name__ == '__main__':
    main()
