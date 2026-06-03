"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CONFIG } from "@/lib/config";
import type { CupGame, PeriodScore } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

type NotifyState = "default" | "granted" | "denied" | "unsupported";
type GoalAlert = { team: "VGK" | "CAR"; score: string; timestamp: number };

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

function displayTeamName(team: "VGK" | "CAR") {
  return team === "VGK" ? "Golden Knights" : "Hurricanes";
}

function getPeriodScores(game: CupGame): PeriodScore[] {
  const incoming = game.periodScores?.length ? game.periodScores : [];
  const maxPeriod = Math.max(3, ...incoming.map((p) => p.period));
  return Array.from({ length: maxPeriod }, (_, idx) => {
    const period = idx + 1;
    return incoming.find((p) => p.period === period) || { period, away: null, home: null };
  });
}

function scoreFor(game: CupGame, team: "VGK" | "CAR") {
  return team === game.awayTeam ? game.awayScore ?? "-" : game.homeScore ?? "-";
}

export function Scoreboard({ game }: { game: CupGame | null }) {
  const previousScoreRef = useRef<{ gameId: string; home: number | null; away: number | null } | null>(null);
  const [goalAlert, setGoalAlert] = useState<GoalAlert | null>(null);
  const [flashTeam, setFlashTeam] = useState<"VGK" | "CAR" | null>(null);
  const [notificationState, setNotificationState] = useState<NotifyState>("unsupported");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) {
      setNotificationState(window.Notification.permission as NotifyState);
      if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
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
        <div className="league">NHL</div>
        <div className="empty-title">No Stanley Cup Final game live</div>
        <p className="empty-text">Live scores will appear automatically during the game.</p>
        <style jsx>{styles}</style>
      </section>
    );
  }

  const periods = getPeriodScores(game);
  const columns = `minmax(74px, 1fr) repeat(${periods.length + 1}, minmax(28px, 46px))`;

  return (
    <section className={`score-card ${goalAlert ? "shake" : ""}`}>
      {goalAlert && (
        <div className={`goal-overlay ${goalAlert.team === "VGK" ? "vgk-goal" : "car-goal"}`}>
          <div className="goal-text">GOAL!</div>
          <div>{CONFIG.teams[goalAlert.team].fullName}</div>
          <strong>{goalAlert.score}</strong>
        </div>
      )}

      <div className="top-bar">
        <div className="league">NHL</div>
        <div className={game.status === "live" ? "live-state" : "state"}>{statusText(game)}</div>
      </div>

      <div className="matchup">
        <div className={`team-block ${flashTeam === game.awayTeam ? "flash" : ""}`}>
          <div className="logo-wrap"><TeamLogo team={game.awayTeam} size={70} /></div>
          <div className="score-num">{game.awayScore ?? "-"}</div>
          <div className="team-name">{displayTeamName(game.awayTeam)}</div>
          <div className="record">(0 - 0)</div>
        </div>

        <div className="dash">-</div>

        <div className={`team-block ${flashTeam === game.homeTeam ? "flash" : ""}`}>
          <div className="logo-wrap"><TeamLogo team={game.homeTeam} size={70} /></div>
          <div className="score-num">{game.homeScore ?? "-"}</div>
          <div className="team-name">{displayTeamName(game.homeTeam)}</div>
          <div className="record">(0 - 0)</div>
        </div>
      </div>

      <div className="subtitle">Stanley Cup Final • Game {game.gameNumber}</div>

      <div className="period-table" style={{ gridTemplateColumns: columns }}>
        <div className="head team-col">Team</div>
        {periods.map((p) => <div className="head" key={`h-${p.period}`}>{p.period <= 3 ? p.period : `OT${p.period - 3}`}</div>)}
        <div className="head">T</div>

        <div className="team-code">{game.awayTeam}</div>
        {periods.map((p) => <div key={`${game.awayTeam}-${p.period}`}>{p.away ?? "-"}</div>)}
        <div className="total">{scoreFor(game, game.awayTeam)}</div>

        <div className="team-code">{game.homeTeam}</div>
        {periods.map((p) => <div key={`${game.homeTeam}-${p.period}`}>{p.home ?? "-"}</div>)}
        <div className="total">{scoreFor(game, game.homeTeam)}</div>
      </div>

      <div className="alerts-row">
        {notificationState !== "granted" && notificationState !== "unsupported" && (
          <button className="notify-button" onClick={enableNotifications}>Enable Goal Alerts</button>
        )}
        {notificationState === "granted" && <span className="alerts-on">Alerts On</span>}
      </div>

      <style jsx>{styles}</style>
    </section>
  );
}

