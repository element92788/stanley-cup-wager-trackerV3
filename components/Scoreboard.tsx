import { CONFIG } from "@/lib/config";
import type { CupGame } from "@/lib/types";

export function Scoreboard({ game }: { game: CupGame | null }) {
  if (!game) {
    return (
      <section className="card">
        <div className="label">Live score</div>
        <h2>No game live right now</h2>
        <p className="small">Scores will appear automatically during puck drop.</p>
      </section>
    );
  }

  const awayName = CONFIG.teams[game.awayTeam].fullName;
  const homeName = CONFIG.teams[game.homeTeam].fullName;

  return (
    <section className="card">
      <div className="label">Live score</div>
      <h2>Game {game.gameNumber}</h2>
      <div className="score-row">
        <div>
          <strong>{game.awayTeam}</strong>
          <div className="small">{awayName}</div>
        </div>
        <div className="score">{game.awayScore ?? "-"}</div>
      </div>
      <div className="score-row">
        <div>
          <strong>{game.homeTeam}</strong>
          <div className="small">{homeName}</div>
        </div>
        <div className="score">{game.homeScore ?? "-"}</div>
      </div>
      <p className="small">
        {game.status === "live" ? `Period ${game.period ?? ""} ${game.clock ? `• ${game.clock}` : ""}` : "Final"}
      </p>
    </section>
  );
}
