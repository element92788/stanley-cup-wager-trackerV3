import { CONFIG } from "@/lib/config";
import type { TrackerData } from "@/lib/types";

export function SeriesTracker({ data }: { data: TrackerData }) {
  return (
    <section className="card">
      <div className="label">Series</div>
      <h2>
        <span className="gold">VGK {data.series.VGK}</span> - <span className="red">CAR {data.series.CAR}</span>
      </h2>

      {data.cupWinner ? (
        <p className="badge">{CONFIG.teams[data.cupWinner].fullName} win the Cup</p>
      ) : (
        <p className="small">First team to 4 wins claims the Cup bonus.</p>
      )}

      <div>
        {data.games.slice(0, 7).map((game) => (
          <div className="game-row" key={game.id}>
            <div>
              <strong>Game {game.gameNumber}</strong>
              <div className="small">
                {game.awayTeam} at {game.homeTeam} •{" "}
                {new Date(game.startTimeUTC).toLocaleDateString([], { month: "short", day: "numeric" })}
              </div>
            </div>
            <div>
              {game.status === "final" && game.winner ? (
                <span className="badge">{game.winner} won</span>
              ) : game.status === "live" ? (
                <span className="badge live">LIVE</span>
              ) : (
                <span className="badge">Scheduled</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
