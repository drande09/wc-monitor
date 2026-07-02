/* ============================================================
   app.js — state, refresh loop, navigation, event delegation
   ============================================================ */

const state = {
  matches: [],          // normalized, sorted by date
  groups: {},           // { A: [ {name,p,w,d,l,gf,ga,gd,pts,status} ] }
  perf: {},             // { teamName: perf object }
  teamMeta: {},         // { teamName: {logo, abbr, id} }
  leaders: null,        // { goals: [{name,team,value}...], ... }
  view: "overview",
  filters: {
    matches: { round: "all", team: "" },
    teams: { conf: "all", q: "" },
    players: { cat: null },
  },
  lastUpdated: null,
  _timer: null,
};

const RENDERERS = {
  overview: renderOverview, matches: renderMatches, groups: renderGroups,
  bracket: renderBracket, federations: renderFederations,
  teams: renderTeams, players: renderPlayers,
};

function renderCurrent() {
  try { RENDERERS[state.view](); }
  catch (e) {
    console.error("render error", e);
    $(`#view-${state.view}`).innerHTML = `<div class="error-box">Render error: ${esc(e.message)}</div>`;
  }
}

function switchView(v) {
  state.view = v;
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === v));
  $$(".view").forEach((s) => s.classList.toggle("active", s.id === "view-" + v));
  renderCurrent();
}

/* ---------- refresh loop ---------- */
async function refresh(manual = false) {
  const btn = $("#refresh-btn");
  btn.classList.add("spinning");
  try {
    const data = await API.fetchAll();
    state.matches = data.matches;
    state.groups = data.groups;
    state.teamMeta = data.teamMeta;
    if (data.leaders) state.leaders = data.leaders;
    // recompute perf for every team we know about
    const names = new Set([
      ...Object.keys(PRETOURNAMENT.teams),
      ...state.matches.flatMap((m) => [m.home.name, m.away.name]).filter(Boolean),
    ]);
    state.perf = {};
    for (const n of names) {
      const ms = state.matches.filter((m) => m.home.name === n || m.away.name === n);
      state.perf[n] = computeTeamPerformance(n, ms);
    }
    state.lastUpdated = new Date();
    $("#last-updated").textContent = "updated " + state.lastUpdated.toLocaleTimeString();
    const live = state.matches.filter((m) => m.state === "in").length;
    $("#live-indicator").classList.toggle("hidden", live === 0);
    $("#live-count").textContent = `${live} LIVE`;
    renderCurrent();
    scheduleNext(live > 0);
  } catch (e) {
    console.error(e);
    $("#last-updated").textContent = "update failed — retrying";
    if (manual || !state.matches.length) {
      $(`#view-${state.view}`).innerHTML =
        `<div class="error-box"><b>Couldn't reach the data source.</b><br>${esc(e.message)}<br><br>
         If you opened this file directly and it fails, serve it locally instead:<br>
         <code style="font-family:var(--mono)">cd "${esc("C:\\Users\\dander09\\Dropbox\\WC")}" ; python -m http.server 8080</code>
         then open <code>http://localhost:8080</code></div>`;
    }
    scheduleNext(false, true);
  } finally {
    btn.classList.remove("spinning");
  }
}

function scheduleNext(anyLive, failed = false) {
  clearTimeout(state._timer);
  // live matches: 60s. idle: 5 min. failure: 90s backoff.
  const ms = failed ? 90_000 : anyLive ? 60_000 : 300_000;
  state._timer = setTimeout(refresh, ms);
}

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) return switchView(tab.dataset.view);

  const mEl = e.target.closest("[data-match]");
  if (mEl) return openMatchModal(mEl.dataset.match);

  const tEl = e.target.closest("[data-team]");
  if (tEl) return openTeamModal(tEl.dataset.team);

  const rf = e.target.closest("[data-mf-round]");
  if (rf) { state.filters.matches.round = rf.dataset.mfRound; return renderMatches(); }

  const cf = e.target.closest("[data-tf-conf]");
  if (cf) { state.filters.teams.conf = cf.dataset.tfConf; return renderTeams(); }

  const pf = e.target.closest("[data-pf-cat]");
  if (pf) { state.filters.players.cat = pf.dataset.pfCat; return renderPlayers(); }

  if (e.target.id === "modal-close" || e.target.id === "modal-backdrop") {
    $("#modal-backdrop").classList.add("hidden");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("#modal-backdrop").classList.add("hidden");
});
$("#refresh-btn").addEventListener("click", () => refresh(true));

/* ---------- boot ---------- */
refresh(true);
