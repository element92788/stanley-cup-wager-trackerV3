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

function badge(game: any) {
  if (game.status === "live") return <span className="badge live">● LIVE</span>;
  if (game.status === "final") return <span className="badge">Final{game.winner ? ` • ${game.winner}` : ""}</span>;
  return <span className="badge scheduled">● Scheduled</span>;
}

export function FullSchedule({ data }: { data: TrackerData }) {
  return (
    <section className="card">
      <div className="label">Full Stanley Cup Final schedule</div>
      <h2>Best-of-7 Schedule</h2>
      <p className="small">Only these official Finals games count toward the wager.</p>

      {data.finalsGames.map((game) => (
        <div className="schedule-row" key={game.id}>
          <div>
            <strong>Game {game.gameNumber}{game.ifNecessary ? " • If necessary" : ""}</strong>
            <div className="small team-line">
              <TeamLogo team={game.awayTeam} size={26} />
              <span>{game.awayTeam}</span>
              <span>at</span>
              <TeamLogo team={game.homeTeam} size={26} />
              <span>{game.homeTeam}</span>
            </div>
            <div className="small">{formatGameTime(game.startTimeUTC)} • {game.venue}</div>
          </div>
          {badge(game)}
        </div>
      ))}
    </section>
  );
}
