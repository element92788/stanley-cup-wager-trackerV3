BUILD FIX

Replace:
components/Scoreboard.tsx

This removes the TypeScript issues likely caused by browser notification typings during Vercel build.

Then:
git add .
git commit -m "Fix notification TypeScript build"
git push
