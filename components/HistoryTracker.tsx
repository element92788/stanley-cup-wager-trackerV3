import type { TrackerData, CupGame } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

function gameCategory(game: CupGame) {
  if (game.isStanleyCupFinal) return "Postseason • Stanley Cup Final";
  if (game.gameType === 3 || game.playoffRound) return "Postseason";
  return "Regular season";
}

function statusBadge(game: CupGame) {
  if (game.status === "live") return <span className="badge live">● LIVE</span>;
  if (game.status === "final") return <span className="badge">Final</span>;
  return <span className="badge">Scheduled</span>;
}

export function HistoryTracker({ data }: { data: TrackerData }) {
  return (
    <section className="card">
      <div className="label">Full VGK vs CAR history</div>
      <h2>All games found in NHL feed</h2>
      <p className="small">
        This section is for history only. The label under each date shows regular season or postseason.
      </p>

      {data.games.map((game) => (
        <div className={`game-row ${game.status === "live" ? "history-live-row" : ""}`} key={game.id}>
          <div>
            <div className="small">
              {new Date(game.startTimeUTC).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </div>

            <div className="history-game-type">{gameCategory(game)}</div>

            <div className="team-line history-team-line">
              <TeamLogo team={game.awayTeam} size={28} />
              <span>{game.awayTeam}</span>
              <strong>{game.awayScore ?? "-"}</strong>
              <span className="small">at</span>
              <TeamLogo team={game.homeTeam} size={28} />
              <span>{game.homeTeam}</span>
              <strong>{game.homeScore ?? "-"}</strong>
            </div>
          </div>

          <div className="history-status">
            {statusBadge(game)}
            {game.status === "live" && (
              <div className="small">
                {game.period ? `P${game.period}` : "In progress"}
                {game.clock ? ` • ${game.clock}` : ""}
              </div>
            )}
          </div>
        </div>
      ))}

      {!data.games.length && <p className="small">No VGK vs CAR history found yet.</p>}
    </section>
  );
}
