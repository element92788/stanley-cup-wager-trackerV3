import { NextResponse } from "next/server";
import { type TeamAbbr } from "@/lib/config";
import type { CupGame, TrackerData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEAM_ABBRS = new Set(["VGK", "CAR"]);
const NHL_SEASON = "20252026";

/*
  The manual Finals schedule drives:
  - countdown
  - full 7-game schedule display
  - wager eligibility

  Live scores are merged into these games from multiple data sources:
  1. NHL score/now
  2. NHL club schedules
  3. NHL gamecenter landing
  4. ESPN NHL scoreboard fallback
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

async function getJson(url: string) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Stanley-Cup-Wager-Tracker/1.0"
      }
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function parseNhlStatus(game: any): CupGame["status"] {
  const state = String(game.gameState || game.gameScheduleState || "").toUpperCase();

  if (state === "LIVE" || state === "CRIT") return "live";
  if (state === "FINAL" || state === "OFF") return "final";

  return "scheduled";
}

function parseEspnStatus(event: any): CupGame["status"] {
  const state = String(event?.status?.type?.state || "").toLowerCase();
  const name = String(event?.status?.type?.name || "").toLowerCase();

  if (state === "in" || name.includes("in_progress")) return "live";
  if (state === "post" || name.includes("final")) return "final";

  return "scheduled";
}

function isVgkCarNhl(game: any) {
  const home = game.homeTeam?.abbrev;
  const away = game.awayTeam?.abbrev;

  return (
    home &&
    away &&
    TEAM_ABBRS.has(home) &&
    TEAM_ABBRS.has(away) &&
    ((home === "VGK" && away === "CAR") || (home === "CAR" && away === "VGK"))
  );
}

function normalizeNhlGame(game: any, index: number): CupGame | null {
  if (!isVgkCarNhl(game)) return null;

  const home = game.homeTeam.abbrev as TeamAbbr;
  const away = game.awayTeam.abbrev as TeamAbbr;
  const homeScore = typeof game.homeTeam?.score === "number" ? game.homeTeam.score : null;
  const awayScore = typeof game.awayTeam?.score === "number" ? game.awayTeam.score : null;
  const status = parseNhlStatus(game);

  let winner: TeamAbbr | null = null;
  if (status === "final" && homeScore !== null && awayScore !== null && homeScore !== awayScore) {
    winner = homeScore > awayScore ? home : away;
  }

  const tv = Array.isArray(game.tvBroadcasts)
    ? game.tvBroadcasts.map((b: any) => b.network || b.name || b.market).filter(Boolean).join(", ")
    : "";

  return {
    id: `nhl-${String(game.id || game.gamePk || `${game.startTimeUTC}-${index}`)}`,
    gameNumber: index + 1,
    startTimeUTC: game.startTimeUTC || game.gameDate,
    venue: game.venue?.default || game.venueLocation?.default || undefined,
    homeTeam: home,
    awayTeam: away,
    homeScore,
    awayScore,
    status,
    period: typeof game.periodDescriptor?.number === "number" ? game.periodDescriptor.number : null,
    clock: game.clock?.timeRemaining || game.clock?.timeInIntermission || game.gameClock || null,
    winner,
    gameType: typeof game.gameType === "number" ? game.gameType : Number(game.gameTypeId ?? 0) || null,
    playoffRound: 4,
    isStanleyCupFinal: true,
    broadcast: tv || "TBD"
  };
}

function normalizeEspnGame(event: any, index: number): CupGame | null {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];

  if (!Array.isArray(competitors) || competitors.length < 2) return null;

  const homeComp = competitors.find((c: any) => c.homeAway === "home");
  const awayComp = competitors.find((c: any) => c.homeAway === "away");

  const homeAbbr = homeComp?.team?.abbreviation as TeamAbbr | undefined;
  const awayAbbr = awayComp?.team?.abbreviation as TeamAbbr | undefined;

  if (!homeAbbr || !awayAbbr) return null;
  if (!TEAM_ABBRS.has(homeAbbr) || !TEAM_ABBRS.has(awayAbbr)) return null;
  if (!((homeAbbr === "VGK" && awayAbbr === "CAR") || (homeAbbr === "CAR" && awayAbbr === "VGK"))) return null;

  const homeScore = homeComp?.score !== undefined && homeComp?.score !== "" ? Number(homeComp.score) : null;
  const awayScore = awayComp?.score !== undefined && awayComp?.score !== "" ? Number(awayComp.score) : null;
  const status = parseEspnStatus(event);

  let winner: TeamAbbr | null = null;
  if (status === "final" && homeScore !== null && awayScore !== null && homeScore !== awayScore) {
    winner = homeScore > awayScore ? homeAbbr : awayAbbr;
  }

  const period = typeof event?.status?.period === "number" ? event.status.period : null;
  const clock = event?.status?.displayClock || event?.status?.type?.shortDetail || null;

  return {
    id: `espn-${String(event.id || `${event.date}-${index}`)}`,
    gameNumber: index + 1,
    startTimeUTC: event.date,
    venue: competition?.venue?.fullName || competition?.venue?.address?.city || undefined,
    homeTeam: homeAbbr,
    awayTeam: awayAbbr,
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    status,
    period,
    clock,
    winner,
    gameType: 3,
    playoffRound: 4,
    isStanleyCupFinal: true,
    broadcast: Array.isArray(competition?.broadcasts)
      ? competition.broadcasts.map((b: any) => b.names?.join(", ")).filter(Boolean).join(", ")
      : "TBD"
  };
}

function datesClose(aIso: string, bIso: string) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.abs(a - b) <= 1000 * 60 * 60 * 36;
}

function sameMatchup(a: CupGame, b: CupGame) {
  return a.homeTeam === b.homeTeam && a.awayTeam === b.awayTeam;
}

function chooseBestApiGame(manual: CupGame, apiGames: CupGame[]) {
  const sameGame = apiGames.filter((g) => sameMatchup(g, manual) && datesClose(g.startTimeUTC, manual.startTimeUTC));
  const liveSameMatchup = apiGames.filter((g) => sameMatchup(g, manual) && g.status === "live");

  const candidates = [...sameGame, ...liveSameMatchup];

  return (
    candidates.find((g) => g.status === "live" && g.homeScore !== null && g.awayScore !== null) ||
    candidates.find((g) => g.status === "final" && g.homeScore !== null && g.awayScore !== null) ||
    candidates.find((g) => g.homeScore !== null && g.awayScore !== null) ||
    candidates[0] ||
    null
  );
}

function mergeFinalsSchedule(apiGames: CupGame[]) {
  return MANUAL_FINALS_SCHEDULE.map((manual) => {
    const api = chooseBestApiGame(manual, apiGames);
    if (!api) return manual;

    return {
      ...manual,
      startTimeUTC: api.startTimeUTC || manual.startTimeUTC,
      venue: api.venue || manual.venue,
      homeScore: api.homeScore,
      awayScore: api.awayScore,
      status: api.status,
      period: api.period,
      clock: api.clock,
      winner: api.winner,
      broadcast: api.broadcast || manual.broadcast,
      isStanleyCupFinal: true
    };
  });
}

function buildTracker(historyGames: CupGame[], source: TrackerData["source"]): TrackerData {
  const games = historyGames
    .filter(Boolean)
    .sort((a, b) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime())
    .map((g, idx) => ({ ...g, gameNumber: idx + 1 }));

  const finalsGames = mergeFinalsSchedule(games);

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

function espnDateString(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function uniqueDatesForEspn() {
  const dates = new Set<string>();

  // Pull today/yesterday/tomorrow so live games are covered even with timezone shifts.
  for (const offset of [-1, 0, 1]) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    dates.add(espnDateString(d));
  }

  // Pull every scheduled Finals date too.
  for (const game of MANUAL_FINALS_SCHEDULE) {
    dates.add(espnDateString(new Date(game.startTimeUTC)));
  }

  return Array.from(dates);
}

export async function GET() {
  try {
    const [vgkSchedule, carSchedule, scoreNow] = await Promise.all([
      getJson(`https://api-web.nhle.com/v1/club-schedule-season/VGK/${NHL_SEASON}`),
      getJson(`https://api-web.nhle.com/v1/club-schedule-season/CAR/${NHL_SEASON}`),
      getJson("https://api-web.nhle.com/v1/score/now")
    ]);

    const nhlRawGames = [
      ...(vgkSchedule?.games || []),
      ...(carSchedule?.games || []),
      ...(scoreNow?.games || [])
    ];

    const nhlGames = nhlRawGames
      .map((raw, index) => normalizeNhlGame(raw, index))
      .filter(Boolean) as CupGame[];

    // If NHL says the game is live, call gamecenter landing for the freshest state.
    const liveNhlCandidate = nhlGames.find((g) => g.status === "live");
    if (liveNhlCandidate?.id) {
      const realGameId = liveNhlCandidate.id.replace("nhl-", "");
      const landing = await getJson(`https://api-web.nhle.com/v1/gamecenter/${realGameId}/landing`);
      const normalizedLanding = landing ? normalizeNhlGame(landing, 9999) : null;
      if (normalizedLanding) nhlGames.push(normalizedLanding);
    }

    // ESPN fallback: this is the additional path when NHL endpoints do not expose the game correctly.
    const espnPayloads = await Promise.all(
      uniqueDatesForEspn().map((date) =>
        getJson(`https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${date}`)
      )
    );

    const espnGames = espnPayloads
      .flatMap((payload) => payload?.events || [])
      .map((event, index) => normalizeEspnGame(event, index))
      .filter(Boolean) as CupGame[];

    const combined = [...nhlGames, ...espnGames];

    const unique = new Map<string, CupGame>();
    combined.forEach((game) => {
      unique.set(`${game.homeTeam}-${game.awayTeam}-${game.startTimeUTC}-${game.id}`, game);
    });

    return NextResponse.json(buildTracker(Array.from(unique.values()), "nhl-api"), {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    });
  } catch {
    return NextResponse.json(buildTracker([], "fallback"), {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    });
  }
}
