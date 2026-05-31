import { NextResponse } from "next/server";
import { type TeamAbbr } from "@/lib/config";
import type { CupGame, TrackerData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEAM_ABBRS = new Set(["VGK", "CAR"]);

/*
  Source of truth for the full 7-game Stanley Cup Final schedule.
  The NHL API is still pulled and merged into these games for live/final score updates.
  This prevents the app from saying "no upcoming game" when the NHL schedule endpoint
  has not labeled future games as Stanley Cup Final / Round 4 yet.

  Times below are 8:00 PM ET.
  Edit these if the official dates/times change.
*/
const MANUAL_FINALS_SCHEDULE: CupGame[] = [
  {
    id: "scf-game-1",
    gameNumber: 1,
    startTimeUTC: "2026-06-03T00:00:00Z",
    venue: "PNC Arena, Raleigh, NC",
    homeTeam: "CAR",
    awayTeam: "VGK",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    ifNecessary: false,
    broadcast: "TBD",
    gameType: 3,
    playoffRound: 4,
    isStanleyCupFinal: true
  },
  {
    id: "scf-game-2",
    gameNumber: 2,
    startTimeUTC: "2026-06-05T00:00:00Z",
    venue: "PNC Arena, Raleigh, NC",
    homeTeam: "CAR",
    awayTeam: "VGK",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    ifNecessary: false,
    broadcast: "TBD",
    gameType: 3,
    playoffRound: 4,
    isStanleyCupFinal: true
  },
  {
    id: "scf-game-3",
    gameNumber: 3,
    startTimeUTC: "2026-06-07T00:00:00Z",
    venue: "T-Mobile Arena, Las Vegas, NV",
    homeTeam: "VGK",
    awayTeam: "CAR",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    ifNecessary: false,
    broadcast: "TBD",
    gameType: 3,
    playoffRound: 4,
    isStanleyCupFinal: true
  },
  {
    id: "scf-game-4",
    gameNumber: 4,
    startTimeUTC: "2026-06-09T00:00:00Z",
    venue: "T-Mobile Arena, Las Vegas, NV",
    homeTeam: "VGK",
    awayTeam: "CAR",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    ifNecessary: false,
    broadcast: "TBD",
    gameType: 3,
    playoffRound: 4,
    isStanleyCupFinal: true
  },
  {
    id: "scf-game-5",
    gameNumber: 5,
    startTimeUTC: "2026-06-11T00:00:00Z",
    venue: "PNC Arena, Raleigh, NC",
    homeTeam: "CAR",
    awayTeam: "VGK",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    ifNecessary: true,
    broadcast: "TBD",
    gameType: 3,
    playoffRound: 4,
    isStanleyCupFinal: true
  },
  {
    id: "scf-game-6",
    gameNumber: 6,
    startTimeUTC: "2026-06-13T00:00:00Z",
    venue: "T-Mobile Arena, Las Vegas, NV",
    homeTeam: "VGK",
    awayTeam: "CAR",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    ifNecessary: true,
    broadcast: "TBD",
    gameType: 3,
    playoffRound: 4,
    isStanleyCupFinal: true
  },
  {
    id: "scf-game-7",
    gameNumber: 7,
    startTimeUTC: "2026-06-15T00:00:00Z",
    venue: "PNC Arena, Raleigh, NC",
    homeTeam: "CAR",
    awayTeam: "VGK",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    ifNecessary: true,
    broadcast: "TBD",
    gameType: 3,
    playoffRound: 4,
    isStanleyCupFinal: true
  }
];

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

function isVgkCar(game: any) {
  const home = game.homeTeam?.abbrev;
  const away = game.awayTeam?.abbrev;
  return home && away && TEAM_ABBRS.has(home) && TEAM_ABBRS.has(away);
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

  return gameType === 3 && (
    round === 4 ||
    seriesName.includes("stanley cup final") ||
    seriesName.includes("stanley cup finals")
  );
}

function normalizeGame(game: any, index: number): CupGame | null {
  if (!isVgkCar(game)) return null;

  const home = game.homeTeam.abbrev as TeamAbbr;
  const away = game.awayTeam.abbrev as TeamAbbr;
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
    startTimeUTC: game.startTimeUTC || game.gameDate,
    venue: game.venue?.default || game.venueLocation?.default || undefined,
    homeTeam: home,
    awayTeam: away,
    homeScore,
    awayScore,
    status,
    period: typeof game.periodDescriptor?.number === "number" ? game.periodDescriptor.number : null,
    clock: game.clock?.timeRemaining || game.gameClock || null,
    winner,
    gameType: typeof game.gameType === "number" ? game.gameType : Number(game.gameTypeId ?? 0) || null,
    playoffRound: getPlayoffRound(game),
    isStanleyCupFinal: isStanleyCupFinalGame(game)
  };
}

function sameMatchupAndDate(a: CupGame, b: CupGame) {
  const aDay = new Date(a.startTimeUTC).toISOString().slice(0, 10);
  const bDay = new Date(b.startTimeUTC).toISOString().slice(0, 10);
  return aDay === bDay && a.homeTeam === b.homeTeam && a.awayTeam === b.awayTeam;
}

function mergeFinalsSchedule(apiFinals: CupGame[]) {
  return MANUAL_FINALS_SCHEDULE.map((manual) => {
    const api = apiFinals.find((g) => sameMatchupAndDate(g, manual));
    return api
      ? {
          ...manual,
          ...api,
          id: manual.id,
          gameNumber: manual.gameNumber,
          isStanleyCupFinal: true,
          ifNecessary: manual.ifNecessary,
          broadcast: api.broadcast || manual.broadcast,
          venue: api.venue || manual.venue
        }
      : manual;
  });
}

function buildTracker(historyGames: CupGame[], source: TrackerData["source"]): TrackerData {
  const games = historyGames
    .sort((a, b) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime())
    .map((g, idx) => ({ ...g, gameNumber: idx + 1 }));

  const apiFinals = games.filter((g) => g.isStanleyCupFinal);
  const finalsGames = mergeFinalsSchedule(apiFinals);

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

  return {
    generatedAt: new Date().toISOString(),
    source,
    games,
    finalsGames,
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
      `https://api-web.nhle.com/v1/club-schedule-season/CAR/${season}`,
      `https://api-web.nhle.com/v1/score/now`
    ];

    const responses = await Promise.all(urls.map((url) => fetch(url, { cache: "no-store" })));
    const payloads = await Promise.all(responses.map((r) => (r.ok ? r.json() : null)));

    const rawGames = [
      ...(payloads[0]?.games || []),
      ...(payloads[1]?.games || []),
      ...(payloads[2]?.games || [])
    ];

    const unique = new Map<string, CupGame>();
    rawGames.forEach((raw, index) => {
      const game = normalizeGame(raw, index);
      if (game) unique.set(game.id, game);
    });

    return NextResponse.json(buildTracker(Array.from(unique.values()), "nhl-api"), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch {
    return NextResponse.json(buildTracker([], "fallback"), {
      headers: { "Cache-Control": "no-store" }
    });
  }
}
