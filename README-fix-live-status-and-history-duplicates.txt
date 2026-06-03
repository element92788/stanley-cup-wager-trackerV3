FIX: false LIVE games + duplicate history

Replace:
app/api/nhl/route.ts

What changed:
- Removed the loose rule that attached any live CAR/VGK game to every matching home/away finals game.
- Live/final score data now only merges into a scheduled finals game if the date/time is within 18 hours.
- History feed is deduped by date + away team + home team.
- When NHL and ESPN both return the same game, the app keeps the best version instead of showing duplicates.

Then commit/push:
git add .
git commit -m "Fix false live games and duplicate history"
git push
