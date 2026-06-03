import type { TrackerData, CupGame } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

const FINAL_START = new Date("2026-06-03T00:00:00Z").getTime();

function gameCategory(game: CupGame) {
  const gameTime = new Date(game.startTimeUTC).getTime();

  if (game.isStanleyCupFinal && gameTime >= FINAL_START) {
    return "Postseason • Stanley Cup Final";
  }

  if (game.gameType === 3 || game.playoffRound) {
    return "Postseason";
  }

  return "Regular season";
}

function statusBadge(game: CupGame) {
  if (game.status === "live") return <span className="badge live">● LIVE</span>;
  if (game.status === "final") return <span className="badge">Final</span>;
  return <span className="badge scheduled">● Scheduled</span>;
}

export function HistoryTracker({ data }: { data: TrackerData }) {
  const sortedGames = [...data.games].sort(
    (a, b) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime()
  );

  return (
    <section className="card">
      <div className="label">Full VGK vs CAR history</div>
      <h2>Season Matchup History</h2>
      <p className="small">
        Includes previous regular season games, today&apos;s live game, and upcoming scheduled games.
      </p>

      {sortedGames.map((game) => (
        <div
          className={`game-row ${game.status === "live" ? "history-live-row" : ""} ${
            game.status === "scheduled" ? "history-scheduled-row" : ""
          }`}
          key={`${game.startTimeUTC}-${game.awayTeam}-${game.homeTeam}`}
        >
          <div>
            <div className="small">
              {new Date(game.startTimeUTC).toLocaleString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit"
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

            {game.venue && <div className="small history-venue">{game.venue}</div>}
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

      {!sortedGames.length && <p className="small">No VGK vs CAR history found yet.</p>}
    </section>
  );
}
