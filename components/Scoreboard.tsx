"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CONFIG, type TeamAbbr } from "@/lib/config";
import type { CupGame, PeriodScore } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

type NotifyState = "default" | "granted" | "denied" | "unsupported";
type GoalAlert = { team: TeamAbbr; score: string; timestamp: number };

function periodLabel(period?: number | null) {
  if (!period) return "";
  if (period === 1) return "1st";
  if (period === 2) return "2nd";
  if (period === 3) return "3rd";
  return `OT${period - 3}`;
}

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

function displayTeamName(team: TeamAbbr) {
  return CONFIG.teams[team].shortName;
}

function scoreFor(game: CupGame, team: TeamAbbr) {
  return team === game.awayTeam ? game.awayScore ?? "-" : game.homeScore ?? "-";
}

function seriesText(team: TeamAbbr, series?: Record<TeamAbbr, number>) {
  const wins = series?.[team] ?? 0;
  const other: TeamAbbr = team === "VGK" ? "CAR" : "VGK";
  const losses = series?.[other] ?? 0;
  return `${wins}-${losses}`;
}

function getPeriodScores(game: CupGame): PeriodScore[] {
  const incoming = game.periodScores?.length ? game.periodScores : [];
  const maxPeriod = Math.max(3, ...incoming.map((p) => p.period));
  return Array.from({ length: maxPeriod }, (_, idx) => {
    const period = idx + 1;
    return incoming.find((p) => p.period === period) || { period, away: 0, home: 0 };
  });
}

export function Scoreboard({ game, series }: { game: CupGame | null; series?: Record<TeamAbbr, number> }) {
  const previousScoreRef = useRef<{ gameId: string; home: number | null; away: number | null } | null>(null);
  const [goalAlert, setGoalAlert] = useState<GoalAlert | null>(null);
  const [flashTeam, setFlashTeam] = useState<TeamAbbr | null>(null);
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
    if (!("Notification" in window) || window.Notification.permission !== "granted") return;

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, { body, icon, tag: `goal-${Date.now()}` });
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
      sendMobileNotification(`GOAL! ${CONFIG.teams[scoringTeam].fullName}`, alert.score, CONFIG.teams[scoringTeam].logo);

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
      await sendMobileNotification("Goal alerts enabled", "You’ll get an alert when VGK or CAR scores.", "/icon.svg");
    }
  }

  if (!game) {
    return (
      <section className="score-card">
        <div className="score-top">
          <div>
            <div className="mini-label">Live Finals Score</div>
            <h2>NHL</h2>
          </div>
          <span className="status-chip">No live game</span>
        </div>
        <p className="empty-text">Live score will appear automatically during the Stanley Cup Final.</p>
      </section>
    );
  }

  const periods = getPeriodScores(game);
  const columns = `minmax(68px, 1fr) repeat(${periods.length + 1}, minmax(30px, 44px))`;

  return (
    <section className={`score-card ${goalAlert ? "shake" : ""}`}>
      {goalAlert && (
        <div className={`goal-overlay ${goalAlert.team === "VGK" ? "vgk-goal" : "car-goal"}`}>
          <div className="goal-text">GOAL!</div>
          <div>{CONFIG.teams[goalAlert.team].fullName}</div>
          <strong>{goalAlert.score}</strong>
        </div>
      )}

      <div className="score-top">
        <div>
          <div className="mini-label">Live Finals Score</div>
          <h2>NHL</h2>
        </div>
        <span className={game.status === "live" ? "status-chip live" : "status-chip"}>{statusText(game)}</span>
      </div>

      <div className="score-matchup">
        <div className={`score-team-card ${flashTeam === game.awayTeam ? "flash" : ""}`}>
          <TeamLogo team={game.awayTeam} size={62} />
          <div className="score-num">{scoreFor(game, game.awayTeam)}</div>
          <div className="score-team-name">{displayTeamName(game.awayTeam)}</div>
          <div className="series-line">Series {seriesText(game.awayTeam, series)}</div>
        </div>

        <div className="score-divider">-</div>

        <div className={`score-team-card ${flashTeam === game.homeTeam ? "flash" : ""}`}>
          <TeamLogo team={game.homeTeam} size={62} />
          <div className="score-num">{scoreFor(game, game.homeTeam)}</div>
          <div className="score-team-name">{displayTeamName(game.homeTeam)}</div>
          <div className="series-line">Series {seriesText(game.homeTeam, series)}</div>
        </div>
      </div>

      <div className="game-subtitle">Stanley Cup Final • Game {game.gameNumber}</div>

      <div className="period-table" style={{ gridTemplateColumns: columns }}>
        <div className="table-head table-team">Team</div>
        {periods.map((p) => (
          <div className="table-head" key={`head-${p.period}`}>
            {p.period <= 3 ? p.period : `OT${p.period - 3}`}
          </div>
        ))}
        <div className="table-head">T</div>

        <div className="table-team team-code">{game.awayTeam}</div>
        {periods.map((p) => (
          <div key={`${game.awayTeam}-${p.period}`}>{p.away ?? 0}</div>
        ))}
        <div className="table-total">{scoreFor(game, game.awayTeam)}</div>

        <div className="table-team team-code">{game.homeTeam}</div>
        {periods.map((p) => (
          <div key={`${game.homeTeam}-${p.period}`}>{p.home ?? 0}</div>
        ))}
        <div className="table-total">{scoreFor(game, game.homeTeam)}</div>
      </div>

      <div className="alerts-row">
        {notificationState !== "granted" && notificationState !== "unsupported" && (
          <button className="notify-button" onClick={enableNotifications}>Enable Goal Alerts</button>
        )}
        {notificationState === "granted" && <span className="alerts-on">Alerts On</span>}
      </div>
    </section>
  );
}
