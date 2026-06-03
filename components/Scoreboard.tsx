"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CONFIG } from "@/lib/config";
import type { CupGame } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

type NotifyState = "default" | "granted" | "denied" | "unsupported";

function statusText(game: CupGame) {
  if (game.statusText) return game.statusText;

  if (game.status === "live") {
    if (game.clock && game.period) return `${game.clock} • ${periodLabel(game.period)}`;
    if (game.period) return `Live • ${periodLabel(game.period)}`;
    return "Live";
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

function periodLabel(period?: number | null) {
  if (!period) return "";
  if (period === 1) return "1st";
  if (period === 2) return "2nd";
  if (period === 3) return "3rd";
  return `OT${period - 3}`;
}

function displayTeamName(team: "VGK" | "CAR") {
  return team === "VGK" ? "Golden Knights" : "Hurricanes";
}

function totalForTeam(game: CupGame, team: "VGK" | "CAR") {
  return team === game.awayTeam ? game.awayScore ?? "-" : game.homeScore ?? "-";
}

function getPeriodScores(game: CupGame) {
  if (game.periodScores?.length) return game.periodScores;

  return [
    { period: 1, away: null, home: null },
    { period: 2, away: null, home: null },
    { period: 3, away: null, home: null }
  ];
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

  const periods = getPeriodScores(game);

  return (
    <section className={`card scoreboard-card google-score-card ${goalAlert ? "goal-shake" : ""}`}>
      {goalAlert && (
        <div className={`goal-alert ${goalAlert.team === "VGK" ? "goal-vgk" : "goal-car"}`}>
          <div className="goal-alert-big">GOAL!</div>
          <div>{CONFIG.teams[goalAlert.team].fullName}</div>
          <strong>{goalAlert.score}</strong>
        </div>
      )}

      <div className="google-score-header">
        <div className="league-label">NHL</div>
        <div className={game.status === "live" ? "live-game-state" : "game-state"}>
          {statusText(game)}
        </div>
      </div>

      <div className="google-score-main">
        <div className={`google-team ${flashTeam === game.awayTeam ? "score-flash" : ""}`}>
          <TeamLogo team={game.awayTeam} size={72} />
          <div className="google-score-number">{game.awayScore ?? "-"}</div>
          <div className="google-team-name">{displayTeamName(game.awayTeam)}</div>
          <div className="google-team-record">(0 - 0)</div>
        </div>

        <div className="google-score-dash">-</div>

        <div className={`google-team ${flashTeam === game.homeTeam ? "score-flash" : ""}`}>
          <TeamLogo team={game.homeTeam} size={72} />
          <div className="google-score-number">{game.homeScore ?? "-"}</div>
          <div className="google-team-name">{displayTeamName(game.homeTeam)}</div>
          <div className="google-team-record">(0 - 0)</div>
        </div>
      </div>

      <div className="google-game-subtitle">
        Stanley Cup Final • Game {game.gameNumber}
      </div>

      <div className="period-score-table">
        <div className="period-header team-column">Team</div>
        {periods.map((p) => (
          <div className="period-header" key={p.period}>
            {p.period <= 3 ? p.period : `OT${p.period - 3}`}
          </div>
        ))}
        <div className="period-header">T</div>

        <div className="period-team">{game.awayTeam}</div>
        {periods.map((p) => (
          <div key={`${game.awayTeam}-${p.period}`}>{p.away ?? "-"}</div>
        ))}
        <div>{totalForTeam(game, game.awayTeam)}</div>

        <div className="period-team">{game.homeTeam}</div>
        {periods.map((p) => (
          <div key={`${game.homeTeam}-${p.period}`}>{p.home ?? "-"}</div>
        ))}
        <div>{totalForTeam(game, game.homeTeam)}</div>
      </div>

      <div className="scoreboard-top compact-alert-row">
        {notificationState !== "granted" && notificationState !== "unsupported" && (
          <button className="notify-button" onClick={enableNotifications}>
            Enable Goal Alerts
          </button>
        )}

        {notificationState === "granted" && <span className="badge">Alerts On</span>}
      </div>

      <p className="small">
        Mobile alerts work best after adding this site to your phone’s home screen and tapping Enable Goal Alerts.
      </p>
    </section>
  );
}
