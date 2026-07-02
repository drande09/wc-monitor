/* ============================================================
   views.js — all DOM rendering. Reads global `state` (app.js),
   PRETOURNAMENT, and analytics helpers. No fetching here except
   modal deep-dives which call api.js helpers.
   ============================================================ */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CONF_COLORS = {
  UEFA: "#2b4a8a", CONMEBOL: "#1c6b41", CONCACAF: "#9a6d1b",
  AFC: "#b5541d", CAF: "#6b3fa0", OFC: "#1d6f7a",
};

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(d) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function teamLogo(t, size = 26) {
  return t.logo ? `<img src="${esc(t.logo)}" width="${size}" height="${size}" alt="" loading="lazy">` : `<span style="width:${size}px"></span>`;
}
function deltaSpan(v, digits = 1, suffix = "") {
  const cls = v > 0.05 ? "pos" : v < -0.05 ? "neg" : "zero";
  const sign = v > 0 ? "+" : "";
  return `<span class="delta ${cls}">${sign}${v.toFixed(digits)}${suffix}</span>`;
}

/* ================= MATCH CARD ================= */
function matchCard(m, opts = {}) {
  const stateCls = m.state === "in" ? "live" : m.state === "post" ? "ft" : "pre";
  const stateTxt = m.state === "in" ? `&#9679; ${esc(m.clock || "LIVE")}`
    : m.state === "post" ? esc(m.detail || "FT")
    : `${fmtDate(m.date)} ${fmtTime(m.date)}`;
  const row = (t, other) => {
    if (!t.name) return `<div class="mc-row">${teamLogo(t)}<span class="name faint" style="font-style:italic">${esc(t.tbdLabel || "TBD")}</span><span class="score"></span></div>`;
    const win = m.state === "post" && t.winner;
    const e = getExpectation(t.name);
    const pens = m.shootout && m.state === "post" ? `<span class="pens">(${t.shootoutScore})</span>` : "";
    return `<div class="mc-row ${win ? "winner" : ""}">
      ${teamLogo(t)}
      <span class="name">${esc(t.name)}${e ? `<span class="rank">#${e.fifaRank}</span>` : ""}</span>
      ${pens}
      <span class="score">${m.state === "pre" ? "" : t.score}</span>
    </div>`;
  };
  let foot;
  if (m.state === "pre" && getExpectation(m.home.name) && getExpectation(m.away.name)) {
    const p = eloMatchProbs(getExpectation(m.home.name).elo, getExpectation(m.away.name).elo);
    const oddsTxt = m.odds ? ` &middot; ${esc(m.odds.details)}${m.odds.overUnder ? " O/U " + m.odds.overUnder : ""}` : "";
    foot = `<div class="mc-foot"><span>Elo: ${Math.round(p.pWin * 100)}/${Math.round(p.pDraw * 100)}/${Math.round(p.pLoss * 100)}%${oddsTxt}</span><span>${esc(m.venue || "")}</span></div>`;
  } else if (m.state === "post" && m.note) {
    foot = `<div class="mc-foot"><span class="gold">${esc(m.note)}</span><span>${esc(m.venue || "")}</span></div>`;
  } else {
    foot = `<div class="mc-foot"><span>${esc(m.group ? "Group " + m.group : m.roundLabel)}</span><span>${esc(m.venue || "")}</span></div>`;
  }
  return `<div class="card match-card clickable" data-match="${m.id}">
    <div class="mc-meta"><span class="mc-round">${esc(m.group ? "GROUP " + m.group : m.roundLabel.toUpperCase())}</span>
    <span class="mc-state ${stateCls}">${stateTxt}</span></div>
    ${row(m.home, m.away)}${row(m.away, m.home)}
    ${opts.liveStats && m.liveStats ? liveStatStrip(m) : foot}
  </div>`;
}

function liveStatStrip(m) {
  const s = m.liveStats;
  if (!s) return "";
  let html = "";
  if (s.possH != null) {
    html += `<div class="poss-bar"><div class="home" style="width:${s.possH}%"></div><div class="away" style="width:${100 - s.possH}%"></div></div>`;
    html += `<div class="live-stat-strip"><span>POSS <b>${s.possH}%–${100 - s.possH}%</b></span>`;
  } else html += `<div class="live-stat-strip">`;
  if (s.shotsH != null) html += `<span>SHOTS <b>${s.shotsH}–${s.shotsA}</b></span>`;
  if (s.sotH != null) html += `<span>ON TARGET <b>${s.sotH}–${s.sotA}</b></span>`;
  if (s.cornersH != null) html += `<span>CORNERS <b>${s.cornersH}–${s.cornersA}</b></span>`;
  html += `</div>`;
  return html;
}

/* ================= OVERVIEW ================= */
function renderOverview() {
  const el = $("#view-overview");
  const now = new Date();
  const live = state.matches.filter((m) => m.state === "in");
  const today = state.matches.filter((m) => m.date.toDateString() === now.toDateString() && m.state !== "in");
  const upcoming = state.matches.filter((m) => m.state === "pre" && m.date.toDateString() !== now.toDateString()).slice(0, 6);
  const recent = state.matches.filter((m) => m.state === "post").slice(-6).reverse();
  const pulse = computePulse(state.matches, state.perf);
  const movers = computeMovers(state.perf, 5);
  const leaders = (state.leaders?.goals || []).slice(0, 5);

  let html = "";

  // pulse tiles
  html += `<div class="stat-tiles">
    <div class="stat-tile"><div class="v">${pulse.played}<span class="faint" style="font-size:14px">/104</span></div><div class="l">Matches played</div></div>
    <div class="stat-tile"><div class="v gold">${pulse.goals}</div><div class="l">Goals</div><div class="s">${pulse.gpg} per match</div></div>
    <div class="stat-tile"><div class="v">${pulse.alive}</div><div class="l">Teams alive</div><div class="s">of 48</div></div>
    <div class="stat-tile"><div class="v ${pulse.upsets > 8 ? "green" : ""}">${pulse.upsets}</div><div class="l">Upsets</div><div class="s">Elo gap &ge; 100</div></div>
    <div class="stat-tile"><div class="v">${pulse.cleanSheets}</div><div class="l">Clean sheets</div></div>
  </div>`;

  if (live.length) {
    html += `<h2 class="section-title">&#128308; Live now</h2>
      <div class="grid cols-2">${live.map((m) => matchCard(m, { liveStats: true })).join("")}</div>`;
  }
  if (today.length) {
    html += `<h2 class="section-title">Today</h2>
      <div class="grid cols-2">${today.map((m) => matchCard(m)).join("")}</div>`;
  }

  // movers snapshot
  const SHORT_ROUND = { group: "Groups", r32: "R32", r16: "R16", qf: "QF", sf: "SF", third: "3rd", final: "Final", champion: "Champ" };
  const moverRow = (p) => {
    const e = p.exp;
    const path = `${SHORT_ROUND[p.expectedRound]} &rarr; ${SHORT_ROUND[p.achieved]}${p.alive ? " (alive)" : p.isChampion ? "" : " (out)"}`;
    return `<tr class="rowlink" data-team="${esc(p.name)}">
      <td><span class="team-cell">${teamLogo(state.teamMeta[p.name] || {}, 20)}${esc(p.name)}
        <span class="conf-tag">${e ? e.confederation : ""}</span></span></td>
      <td class="num">${deltaSpan(p.perfScore)}</td>
      <td class="faint">${path}</td>
    </tr>`;
  };
  html += `<h2 class="section-title">Performance vs expectations</h2>
  <div class="grid cols-2">
    <div class="card"><div class="flex-between"><b style="color:var(--over)">&#9650; Overperformers</b><span class="faint" style="font-size:11px">perf score</span></div>
      <table class="data">${movers.over.map(moverRow).join("")}</table></div>
    <div class="card"><div class="flex-between"><b style="color:var(--under)">&#9660; Underperformers</b><span class="faint" style="font-size:11px">perf score</span></div>
      <table class="data">${movers.under.map(moverRow).join("")}</table></div>
  </div>`;

  // golden boot + biggest upsets
  html += `<div class="grid cols-2" style="margin-top:12px">`;
  if (leaders.length) {
    html += `<div class="card"><b class="gold">&#9917; Golden Boot race</b><table class="data" style="margin-top:6px">
      ${leaders.map((p, i) => `<tr><td class="faint mono">${i + 1}</td>
        <td><b>${esc(p.name)}</b> <span class="faint">${esc(p.team)}</span></td>
        <td class="num"><b>${p.value}</b></td></tr>`).join("")}</table>
      <div class="faint" style="font-size:11px;margin-top:6px">Full leaderboards in the Players tab</div></div>`;
  }
  if (pulse.upsetList.length) {
    html += `<div class="card"><b>&#9889; Biggest upsets so far</b><table class="data" style="margin-top:6px">
      ${pulse.upsetList.map((u) => {
        const m = u.match;
        const w = m.home.winner ? m.home : m.away;
        const l = w === m.home ? m.away : m.home;
        return `<tr class="rowlink" data-match="${m.id}"><td><b>${esc(w.name)}</b> ${w.score}&ndash;${l.score} ${esc(l.name)}</td>
          <td class="faint">${esc(m.group ? "Group " + m.group : m.roundLabel)}</td>
          <td class="num delta pos">+${u.eloGap} Elo</td></tr>`;
      }).join("")}</table></div>`;
  }
  html += `</div>`;

  if (recent.length) {
    html += `<h2 class="section-title">Latest results</h2>
      <div class="grid cols-3">${recent.map((m) => matchCard(m)).join("")}</div>`;
  }
  if (upcoming.length) {
    html += `<h2 class="section-title">Coming up</h2>
      <div class="grid cols-3">${upcoming.map((m) => matchCard(m)).join("")}</div>`;
  }
  el.innerHTML = html;
}

/* ================= MATCHES ================= */
function renderMatches() {
  const el = $("#view-matches");
  const f = state.filters.matches;
  const rounds = [
    ["all", "All"], ["group", "Groups"], ["r32", "Rd of 32"], ["r16", "Rd of 16"],
    ["qf", "Quarters"], ["sf", "Semis"], ["third", "3rd place"], ["final", "Final"],
  ];
  let ms = state.matches;
  if (f.round !== "all") ms = ms.filter((m) => m.round === f.round);
  if (f.team) {
    const q = f.team.toLowerCase();
    ms = ms.filter((m) => m.home.name.toLowerCase().includes(q) || m.away.name.toLowerCase().includes(q));
  }
  let html = `<div class="pill-bar">
    ${rounds.map(([k, lbl]) => `<button class="pill ${f.round === k ? "active" : ""}" data-mf-round="${k}">${lbl}</button>`).join("")}
    <input class="search" placeholder="Filter by team&hellip;" value="${esc(f.team)}" id="match-team-filter">
  </div>`;
  // group by date
  const byDate = new Map();
  for (const m of ms) {
    const k = m.date.toDateString();
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k).push(m);
  }
  for (const [dk, arr] of byDate) {
    html += `<div class="date-header">${fmtDate(new Date(dk))} <span class="faint" style="text-transform:none;letter-spacing:0">${arr.length} matches</span></div>
      <div class="grid cols-3">${arr.map((m) => matchCard(m, { liveStats: m.state === "in" })).join("")}</div>`;
  }
  if (!ms.length) html += `<div class="loading">No matches for this filter.</div>`;
  el.innerHTML = html;
  $("#match-team-filter")?.addEventListener("input", (e) => {
    state.filters.matches.team = e.target.value;
    clearTimeout(state._mfT);
    state._mfT = setTimeout(renderMatches, 200);
  });
}

/* ================= GROUPS ================= */
function renderGroups() {
  const el = $("#view-groups");
  let html = `<div class="grid cols-3">`;
  for (const g of Object.keys(state.groups).sort()) {
    const rows = state.groups[g];
    html += `<div class="card"><div class="flex-between"><b>Group ${g}</b><span class="faint" style="font-size:11px">P&nbsp;W&nbsp;D&nbsp;L only group games</span></div>
    <table class="data" style="margin-top:6px">
      <tr><th></th><th>Team</th><th class="num">P</th><th class="num">GD</th><th class="num">Pts</th><th class="num">xPts</th></tr>
      ${rows.map((t, i) => {
        const e = getExpectation(t.name);
        const perf = state.perf[t.name];
        const qCls = t.status === "through" ? "q-through" : t.status === "third" ? "q-third" : t.status === "out" ? "q-out" : "";
        return `<tr class="rowlink ${qCls}" data-team="${esc(t.name)}">
          <td class="faint mono">${i + 1}</td>
          <td><span class="team-cell">${teamLogo(state.teamMeta[t.name] || {}, 20)}${esc(t.name)}</span></td>
          <td class="num">${t.p}</td><td class="num">${t.gd > 0 ? "+" : ""}${t.gd}</td>
          <td class="num"><b>${t.pts}</b></td>
          <td class="num">${perf && e ? deltaSpan(perf.groupDelta) : "&ndash;"}</td>
        </tr>`;
      }).join("")}
    </table></div>`;
  }
  html += `</div>
  <div class="card" style="margin-top:14px;font-size:12px" >
    <span style="border-left:3px solid var(--accent);padding-left:8px;margin-right:18px">Advanced (top 2)</span>
    <span style="border-left:3px solid var(--gold);padding-left:8px;margin-right:18px">Advanced (best 3rd)</span>
    <span style="border-left:3px solid #444d63;padding-left:8px;margin-right:18px">Eliminated</span>
    <span class="faint">xPts = actual points minus Elo-model expected points</span>
  </div>`;
  el.innerHTML = html;
}

/* ================= BRACKET ================= */
function renderBracket() {
  const el = $("#view-bracket");
  const koRounds = [["r32", "Round of 32"], ["r16", "Round of 16"], ["qf", "Quarterfinals"], ["sf", "Semifinals"], ["final", "Final"]];
  let html = `<div id="bracket-scroll"><div class="bracket">`;
  for (const [key, label] of koRounds) {
    const ms = state.matches.filter((m) => m.round === key);
    html += `<div class="b-round"><h3>${label}</h3><div class="b-matches">`;
    if (!ms.length) {
      html += `<div class="b-match"><span class="tbd">TBD</span></div>`;
    }
    for (const m of ms) {
      const row = (t) => {
        if (!t.name) return `<div class="bm-row"><span class="n tbd">${esc(t.tbdLabel || "TBD")}</span></div>`;
        const cls = m.state === "post" ? (t.winner ? "w" : "l") : "";
        const pens = m.shootout && m.state === "post" ? ` <span class="faint">(${t.shootoutScore})</span>` : "";
        return `<div class="bm-row ${cls}">${teamLogo(t, 16)}<span class="n">${esc(t.abbr || t.name)}</span>
          <span class="s">${m.state === "pre" ? "" : t.score}${pens}</span></div>`;
      };
      const meta = m.state === "in" ? `<span style="color:var(--live)">&#9679; ${esc(m.clock || "LIVE")}</span>`
        : m.state === "pre" ? `${fmtDate(m.date)} ${fmtTime(m.date)}` : esc(m.detail || "FT");
      html += `<div class="b-match ${m.state === "in" ? "live" : ""}" data-match="${m.id}">
        ${row(m.home)}${row(m.away)}<div class="bm-meta">${meta}</div></div>`;
    }
    html += `</div></div>`;
  }
  html += `</div></div>`;
  // third place
  const third = state.matches.find((m) => m.round === "third");
  if (third) html += `<h2 class="section-title">Third-place match</h2><div class="grid cols-3">${matchCard(third)}</div>`;
  el.innerHTML = html;
}

