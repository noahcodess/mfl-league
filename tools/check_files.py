"""Enforces the project rules: folders and file size. Run with: npm run check"""
import sys
from pathlib import Path

MAX_LINES = 200
SRC = Path(__file__).parents[1] / 'src'
ALLOWED = {'pages', 'components', 'data', 'lib', 'styles'}

bad = []
for f in SRC.rglob('*'):
    if f.is_dir():
        continue
    rel = f.relative_to(SRC)
    if len(rel.parts) > 1 and rel.parts[0] not in ALLOWED:
        bad.append(f'{rel}: not in an allowed folder ({", ".join(sorted(ALLOWED))})')
    if f.suffix in {'.js', '.jsx', '.css', '.py'}:
        n = len(f.read_text(encoding='utf-8').splitlines())
        if n > MAX_LINES:
            bad.append(f'{rel}: {n} lines (max {MAX_LINES}), split it up')
print('\n'.join(bad) if bad else f'OK: every file is in the right folder and under {MAX_LINES} lines')
sys.exit(1 if bad else 0)
