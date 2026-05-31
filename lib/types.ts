import type { TeamAbbr } from "./config";

export type GameStatus = "scheduled" | "live" | "final";

export type CupGame = {
  id: string;
  gameNumber: number;
  startTimeUTC: string;
  venue?: string;
  homeTeam: TeamAbbr;
  awayTeam: TeamAbbr;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
  period?: number | null;
  clock?: string | null;
  winner?: TeamAbbr | null;
  gameType?: number | null;
  playoffRound?: number | null;
  isStanleyCupFinal?: boolean;
};

export type TrackerData = {
  generatedAt: string;
  source: "nhl-api" | "fallback";
  games: CupGame[];        // full VGK vs CAR history found from NHL feed
  finalsGames: CupGame[];  // ONLY Stanley Cup Final games; wager uses this only
  nextGame: CupGame | null;
  liveGame: CupGame | null;
  series: Record<TeamAbbr, number>; // Stanley Cup Final series only
  cupWinner: TeamAbbr | null;
};
