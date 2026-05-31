import { CONFIG } from "@/lib/config";
import type { CupGame } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function Scoreboard({ game }: { game: CupGame | null }) {
  if (!game) {
    return (
      <section className="card">
        <div className="label">Finals score</div>
        <h2>No Stanley Cup Final game live</h2>
        <p className="small">Scores will appear automatically during Stanley Cup Final games.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="label">{game.status === "live" ? "Live finals score" : "Latest finals score"}</div>
      <h2>Final Game {game.gameNumber}</h2>
      {[game.awayTeam, game.homeTeam].map((team) => (
        <div className="score-row" key={team}>
          <div className="team-line">
            <TeamLogo team={team} size={40} />
            <div>
              <strong>{team}</strong>
              <div className="small">{CONFIG.teams[team].fullName}</div>
            </div>
          </div>
          <div className="score">{team === game.awayTeam ? game.awayScore ?? "-" : game.homeScore ?? "-"}</div>
        </div>
      ))}
      <p className="small">
        {game.status === "live" ? `Period ${game.period ?? ""} ${game.clock ? `• ${game.clock}` : ""}` : game.status}
      </p>
    </section>
  );
}
