import { NextResponse } from "next/server";
import { type TeamAbbr } from "@/lib/config";
import type { CupGame, PeriodScore, TrackerData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEAM_ABBRS = new Set(["VGK", "CAR"]);
const NHL_SEASON = "20252026";
const FINAL_START = new Date("2026-06-02T20:00:00-04:00").getTime();

const OFFICIAL_FINALS_SCHEDULE: CupGame[] = [
  { id: "scf-game-1", gameNumber: 1, startTimeUTC: "2026-06-02T20:00:00-04:00", venue: "PNC Arena, Raleigh, NC", homeTeam: "CAR", awayTeam: "VGK", homeScore: null, awayScore: null, status: "scheduled", ifNecessary: false, broadcast: "ABC, SN, CBC, TVAS", gameType: 3, playoffRound: 4, isStanleyCupFinal: true, periodScores: [] },
  { id: "scf-game-2", gameNumber: 2, startTimeUTC: "2026-06-04T20:00:00-04:00", venue: "PNC Arena, Raleigh, NC", homeTeam: "CAR", awayTeam: "VGK", homeScore: null, awayScore: null, status: "scheduled", ifNecessary: false, broadcast: "ABC, SN, CBC, TVAS", gameType: 3, playoffRound: 4, isStanleyCupFinal: true, periodScores: [] },
  { id: "scf-game-3", gameNumber: 3, startTimeUTC: "2026-06-06T20:00:00-04:00", venue: "T-Mobile Arena, Las Vegas, NV", homeTeam: "VGK", awayTeam: "CAR", homeScore: null, awayScore: null, status: "scheduled", ifNecessary: false, broadcast: "ABC, SN, CBC, TVAS", gameType: 3, playoffRound: 4, isStanleyCupFinal: true, periodScores: [] },
  { id: "scf-game-4", gameNumber: 4, startTimeUTC: "2026-06-09T20:00:00-04:00", venue: "T-Mobile Arena, Las Vegas, NV", homeTeam: "VGK", awayTeam: "CAR", homeScore: null, awayScore: null, status: "scheduled", ifNecessary: false, broadcast: "ABC, SN, CBC, TVAS", gameType: 3, playoffRound: 4, isStanleyCupFinal: true, periodScores: [] },
  { id: "scf-game-5", gameNumber: 5, startTimeUTC: "2026-06-11T20:00:00-04:00", venue: "PNC Arena, Raleigh, NC", homeTeam: "CAR", awayTeam: "VGK", homeScore: null, awayScore: null, status: "scheduled", ifNecessary: true, broadcast: "ABC, SN, CBC, TVAS", gameType: 3, playoffRound: 4, isStanleyCupFinal: true, periodScores: [] },
  { id: "scf-game-6", gameNumber: 6, startTimeUTC: "2026-06-14T20:00:00-04:00", venue: "T-Mobile Arena, Las Vegas, NV", homeTeam: "VGK", awayTeam: "CAR", homeScore: null, awayScore: null, status: "scheduled", ifNecessary: true, broadcast: "ABC, SN, CBC, TVAS", gameType: 3, playoffRound: 4, isStanleyCupFinal: true, periodScores: [] },
  { id: "scf-game-7", gameNumber: 7, startTimeUTC: "2026-06-17T20:00:00-04:00", venue: "PNC Arena, Raleigh, NC", homeTeam: "CAR", awayTeam: "VGK", homeScore: null, awayScore: null, status: "scheduled", ifNecessary: true, broadcast: "ABC, SN, CBC, TVAS", gameType: 3, playoffRound: 4, isStanleyCupFinal: true, periodScores: [] }
];

async function getJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
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
  return home && away && TEAM_ABBRS.has(home) && TEAM_ABBRS.has(away) && ((home === "VGK" && away === "CAR") || (home === "CAR" && away === "VGK"));
}

