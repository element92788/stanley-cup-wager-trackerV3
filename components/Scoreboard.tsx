"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CONFIG } from "@/lib/config";
import type { CupGame } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

type NotifyState = "default" | "granted" | "denied" | "unsupported";

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
  const [notificationState, setNotificationState] = useState<NotifyState>("unsupported");

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("Notification" in window) {
      setNotificationState(window.Notification.permission as NotifyState);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    }
  }, []);

  const currentScore = useMemo(() => {
    if (!game) return null;
    return { gameId: game.id, home: game.homeScore, away: game.awayScore };
  }, [game]);

  async function sendMobileNotification(title: string, body: string, icon: string) {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (window.Notification.permission !== "granted") return;

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon,
          tag: `goal-${Date.now()}`
        });
      } else {
        new window.Notification(title, { body, icon });
      }
    } catch {
      new window.Notification(title, { body, icon });
    }
  }

  useEffect(() => {
    if (!game || !currentScore) return;

    const previous = previousScoreRef.current;

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

      sendMobileNotification(
        `GOAL! ${CONFIG.teams[scoringTeam].fullName}`,
        alert.score,
        CONFIG.teams[scoringTeam].logo
      );

      window.setTimeout(() => setGoalAlert(null), 6500);
      window.setTimeout(() => setFlashTeam(null), 2500);
    }

    previousScoreRef.current = currentScore;
  }, [game, currentScore]);

  async function enableNotifications() {
    if (typeof window === "undefined") return;

    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      return;
    }

    const permission = await window.Notification.requestPermission();
    setNotificationState(permission as NotifyState);

    if (permission === "granted") {
      await sendMobileNotification(
        "Goal alerts enabled",
        "You’ll get an alert when VGK or CAR scores while this app is open or installed.",
        "/icon.svg"
      );
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

        {notificationState !== "granted" && notificationState !== "unsupported" && (
          <button className="notify-button" onClick={enableNotifications}>
            Enable Goal Alerts
          </button>
        )}

        {notificationState === "granted" && <span className="badge">Alerts On</span>}
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
      <p className="small">
        Mobile alerts work best after adding this site to your phone’s home screen and tapping Enable Goal Alerts.
      </p>
    </section>
  );
}
