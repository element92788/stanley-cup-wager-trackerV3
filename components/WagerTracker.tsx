"use client";

import { CONFIG, type TeamAbbr } from "@/lib/config";
import type { TrackerData } from "@/lib/types";
import { calculateWager, money } from "@/lib/wager";

export function WagerTracker({
  data,
  perspective,
  setPerspective
}: {
  data: TrackerData;
  perspective: TeamAbbr;
  setPerspective: (team: TeamAbbr) => void;
}) {
  const wager = calculateWager(data, perspective);
  const owner = CONFIG.teams[perspective].owner;
  const otherOwner = CONFIG.teams[wager.other].owner;
  const totalClass = wager.total >= 0 ? "positive" : "negative";

  return (
    <section className="card">
      <div className="label">Wager tracker</div>
      <h2>Viewing {owner}'s side</h2>

      <div className="segmented">
        <button className={perspective === "VGK" ? "active" : ""} onClick={() => setPerspective("VGK")}>
          Brett • VGK
        </button>
        <button className={perspective === "CAR" ? "active" : ""} onClick={() => setPerspective("CAR")}>
          Dad • CAR
        </button>
      </div>

      <div className="wager-row">
        <span>{owner} game wins</span>
        <strong>{wager.myWins}</strong>
      </div>
      <div className="wager-row">
        <span>{otherOwner} game wins</span>
        <strong>{wager.theirWins}</strong>
      </div>
      <div className="wager-row">
        <span>$10 per game net</span>
        <strong className={wager.gameNet >= 0 ? "positive" : "negative"}>{money(wager.gameNet)}</strong>
      </div>
      <div className="wager-row">
        <span>$100 Cup bonus</span>
        <strong className={wager.cupNet >= 0 ? "positive" : "negative"}>{money(wager.cupNet)}</strong>
      </div>
      <div className="wager-row">
        <span>Current total</span>
        <strong className={`money ${totalClass}`}>{money(wager.total)}</strong>
      </div>

      {!data.cupWinner && (
        <p className="small">
          If {CONFIG.teams[perspective].abbr} wins the Cup: <span className="positive">{money(wager.possibleIfWinCup)}</span>.
          {" "}If they lose the Cup: <span className="negative">{money(wager.possibleIfLoseCup)}</span>.
        </p>
      )}

      <p className="small">
        Rules: ${CONFIG.gameWinValue} per game won, plus ${CONFIG.cupBonusValue} to the Stanley Cup winner.
      </p>
    </section>
  );
}
