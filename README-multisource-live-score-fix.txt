MULTI-SOURCE LIVE SCORE FIX

Replace:
- app/api/nhl/route.ts

This version uses multiple live score sources:
1. NHL club-schedule-season/VGK
2. NHL club-schedule-season/CAR
3. NHL score/now
4. NHL gamecenter/{gameId}/landing during live games
5. ESPN NHL scoreboard fallback

The manual 7-game Stanley Cup Final schedule still controls:
- countdown
- full schedule
- wager eligibility

The API sources only fill in:
- live score
- status
- period
- clock
- final result

Then:
git add .
git commit -m "Add ESPN fallback live score source"
git push

Vercel should redeploy automatically.
