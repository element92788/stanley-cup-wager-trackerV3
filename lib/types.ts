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
};

export type TrackerData = {
  generatedAt: string;
  source: "nhl-api" | "fallback";
  games: CupGame[];
  nextGame: CupGame | null;
  liveGame: CupGame | null;
  series: Record<TeamAbbr, number>;
  cupWinner: TeamAbbr | null;
};
