FIX: playoffs schedule should only show 7 games

Replace:
- app/api/nhl/route.ts
- components/HistoryTracker.tsx

What changed:
- finalsGames is now forced to exactly the 7 manual Stanley Cup Final games.
- NHL/ESPN data can update scores/status for those 7 games, but cannot add extra playoff games.
- Bottom history now includes:
  1. regular season VGK/CAR history before the Final
  2. the exact 7 Stanley Cup Final games
- It will no longer show 11 scheduled playoff games.

Then:
git add .
git commit -m "Limit playoff schedule to seven finals games"
git push
