HISTORY FEED UPDATE

Replace:
- components/HistoryTracker.tsx

Then paste the CSS from:
- history-css-additions.txt

At the bottom of:
- app/globals.css

Changes:
- Replaces "Counts" / "History only"
- Shows "Regular season" or "Postseason"
- Stanley Cup Final games show "Postseason • Stanley Cup Final"
- Live games show a pulsing "● LIVE" badge
- Live history row highlights while the game is in progress

Then:
git add .
git commit -m "Update history labels and live icon"
git push
