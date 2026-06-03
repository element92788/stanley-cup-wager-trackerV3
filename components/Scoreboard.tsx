"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CONFIG } from "@/lib/config";
import type { CupGame } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

function statusText(game: CupGame) {
  if (game.status === "live") {
    const period = game.period ? `Period ${game.period}` : "Live";
    const clock = game.clock ? ` • ${game.clock}` : "";
    return `${period}${clock}`;
  }

  if (game.status === "final") return "Final";

  return new Date(game.startTimeUTC).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

type GoalAlert = {
  team: "VGK" | "CAR";
  score: string;
  timestamp: number;
};

export function Scoreboard({ game }: { game: CupGame | null }) {
  const previousScoreRef = useRef<{ gameId: string; home: number | null; away: number | null } | null>(null);
  const [goalAlert, setGoalAlert] = useState<GoalAlert | null>(null);
  const [flashTeam, setFlashTeam] = useState<"VGK" | "CAR" | null>(null);

  const currentScore = useMemo(() => {
    if (!game) return null;
    return {
      gameId: game.id,
      home: game.homeScore,
      away: game.awayScore
    };
  }, [game]);

  useEffect(() => {
    if (!game || !currentScore) return;

    const previous = previousScoreRef.current;

    // First load: store score but do not alert.
    if (!previous || previous.gameId !== currentScore.gameId) {
      previousScoreRef.current = currentScore;
      return;
    }

    const homeScored =
      typeof previous.home === "number" &&
      typeof currentScore.home === "number" &&
      currentScore.home > previous.home;

    const awayScored =
      typeof previous.away === "number" &&
      typeof currentScore.away === "number" &&
      currentScore.away > previous.away;

    if (homeScored || awayScored) {
      const scoringTeam = homeScored ? game.homeTeam : game.awayTeam;
      const alert = {
        team: scoringTeam,
        score: `${game.awayTeam} ${game.awayScore ?? 0} - ${game.homeTeam} ${game.homeScore ?? 0}`,
        timestamp: Date.now()
      };

      setGoalAlert(alert);
      setFlashTeam(scoringTeam);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`GOAL! ${CONFIG.teams[scoringTeam].fullName}`, {
          body: alert.score,
          icon: CONFIG.teams[scoringTeam].logo
        });
      }

      window.setTimeout(() => setGoalAlert(null), 6500);
      window.setTimeout(() => setFlashTeam(null), 2500);
    }

    previousScoreRef.current = currentScore;
  }, [game, currentScore]);

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  if (!game) {
    return (
      <section className="card">
        <div className="label">Finals score</div>
        <h2>No Stanley Cup Final game live</h2>
        <p className="small">Live scores will appear automatically during the game.</p>
      </section>
    );
  }

  return (
    <section className={`card scoreboard-card ${goalAlert ? "goal-shake" : ""}`}>
      {goalAlert && (
        <div className={`goal-alert ${goalAlert.team === "VGK" ? "goal-vgk" : "goal-car"}`}>
          <div className="goal-alert-big">GOAL!</div>
          <div>{CONFIG.teams[goalAlert.team].fullName}</div>
          <strong>{goalAlert.score}</strong>
        </div>
      )}

      <div className="scoreboard-top">
        <div>
          <div className="label">
            {game.status === "live"
              ? "Live finals score"
              : game.status === "final"
                ? "Latest finals score"
                : "Next finals matchup"}
          </div>
          <h2>Final Game {game.gameNumber}</h2>
        </div>

        {"Notification" in globalThis && (
          <button className="notify-button" onClick={enableNotifications}>
            Enable Goal Alerts
          </button>
        )}
      </div>

      {[game.awayTeam, game.homeTeam].map((team) => (
        <div
          className={`score-row animated-score-row ${
            flashTeam === team ? "score-flash" : ""
          } ${team === "VGK" ? "flash-vgk" : "flash-car"}`}
          key={team}
        >
          <div className="team-line">
            <TeamLogo team={team} size={40} />
            <div>
              <strong>{team}</strong>
              <div className="small">{CONFIG.teams[team].fullName}</div>
            </div>
          </div>

          <div className="score">
            {team === game.awayTeam ? game.awayScore ?? "-" : game.homeScore ?? "-"}
          </div>
        </div>
      ))}

      <p className="small">{statusText(game)}</p>
      {game.status === "scheduled" && (
        <p className="small">Score will change from “-” to live once the NHL feed marks the game live.</p>
      )}
    </section>
  );
}
