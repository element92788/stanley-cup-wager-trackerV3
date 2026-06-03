UPDATE: regular season history + mobile push alerts

Replace:
- app/api/nhl/route.ts
- components/HistoryTracker.tsx
- components/Scoreboard.tsx

Add:
- public/sw.js

Paste:
- css-additions.txt at bottom of app/globals.css

What this changes:
- Games before the Stanley Cup Final are labeled Regular season unless the source truly marks them postseason.
- Stanley Cup Final games stay in the Finals schedule widget, not duplicated in bottom history.
- Live games still show a pulsing LIVE badge.
- Mobile push-style alerts are added using a service worker.

Important mobile note:
- The user must tap Enable Goal Alerts.
- On iPhone, web push works best when the site is added to the Home Screen.
- Browser notifications still require the app/site to be open or installed.