const styles = `
.score-card {
  all: initial;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  display: block;
  width: 100%;
  max-width: 100%;
  border: 1px solid #dadce0;
  border-radius: 26px;
  padding: clamp(18px, 4vw, 34px);
  background: #fff;
  color: #202124;
  box-shadow: 0 16px 40px rgba(0,0,0,.28);
  font-family: Arial, Helvetica, sans-serif;
}

.score-card *, .score-card *::before, .score-card *::after {
  box-sizing: border-box;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: clamp(18px, 4vw, 28px);
}

.league {
  font-size: clamp(24px, 5vw, 38px);
  color: #5f6368;
  line-height: 1;
}

.state, .live-state {
  font-size: clamp(18px, 4.8vw, 34px);
  font-weight: 800;
  line-height: 1.1;
  text-align: right;
}

.live-state { color: #188038; }
.state { color: #5f6368; }

.matchup {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: clamp(8px, 3vw, 30px);
  align-items: start;
}

.team-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
}

.logo-wrap {
  height: clamp(54px, 15vw, 86px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-num {
  margin-top: 10px;
  font-size: clamp(54px, 15vw, 90px);
  line-height: .95;
  font-weight: 500;
  color: #111;
}

.team-name {
  margin-top: 12px;
  font-size: clamp(21px, 5.4vw, 42px);
  line-height: 1.08;
  color: #202124;
  max-width: 100%;
  overflow-wrap: break-word;
}

.record {
  margin-top: 8px;
  font-size: clamp(15px, 3.7vw, 25px);
  color: #5f6368;
}

.dash {
  align-self: center;
  font-size: clamp(42px, 11vw, 78px);
  line-height: 1;
  color: #202124;
  transform: translateY(clamp(26px, 8vw, 44px));
}

.subtitle {
  margin: clamp(22px, 5vw, 34px) 0 clamp(16px, 4vw, 26px);
  text-align: center;
  color: #5f6368;
  font-size: clamp(20px, 4.9vw, 34px);
  line-height: 1.15;
}

.period-table {
  display: grid;
  gap: clamp(6px, 2vw, 12px);
  align-items: center;
  border-top: 2px solid #dadce0;
  border-bottom: 2px solid #dadce0;
  padding: clamp(16px, 4vw, 24px) 0;
  color: #202124;
  font-size: clamp(17px, 4.7vw, 30px);
  line-height: 1.2;
}

.period-table > div {
  text-align: center;
}

.period-table .team-col,
.period-table .team-code {
  text-align: left;
  padding-left: 6px;
}

.head {
  color: #5f6368;
  font-weight: 400;
}

.team-code, .total {
  font-weight: 500;
}

.alerts-row {
  margin-top: 14px;
  min-height: 34px;
}

.notify-button {
  border: 1px solid #dadce0;
  border-radius: 999px;
  padding: 8px 12px;
  background: #f8fafd;
  color: #202124;
  font-weight: 700;
  font-family: Arial, Helvetica, sans-serif;
}

.alerts-on {
  display: inline-flex;
  border-radius: 999px;
  padding: 8px 12px;
  background: #e6f4ea;
  color: #188038;
  font-weight: 800;
}

.goal-overlay {
  position: absolute;
  inset: 14px;
  z-index: 10;
  display: grid;
  place-items: center;
  text-align: center;
  border-radius: 24px;
  background: rgba(0,0,0,.92);
  color: white;
  border: 2px solid rgba(255,255,255,.45);
  animation: goalPop 6.5s ease forwards;
  font-family: Arial, Helvetica, sans-serif;
}

.goal-text {
  font-size: clamp(48px, 13vw, 92px);
  font-weight: 1000;
  letter-spacing: -0.08em;
}

.vgk-goal { box-shadow: 0 0 70px rgba(244,208,111,.45); }
.car-goal { box-shadow: 0 0 70px rgba(206,17,38,.55); }
.shake { animation: shake .55s ease; }
.flash { animation: flash 2.5s ease; }

.empty-title {
  margin-top: 16px;
  font-size: clamp(24px, 6vw, 40px);
  font-weight: 700;
  color: #202124;
}

.empty-text {
  color: #5f6368;
  font-size: 16px;
}

@media (max-width: 430px) {
  .score-card {
    padding: 18px 14px;
    border-radius: 24px;
  }

  .matchup {
    gap: 8px;
  }

  .team-name {
    font-size: 20px;
  }

  .record {
    font-size: 14px;
  }

  .period-table {
    gap: 6px;
    font-size: 16px;
  }

  .dash {
    font-size: 42px;
  }
}

@keyframes goalPop {
  0% { opacity: 0; transform: scale(.75); }
  10% { opacity: 1; transform: scale(1.05); }
  82% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(.92); pointer-events: none; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

@keyframes flash {
  0%, 100% { transform: scale(1); }
  20% { transform: scale(1.035); }
  50% { transform: scale(1); }
  70% { transform: scale(1.025); }
}
`;
