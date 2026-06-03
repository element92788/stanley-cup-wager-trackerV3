GOAL ALERT + ANIMATION UPDATE

Replace this file:
- components/Scoreboard.tsx

Then copy the CSS from:
- goal-alert-css-additions.txt

Paste it at the bottom of:
- app/globals.css

What it does:
- Detects when either team score increases
- Shows a big GOAL overlay
- Flashes the scoring team's score row
- Shakes the scoreboard card
- Adds optional browser push notification button

Important:
- Browser notifications only work after the user taps "Enable Goal Alerts"
- The app still needs NHL score polling working from the API route
