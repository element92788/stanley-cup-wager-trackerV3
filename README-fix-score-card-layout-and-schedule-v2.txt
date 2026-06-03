FIX SCORE CARD + OFFICIAL SCHEDULE V2

Replace:
- components/Scoreboard.tsx
- app/api/nhl/route.ts
- lib/types.ts

Also delete the old google-score-card CSS you pasted at the bottom of app/globals.css.
The new Scoreboard has its own scoped styles, so old global CSS can break it.

Official schedule matches NHL.com:
Game 1 Tue Jun 2 8 PM ET
Game 2 Thu Jun 4 8 PM ET
Game 3 Sat Jun 6 8 PM ET
Game 4 Tue Jun 9 8 PM ET
Game 5 Thu Jun 11 8 PM ET
Game 6 Sun Jun 14 8 PM ET
Game 7 Wed Jun 17 8 PM ET

Then:
git add .
git commit -m "Fix score card layout and official schedule"
git push
