import { CONFIG } from "@/lib/config";
import type { TrackerData } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

function formatGameTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function FullSchedule({ data }: { data: TrackerData }) {
  return (
    <section className="card">
      <div className="label">Full Stanley Cup Final schedule</div>
      <h2>Best-of-7 Schedule</h2>
      <p className="small">
        This section drives the countdown and wager. Regular season games remain in history only.
      </p>

      {data.finalsGames.map((game) => (
        <div className="schedule-row" key={game.id}>
          <div className="schedule-game-number">
            <strong>Game {game.gameNumber}</strong>
            {game.ifNecessary && <span className="small">If necessary</span>}
          </div>

          <div className="schedule-matchup">
            <div className="team-line">
              <TeamLogo team={game.awayTeam} size={28} />
              <strong>{game.awayTeam}</strong>
              <span className="small">at</span>
              <TeamLogo team={game.homeTeam} size={28} />
              <strong>{game.homeTeam}</strong>
            </div>
            <div className="small">{CONFIG.teams[game.homeTeam].fullName} home game</div>
          </div>

          <div className="schedule-detail">
            <strong>{formatGameTime(game.startTimeUTC)}</strong>
            <div className="small">{game.venue || "Venue TBD"}</div>
            <div className="small">{game.broadcast || "Broadcast TBD"}</div>
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
    </section>
  );
}
