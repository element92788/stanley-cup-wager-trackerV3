import { NextResponse } from "next/server";
import { CONFIG, type TeamAbbr } from "@/lib/config";
import type { CupGame, TrackerData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEAM_ABBRS = new Set(["VGK", "CAR"]);

function parseStatus(game: any): CupGame["status"] {
  const state = String(game.gameState || game.gameScheduleState || "").toUpperCase();
  if (state === "LIVE" || state === "CRIT") return "live";
  if (state === "FINAL" || state === "OFF") return "final";
  return "scheduled";
}

function getPlayoffRound(game: any): number | null {
  if (typeof game.playoffRound === "number") return game.playoffRound;
  if (typeof game.seriesRound === "number") return game.seriesRound;
  if (typeof game.playoffSeries?.round === "number") return game.playoffSeries.round;
  if (typeof game.series?.round === "number") return game.series.round;
  return null;
}

function isStanleyCupFinalGame(game: any): boolean {
  const gameType = Number(game.gameType ?? game.gameTypeId ?? 0);
  const round = getPlayoffRound(game);
  const seriesName = String(
    game.seriesAbbrev ||
    game.seriesTitle ||
    game.seriesName ||
    game.playoffSeries?.seriesTitle ||
    ""
  ).toLowerCase();

  // Only Stanley Cup Final games count toward the wager.
  // Regular season and earlier playoff matchups remain in history only.
  return gameType === 3 && (
    round === 4 ||
    seriesName.includes("stanley cup final") ||
    seriesName.includes("stanley cup finals")
  );
}

function normalizeGame(game: any, index: number): CupGame | null {
  const home = game.homeTeam?.abbrev as TeamAbbr | undefined;
  const away = game.awayTeam?.abbrev as TeamAbbr | undefined;

  if (!home || !away || !TEAM_ABBRS.has(home) || !TEAM_ABBRS.has(away)) return null;
  if (!((home === "VGK" && away === "CAR") || (home === "CAR" && away === "VGK"))) return null;

  const homeScore = typeof game.homeTeam?.score === "number" ? game.homeTeam.score : null;
  const awayScore = typeof game.awayTeam?.score === "number" ? game.awayTeam.score : null;
  const status = parseStatus(game);
  const playoffRound = getPlayoffRound(game);
  const gameType = typeof game.gameType === "number" ? game.gameType : Number(game.gameTypeId ?? 0) || null;

  let winner: TeamAbbr | null = null;
  if (status === "final" && homeScore !== null && awayScore !== null && homeScore !== awayScore) {
    winner = homeScore > awayScore ? home : away;
  }

  return {
    id: String(game.id || game.gamePk || `${game.startTimeUTC}-${index}`),
    gameNumber: index + 1,
    startTimeUTC: game.startTimeUTC || game.gameDate || CONFIG.firstGamePuckDrop,
    venue: game.venue?.default || game.venueLocation?.default || undefined,
    homeTeam: home,
    awayTeam: away,
    homeScore,
    awayScore,
    status,
    period: typeof game.periodDescriptor?.number === "number" ? game.periodDescriptor.number : null,
    clock: game.clock?.timeRemaining || game.gameClock || null,
    winner,
    gameType,
    playoffRound,
    isStanleyCupFinal: isStanleyCupFinalGame(game)
  };
}

function fallbackData(): TrackerData {
  const finalsGames: CupGame[] = [{
    id: "fallback-final-game-1",
    gameNumber: 1,
    startTimeUTC: CONFIG.firstGamePuckDrop,
    venue: "PNC Arena, Raleigh, NC",
    homeTeam: "CAR",
    awayTeam: "VGK",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    period: null,
    clock: null,
    winner: null,
    gameType: 3,
    playoffRound: 4,
    isStanleyCupFinal: true
  }];

  return {
    generatedAt: new Date().toISOString(),
    source: "fallback",
    games: finalsGames,
    finalsGames,
    nextGame: finalsGames[0],
    liveGame: null,
    series: { VGK: 0, CAR: 0 },
    cupWinner: null
  };
}

function buildTracker(allGames: CupGame[], source: TrackerData["source"]): TrackerData {
  const games = allGames
    .sort((a, b) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime())
    .map((g, idx) => ({ ...g, gameNumber: idx + 1 }));

  const finalsGames = games
    .filter((g) => g.isStanleyCupFinal)
    .map((g, idx) => ({ ...g, gameNumber: idx + 1 }));

  const series = finalsGames.reduce<Record<TeamAbbr, number>>(
    (acc, game) => {
      if (game.winner) acc[game.winner] += 1;
      return acc;
    },
    { VGK: 0, CAR: 0 }
  );

  const cupWinner = series.VGK >= 4 ? "VGK" : series.CAR >= 4 ? "CAR" : null;
  const now = Date.now();
  const liveGame = finalsGames.find((g) => g.status === "live") || null;
  const nextGame =
    finalsGames.find((g) => g.status === "scheduled" && new Date(g.startTimeUTC).getTime() >= now - 1000 * 60 * 60 * 8) ||
    null;

  return { generatedAt: new Date().toISOString(), source, games, finalsGames, nextGame, liveGame, series, cupWinner };
}

export async function GET() {
  try {
    const season = "20252026";
    const urls = [
      `https://api-web.nhle.com/v1/club-schedule-season/VGK/${season}`,
      `https://api-web.nhle.com/v1/club-schedule-season/CAR/${season}`
    ];

    const responses = await Promise.all(urls.map((url) => fetch(url, { cache: "no-store" })));
    const payloads = await Promise.all(responses.map((r) => (r.ok ? r.json() : null)));
    const rawGames = payloads.flatMap((p) => p?.games || []);

    const unique = new Map<string, CupGame>();
    rawGames.forEach((raw, index) => {
      const game = normalizeGame(raw, index);
      if (game) unique.set(game.id, game);
    });

    const games = Array.from(unique.values());
    if (!games.length) return NextResponse.json(fallbackData(), { headers: { "Cache-Control": "no-store" } });

    return NextResponse.json(buildTracker(games, "nhl-api"), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(fallbackData(), { headers: { "Cache-Control": "no-store" } });
  }
}
