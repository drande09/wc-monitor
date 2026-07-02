/* ============================================================
   analytics.js — expectations model & performance-vs-expected
   Inputs: PRETOURNAMENT (expectations.js) + normalized matches
   from api.js. All functions pure; app.js wires them up.
   ============================================================ */

const ROUND_ORDER = ["group", "r32", "r16", "qf", "sf", "final", "champion"];
const ROUND_LABELS = {
  group: "Group stage", r32: "Round of 32", r16: "Round of 16",
  qf: "Quarterfinals", sf: "Semifinals", third: "3rd-place match",
  final: "Final", champion: "Champion",
};

function roundIdx(r) { return ROUND_ORDER.indexOf(r); }

/* ---- Elo match model -------------------------------------
   Standard Elo expectancy with a flat draw component. Crude but
   transparent: E = P(win) + 0.5*P(draw); draw prob shrinks as
   the mismatch grows. Expected points = 3*Pw + 1*Pd.           */
function eloMatchProbs(eloA, eloB) {
  const dr = eloA - eloB;
  const E = 1 / (1 + Math.pow(10, -dr / 400));
  const pDraw = 0.28 * Math.exp(-Math.abs(dr) / 600);
  const pWin = Math.max(0, E - pDraw / 2);
  const pLoss = Math.max(0, 1 - pWin - pDraw);
  return { pWin, pDraw, pLoss, expPts: 3 * pWin + pDraw };
}

/* ---- resolve a team's expectation record ---- */
function getExpectation(teamName) {
  if (!teamName) return null;
  const canonical = PRETOURNAMENT.aliases[teamName] || teamName;
  const t = PRETOURNAMENT.teams[canonical];
  if (t) return t;
  // fuzzy fallback: match ignoring case/accents
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const key = Object.keys(PRETOURNAMENT.teams).find((k) => norm(k) === norm(teamName));
  return key ? PRETOURNAMENT.teams[key] : null;
}

/* ---- per-team performance ---------------------------------
   matches: normalized matches involving this team (any state)
   returns a rich perf object used by team cards, federation agg. */
function computeTeamPerformance(teamName, matches) {
  const exp = getExpectation(teamName);
  const played = matches.filter((m) => m.state === "post");
  const groupPlayed = played.filter((m) => m.round === "group");
  const koPlayed = played.filter((m) => m.round !== "group" && m.round !== "third");

  // -- group stage: actual vs Elo-expected points
  let actualPts = 0, gf = 0, ga = 0, w = 0, d = 0, l = 0, expPts = 0;
  for (const m of groupPlayed) {
    const us = m.home.name === teamName ? m.home : m.away;
    const them = m.home.name === teamName ? m.away : m.home;
    gf += us.score; ga += them.score;
    if (us.score > them.score) { actualPts += 3; w++; }
    else if (us.score === them.score) { actualPts += 1; d++; }
    else l++;
    const oppExp = getExpectation(them.name);
    if (exp && oppExp) expPts += eloMatchProbs(exp.elo, oppExp.elo).expPts;
  }

  // -- knockout progress
  // deepest round the team has appeared in (played or scheduled)
  let deepest = "group";
  let eliminated = false;
  let eliminatedIn = null;
  let isChampion = false;
  for (const m of matches) {
    if (m.round === "third") continue;
    if (roundIdx(m.round) > roundIdx(deepest)) deepest = m.round;
  }
  for (const m of koPlayed) {
    const us = m.home.name === teamName ? m.home : m.away;
    if (!us.winner) { eliminated = true; eliminatedIn = m.round; }
    else if (m.round === "final") isChampion = true;
  }
  // group-stage elimination: all 3 group games played, no KO matches scheduled
  const groupDone = groupPlayed.length >= 3;
  const hasKO = matches.some((m) => m.round !== "group" && m.round !== "third");
  if (groupDone && !hasKO) { eliminated = true; eliminatedIn = "group"; }

  const achieved = isChampion ? "champion" : deepest;
  const alive = !eliminated && !isChampion;

  // -- round delta vs expectation
  // eliminated: final verdict (reached vs expected, can be negative).
  // still alive: only credit rounds already exceeded — no penalty for
  // rounds not yet played (an alive favorite is "on track", not failing).
  const expRound = exp ? exp.expectedRound : "group";
  const rawDelta = roundIdx(achieved) - roundIdx(expRound);
  const roundDelta = (alive) ? Math.max(0, rawDelta) : rawDelta;
  const groupDelta = groupPlayed.length ? actualPts - expPts : 0;

  // -- composite performance score (explainable):
  // knockout rounds are worth 3 "points" each; group pts delta as-is
  const perfScore = roundDelta * 3 + groupDelta;

  return {
    name: teamName, exp, alive, eliminated, eliminatedIn, isChampion,
    achieved, achievedLabel: ROUND_LABELS[achieved],
    expectedRound: expRound, expectedLabel: ROUND_LABELS[expRound],
    roundDelta, groupDelta: +groupDelta.toFixed(2),
    expPts: +expPts.toFixed(2), actualPts,
    perfScore: +perfScore.toFixed(2),
    record: { w, d, l, gf, ga, gd: gf - ga, played: groupPlayed.length + koPlayed.length },
  };
}

