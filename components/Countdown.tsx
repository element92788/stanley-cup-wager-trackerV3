import type { CupGame } from "@/lib/types";

function getCountdownParts(targetIso: string) {
  const diff = Math.max(0, new Date(targetIso).getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000)
  };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function Countdown({ nextGame, liveGame }: { nextGame: CupGame | null; liveGame: CupGame | null }) {
  if (liveGame) {
    return (
      <section className="card">
        <div className="label">Next Stanley Cup Final puck drop</div>
        <h2>Game {liveGame.gameNumber} is live</h2>
        <div className="countdown">
          {["LIVE", "LIVE", "LIVE", "LIVE"].map((x, idx) => (
            <div key={idx}><strong>{x}</strong><span>{idx === 0 ? "Status" : "Now"}</span></div>
          ))}
        </div>
        <p className="small">{liveGame.awayTeam} at {liveGame.homeTeam} • {liveGame.venue}</p>
      </section>
    );
  }

  if (!nextGame) {
    return (
      <section className="card">
        <div className="label">Next Stanley Cup Final puck drop</div>
        <h2>No upcoming Final game</h2>
        <p className="small">The series may be complete.</p>
      </section>
    );
  }

  const cd = getCountdownParts(nextGame.startTimeUTC);

  return (
    <section className="card">
      <div className="label">Next Stanley Cup Final puck drop</div>
      <h2>Game {nextGame.gameNumber}: {nextGame.awayTeam} at {nextGame.homeTeam}</h2>
      <div className="countdown">
        <div><strong>{cd.days}</strong><span>Days</span></div>
        <div><strong>{cd.hours}</strong><span>Hours</span></div>
        <div><strong>{cd.minutes}</strong><span>Minutes</span></div>
        <div><strong>{cd.seconds}</strong><span>Seconds</span></div>
      </div>
      <p className="small">{formatTime(nextGame.startTimeUTC)} • {nextGame.venue}</p>
    </section>
  );
}
