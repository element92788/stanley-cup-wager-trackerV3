import { CONFIG, type TeamAbbr } from "./config";
import type { TrackerData } from "./types";

export function calculateWager(data: TrackerData, perspective: TeamAbbr) {
  const other: TeamAbbr = perspective === "VGK" ? "CAR" : "VGK";
  const myWins = data.series[perspective] || 0;
  const theirWins = data.series[other] || 0;
  const gameNet = (myWins - theirWins) * CONFIG.gameWinValue;

  let cupNet = 0;
  if (data.cupWinner === perspective) cupNet = CONFIG.cupBonusValue;
  if (data.cupWinner === other) cupNet = -CONFIG.cupBonusValue;

  return {
    perspective,
    other,
    myWins,
    theirWins,
    gameNet,
    cupNet,
    total: gameNet + cupNet,
    possibleIfWinCup: gameNet + CONFIG.cupBonusValue,
    possibleIfLoseCup: gameNet - CONFIG.cupBonusValue
  };
}

export function money(n: number) {
  if (n === 0) return "$0";
  return `${n > 0 ? "+" : "-"}$${Math.abs(n)}`;
}
