OPTIONAL API ENHANCEMENT

To make the period scoring table populate when the feed provides line score data, add this helper into app/api/nhl/route.ts and include periodScores/statusText in normalized games.

Helper:

function getNhlPeriodScores(game: any) {
  const byPeriod =
    game.summary?.scoring ||
    game.periods ||
    game.linescore?.periods ||
    game.periodScores ||
    [];

  if (!Array.isArray(byPeriod)) return [];

  return byPeriod.map((p: any, idx: number) => ({
    period: Number(p.periodDescriptor?.number || p.num || p.period || idx + 1),
    away: typeof p.away === "number" ? p.away : typeof p.awayScore === "number" ? p.awayScore : null,
    home: typeof p.home === "number" ? p.home : typeof p.homeScore === "number" ? p.homeScore : null
  }));
}

Inside normalizeNhlGame return object, add:
periodScores: getNhlPeriodScores(game),
statusText: game.gameState === "LIVE" && game.periodDescriptor?.periodType
  ? `${game.clock?.timeRemaining || ""} ${game.periodDescriptor?.number ? "• Period " + game.periodDescriptor.number : ""}`.trim()
  : null

The Scoreboard works even without this, but period columns will show "-" unless the API route passes periodScores.
