"use client";

import { useEffect, useMemo, useState } from "react";
import type { CupGame } from "@/lib/types";

function parts(ms: number) {
  const safe = Math.max(0, ms);
  const days = Math.floor(safe / 86400000);
  const hours = Math.floor((safe % 86400000) / 3600000);
  const minutes = Math.floor((safe % 3600000) / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export function Countdown({ nextGame, liveGame }: { nextGame: CupGame | null; liveGame: CupGame | null }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const p = useMemo(() => parts(nextGame ? new Date(nextGame.startTimeUTC).getTime() - now : 0), [nextGame, now]);

  if (liveGame) {
    return (
      <section className="card">
        <div className="label">Game is live</div>
        <h2>Current puck drop is underway</h2>
        <span className="badge live">LIVE NOW</span>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="label">Next puck drop</div>
      <h2>{nextGame ? `Game ${nextGame.gameNumber}` : "Schedule pending"}</h2>
      {nextGame ? (
        <>
          <p className="small">
            {new Date(nextGame.startTimeUTC).toLocaleString([], {
              weekday: "long",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit"
            })}
            {nextGame.venue ? ` • ${nextGame.venue}` : ""}
          </p>
          <div className="countdown">
            <div className="timebox"><strong>{p.days}</strong><span>Days</span></div>
            <div className="timebox"><strong>{p.hours}</strong><span>Hours</span></div>
            <div className="timebox"><strong>{p.minutes}</strong><span>Min</span></div>
            <div className="timebox"><strong>{p.seconds}</strong><span>Sec</span></div>
          </div>
        </>
      ) : (
        <p className="small">No upcoming puck drop found yet. The app will keep checking the NHL feed.</p>
      )}
    </section>
  );
}
