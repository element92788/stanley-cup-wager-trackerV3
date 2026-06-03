UPDATE: history includes today/live/upcoming

Replace:
- app/api/nhl/route.ts
- components/HistoryTracker.tsx

Paste:
- css-additions.txt at the bottom of app/globals.css

What changed:
- Season Matchup History now includes previous regular season games AND the finals schedule.
- Today's/current game appears in history.
- Live games show pulsing "● LIVE".
- Future games show "● Scheduled".
- Dedupe still prevents NHL + ESPN + manual entries from duplicating the same game.

Then:
git add .
git commit -m "Show live and scheduled games in history"
git push