/* ================= FEDERATIONS ================= */
function renderFederations() {
  const el = $("#view-federations");
  const feds = computeFederations(state.perf);
  const maxAbs = Math.max(1, ...feds.map((f) => Math.abs(f.avgPerf)));

  let html = `<div class="card" style="margin-bottom:14px">
    <b>How to read this:</b> <span class="muted">Each team gets a <b>performance score</b> = (knockout rounds beyond/short of pre-tournament expected finish &times; 3) + (actual group points &minus; Elo-model expected points). Positive = beating expectations. Teams still alive are never penalized for rounds they haven't played yet &mdash; a favorite that's still on track scores near zero until it either advances past its expected round or gets knocked out. Federation score is the average across its teams, so small federations aren't penalized for having fewer entrants.</span>
  </div>`;

  // diverging bar chart
  html += `<div class="card"><h2 class="section-title">Federation performance index</h2>`;
  for (const f of feds) {
    const w = Math.abs(f.avgPerf) / maxAbs * 48;
    const pos = f.avgPerf >= 0;
    html += `<div class="div-row">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:86px;font-weight:700;color:${CONF_COLORS[f.name] || "var(--text)"}">${esc(f.name)}</span>
        <div class="div-track" style="flex:1">
          <div class="zero-line"></div>
          <div class="bar ${pos ? "hbar pos" : "hbar neg"}" style="${pos ? `left:50%` : `right:50%`};width:${w}%"></div>
        </div>
      </div>
      <div class="num">${deltaSpan(f.avgPerf, 2)}</div>
    </div>`;
  }
  html += `</div>`;

  // federation summary table
  html += `<div class="card" style="margin-top:12px"><table class="data">
    <tr><th>Federation</th><th class="num">Teams</th><th class="num">Alive</th><th class="num">W-D-L</th><th class="num">GF-GA</th><th class="num">Grp Pts</th><th class="num">xPts &Delta;</th><th class="num">Avg perf</th></tr>
    ${feds.map((f) => `<tr>
      <td><b style="color:${CONF_COLORS[f.name] || "inherit"}">${esc(f.name)}</b></td>
      <td class="num">${f.n}</td><td class="num">${f.alive > 0 ? `<b class="gold">${f.alive}</b>` : 0}</td>
      <td class="num">${f.wins}-${f.draws}-${f.losses}</td>
      <td class="num">${f.gf}-${f.ga}</td>
      <td class="num">${f.actualPts} <span class="faint">(exp ${f.expPts.toFixed(1)})</span></td>
      <td class="num">${deltaSpan(f.ptsDelta)}</td>
      <td class="num">${deltaSpan(f.avgPerf, 2)}</td>
    </tr>`).join("")}
  </table></div>`;

  // per-federation team breakdown
  for (const f of feds) {
    html += `<h2 class="section-title" style="color:${CONF_COLORS[f.name] || ""}">${esc(f.name)} &mdash; team by team</h2>
    <div class="card"><table class="data">
      <tr><th>Team</th><th>Expected</th><th>Actual</th><th class="num">Rd &Delta;</th><th class="num">Grp pts vs xPts</th><th class="num">Perf</th><th></th></tr>
      ${f.teams.map((p) => {
        const v = perfVerdict(p);
        return `<tr class="rowlink" data-team="${esc(p.name)}">
          <td><span class="team-cell">${teamLogo(state.teamMeta[p.name] || {}, 20)}${esc(p.name)}</span></td>
          <td class="muted">${esc(p.expectedLabel)}</td>
          <td>${p.alive ? `<span class="gold">Alive &middot; ${esc(p.achievedLabel)}</span>` : p.isChampion ? `<b class="gold">CHAMPION</b>` : `Out &middot; ${esc(ROUND_LABELS[p.eliminatedIn] || p.achievedLabel)}`}</td>
          <td class="num">${deltaSpan(p.roundDelta, 0)}</td>
          <td class="num">${p.actualPts} vs ${p.expPts.toFixed(1)} ${deltaSpan(p.groupDelta)}</td>
          <td class="num">${deltaSpan(p.perfScore)}</td>
          <td><span class="badge ${v.cls}">${v.label}</span></td>
        </tr>`;
      }).join("")}
    </table></div>`;
  }
  el.innerHTML = html;
}

