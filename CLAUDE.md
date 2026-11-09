# MFL League: rules for working in this repo

Noah's rules. Follow them on every change.

- Screens go in `src/pages/`. Shared pieces go in `src/components/`. Saving and loading goes in `src/data/`.
- `src/lib/` is for small helpers, `src/styles/` for the theme. Nothing else under `src/`.
- One job per file, with a one-line comment at the top saying what that job is.
- No file over 200 lines. Run `npm run check` before every commit; it fails on a long or misplaced file.
- Before writing anything new, search the repo for it first. Extend what exists instead of making a second version.
- STAY ORGANIZED.

## Working notes

- The plan is the "MFL Build Plan" doc. Phase 1 = league website, Phase 2 = the game.
- League data comes from the Discord roster posts in `tools/import/raw/`. Re-import with `npm run import`; problems land in `tools/import/Import Report.md` and the site's Data Check page.
- Preview build for sharing: `npm run build:preview` (one HTML file in `dist-preview/`).
- Noah wants progress updates with screenshots during long builds, short code summaries, and no time estimates.