function scoreValue(...values: any[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function teamAbbrFromGoal(goal: any): TeamAbbr | null {
  const possible =
    goal.teamAbbrev?.default ||
    goal.teamAbbrev ||
    goal.team?.abbrev ||
    goal.team?.abbreviation ||
    goal.team?.triCode ||
    goal.teamCode ||
    goal.clubAbbrev ||
    goal.scoringTeam?.abbrev ||
    goal.ownerTeamAbbrev ||
    null;

  return possible === "VGK" || possible === "CAR" ? possible : null;
}

function periodNumberFromGoal(goal: any, fallback: number) {
  const n = goal.periodDescriptor?.number ?? goal.period ?? goal.periodNumber ?? goal.periodNum ?? fallback;
  return Number(n) || fallback;
}

function periodScoresFromGoals(game: any): PeriodScore[] {
  const buckets = new Map<number, { period: number; away: number; home: number }>();
  const home = game.homeTeam?.abbrev as TeamAbbr | undefined;
  const away = game.awayTeam?.abbrev as TeamAbbr | undefined;
  if (!home || !away) return [];

  const scoringGroups = game.summary?.scoring || game.scoringSummary || game.scoring || [];
  if (Array.isArray(scoringGroups)) {
    for (const group of scoringGroups) {
      const fallbackPeriod = Number(group.periodDescriptor?.number || group.period || group.periodNumber || 1);
      const goals = Array.isArray(group.goals) ? group.goals : Array.isArray(group.plays) ? group.plays : [];
      for (const goal of goals) {
        const period = periodNumberFromGoal(goal, fallbackPeriod);
        const team = teamAbbrFromGoal(goal);
        if (!team) continue;
        const current = buckets.get(period) || { period, away: 0, home: 0 };
        if (team === away) current.away += 1;
        if (team === home) current.home += 1;
        buckets.set(period, current);
      }
    }
  }

  const plays = game.plays || game.scoringPlays || [];
  if (Array.isArray(plays)) {
    for (const play of plays) {
      const type = String(play.typeDescKey || play.typeCode || play.eventType || play.result?.eventTypeId || "").toLowerCase();
      if (!type.includes("goal")) continue;
      const period = periodNumberFromGoal(play, 1);
      const team = teamAbbrFromGoal(play);
      if (!team) continue;
      const current = buckets.get(period) || { period, away: 0, home: 0 };
      if (team === away) current.away += 1;
      if (team === home) current.home += 1;
      buckets.set(period, current);
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.period - b.period);
}

function getNhlPeriodScores(game: any): PeriodScore[] {
  const source = game.linescore?.periods || game.lineScore?.periods || game.periodScores || game.periods || [];

  if (Array.isArray(source) && source.length) {
    const parsed = source.map((p: any, idx: number) => ({
      period: Number(p.periodDescriptor?.number || p.num || p.period || p.periodNumber || idx + 1),
      away: scoreValue(p.away, p.awayScore, p.awayTeam?.score, p.awayGoals),
      home: scoreValue(p.home, p.homeScore, p.homeTeam?.score, p.homeGoals)
    }));

    if (parsed.some((p) => p.away !== null || p.home !== null)) return parsed;
  }

  return periodScoresFromGoals(game);
}

function getStatusText(game: any, status: CupGame["status"]) {
  if (status === "final") return "Final";
  const period = game.periodDescriptor?.number;
  const clock = game.clock?.timeRemaining || game.gameClock || "";
  if (status === "live" && clock && period) return `${clock} • ${period === 1 ? "1st" : period === 2 ? "2nd" : period === 3 ? "3rd" : `OT${period - 3}`}`;
  if (status === "live") return "Live";
  return null;
}

function normalizeNhlGame(game: any, index: number): CupGame | null {
  if (!isVgkCarNhl(game)) return null;

  const home = game.homeTeam.abbrev as TeamAbbr;
  const away = game.awayTeam.abbrev as TeamAbbr;
  const startTimeUTC = game.startTimeUTC || game.gameDate;
  const homeScore = typeof game.homeTeam?.score === "number" ? game.homeTeam.score : null;
  const awayScore = typeof game.awayTeam?.score === "number" ? game.awayTeam.score : null;
  const status = parseNhlStatus(game);
  const gameType = typeof game.gameType === "number" ? game.gameType : Number(game.gameTypeId ?? 2) || 2;

  let winner: TeamAbbr | null = null;
  if (status === "final" && homeScore !== null && awayScore !== null && homeScore !== awayScore) winner = homeScore > awayScore ? home : away;

  return {
    id: String(game.id || game.gamePk || `nhl-${startTimeUTC}-${index}`),
    gameNumber: index + 1,
    startTimeUTC,
    venue: game.venue?.default || game.venueLocation?.default || undefined,
    homeTeam: home,
    awayTeam: away,
    homeScore,
    awayScore,
    status,
    period: typeof game.periodDescriptor?.number === "number" ? game.periodDescriptor.number : null,
    clock: game.clock?.timeRemaining || game.clock?.timeInIntermission || game.gameClock || null,
    winner,
    gameType,
    playoffRound: gameType === 3 ? 4 : null,
    isStanleyCupFinal: gameType === 3,
    broadcast: "ABC, SN, CBC, TVAS",
    periodScores: getNhlPeriodScores(game),
    statusText: getStatusText(game, status)
  };
}

function normalizeEspnGame(event: any, index: number): CupGame | null {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const homeComp = competitors.find((c: any) => c.homeAway === "home");
  const awayComp = competitors.find((c: any) => c.homeAway === "away");
  const homeAbbr = homeComp?.team?.abbreviation as TeamAbbr | undefined;
  const awayAbbr = awayComp?.team?.abbreviation as TeamAbbr | undefined;

  if (!homeAbbr || !awayAbbr || !TEAM_ABBRS.has(homeAbbr) || !TEAM_ABBRS.has(awayAbbr)) return null;
  if (!((homeAbbr === "VGK" && awayAbbr === "CAR") || (homeAbbr === "CAR" && awayAbbr === "VGK"))) return null;

  const homeScore = homeComp?.score !== undefined && homeComp?.score !== "" ? Number(homeComp.score) : null;
  const awayScore = awayComp?.score !== undefined && awayComp?.score !== "" ? Number(awayComp.score) : null;
  const status = parseEspnStatus(event);

  let winner: TeamAbbr | null = null;
  if (status === "final" && homeScore !== null && awayScore !== null && homeScore !== awayScore) winner = homeScore > awayScore ? homeAbbr : awayAbbr;

  const linescoresByTeam: Record<string, any[]> = {};
  competitors.forEach((c: any) => {
    const abbr = c.team?.abbreviation;
    linescoresByTeam[abbr] = Array.isArray(c.linescores) ? c.linescores : [];
  });

  const maxLen = Math.max(linescoresByTeam[awayAbbr]?.length || 0, linescoresByTeam[homeAbbr]?.length || 0, 0);
  const periodScores = Array.from({ length: maxLen }, (_, i) => ({
    period: i + 1,
    away: scoreValue(linescoresByTeam[awayAbbr]?.[i]?.value, linescoresByTeam[awayAbbr]?.[i]?.displayValue),
    home: scoreValue(linescoresByTeam[homeAbbr]?.[i]?.value, linescoresByTeam[homeAbbr]?.[i]?.displayValue)
  }));

  return {
    id: String(event.id || `espn-${event.date}-${index}`),
    gameNumber: index + 1,
    startTimeUTC: event.date,
    venue: competition?.venue?.fullName || undefined,
    homeTeam: homeAbbr,
    awayTeam: awayAbbr,
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    status,
    period: typeof event?.status?.period === "number" ? event.status.period : null,
    clock: event?.status?.displayClock || event?.status?.type?.shortDetail || null,
    winner,
    gameType: 3,
    playoffRound: 4,
    isStanleyCupFinal: true,
    broadcast: "ABC, SN, CBC, TVAS",
    periodScores,
    statusText: event?.status?.type?.shortDetail || null
  };
}

function gameTime(game: CupGame) {
  return new Date(game.startTimeUTC).getTime();
}

function timeDiffHours(aIso: string, bIso: string) {
  return Math.abs(new Date(aIso).getTime() - new Date(bIso).getTime()) / 36e5;
}

function sameMatchup(a: CupGame, b: CupGame) {
  return a.homeTeam === b.homeTeam && a.awayTeam === b.awayTeam;
}

function chooseBestApiGame(manual: CupGame, apiGames: CupGame[]) {
  return apiGames
    .filter((g) => sameMatchup(g, manual))
    .map((g) => ({ game: g, hours: timeDiffHours(g.startTimeUTC, manual.startTimeUTC) }))
    .filter((x) => x.hours <= 18)
    .sort((a, b) => {
      const aRank = (a.game.status === "live" ? 5 : a.game.status === "final" ? 4 : 1) + (a.game.homeScore !== null ? 2 : 0) + (a.game.periodScores?.length ? 1 : 0);
      const bRank = (b.game.status === "live" ? 5 : b.game.status === "final" ? 4 : 1) + (b.game.homeScore !== null ? 2 : 0) + (b.game.periodScores?.length ? 1 : 0);
      return bRank - aRank || a.hours - b.hours;
    })[0]?.game || null;
}

function mergeFinalsSchedule(apiGames: CupGame[]) {
  return OFFICIAL_FINALS_SCHEDULE.map((manual) => {
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
      periodScores: api.periodScores || [],
      statusText: api.statusText || null,
      isStanleyCupFinal: true,
      gameType: 3,
      playoffRound: 4
    };
  });
}

function dedupeGames(games: CupGame[]) {
  const map = new Map<string, CupGame>();
  for (const game of games) {
    const day = new Date(game.startTimeUTC).toISOString().slice(0, 10);
    const key = `${day}-${game.awayTeam}-${game.homeTeam}`;
    const existing = map.get(key);
    const rank = (game.status === "live" ? 5 : game.status === "final" ? 4 : 1) + (game.homeScore !== null ? 2 : 0) + (game.periodScores?.length ? 1 : 0);
    const existingRank = existing ? (existing.status === "live" ? 5 : existing.status === "final" ? 4 : 1) + (existing.homeScore !== null ? 2 : 0) + (existing.periodScores?.length ? 1 : 0) : -1;
    if (!existing || rank > existingRank) map.set(key, game);
  }
  return Array.from(map.values());
}

function buildTracker(rawGames: CupGame[], source: TrackerData["source"]): TrackerData {
  const finalsGames = mergeFinalsSchedule(rawGames);

  const regularSeasonHistory = rawGames.filter((g) => !g.isStanleyCupFinal || gameTime(g) < FINAL_START);
  const games = dedupeGames([...regularSeasonHistory, ...finalsGames])
    .sort((a, b) => gameTime(a) - gameTime(b))
    .map((g, idx) => ({ ...g, gameNumber: idx + 1 }));

  const series = finalsGames.reduce<Record<TeamAbbr, number>>((acc, game) => {
    if (game.winner) acc[game.winner] += 1;
    return acc;
  }, { VGK: 0, CAR: 0 });

  const cupWinner = series.VGK >= 4 ? "VGK" : series.CAR >= 4 ? "CAR" : null;
  const now = Date.now();
  const liveGame = finalsGames.find((g) => g.status === "live") || null;
  const nextGame = finalsGames.find((g) => g.status === "scheduled" && gameTime(g) >= now - 1000 * 60 * 60 * 8) || null;

  return { generatedAt: new Date().toISOString(), source, games, finalsGames, nextGame, liveGame, series, cupWinner };
}

function espnDateString(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function uniqueDatesForEspn() {
  const dates = new Set<string>();
  for (const offset of [-1, 0, 1]) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    dates.add(espnDateString(d));
  }
  for (const game of OFFICIAL_FINALS_SCHEDULE) dates.add(espnDateString(new Date(game.startTimeUTC)));
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

    const nhlGames = nhlRawGames.map((raw, index) => normalizeNhlGame(raw, index)).filter(Boolean) as CupGame[];

    const liveNhlCandidate = nhlGames.find((g) => g.status === "live");
    if (liveNhlCandidate?.id) {
      const [landing, rightRail, boxscore] = await Promise.all([
        getJson(`https://api-web.nhle.com/v1/gamecenter/${liveNhlCandidate.id}/landing`),
        getJson(`https://api-web.nhle.com/v1/gamecenter/${liveNhlCandidate.id}/right-rail`),
        getJson(`https://api-web.nhle.com/v1/gamecenter/${liveNhlCandidate.id}/boxscore`)
      ]);

      const mergedLive = landing ? {
        ...landing,
        summary: rightRail?.summary || landing?.summary,
        scoringSummary: rightRail?.summary?.scoring || landing?.summary?.scoring,
        linescore: landing?.linescore || boxscore?.linescore
      } : null;

      const normalizedLanding = mergedLive ? normalizeNhlGame(mergedLive, 9999) : null;
      if (normalizedLanding) nhlGames.push(normalizedLanding);
    }

    const espnPayloads = await Promise.all(
      uniqueDatesForEspn().map((date) => getJson(`https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${date}`))
    );

    const espnGames = espnPayloads
      .flatMap((payload) => payload?.events || [])
      .map((event, index) => normalizeEspnGame(event, index))
      .filter(Boolean) as CupGame[];

    return NextResponse.json(buildTracker([...nhlGames, ...espnGames], "nhl-api"), {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" }
    });
  } catch {
    return NextResponse.json(buildTracker([], "fallback"), {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", Pragma: "no-cache", Expires: "0" }
    });
  }
}
