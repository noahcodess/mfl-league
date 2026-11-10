"""Writes the 9 attributes for each position, once, to both places that need them:
src/lib/attributeDefs.js (the site's labels) and supabase/seed/08_attribute_defs.sql (the database, which the sim will use).
Edit DEFS here and re-run so the two never drift apart.
"""
import json
from pathlib import Path

ROOT = Path(__file__).parents[2]
# Every player: 8 attributes for his position, then the 2 everyone has (Toughness = stamina and how often he gets hurt).
EVERYONE = [('speed', 'Speed'), ('toughness', 'Toughness')]
OL = [('pass_block', 'Pass Block'), ('run_block', 'Run Block'), ('strength', 'Strength'), ('footwork', 'Footwork'),
      ('anchor', 'Anchor'), ('awareness', 'Awareness'), ('discipline', 'Discipline'), ('agility', 'Agility')]
DT = [('power_moves', 'Power Moves'), ('finesse_moves', 'Finesse Moves'), ('block_shed', 'Block Shedding'), ('strength', 'Strength'),
      ('run_stop', 'Run Stopping'), ('pursuit', 'Pursuit'), ('double_team', 'Beats Double Teams'), ('tackling', 'Tackling')]
POSITION = {
    'QB': [('throw_power', 'Throw Power'), ('short_acc', 'Short Accuracy'), ('deep_acc', 'Deep Accuracy'), ('throw_on_run', 'Throw on the Run'),
           ('vision', 'Reading Defenses'), ('break_sack', 'Break Sack'), ('throw_pressure', 'Throw Under Pressure'), ('play_action', 'Play Action')],
    'RB': [('acceleration', 'Acceleration'), ('elusiveness', 'Elusiveness'), ('break_tackle', 'Break Tackle'), ('carrying', 'Ball Security'),
           ('vision', 'Vision'), ('catching', 'Catching'), ('pass_block', 'Pass Block'), ('route_running', 'Route Running')],
    'WR': [('catching', 'Catching'), ('route_running', 'Route Running'), ('release', 'Release'), ('catch_traffic', 'Catch in Traffic'),
           ('jumping', 'Jumping'), ('agility', 'Agility'), ('run_after_catch', 'Run After Catch'), ('spectacular_catch', 'Spectacular Catch')],
    'TE': [('catching', 'Catching'), ('route_running', 'Route Running'), ('catch_traffic', 'Catch in Traffic'), ('run_block', 'Run Block'),
           ('pass_block', 'Pass Block'), ('strength', 'Strength'), ('run_after_catch', 'Run After Catch'), ('release', 'Release')],
    'OT': OL, 'OG': OL,
    'C': OL[:4] + [('anchor', 'Anchor'), ('awareness', 'Awareness'), ('snapping', 'Snapping'), ('discipline', 'Discipline')],
    'DL': DT, 'DT': DT,
    'DE': [('speed_rush', 'Speed Rush'), ('power_moves', 'Power Moves'), ('block_shed', 'Block Shedding'), ('strength', 'Strength'),
           ('pursuit', 'Pursuit'), ('tackling', 'Tackling'), ('run_stop', 'Run Stopping'), ('finesse_moves', 'Finesse Moves')],
    'LB': [('tackling', 'Tackling'), ('pursuit', 'Pursuit'), ('play_rec', 'Play Recognition'), ('hit_power', 'Hit Power'),
           ('zone_cover', 'Zone Coverage'), ('man_cover', 'Man Coverage'), ('blitzing', 'Blitzing'), ('block_shed', 'Block Shedding')],
    'CB': [('man_cover', 'Man Coverage'), ('zone_cover', 'Zone Coverage'), ('press', 'Press'), ('ball_skills', 'Ball Skills'),
           ('agility', 'Agility'), ('tackling', 'Tackling'), ('jumping', 'Jumping'), ('play_rec', 'Play Recognition')],
    'SS': [('zone_cover', 'Zone Coverage'), ('man_cover', 'Man Coverage'), ('tackling', 'Tackling'), ('hit_power', 'Hit Power'),
           ('ball_skills', 'Ball Skills'), ('play_rec', 'Play Recognition'), ('pursuit', 'Pursuit'), ('blitzing', 'Blitzing')],
}
DEFS = {pos: attrs + EVERYONE for pos, attrs in POSITION.items()}

# Archetypes: (key, label, bars that run high, bars that run low). Each player gets one, and it shapes his bars.
OL_STYLES = [('pass_pro', 'Pass Protector', ['pass_block', 'footwork'], ['run_block']),
             ('road_grader', 'Road Grader', ['run_block', 'strength'], ['footwork', 'speed']),
             ('technician', 'Technician', ['awareness', 'footwork'], ['strength'])]
DT_STYLES = [('run_stuffer', 'Run Stuffer', ['run_stop', 'strength'], ['finesse_moves', 'speed']),
             ('power_rusher', 'Power Rusher', ['power_moves', 'strength'], ['finesse_moves']),
             ('quick_rusher', 'Quick Rusher', ['finesse_moves', 'speed'], ['run_stop', 'strength'])]
