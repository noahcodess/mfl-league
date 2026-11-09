# MFL League Site

The MFL league website: coach logins, rosters, contracts, trades, draft and season hub (Phase 1), then the animated game (Phase 2). Plan: "MFL Build Plan" doc.

## Rules (keep it organized)

- **Screens go in `src/pages/`.** One file per screen.
- **Shared pieces go in `src/components/`.** Anything used on more than one screen.
- **Saving and loading goes in `src/data/`.** Pages never read files or the database directly; they call a data function.
- `src/lib/` holds small helpers (formatting, routing). `src/styles/` holds the theme.
- **One job per file.** Each file starts with a one-line comment saying its job.
- **No file over 200 lines.** `npm run check` fails if one is.
- **Before writing anything new, search for it first.** Reuse or extend what exists instead of making a second version.

## Layout

```
src/
  pages/        LeaguePage, TeamPage, DataCheckPage
  components/   Header, TeamBadge, StarIcon, StarRating, RatingChip, MoodTag, CapBar, DepthChart, ContractTable, PickList, IssueList
  data/         league.json (imported rosters), teams.js, players.js, picks.js, issues.js, positions.js, teamStyles.json
  lib/          format.js, router.js
  styles/       theme.css
docs/           League Rules Original, League History, Player Development
tools/
  import/       raw Discord roster posts, parse_rosters.py, check_league.py, Import Report.md
  check_files.py
```

## Commands

- `npm run dev`: local site
- `npm run import`: re-read the roster posts in `tools/import/raw/` and rebuild the data + problem list
- `npm run check`: enforce the folder and file-size rules
- `npm run build:preview`: one-file preview build for sharing
