"use client";

import { useEffect, useState } from "react";
import { CONFIG, type TeamAbbr } from "@/lib/config";
import type { TrackerData } from "@/lib/types";
import { Countdown } from "@/components/Countdown";
import { Scoreboard } from "@/components/Scoreboard";
import { WagerTracker } from "@/components/WagerTracker";
import { SeriesTracker } from "@/components/SeriesTracker";
import { HistoryTracker } from "@/components/HistoryTracker";
import { TeamLogo } from "@/components/TeamLogo";

const fallbackGame = {
  id: "initial",
  gameNumber: 1,
  startTimeUTC: CONFIG.firstGamePuckDrop,
  venue: "PNC Arena, Raleigh, NC",
  homeTeam: "CAR" as const,
  awayTeam: "VGK" as const,
  homeScore: null,
  awayScore: null,
  status: "scheduled" as const,
  period: null,
  clock: null,
  winner: null,
  gameType: 3,
  playoffRound: 4,
  isStanleyCupFinal: true
};

const fallback: TrackerData = {
  generatedAt: new Date().toISOString(),
  source: "fallback",
  games: [fallbackGame],
  finalsGames: [fallbackGame],
  nextGame: fallbackGame,
  liveGame: null,
  series: { VGK: 0, CAR: 0 },
  cupWinner: null
};

export default function Home() {
  const [data, setData] = useState<TrackerData>(fallback);
  const [loading, setLoading] = useState(true);
  const [perspective, setPerspectiveState] = useState<TeamAbbr>("VGK");

  function setPerspective(team: TeamAbbr) {
    setPerspectiveState(team);
    window.localStorage.setItem("cup-perspective", team);
  }

  async function load() {
    try {
      const res = await fetch("/api/nhl", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      setData(fallback);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("cup-perspective") as TeamAbbr | null;
    if (saved === "VGK" || saved === "CAR") setPerspectiveState(saved);
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const latestFinalsGame = data.liveGame || [...data.finalsGames].reverse().find((g) => g.status === "final") || null;

  return (
    <main>
      <section className="hero">
        <p className="kicker">Stanley Cup Finals</p>
        <h1>Wager Tracker</h1>

        <div className="matchup">
          <div className="team gold-border">
            <TeamLogo team="VGK" size={72} />
            <div className="abbr gold">VGK</div>
            <div className="name">Vegas Golden Knights</div>
            <div className="small">Brett</div>
          </div>
          <div className="vs">VS</div>
          <div className="team red-border">
            <TeamLogo team="CAR" size={72} />
            <div className="abbr red">CAR</div>
            <div className="name">Carolina Hurricanes</div>
            <div className="small">Dad</div>
          </div>
        </div>

        <p className="small" style={{ marginTop: 14 }}>
          Wager counts Stanley Cup Final games only • $10 per Final game won • $100 Cup winner bonus
        </p>
      </section>

      {loading ? (
        <section className="card" style={{ marginTop: 14 }}>
          <h2>Loading tracker...</h2>
          <p className="small">Pulling NHL schedule and score data.</p>
        </section>
      ) : (
        <div className="grid">
          <Countdown nextGame={data.nextGame} liveGame={data.liveGame} />
          <div className="grid two">
            <Scoreboard game={latestFinalsGame} />
            <WagerTracker data={data} perspective={perspective} setPerspective={setPerspective} />
          </div>
          <SeriesTracker data={data} />
          <HistoryTracker data={data} />
        </div>
      )}

      <p className="footer">
        Data source: {data.source === "nhl-api" ? "NHL public API" : "fallback schedule"} • Updates every 30 seconds
      </p>
    </main>
  );
}
