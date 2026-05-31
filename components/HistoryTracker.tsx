import type { TrackerData } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function HistoryTracker({ data }: { data: TrackerData }) {
  return (
    <section className="card">
      <div className="label">Full VGK vs CAR history</div>
      <h2>All games found in NHL feed</h2>
      <p className="small">This section is for history only. These games do not affect the wager unless marked Stanley Cup Final.</p>

      {data.games.map((game) => (
        <div className="game-row" key={game.id}>
          <div className="team-line">
            <TeamLogo team={game.awayTeam} size={28} />
            <span className="small">{game.awayTeam}</span>
            <strong>{game.awayScore ?? "-"}</strong>
            <span className="small">at</span>
            <TeamLogo team={game.homeTeam} size={28} />
            <span className="small">{game.homeTeam}</span>
            <strong>{game.homeScore ?? "-"}</strong>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="small">{new Date(game.startTimeUTC).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</div>
            {game.isStanleyCupFinal ? <span className="badge">Counts</span> : <span className="badge">History only</span>}
          </div>
        </div>
      ))}

      {!data.games.length && <p className="small">No VGK vs CAR history found yet.</p>}
    </section>
  );
}
