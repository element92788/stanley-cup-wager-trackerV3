"use client";

import { useEffect, useState } from "react";
import { CONFIG, type TeamAbbr } from "@/lib/config";
import type { TrackerData } from "@/lib/types";
import { Countdown } from "@/components/Countdown";
import { Scoreboard } from "@/components/Scoreboard";
import { WagerTracker } from "@/components/WagerTracker";
import { HistoryTracker } from "@/components/HistoryTracker";
import { FullSchedule } from "@/components/FullSchedule";
import { TeamLogo } from "@/components/TeamLogo";

const fallbackFinals = [
  {
    id: "scf-game-1",
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
    isStanleyCupFinal: true,
    ifNecessary: false,
    broadcast: "ABC, SN, CBC, TVAS",
    periodScores: []
  }
];

const fallback: TrackerData = {
  generatedAt: new Date().toISOString(),
  source: "fallback",
  games: fallbackFinals,
  finalsGames: fallbackFinals,
  nextGame: fallbackFinals[0],
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

  const latestFinalsGame =
    data.liveGame ||
    [...data.finalsGames].reverse().find((g) => g.status === "final") ||
    data.nextGame ||
    data.finalsGames[0] ||
    null;

  return (
    <main>
      <section className="hero">
        <p className="kicker">Stanley Cup Finals</p>
        <h1>Wager Tracker</h1>

        <div className="hero-series-total" aria-label="Stanley Cup Final series total">
          <span className="series-side series-side-vgk">
            <TeamLogo team="VGK" size={34} />
            <span>VGK</span>
            <strong>{data.series.VGK}</strong>
          </span>
          <span className="series-separator">-</span>
          <span className="series-side series-side-car">
            <strong>{data.series.CAR}</strong>
            <span>CAR</span>
            <TeamLogo team="CAR" size={34} />
          </span>
        </div>

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

        <p className="small hero-note">
          Wager counts Stanley Cup Final games only • $10 per Final game won • $100 Cup winner bonus
        </p>
      </section>

      {loading ? (
        <section className="card loading-card">
          <h2>Loading tracker...</h2>
          <p className="small">Pulling NHL schedule and score data.</p>
        </section>
      ) : (
        <div className="grid">
          <Countdown nextGame={data.nextGame} liveGame={data.liveGame} />
          <Scoreboard game={latestFinalsGame} series={data.series} />
          <WagerTracker data={data} perspective={perspective} setPerspective={setPerspective} />
          <FullSchedule data={data} />
          <HistoryTracker data={data} />
        </div>
      )}

      <p className="footer">
        Data source: {data.source === "nhl-api" ? "NHL public API + ESPN fallback" : "fallback schedule"} • Updates every 30 seconds
      </p>
    </main>
  );
}
