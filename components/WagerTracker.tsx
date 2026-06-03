import { CONFIG, type TeamAbbr } from "@/lib/config";
import type { TrackerData } from "@/lib/types";

function money(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value)}`;
}

export function WagerTracker({
  data,
  perspective,
  setPerspective
}: {
  data: TrackerData;
  perspective: TeamAbbr;
  setPerspective: (team: TeamAbbr) => void;
}) {
  const cupWinner = data.cupWinner;
  const brett =
    data.series.VGK * CONFIG.gameWinValue -
    data.series.CAR * CONFIG.gameWinValue +
    (cupWinner === "VGK" ? CONFIG.cupBonusValue : 0);

  const dad =
    data.series.CAR * CONFIG.gameWinValue -
    data.series.VGK * CONFIG.gameWinValue +
    (cupWinner === "CAR" ? CONFIG.cupBonusValue : 0);

  return (
    <section className="card">
      <div className="label">Wager tracker</div>
      <h2>Current Wager</h2>

      <div className="toggle">
        <button className={perspective === "VGK" ? "active" : ""} onClick={() => setPerspective("VGK")}>Brett / VGK</button>
        <button className={perspective === "CAR" ? "active" : ""} onClick={() => setPerspective("CAR")}>Dad / CAR</button>
      </div>

      <div className="wager-row">
        <span>Brett / VGK</span>
        <strong>{money(brett)}</strong>
      </div>
      <div className="wager-row">
        <span>Dad / CAR</span>
        <strong>{money(dad)}</strong>
      </div>

      <p className="small">$10 per Stanley Cup Final game won • $100 Cup winner bonus</p>
    </section>
  );
}
