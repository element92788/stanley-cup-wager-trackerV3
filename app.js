const TEAMS = {
  VGK: {
    abbr: "VGK",
    fullName: "Vegas Golden Knights",
    shortName: "Golden Knights",
    owner: "Brett",
    logo: "https://assets.nhle.com/logos/nhl/svg/VGK_light.svg"
  },
  CAR: {
    abbr: "CAR",
    fullName: "Carolina Hurricanes",
    shortName: "Hurricanes",
    owner: "Dad",
    logo: "https://assets.nhle.com/logos/nhl/svg/CAR_light.svg"
  }
};

const GAME_WIN_VALUE = 10;
const CUP_BONUS_VALUE = 100;

// Official NHL.com schedule. Stored with ET offset so the visible date stays correct.
const FINALS = [
  { id: "scf-game-1", gameNumber: 1, startTimeUTC: "2026-06-02T20:00:00-04:00", venue: "PNC Arena, Raleigh, NC", homeTeam: "CAR", awayTeam: "VGK", ifNecessary: false, status: "final", winner: "VGK", homeScore: null, awayScore: null, periodScores: [] },
  { id: "scf-game-2", gameNumber: 2, startTimeUTC: "2026-06-04T20:00:00-04:00", venue: "PNC Arena, Raleigh, NC", homeTeam: "CAR", awayTeam: "VGK", ifNecessary: false, status: "scheduled", winner: null, homeScore: null, awayScore: null, periodScores: [] },
  { id: "scf-game-3", gameNumber: 3, startTimeUTC: "2026-06-06T20:00:00-04:00", venue: "T-Mobile Arena, Las Vegas, NV", homeTeam: "VGK", awayTeam: "CAR", ifNecessary: false, status: "scheduled", winner: null, homeScore: null, awayScore: null, periodScores: [] },
  { id: "scf-game-4", gameNumber: 4, startTimeUTC: "2026-06-09T20:00:00-04:00", venue: "T-Mobile Arena, Las Vegas, NV", homeTeam: "VGK", awayTeam: "CAR", ifNecessary: false, status: "scheduled", winner: null, homeScore: null, awayScore: null, periodScores: [] },
  { id: "scf-game-5", gameNumber: 5, startTimeUTC: "2026-06-11T20:00:00-04:00", venue: "PNC Arena, Raleigh, NC", homeTeam: "CAR", awayTeam: "VGK", ifNecessary: true, status: "scheduled", winner: null, homeScore: null, awayScore: null, periodScores: [] },
  { id: "scf-game-6", gameNumber: 6, startTimeUTC: "2026-06-14T20:00:00-04:00", venue: "T-Mobile Arena, Las Vegas, NV", homeTeam: "VGK", awayTeam: "CAR", ifNecessary: true, status: "scheduled", winner: null, homeScore: null, awayScore: null, periodScores: [] },
  { id: "scf-game-7", gameNumber: 7, startTimeUTC: "2026-06-17T20:00:00-04:00", venue: "PNC Arena, Raleigh, NC", homeTeam: "CAR", awayTeam: "VGK", ifNecessary: true, status: "scheduled", winner: null, homeScore: null, awayScore: null, periodScores: [] }
];

let previousLiveScore = null;
let state = {
  finalsGames: [...FINALS],
  historyGames: [],
  source: "fallback"
};

function $(id) {
  return document.getElementById(id);
}