/* ================= TEAMS ================= */
function renderTeams() {
  const el = $("#view-teams");
  const f = state.filters.teams;
  const confs = ["all", "UEFA", "CONMEBOL", "CONCACAF", "AFC", "CAF", "OFC"];
  let teams = Object.values(state.perf);
  if (f.conf !== "all") teams = teams.filter((p) => p.exp?.confederation === f.conf);
  if (f.q) teams = teams.filter((p) => p.name.toLowerCase().includes(f.q.toLowerCase()));
  teams.sort((a, b) => (b.alive - a.alive) || (b.perfScore - a.perfScore));

  let html = `<div class="pill-bar">
    ${confs.map((c) => `<button class="pill ${f.conf === c ? "active" : ""}" data-tf-conf="${c}">${c === "all" ? "All federations" : c}</button>`).join("")}
    <input class="search" placeholder="Search team&hellip;" value="${esc(f.q)}" id="team-search">
  </div><div class="grid cols-3">`;
  for (const p of teams) {
    const v = perfVerdict(p);
    const e = p.exp;
    html += `<div class="card clickable" data-team="${esc(p.name)}">
      <div class="flex-between">
        <span class="team-cell" style="font-size:15px">${teamLogo(state.teamMeta[p.name] || {}, 26)}${esc(p.name)}</span>
        ${p.alive ? `<span class="badge alive">Alive</span>` : p.isChampion ? `<span class="badge alive">Champion</span>` : `<span class="badge par" style="opacity:.7">Out</span>`}
      </div>
      <div class="muted" style="font-size:12px;margin:6px 0">
        ${e ? `FIFA #${e.fifaRank} &middot; Elo ${e.elo} &middot; ${e.confederation} &middot; Group ${e.group}` : ""}
      </div>
      <div class="flex-between" style="font-size:12.5px">
        <span>${p.record.w}W-${p.record.d}D-${p.record.l}L &middot; GD ${p.record.gd > 0 ? "+" : ""}${p.record.gd}</span>
        <span class="badge ${v.cls}">${v.label}</span>
      </div>
      <div style="font-size:12px;margin-top:6px" class="faint">Expected: ${esc(p.expectedLabel)} &middot; ${p.alive ? "In" : "Reached"}: ${esc(p.achievedLabel)} ${deltaSpan(p.perfScore)}</div>
    </div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
  $("#team-search")?.addEventListener("input", (e) => {
    state.filters.teams.q = e.target.value;
    clearTimeout(state._tfT);
    state._tfT = setTimeout(renderTeams, 200);
  });
}

/* ================= PLAYERS ================= */
function renderPlayers() {
  const el = $("#view-players");
  const L = state.leaders;
  if (!L || !Object.keys(L).length) {
    el.innerHTML = `<div class="loading">Player stats unavailable right now &mdash; will retry on next refresh.</div>`;
    return;
  }
  // lazily pull extended categories (shots, saves, cards…) the first time
  if (!state._extLoading) {
    state._extLoading = true;
    API.fetchExtendedLeaders().then((ext) => {
      let added = false;
      for (const [k, v] of Object.entries(ext || {})) {
        if (!state.leaders[k]) { state.leaders[k] = v; added = true; }
      }
      if (added && state.view === "players") renderPlayers();
    }).catch(() => { state._extLoading = false; });
  }
  const cats = Object.keys(L);
  const active = state.filters.players.cat && cats.includes(state.filters.players.cat)
    ? state.filters.players.cat : cats[0];
  const rows = L[active] || [];
  let html = `<div class="pill-bar">
    ${cats.map((c) => `<button class="pill ${c === active ? "active" : ""}" data-pf-cat="${esc(c)}">${esc(LEADER_LABELS[c] || c)}</button>`).join("")}
  </div>
  <div class="card"><table class="data">
    <tr><th>#</th><th>Player</th><th>Team</th><th class="num">${esc(LEADER_LABELS[active] || active)}</th>${rows[0]?.extra ? `<th class="num">${esc(rows[0].extraLabel || "")}</th>` : ""}</tr>
    ${rows.map((p, i) => `<tr>
      <td class="faint mono">${i + 1}</td>
      <td><b>${esc(p.name)}</b> ${p.pos ? `<span class="faint">${esc(p.pos)}</span>` : ""}</td>
      <td><span class="team-cell">${p.teamLogo ? `<img src="${esc(p.teamLogo)}" width="18" height="18">` : ""}${esc(p.team)}</span></td>
      <td class="num"><b>${p.value}</b></td>
      ${p.extra != null ? `<td class="num muted">${p.extra}</td>` : ""}
    </tr>`).join("")}
  </table></div>`;
  el.innerHTML = html;
}

/* ================= MATCH MODAL ================= */
async function openMatchModal(id) {
  const m = state.matches.find((x) => x.id === id);
  if (!m) return;
  const body = $("#modal-body");
  $("#modal-backdrop").classList.remove("hidden");
  body.innerHTML = `<div class="loading">Loading match detail&hellip;</div>`;
  let sum = null;
  try { sum = await API.fetchSummary(id); } catch (e) { /* render what we have */ }

  const headScore = m.state === "pre"
    ? `<div class="mm-score"><span class="faint" style="font-size:20px">vs</span><span class="ft">${fmtDate(m.date)} ${fmtTime(m.date)}</span></div>`
    : `<div class="mm-score">${m.home.score}&ndash;${m.away.score}
        ${m.shootout ? `<span class="ft">(${m.home.shootoutScore}&ndash;${m.away.shootoutScore} pens)</span>` : ""}
        ${m.state === "in" ? `<span class="clock">&#9679; ${esc(m.clock || "LIVE")}</span>` : `<span class="ft">${esc(m.detail || "FULL TIME")}</span>`}</div>`;

  let html = `<div class="mm-head">
    <div class="mm-team">${teamLogo(m.home, 54)}<span class="n">${esc(m.home.name)}</span></div>
    ${headScore}
    <div class="mm-team">${teamLogo(m.away, 54)}<span class="n">${esc(m.away.name)}</span></div>
  </div>
  <div class="mm-sub">${esc(m.group ? "Group " + m.group : m.roundLabel)} &middot; ${esc(m.venue || "")}</div>`;

  if (sum?.events?.length) {
    html += `<h2 class="section-title">Key events</h2>`;
    for (const ev of sum.events) {
      html += `<div class="kev"><span class="t">${esc(ev.clock)}</span><span class="ic">${ev.icon}</span>
        <span>${esc(ev.text)}</span></div>`;
    }
  }
  if (sum?.stats?.length) {
    html += `<h2 class="section-title">Team stats</h2>`;
    for (const s of sum.stats) {
      const total = (parseFloat(s.home) || 0) + (parseFloat(s.away) || 0) || 1;
      const hw = (parseFloat(s.home) || 0) / total * 100;
      html += `<div class="cmp-row">
        <span class="cv">${esc(s.home)}</span>
        <div><div class="c-label">${esc(s.label)}</div>
          <div class="cmp-bars"><div class="h" style="width:${hw}%"></div><div class="a" style="width:${100 - hw}%"></div></div></div>
        <span class="cv away">${esc(s.away)}</span>
      </div>`;
    }
  }
  if (sum?.shootout?.length) {
    html += `<h2 class="section-title">Penalty shootout</h2><div class="grid cols-2">`;
    for (const s of sum.shootout) {
      html += `<div class="card"><b>${esc(s.team)}</b><div style="margin-top:6px">
        ${s.shots.map((x) => `<div class="kev"><span class="ic">${x.scored ? "&#9989;" : "&#10060;"}</span><span>${esc(x.player)}</span></div>`).join("")}
      </div></div>`;
    }
    html += `</div>`;
  }
  if (sum?.lineups?.length) {
    html += `<h2 class="section-title">Starting lineups</h2><div class="grid cols-2">`;
    for (const lu of sum.lineups) {
      html += `<div class="card"><div class="flex-between"><b>${esc(lu.team)}</b><span class="faint mono">${esc(lu.formation)}</span></div>
        <table class="data" style="margin-top:6px">${lu.starters.map((p) =>
          `<tr><td class="faint mono">${esc(p.jersey)}</td><td class="faint">${esc(p.pos)}</td>
           <td>${esc(p.name)}${p.off ? ' <span class="faint">&#8646;</span>' : ""}</td></tr>`).join("")}
        </table></div>`;
    }
    html += `</div>`;
  }
  if (!sum) html += `<div class="error-box">Couldn't load the detailed box score for this match.</div>`;
  body.innerHTML = html;
}

/* ================= TEAM MODAL ================= */
function openTeamModal(name) {
  const p = state.perf[name];
  if (!p) return;
  const e = p.exp;
  const meta = state.teamMeta[name] || {};
  const v = perfVerdict(p);
  const ms = state.matches.filter((m) => m.home.name === name || m.away.name === name);
  $("#modal-backdrop").classList.remove("hidden");
  let html = `<div class="tm-head">
    ${teamLogo(meta, 62)}
    <div>
      <div class="tn">${esc(name)} <span class="badge ${v.cls}" style="vertical-align:middle">${v.label}</span></div>
      <div class="tmeta">${e ? `${e.confederation} &middot; FIFA rank #${e.fifaRank} &middot; Elo ${e.elo} &middot; pre-tournament title odds ${e.titleOdds}% &middot; Group ${e.group}` : "No pre-tournament data"}</div>
    </div>
  </div>
  <div class="stat-tiles" style="margin-bottom:14px">
    <div class="stat-tile"><div class="v">${p.record.w}-${p.record.d}-${p.record.l}</div><div class="l">Record</div></div>
    <div class="stat-tile"><div class="v">${p.record.gf}:${p.record.ga}</div><div class="l">Goals</div><div class="s">GD ${p.record.gd > 0 ? "+" : ""}${p.record.gd}</div></div>
    <div class="stat-tile"><div class="v">${p.actualPts} <span class="faint" style="font-size:13px">vs ${p.expPts.toFixed(1)}</span></div><div class="l">Grp pts vs expected</div></div>
    <div class="stat-tile"><div class="v ${p.perfScore > 0 ? "green" : ""}">${p.perfScore > 0 ? "+" : ""}${p.perfScore}</div><div class="l">Perf score</div></div>
  </div>
  <div class="card" style="margin-bottom:14px">
    <b>Expectation vs reality:</b> <span class="muted">expected to reach <b>${esc(p.expectedLabel)}</b> &mdash; ${
      p.isChampion ? `<b class="gold">won the whole thing.</b>` :
      p.alive ? `still alive in the <b>${esc(p.achievedLabel)}</b>.` :
      `went out in the <b>${esc(ROUND_LABELS[p.eliminatedIn] || p.achievedLabel)}</b>.`}
    </span>
  </div>
  <h2 class="section-title">Matches</h2>
  <div class="grid cols-2">${ms.map((m) => matchCard(m)).join("")}</div>`;
  $("#modal-body").innerHTML = html;
}

const LEADER_LABELS = {
  goals: "Goals", assists: "Assists", shots: "Shots", shotsOnTarget: "Shots on target",
  saves: "Saves", yellowCards: "Yellow cards", redCards: "Red cards",
  foulsCommitted: "Fouls", foulsSuffered: "Fouls won", offsides: "Offsides",
};