/* ---- verdict badge for a perf object ---- */
function perfVerdict(p) {
  const s = p.perfScore;
  if (s >= 2) return { cls: "over", label: s >= 5 ? "Major overperformer" : "Overperforming" };
  if (s <= -2) return { cls: "under", label: s <= -5 ? "Major disappointment" : "Underperforming" };
  return { cls: "par", label: "On expectation" };
}

/* ---- federation aggregation ---- */
function computeFederations(perfByTeam) {
  const feds = {};
  for (const p of Object.values(perfByTeam)) {
    if (!p.exp) continue;
    const c = p.exp.confederation;
    if (!feds[c]) feds[c] = {
      name: c, teams: [], n: 0, alive: 0,
      actualPts: 0, expPts: 0, roundDeltaSum: 0, perfSum: 0,
      gf: 0, ga: 0, wins: 0, draws: 0, losses: 0,
    };
    const f = feds[c];
    f.teams.push(p); f.n++;
    if (p.alive || p.isChampion) f.alive++;
    f.actualPts += p.actualPts; f.expPts += p.expPts;
    f.roundDeltaSum += p.roundDelta; f.perfSum += p.perfScore;
    f.gf += p.record.gf; f.ga += p.record.ga;
    f.wins += p.record.w; f.draws += p.record.d; f.losses += p.record.l;
  }
  for (const f of Object.values(feds)) {
    f.ptsDelta = +(f.actualPts - f.expPts).toFixed(1);
    f.avgPerf = +(f.perfSum / f.n).toFixed(2);
    f.teams.sort((a, b) => b.perfScore - a.perfScore);
  }
  return Object.values(feds).sort((a, b) => b.avgPerf - a.avgPerf);
}

/* ---- tournament-wide pulse stats ---- */
function computePulse(matches, perfByTeam) {
  const done = matches.filter((m) => m.state === "post");
  const goals = done.reduce((s, m) => s + m.home.score + m.away.score, 0);
  const draws = done.filter((m) => m.home.score === m.away.score && m.round === "group").length;
  // upset: winner had pre-tournament Elo >= 100 below loser
  let upsets = 0;
  const upsetList = [];
  for (const m of done) {
    const wSide = m.home.winner ? m.home : m.away.winner ? m.away : null;
    if (!wSide) continue;
    const lSide = wSide === m.home ? m.away : m.home;
    const we = getExpectation(wSide.name), le = getExpectation(lSide.name);
    if (we && le && le.elo - we.elo >= 100) {
      upsets++;
      upsetList.push({ match: m, eloGap: le.elo - we.elo });
    }
  }
  upsetList.sort((a, b) => b.eloGap - a.eloGap);
  const cleanSheets = done.reduce((s, m) =>
    s + (m.away.score === 0 ? 1 : 0) + (m.home.score === 0 ? 1 : 0), 0);
  return {
    played: done.length, goals,
    gpg: done.length ? +(goals / done.length).toFixed(2) : 0,
    draws, upsets, upsetList: upsetList.slice(0, 6), cleanSheets,
    alive: Object.values(perfByTeam).filter((p) => p.alive || p.isChampion).length,
  };
}

/* ---- biggest movers (over/under) ---- */
function computeMovers(perfByTeam, count = 5) {
  const arr = Object.values(perfByTeam).filter((p) => p.exp && p.record.played > 0);
  const sorted = [...arr].sort((a, b) => b.perfScore - a.perfScore);
  return { over: sorted.slice(0, count), under: sorted.slice(-count).reverse() };
}