function formatTime(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function parseNhlStatus(game) {
  const s = String(game.gameState || game.gameScheduleState || "").toUpperCase();
  if (s === "LIVE" || s === "CRIT") return "live";
  if (s === "FINAL" || s === "OFF") return "final";
  return "scheduled";
}

function parseEspnStatus(event) {
  const state = String(event?.status?.type?.state || "").toLowerCase();
  const name = String(event?.status?.type?.name || "").toLowerCase();
  if (state === "in" || name.includes("in_progress")) return "live";
  if (state === "post" || name.includes("final")) return "final";
  return "scheduled";
}

function isVgkCar(home, away) {
  return ((home === "VGK" && away === "CAR") || (home === "CAR" && away === "VGK"));
}

async function getJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function scoreValue(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function goalTeam(goal) {
  const v =
    goal.teamAbbrev?.default ||
    goal.teamAbbrev ||
    goal.team?.abbrev ||
    goal.team?.abbreviation ||
    goal.team?.triCode ||
    goal.teamCode ||
    goal.clubAbbrev ||
    goal.scoringTeam?.abbrev ||
    goal.ownerTeamAbbrev ||
    null;
  return v === "VGK" || v === "CAR" ? v : null;
}

function periodFromGoal(goal, fallback = 1) {
  return Number(goal.periodDescriptor?.number || goal.period || goal.periodNumber || goal.periodNum || fallback) || fallback;
}

function periodScoresFromGoals(game, home, away) {
  const buckets = new Map();

  const scoringGroups = game.summary?.scoring || game.scoringSummary || game.scoring || [];
  if (Array.isArray(scoringGroups)) {
    scoringGroups.forEach((group) => {
      const fallbackPeriod = Number(group.periodDescriptor?.number || group.period || group.periodNumber || 1);
      const goals = Array.isArray(group.goals) ? group.goals : Array.isArray(group.plays) ? group.plays : [];
      goals.forEach((goal) => {
        const team = goalTeam(goal);
        if (!team) return;
        const period = periodFromGoal(goal, fallbackPeriod);
        const current = buckets.get(period) || { period, away: 0, home: 0 };
        if (team === away) current.away += 1;
        if (team === home) current.home += 1;
        buckets.set(period, current);
      });
    });
  }

  const plays = game.plays || game.scoringPlays || [];
  if (Array.isArray(plays)) {
    plays.forEach((play) => {
      const type = String(play.typeDescKey || play.typeCode || play.eventType || play.result?.eventTypeId || "").toLowerCase();
      if (!type.includes("goal")) return;
      const team = goalTeam(play);
      if (!team) return;
      const period = periodFromGoal(play, 1);
      const current = buckets.get(period) || { period, away: 0, home: 0 };
      if (team === away) current.away += 1;
      if (team === home) current.home += 1;
      buckets.set(period, current);
    });
  }

  return [...buckets.values()].sort((a, b) => a.period - b.period);
}

function getNhlPeriodScores(game, home, away) {
  const source = game.linescore?.periods || game.lineScore?.periods || game.periodScores || game.periods || [];
  if (Array.isArray(source) && source.length) {
    const parsed = source.map((p, idx) => ({
      period: Number(p.periodDescriptor?.number || p.num || p.period || p.periodNumber || idx + 1),
      away: scoreValue(p.away, p.awayScore, p.awayTeam?.score, p.awayGoals),
      home: scoreValue(p.home, p.homeScore, p.homeTeam?.score, p.homeGoals)
    }));
    if (parsed.some((p) => p.away !== null || p.home !== null)) return parsed;
  }

  return periodScoresFromGoals(game, home, away);
}

function normalizeNhl(game, index) {
  const home = game.homeTeam?.abbrev;
  const away = game.awayTeam?.abbrev;
  if (!isVgkCar(home, away)) return null;

  const status = parseNhlStatus(game);
  const homeScore = typeof game.homeTeam?.score === "number" ? game.homeTeam.score : null;
  const awayScore = typeof game.awayTeam?.score === "number" ? game.awayTeam.score : null;
  let winner = null;
  if (status === "final" && homeScore !== null && awayScore !== null && homeScore !== awayScore) {
    winner = homeScore > awayScore ? home : away;
  }

  return {
    id: String(game.id || game.gamePk || `nhl-${game.startTimeUTC}-${index}`),
    gameNumber: index + 1,
    startTimeUTC: game.startTimeUTC || game.gameDate,
    venue: game.venue?.default || game.venueLocation?.default || undefined,
    homeTeam: home,
    awayTeam: away,
    homeScore,
    awayScore,
    status,
    period: typeof game.periodDescriptor?.number === "number" ? game.periodDescriptor.number : null,
    clock: game.clock?.timeRemaining || game.clock?.timeInIntermission || game.gameClock || null,
    winner,
    gameType: typeof game.gameType === "number" ? game.gameType : Number(game.gameTypeId ?? 2) || 2,
    isStanleyCupFinal: Number(game.gameType ?? game.gameTypeId ?? 2) === 3,
    periodScores: getNhlPeriodScores(game, home, away),
    statusText: getStatusText(game, status)
  };
}

function normalizeEspn(event, index) {
  const comp = event?.competitions?.[0];
  const competitors = comp?.competitors || [];
  const homeComp = competitors.find((c) => c.homeAway === "home");
  const awayComp = competitors.find((c) => c.homeAway === "away");
  const home = homeComp?.team?.abbreviation;
  const away = awayComp?.team?.abbreviation;
  if (!isVgkCar(home, away)) return null;

  const homeScore = homeComp?.score !== undefined && homeComp?.score !== "" ? Number(homeComp.score) : null;
  const awayScore = awayComp?.score !== undefined && awayComp?.score !== "" ? Number(awayComp.score) : null;
  const status = parseEspnStatus(event);
  let winner = null;
  if (status === "final" && homeScore !== null && awayScore !== null && homeScore !== awayScore) {
    winner = homeScore > awayScore ? home : away;
  }

  const linescoresByTeam = {};
  competitors.forEach((c) => {
    const abbr = c.team?.abbreviation;
    linescoresByTeam[abbr] = Array.isArray(c.linescores) ? c.linescores : [];
  });
  const maxLen = Math.max(linescoresByTeam[away]?.length || 0, linescoresByTeam[home]?.length || 0, 0);
  const periodScores = Array.from({ length: maxLen }, (_, i) => ({
    period: i + 1,
    away: scoreValue(linescoresByTeam[away]?.[i]?.value, linescoresByTeam[away]?.[i]?.displayValue),
    home: scoreValue(linescoresByTeam[home]?.[i]?.value, linescoresByTeam[home]?.[i]?.displayValue)
  }));

  return {
    id: String(event.id || `espn-${event.date}-${index}`),
    gameNumber: index + 1,
    startTimeUTC: event.date,
    venue: comp?.venue?.fullName || undefined,
    homeTeam: home,
    awayTeam: away,
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    status,
    period: typeof event?.status?.period === "number" ? event.status.period : null,
    clock: event?.status?.displayClock || event?.status?.type?.shortDetail || null,
    winner,
    gameType: 3,
    isStanleyCupFinal: true,
    periodScores,
    statusText: event?.status?.type?.shortDetail || null
  };
}

function getStatusText(game, status) {
  if (status === "final") return "Final";
  const period = game.periodDescriptor?.number;
  const clock = game.clock?.timeRemaining || game.gameClock || "";
  if (status === "live" && clock && period) return `${clock} • ${periodLabel(period)}`;
  if (status === "live") return "Live";
  return null;
}

function periodLabel(period) {
  if (period === 1) return "1st";
  if (period === 2) return "2nd";
  if (period === 3) return "3rd";
  return `OT${period - 3}`;
}

function timeDiffHours(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 36e5;
}

function sameMatchup(a, b) {
  return a.homeTeam === b.homeTeam && a.awayTeam === b.awayTeam;
}

function chooseApiGame(manual, apiGames) {
  return apiGames
    .filter((g) => sameMatchup(g, manual))
    .map((g) => ({ game: g, hours: timeDiffHours(g.startTimeUTC, manual.startTimeUTC) }))
    .filter((x) => x.hours <= 18)
    .sort((a, b) => {
      const ar = (a.game.status === "live" ? 5 : a.game.status === "final" ? 4 : 1) + (a.game.homeScore !== null ? 2 : 0) + (a.game.periodScores?.length ? 1 : 0);
      const br = (b.game.status === "live" ? 5 : b.game.status === "final" ? 4 : 1) + (b.game.homeScore !== null ? 2 : 0) + (b.game.periodScores?.length ? 1 : 0);
      return br - ar || a.hours - b.hours;
    })[0]?.game || null;
}

function mergeFinals(apiGames) {
  return FINALS.map((manual) => {
    const api = chooseApiGame(manual, apiGames);
    if (!api) return { ...manual, isStanleyCupFinal: true, gameType: 3 };

    return {
      ...manual,
      startTimeUTC: api.startTimeUTC || manual.startTimeUTC,
      venue: api.venue || manual.venue,
      homeScore: api.homeScore,
      awayScore: api.awayScore,
      status: api.status,
      period: api.period,
      clock: api.clock,
      winner: api.winner,
      periodScores: api.periodScores || [],
      statusText: api.statusText || null,
      isStanleyCupFinal: true,
      gameType: 3
    };
  });
}

function dedupe(games) {
  const map = new Map();
  games.forEach((game) => {
    const day = new Date(game.startTimeUTC).toISOString().slice(0, 10);
    const key = `${day}-${game.awayTeam}-${game.homeTeam}`;
    const existing = map.get(key);
    const rank = (game.status === "live" ? 5 : game.status === "final" ? 4 : 1) + (game.homeScore !== null ? 2 : 0) + (game.periodScores?.length ? 1 : 0);
    const existingRank = existing ? (existing.status === "live" ? 5 : existing.status === "final" ? 4 : 1) + (existing.homeScore !== null ? 2 : 0) + (existing.periodScores?.length ? 1 : 0) : -1;
    if (!existing || rank > existingRank) map.set(key, game);
  });
  return [...map.values()];
}

function calculateSeries(finalsGames) {
  return finalsGames.reduce((acc, game) => {
    if (game.winner === "VGK") acc.VGK += 1;
    if (game.winner === "CAR") acc.CAR += 1;
    return acc;
  }, { VGK: 0, CAR: 0 });
}

async function loadData() {
  const season = "20252026";
  const [vgkSchedule, carSchedule, scoreNow] = await Promise.all([
    getJson(`https://api-web.nhle.com/v1/club-schedule-season/VGK/${season}`),
    getJson(`https://api-web.nhle.com/v1/club-schedule-season/CAR/${season}`),
    getJson("https://api-web.nhle.com/v1/score/now")
  ]);

  const nhlRaw = [
    ...(vgkSchedule?.games || []),
    ...(carSchedule?.games || []),
    ...(scoreNow?.games || [])
  ];
  const nhlGames = nhlRaw.map(normalizeNhl).filter(Boolean);

  const live = nhlGames.find((g) => g.status === "live");
  if (live?.id) {
    const [landing, rightRail, boxscore] = await Promise.all([
      getJson(`https://api-web.nhle.com/v1/gamecenter/${live.id}/landing`),
      getJson(`https://api-web.nhle.com/v1/gamecenter/${live.id}/right-rail`),
      getJson(`https://api-web.nhle.com/v1/gamecenter/${live.id}/boxscore`)
    ]);
    if (landing) {
      const merged = {
        ...landing,
        summary: rightRail?.summary || landing.summary,
        scoringSummary: rightRail?.summary?.scoring || landing.summary?.scoring,
        linescore: landing.linescore || boxscore?.linescore
      };
      const normalized = normalizeNhl(merged, 9999);
      if (normalized) nhlGames.push(normalized);
    }
  }

  const dates = new Set();
  [-1, 0, 1].forEach((offset) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    dates.add(d.toISOString().slice(0, 10).replaceAll("-", ""));
  });
  FINALS.forEach((g) => dates.add(new Date(g.startTimeUTC).toISOString().slice(0, 10).replaceAll("-", "")));

  const espnPayloads = await Promise.all(
    [...dates].map((date) => getJson(`https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${date}`))
  );
  const espnGames = espnPayloads.flatMap((p) => p?.events || []).map(normalizeEspn).filter(Boolean);

  const apiGames = [...nhlGames, ...espnGames];
  const finalsGames = mergeFinals(apiGames);
  const regularHistory = apiGames.filter((g) => !g.isStanleyCupFinal || new Date(g.startTimeUTC) < new Date(FINALS[0].startTimeUTC));
  const historyGames = dedupe([...regularHistory, ...finalsGames]).sort((a, b) => new Date(a.startTimeUTC) - new Date(b.startTimeUTC));

  state = {
    finalsGames,
    historyGames,
    source: apiGames.length ? "public NHL/ESPN feeds" : "fallback schedule"
  };

  render();
}

function currentLiveGame() {
  return state.finalsGames.find((g) => g.status === "live") || null;
}

function latestFinalOrNextGame() {
  return currentLiveGame()
    || [...state.finalsGames].reverse().find((g) => g.status === "final")
    || state.finalsGames.find((g) => new Date(g.startTimeUTC).getTime() >= Date.now())
    || state.finalsGames[0];
}

function nextGame() {
  return state.finalsGames.find((g) => g.status === "scheduled" && new Date(g.startTimeUTC).getTime() >= Date.now() - 8 * 60 * 60 * 1000) || null;
}

function renderCountdown() {
  const live = currentLiveGame();
  const next = nextGame();

  if (live) {
    $("countdown-title").textContent = `Game ${live.gameNumber} is live`;
    $("countdown-detail").textContent = `${live.awayTeam} at ${live.homeTeam} • ${live.venue || ""}`;
    ["days", "hours", "minutes", "seconds"].forEach((x) => $(`cd-${x}`).textContent = "LIVE");
    return;
  }

  if (!next) {
    $("countdown-title").textContent = "No upcoming Finals game";
    $("countdown-detail").textContent = "The series may be complete.";
    ["days", "hours", "minutes", "seconds"].forEach((x) => $(`cd-${x}`).textContent = "--");
    return;
  }

  $("countdown-title").textContent = `Game ${next.gameNumber}: ${next.awayTeam} at ${next.homeTeam}`;
  $("countdown-detail").textContent = `${formatTime(next.startTimeUTC)} • ${next.venue}`;

  const diff = Math.max(0, new Date(next.startTimeUTC).getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  $("cd-days").textContent = String(days);
  $("cd-hours").textContent = String(hours);
  $("cd-minutes").textContent = String(minutes);
  $("cd-seconds").textContent = String(seconds);
}

function renderHeaderSeries(series) {
  $("series-vgk-top").textContent = series.VGK;
  $("series-car-top").textContent = series.CAR;
}

function renderScoreboard(series) {
  const game = latestFinalOrNextGame();
  if (!game) return;

  $("away-logo").src = TEAMS[game.awayTeam].logo;
  $("home-logo").src = TEAMS[game.homeTeam].logo;
  $("away-logo").alt = `${TEAMS[game.awayTeam].fullName} logo`;
  $("home-logo").alt = `${TEAMS[game.homeTeam].fullName} logo`;

  $("away-score").textContent = game.awayScore ?? "-";
  $("home-score").textContent = game.homeScore ?? "-";
  $("away-name").textContent = TEAMS[game.awayTeam].shortName;
  $("home-name").textContent = TEAMS[game.homeTeam].shortName;

  const awayOther = game.awayTeam === "VGK" ? "CAR" : "VGK";
  const homeOther = game.homeTeam === "VGK" ? "CAR" : "VGK";
  $("away-series").textContent = `Series ${series[game.awayTeam]}-${series[awayOther]}`;
  $("home-series").textContent = `Series ${series[game.homeTeam]}-${series[homeOther]}`;

  $("score-subtitle").textContent = `Stanley Cup Final • Game ${game.gameNumber}`;
  const status = $("score-status");
  status.textContent = game.statusText || (game.status === "live" ? "Live" : game.status === "final" ? "Final" : formatTime(game.startTimeUTC));
  status.className = game.status === "live" ? "status-chip live" : "status-chip";

  const periods = normalizePeriods(game.periodScores);
  const table = $("period-table");
  table.style.gridTemplateColumns = `minmax(68px,1fr) repeat(${periods.length + 1}, minmax(30px,44px))`;
  table.innerHTML = `
    <div class="table-head table-team">Team</div>
    ${periods.map((p) => `<div class="table-head">${p.period <= 3 ? p.period : `OT${p.period - 3}`}</div>`).join("")}
    <div class="table-head">T</div>
    <div class="table-team team-code">${game.awayTeam}</div>
    ${periods.map((p) => `<div>${p.away ?? 0}</div>`).join("")}
    <div class="table-total">${game.awayScore ?? 0}</div>
    <div class="table-team team-code">${game.homeTeam}</div>
    ${periods.map((p) => `<div>${p.home ?? 0}</div>`).join("")}
    <div class="table-total">${game.homeScore ?? 0}</div>
  `;

  maybeGoalAlert(game);
}

function normalizePeriods(periodScores) {
  const incoming = Array.isArray(periodScores) && periodScores.length ? periodScores : [];
  const max = Math.max(3, ...incoming.map((p) => p.period || 1));
  return Array.from({ length: max }, (_, i) => {
    const period = i + 1;
    return incoming.find((p) => p.period === period) || { period, away: 0, home: 0 };
  });
}

function maybeGoalAlert(game) {
  if (!game || game.status !== "live") {
    previousLiveScore = game ? { id: game.id, away: game.awayScore, home: game.homeScore } : null;
    return;
  }

  const current = { id: game.id, away: game.awayScore, home: game.homeScore };
  if (!previousLiveScore || previousLiveScore.id !== current.id) {
    previousLiveScore = current;
    return;
  }

  const awayScored = typeof current.away === "number" && typeof previousLiveScore.away === "number" && current.away > previousLiveScore.away;
  const homeScored = typeof current.home === "number" && typeof previousLiveScore.home === "number" && current.home > previousLiveScore.home;

  if (awayScored || homeScored) {
    const team = awayScored ? game.awayTeam : game.homeTeam;
    showGoal(team, `${game.awayTeam} ${game.awayScore ?? 0} - ${game.homeTeam} ${game.homeScore ?? 0}`);
  }

  previousLiveScore = current;
}

function showGoal(team, score) {
  $("goal-team").textContent = TEAMS[team].fullName;
  $("goal-score").textContent = score;
  $("goal-overlay").classList.remove("hidden");
  setTimeout(() => $("goal-overlay").classList.add("hidden"), 6500);

  if ("Notification" in window && Notification.permission === "granted") {
    navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification(`GOAL! ${TEAMS[team].fullName}`, { body: score, icon: TEAMS[team].logo, tag: `goal-${Date.now()}` }))
      .catch(() => new Notification(`GOAL! ${TEAMS[team].fullName}`, { body: score, icon: TEAMS[team].logo }));
  }
}

function renderWager(series) {
  const cupWinner = series.VGK >= 4 ? "VGK" : series.CAR >= 4 ? "CAR" : null;
  const brett = series.VGK * GAME_WIN_VALUE - series.CAR * GAME_WIN_VALUE + (cupWinner === "VGK" ? CUP_BONUS_VALUE : 0);
  const dad = series.CAR * GAME_WIN_VALUE - series.VGK * GAME_WIN_VALUE + (cupWinner === "CAR" ? CUP_BONUS_VALUE : 0);
  $("brett-money").textContent = `${brett >= 0 ? "+" : "-"}$${Math.abs(brett)}`;
  $("dad-money").textContent = `${dad >= 0 ? "+" : "-"}$${Math.abs(dad)}`;
}

function renderSchedule() {
  $("schedule-list").innerHTML = state.finalsGames.map((game) => `
    <div class="schedule-row">
      <div>
        <strong>Game ${game.gameNumber}${game.ifNecessary ? " • If necessary" : ""}</strong>
        <div class="small">${game.awayTeam} at ${game.homeTeam} • ${formatTime(game.startTimeUTC)}</div>
        <div class="small">${game.venue}</div>
      </div>
      ${badge(game)}
    </div>
  `).join("");
}

function renderHistory() {
  $("history-list").innerHTML = state.historyGames.map((game) => `
    <div class="game-row">
      <div>
        <div class="small">${formatDate(game.startTimeUTC)}</div>
        <strong>${game.isStanleyCupFinal ? "Postseason • Stanley Cup Final" : "Regular season"}</strong>
        <div class="team-line small">
          <img src="${TEAMS[game.awayTeam].logo}" alt="" />
          <span>${game.awayTeam}</span>
          <strong>${game.awayScore ?? "-"}</strong>
          <span>at</span>
          <img src="${TEAMS[game.homeTeam].logo}" alt="" />
          <span>${game.homeTeam}</span>
          <strong>${game.homeScore ?? "-"}</strong>
        </div>
        <div class="small">${game.venue || ""}</div>
      </div>
      ${badge(game)}
    </div>
  `).join("");
}

function badge(game) {
  if (game.status === "live") return `<span class="badge live">● LIVE</span>`;
  if (game.status === "final") return `<span class="badge">Final${game.winner ? ` • ${game.winner}` : ""}</span>`;
  return `<span class="badge scheduled">● Scheduled</span>`;
}

function render() {
  const series = calculateSeries(state.finalsGames);
  renderHeaderSeries(series);
  renderCountdown();
  renderScoreboard(series);
  renderWager(series);
  renderSchedule();
  renderHistory();
  $("footer").textContent = `Data source: ${state.source} • Updates every 30 seconds`;
}

async function enableNotifications() {
  if (!("Notification" in window)) return;
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    $("notify-button").classList.add("hidden");
    $("alerts-on").classList.remove("hidden");
  }
}

$("notify-button").addEventListener("click", enableNotifications);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

render();
loadData().then(render).catch(() => render());
setInterval(() => loadData().catch(() => render()), 30000);
setInterval(renderCountdown, 1000);