STYLES = {
    'QB': [('gunslinger', 'Gunslinger', ['throw_power', 'deep_acc'], ['short_acc', 'vision']),
           ('scrambler', 'Scrambler', ['speed', 'throw_on_run', 'break_sack'], ['vision']),
           ('field_general', 'Field General', ['vision', 'short_acc'], ['speed', 'throw_power']),
           ('pocket_passer', 'Pocket Passer', ['short_acc', 'deep_acc'], ['speed', 'throw_on_run'])],
    'RB': [('speed_back', 'Speed Back', ['speed', 'acceleration'], ['break_tackle']),
           ('power_back', 'Power Back', ['break_tackle', 'carrying'], ['elusiveness', 'speed']),
           ('elusive_back', 'Elusive Back', ['elusiveness', 'vision'], ['break_tackle']),
           ('receiving_back', 'Receiving Back', ['catching', 'elusiveness'], ['break_tackle', 'carrying'])],
    'WR': [('deep_threat', 'Deep Threat', ['speed', 'release'], ['catch_traffic']),
           ('possession', 'Possession Receiver', ['catching', 'catch_traffic', 'route_running'], ['speed']),
           ('route_tech', 'Route Technician', ['route_running', 'release', 'agility'], ['jumping']),
           ('red_zone', 'Red Zone Target', ['jumping', 'catch_traffic'], ['speed', 'agility'])],
    'TE': [('receiving_te', 'Receiving Tight End', ['catching', 'route_running'], ['run_block', 'pass_block']),
           ('blocking_te', 'Blocking Tight End', ['run_block', 'pass_block', 'strength'], ['route_running', 'speed']),
           ('hybrid_te', 'Hybrid Tight End', ['catch_traffic', 'run_block'], [])],
    'OT': OL_STYLES, 'OG': OL_STYLES,
    'C': [('pass_pro', 'Pass Protector', ['pass_block', 'footwork'], ['run_block']),
          ('road_grader', 'Road Grader', ['run_block', 'strength'], ['footwork', 'speed']),
          ('anchor_man', 'Line Captain', ['awareness', 'snapping'], ['strength'])],
    'DL': DT_STYLES, 'DT': DT_STYLES,
    'DE': [('speed_rusher', 'Speed Rusher', ['speed_rush', 'speed'], ['strength']),
           ('power_rusher', 'Power Rusher', ['power_moves', 'strength'], ['speed']),
           ('edge_setter', 'Edge Setter', ['block_shed', 'tackling'], ['speed_rush'])],
    'LB': [('thumper', 'Thumper', ['tackling', 'hit_power'], ['zone_cover', 'man_cover']),
           ('coverage_lb', 'Coverage Linebacker', ['zone_cover', 'man_cover', 'speed'], ['hit_power']),
           ('field_general', 'Field General', ['play_rec', 'pursuit'], ['man_cover'])],
    'CB': [('lockdown', 'Lockdown Corner', ['man_cover', 'press'], ['zone_cover']),
           ('zone_hawk', 'Zone Hawk', ['zone_cover', 'ball_skills'], ['press']),
           ('slot', 'Slot Corner', ['agility', 'man_cover'], ['press', 'tackling']),
           ('physical', 'Physical Corner', ['press', 'tackling'], ['speed'])],
    'SS': [('box_safety', 'Box Safety', ['tackling', 'hit_power'], ['man_cover']),
           ('ball_hawk', 'Ball Hawk', ['ball_skills', 'zone_cover'], ['hit_power']),
           ('center_fielder', 'Center Fielder', ['zone_cover', 'speed', 'play_rec'], ['tackling'])],
}

lines = ',\n'.join(f'  {pos}: ' + json.dumps([[k, l] for k, l in attrs]) for pos, attrs in DEFS.items())
(ROOT / 'src' / 'lib' / 'attributeDefs.js').write_text(
    '// The 9 attributes for each position as [key, label] (generated by tools/league/make_attribute_defs.py, do not edit by hand).\n'
    f'export const ATTRIBUTES = {{\n{lines},\n}};\n\n'
    '// Archetype names by position, as { key: label }.\n'
    f'export const STYLES = {json.dumps({p: {k: l for k, l, _, _ in v} for p, v in STYLES.items()})};\n', encoding='utf-8')
rows = ',\n'.join(f"('{pos}', {i + 1}, '{k}', '{l}')" for pos, attrs in DEFS.items() for i, (k, l) in enumerate(attrs))
(ROOT / 'supabase' / 'seed' / '08_attribute_defs.sql').write_text(
    '-- The 9 attributes for each position (generated by tools/league/make_attribute_defs.py).\n'
    'delete from public.attribute_defs;\ninsert into public.attribute_defs (position, ord, key, label) values\n' + rows + ';\n'
    'delete from public.style_defs;\ninsert into public.style_defs (position, style, label, boosts, drops) values\n'
    + ',\n'.join(f"('{p}', '{k}', '{l}', '{{{','.join(b)}}}', '{{{','.join(d)}}}')" for p, v in STYLES.items() for k, l, b, d in v) + ';\n', encoding='utf-8')
print('positions:', len(DEFS), 'rows:', sum(len(a) for a in DEFS.values()))
