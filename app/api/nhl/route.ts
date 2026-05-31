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

function normalizeGame(game: any, index: number): CupGame | null {
  const home = game.homeTeam?.abbrev as TeamAbbr | undefined;
  const away = game.awayTeam?.abbrev as TeamAbbr | undefined;

  if (!home || !away || !TEAM_ABBRS.has(home) || !TEAM_ABBRS.has(away)) return null;
  if (!((home === "VGK" && away === "CAR") || (home === "CAR" && away === "VGK"))) return null;

  const homeScore = typeof game.homeTeam?.score === "number" ? game.homeTeam.score : null;
  const awayScore = typeof game.awayTeam?.score === "number" ? game.awayTeam.score : null;
  const status = parseStatus(game);

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
    winner
  };
}

function fallbackData(): TrackerData {
  const games: CupGame[] = [
    {
      id: "fallback-game-1",
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
      winner: null
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    source: "fallback",
    games,
    nextGame: games[0],
    liveGame: null,
    series: { VGK: 0, CAR: 0 },
    cupWinner: null
  };
}

function buildTracker(games: CupGame[], source: TrackerData["source"]): TrackerData {
  const sorted = games.sort((a, b) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime())
    .map((g, idx) => ({ ...g, gameNumber: idx + 1 }));

  const series = sorted.reduce<Record<TeamAbbr, number>>(
    (acc, game) => {
      if (game.winner) acc[game.winner] += 1;
      return acc;
    },
    { VGK: 0, CAR: 0 }
  );

  const cupWinner = series.VGK >= 4 ? "VGK" : series.CAR >= 4 ? "CAR" : null;
  const liveGame = sorted.find((g) => g.status === "live") || null;
  const now = Date.now();
  const nextGame =
    sorted.find((g) => g.status === "scheduled" && new Date(g.startTimeUTC).getTime() >= now - 1000 * 60 * 60 * 8) ||
    null;

  return {
    generatedAt: new Date().toISOString(),
    source,
    games: sorted,
    nextGame,
    liveGame,
    series,
    cupWinner
  };
}

export async function GET() {
  try {
    const season = "20252026";
    const urls = [
      `https://api-web.nhle.com/v1/club-schedule-season/VGK/${season}`,
      `https://api-web.nhle.com/v1/club-schedule-season/CAR/${season}`
    ];

    const responses = await Promise.all(
      urls.map((url) => fetch(url, { cache: "no-store", next: { revalidate: 0 } }))
    );

    const payloads = await Promise.all(responses.map((r) => (r.ok ? r.json() : null)));
    const rawGames = payloads.flatMap((p) => p?.games || []);

    const unique = new Map<string, CupGame>();
    rawGames.forEach((raw, index) => {
      const game = normalizeGame(raw, index);
      if (game) unique.set(game.id, game);
    });

    const games = Array.from(unique.values());

    if (!games.length) {
      return NextResponse.json(fallbackData(), {
        headers: { "Cache-Control": "no-store" }
      });
    }

    return NextResponse.json(buildTracker(games, "nhl-api"), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return NextResponse.json(fallbackData(), {
      headers: { "Cache-Control": "no-store" }
    });
  }
}
