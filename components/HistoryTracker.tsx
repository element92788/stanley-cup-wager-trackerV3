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
      <p className="small">Regular season history plus the official 7-game Stanley Cup Final schedule.</p>

      {sortedGames.map((game) => (
        <div className="game-row" key={`${game.startTimeUTC}-${game.awayTeam}-${game.homeTeam}`}>
          <div>
            <div className="small">{new Date(game.startTimeUTC).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</div>
            <strong>{gameCategory(game)}</strong>
            <div className="team-line small">
              <TeamLogo team={game.awayTeam} size={26} />
              <span>{game.awayTeam}</span>
              <strong>{game.awayScore ?? "-"}</strong>
              <span>at</span>
              <TeamLogo team={game.homeTeam} size={26} />
              <span>{game.homeTeam}</span>
              <strong>{game.homeScore ?? "-"}</strong>
            </div>
            {game.venue && <div className="small">{game.venue}</div>}
          </div>
          {statusBadge(game)}
        </div>
      ))}
    </section>
  );
}
