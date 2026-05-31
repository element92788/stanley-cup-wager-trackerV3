import { CONFIG } from "@/lib/config";
import type { TrackerData } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function SeriesTracker({ data }: { data: TrackerData }) {
  return (
    <section className="card">
      <div className="label">Stanley Cup Final series</div>
      <h2><span className="gold">VGK {data.series.VGK}</span> - <span className="red">CAR {data.series.CAR}</span></h2>

      <div className="series-logos">
        <TeamLogo team="VGK" size={64} />
        <span>vs</span>
        <TeamLogo team="CAR" size={64} />
      </div>

      {data.cupWinner ? <p className="badge">{CONFIG.teams[data.cupWinner].fullName} win the Cup</p> : <p className="small">First team to 4 Stanley Cup Final wins claims the Cup bonus.</p>}

      {data.finalsGames.map((game) => (
        <div className="game-row" key={game.id}>
          <div>
            <strong>Final Game {game.gameNumber}</strong>
            <div className="small">{game.awayTeam} at {game.homeTeam} • {new Date(game.startTimeUTC).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
          </div>
          <div>
            {game.status === "final" && game.winner ? <span className="badge">{game.winner} won</span> : game.status === "live" ? <span className="badge live">LIVE</span> : <span className="badge">Scheduled</span>}
          </div>
        </div>
      ))}

      {!data.finalsGames.length && <p className="small">No Stanley Cup Final games are available from the NHL feed yet.</p>}
    </section>
  );
}
