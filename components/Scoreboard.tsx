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
  return team === "VGK" ? "Golden Knights" : "Hurricanes";
}

function scoreFor(game: CupGame, team: TeamAbbr) {
  return team === game.awayTeam ? game.awayScore ?? 0 : game.homeScore ?? 0;
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

export function Scoreboard({
  game,
  series
}: {
  game: CupGame | null;
  series?: Record<TeamAbbr, number>;
}) {
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
        <style jsx>{styles}</style>
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

      <div className="matchup">
        <div className={`team-card ${flashTeam === game.awayTeam ? "flash" : ""}`}>
          <TeamLogo team={game.awayTeam} size={62} />
          <div className="score-num">{scoreFor(game, game.awayTeam)}</div>
          <div className="team-name">{displayTeamName(game.awayTeam)}</div>
          <div className="series-line">Series {seriesText(game.awayTeam, series)}</div>
        </div>

        <div className="score-divider">-</div>

        <div className={`team-card ${flashTeam === game.homeTeam ? "flash" : ""}`}>
          <TeamLogo team={game.homeTeam} size={62} />
          <div className="score-num">{scoreFor(game, game.homeTeam)}</div>
          <div className="team-name">{displayTeamName(game.homeTeam)}</div>
          <div className="series-line">Series {seriesText(game.homeTeam, series)}</div>
        </div>
      </div>

      <div className="game-subtitle">
        Stanley Cup Final • Game {game.gameNumber}
      </div>

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
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 24px;
  padding: clamp(16px, 4vw, 28px);
  background:
    radial-gradient(circle at top left, rgba(206,17,38,.24), transparent 18rem),
    radial-gradient(circle at top right, rgba(185,151,91,.26), transparent 18rem),
    rgba(255,255,255,.08);
  color: #fff;
  box-shadow: 0 10px 30px rgba(0,0,0,.22);
  backdrop-filter: blur(16px);
  font-family: Arial, Helvetica, sans-serif;
}

.score-card *, .score-card *::before, .score-card *::after {
  box-sizing: border-box;
}

.score-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: clamp(16px, 4vw, 24px);
}

.mini-label {
  color: rgba(255,255,255,.68);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.score-top h2 {
  margin: 0;
  font-size: clamp(22px, 4.8vw, 30px);
  line-height: 1;
  font-weight: 800;
  color: #fff;
}

.status-chip {
  border-radius: 999px;
  padding: 8px 10px;
  background: rgba(255,255,255,.10);
  color: rgba(255,255,255,.82);
  font-size: clamp(12px, 2.8vw, 15px);
  font-weight: 800;
  white-space: nowrap;
  text-align: right;
}

.status-chip.live {
  background: rgba(206,17,38,.92);
  color: #fff;
  animation: livePulse 1.35s ease-in-out infinite;
}

.matchup {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: clamp(8px, 3vw, 22px);
  align-items: stretch;
}

.team-card {
  min-width: 0;
  display: grid;
  justify-items: center;
  text-align: center;
  border-radius: 18px;
  padding: 12px 6px;
  background: rgba(0,0,0,.25);
  border: 1px solid rgba(255,255,255,.10);
}

.score-num {
  margin-top: 8px;
  font-size: clamp(38px, 10vw, 60px);
  line-height: .92;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.04em;
}

.team-name {
  margin-top: 8px;
  font-size: clamp(15px, 3.6vw, 22px);
  font-weight: 800;
  line-height: 1.08;
  color: #fff;
  overflow-wrap: break-word;
}

.series-line {
  margin-top: 6px;
  border-radius: 999px;
  padding: 5px 8px;
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.72);
  font-size: clamp(11px, 2.5vw, 13px);
  font-weight: 800;
  letter-spacing: .02em;
}

.score-divider {
  align-self: center;
  color: rgba(255,255,255,.76);
  font-size: clamp(28px, 7vw, 44px);
  font-weight: 800;
}

.game-subtitle {
  margin: clamp(18px, 5vw, 26px) 0 clamp(12px, 3vw, 18px);
  text-align: center;
  color: rgba(255,255,255,.70);
  font-size: clamp(14px, 3.2vw, 18px);
  font-weight: 800;
}

.period-table {
  display: grid;
  gap: clamp(5px, 2vw, 10px);
  align-items: center;
  padding: clamp(12px, 3vw, 18px) 0;
  color: #fff;
  font-size: clamp(13px, 3vw, 17px);
  line-height: 1.2;
  background: rgba(0,0,0,.20);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px;
}

.period-table > div {
  text-align: center;
}

.table-team {
  text-align: left !important;
  padding-left: 10px;
}

.table-head {
  color: rgba(255,255,255,.58);
  font-weight: 800;
}

.team-code,
.table-total {
  font-weight: 800;
}

.alerts-row {
  margin-top: 12px;
  min-height: 30px;
}

.notify-button {
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255,255,255,.08);
  color: #fff;
  font-weight: 800;
  font-family: Arial, Helvetica, sans-serif;
}

.alerts-on {
  display: inline-flex;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(50,213,131,.14);
  color: #32d583;
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
  font-weight: 800;
  letter-spacing: -0.08em;
}

.vgk-goal { box-shadow: 0 0 70px rgba(244,208,111,.45); }
.car-goal { box-shadow: 0 0 70px rgba(206,17,38,.55); }
.shake { animation: shake .55s ease; }
.flash { animation: flash 2.5s ease; }

.empty-text {
  color: rgba(255,255,255,.68);
  font-size: 14px;
}

@media (max-width: 430px) {
  .score-card {
    padding: 16px 12px;
    border-radius: 22px;
  }

  .matchup {
    gap: 6px;
  }

  .team-card {
    padding: 10px 4px;
  }

  .team-name {
    font-size: 16px;
  }

  .period-table {
    gap: 4px;
    font-size: 13px;
  }

  .score-divider {
    font-size: 32px;
  }
}

@keyframes livePulse {
  0%, 100% { box-shadow: 0 0 0 rgba(206,17,38,0); }
  50% { box-shadow: 0 0 18px rgba(206,17,38,.55); }
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
