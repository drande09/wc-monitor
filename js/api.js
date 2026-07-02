/* ============================================================
   api.js — ESPN public API layer. Fetches, normalizes to the
   app's data model, computes group tables. No DOM here.

   Endpoints (all no-key, CORS *):
   - scoreboard: site.api.espn.com .../fifa.world/scoreboard
       ?dates=YYYYMMDD-YYYYMMDD&limit=400  (default limit 100!)
   - standings:  site.api.espn.com/apis/v2/.../standings
   - summary:    .../summary?event=<id>
   - leaders:    site.web.api.espn.com/apis/site/v2/.../statistics
                 (goals+assists); core API types/1/leaders for more
   ============================================================ */

const API = (() => {
  const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
  const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026";
  const STATS_URL = "https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/statistics?region=us&lang=en&contentorigin=espn";
  const CORE_LEADERS = "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/types/1/leaders";
  const RANGE = "20260611-20260720";

  async function getJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} from ${url.split("?")[0]}`);
    return r.json();
  }

  /* ---- round mapping (event.season.slug is authoritative) ---- */
  function mapRound(ev) {
    const slug = (ev.season?.slug || "").toLowerCase();
    if (slug.includes("group")) return ["group", "Group stage"];
    if (slug.includes("32")) return ["r32", "Round of 32"];
    if (slug.includes("16")) return ["r16", "Round of 16"];
    if (slug.includes("quarter")) return ["qf", "Quarterfinal"];
    if (slug.includes("semi")) return ["sf", "Semifinal"];
    if (slug.includes("3rd") || slug.includes("third")) return ["third", "3rd-place match"];
    if (slug.includes("final")) return ["final", "Final"];
    return ["group", "Group stage"];
  }

  function canonicalName(displayName) {
    return PRETOURNAMENT.aliases[displayName] || displayName;
  }

  /* placeholder knockout slots: isActive:false, names like "Round of 32 11 Winner" */
  function isPlaceholder(t) {
    if (!t) return true;
    if (t.isActive === false) return true;
    return /\b(winner|loser|tbd)\b/i.test(t.displayName || "");
  }

  /* ---- normalize one scoreboard event ---- */
  function normalizeEvent(ev) {
    const comp = ev.competitions?.[0];
    if (!comp) return null;
    const [round, roundLabel] = mapRound(ev);
    const side = (ha) => {
      const c = (comp.competitors || []).find((x) => x.homeAway === ha) || {};
      const t = c.team || {};
      const stats = {};
      for (const s of c.statistics || []) stats[s.name] = s.displayValue;
      if (isPlaceholder(t)) {
        return { id: null, name: "", abbr: "", logo: "",
                 tbdLabel: t.shortDisplayName || t.displayName || "TBD",
                 score: 0, shootoutScore: null, winner: false, _stats: {} };
      }
      return {
        id: t.id,
        name: canonicalName(t.displayName || t.name || ""),
        abbr: t.abbreviation || "",
        logo: t.logo || (t.logos?.[0]?.href ?? ""),
        score: c.score != null ? parseInt(c.score, 10) || 0 : 0,
        shootoutScore: c.shootoutScore != null ? Number(c.shootoutScore) : null,
        winner: !!c.winner,
        form: c.form || "",
        _stats: stats,
      };
    };
    const home = side("home"), away = side("away");
    const st = comp.status || ev.status || {};
    const stateRaw = st.type?.state || "pre"; // pre | in | post
    const shootout = home.shootoutScore != null && away.shootoutScore != null;
    // group letter: derive from pre-tournament group of either team
    let group = null;
    if (round === "group") {
      group = getExpectation(home.name)?.group || getExpectation(away.name)?.group || null;
    }
    // pre-match odds (c.odds is [null] on finished games — guard)
    const o = Array.isArray(comp.odds) ? comp.odds[0] : null;
    const odds = o && o.details ? { details: o.details, overUnder: o.overUnder ?? null } : null;
    // live in-match stats if present on scoreboard competitors
    let liveStats = null;
    const num = (v) => (v != null && v !== "" ? parseFloat(v) : null);
    if (stateRaw === "in") {
      liveStats = {
        possH: num(home._stats.possessionPct),
        shotsH: num(home._stats.totalShots), shotsA: num(away._stats.totalShots),
        sotH: num(home._stats.shotsOnTarget), sotA: num(away._stats.shotsOnTarget),
        cornersH: num(home._stats.wonCorners), cornersA: num(away._stats.wonCorners),
      };
      if (liveStats.possH == null && liveStats.shotsH == null) liveStats = null;
      else if (liveStats.possH != null) liveStats.possH = Math.round(liveStats.possH);
    }
    // shootout note e.g. "Paraguay advance 4-3 on penalties"
    const note = (comp.notes || []).map((n) => n.text).filter(Boolean).join(" · ") || null;
    return {
      id: String(ev.id),
      date: new Date(ev.date),
      round, roundLabel, group,
      state: stateRaw,
      clock: stateRaw === "in" ? (st.displayClock || "") : "",
      detail: st.type?.shortDetail || "",
      venue: comp.venue?.fullName || "",
      shootout, note, odds, liveStats,
      home, away,
    };
  }

  /* ---- official standings: teamName -> {rank, advanced, note} ---- */
  async function fetchStandings() {
    try {
      const j = await getJSON(STANDINGS_URL);
      const out = {};
      for (const g of j.children || []) {
        for (const e of g.standings?.entries || []) {
          const get = (n) => e.stats?.find((s) => s.name === n)?.value;
          out[canonicalName(e.team?.displayName || "")] = {
            rank: +get("rank") || 99,
            advanced: +get("advanced") === 1,
            note: e.note?.description || null,
          };
        }
      }
      return out;
    } catch (e) {
      console.warn("standings fetch failed, using computed tables", e);
      return null;
    }
  }

  /* ---- group tables from match results (+ official rank overlay) ---- */
  function computeGroups(matches, official) {
    const groups = {};
    const rows = {};
    for (const g of Object.keys(PRETOURNAMENT.groups)) {
      groups[g] = [];
      for (const name of PRETOURNAMENT.groups[g]) {
        rows[name] = { name, group: g, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, status: null };
        groups[g].push(rows[name]);
      }
    }
    for (const m of matches) {
      if (m.round !== "group" || m.state !== "post") continue;
      const h = rows[m.home.name], a = rows[m.away.name];
      if (!h || !a) continue;
      h.p++; a.p++;
      h.gf += m.home.score; h.ga += m.away.score;
      a.gf += m.away.score; a.ga += m.home.score;
      if (m.home.score > m.away.score) { h.w++; h.pts += 3; a.l++; }
      else if (m.home.score < m.away.score) { a.w++; a.pts += 3; h.l++; }
      else { h.d++; a.d++; h.pts++; a.pts++; }
    }
    // teams appearing in knockout matches definitely advanced
    const inKO = new Set();
    for (const m of matches) {
      if (m.round === "group" || m.round === "third") continue;
      if (m.home.name) inKO.add(m.home.name);
      if (m.away.name) inKO.add(m.away.name);
    }
    for (const g of Object.keys(groups)) {
      const arr = groups[g];
      for (const r of arr) r.gd = r.gf - r.ga;
      arr.sort((x, y) => {
        const ox = official?.[x.name]?.rank, oy = official?.[y.name]?.rank;
        if (ox != null && oy != null && ox !== oy) return ox - oy;
        return y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.name.localeCompare(y.name);
      });
      const complete = arr.every((r) => r.p >= 3);
      arr.forEach((r, i) => {
        const adv = official?.[r.name]?.advanced || inKO.has(r.name);
        if (adv) r.status = i <= 1 ? "through" : "third";
        else if (complete) r.status = "out";
      });
    }
    return groups;
  }

  /* ---- player leaders: goals + assists (rich, one call) ---- */
  async function fetchLeaders() {
    try {
      const j = await getJSON(STATS_URL);
      const out = {};
      for (const cat of j.stats || []) {
        const key = cat.name === "goalsLeaders" ? "goals"
          : cat.name === "assistsLeaders" ? "assists" : cat.name;
        out[key] = (cat.leaders || []).map((l) => {
          const a = l.athlete || {};
          const matches = /Matches:\s*(\d+)/.exec(l.displayValue || "");
          return {
            name: a.displayName || "?",
            pos: a.position?.abbreviation || "",
            team: canonicalName(a.team?.displayName || a.team?.abbreviation || ""),
            teamLogo: a.team?.logos?.[0]?.href || "",
            value: l.value,
            extra: matches ? +matches[1] : null,
            extraLabel: "Matches",
          };
        }).filter((x) => x.value > 0).slice(0, 25);
      }
      return Object.keys(out).length ? out : null;
    } catch (e) {
      console.warn("leaders fetch failed", e);
      return null;
    }
  }

  /* ---- extended leaders (core API, $ref joins) — lazy, cached ---- */
  const EXT_CATS = { shotsOnTarget: "shotsOnTarget", totalShots: "shots",
    yellowCards: "yellowCards", saves: "saves", foulsSuffered: "foulsSuffered" };
  let _extCache = null, _extPromise = null;
  async function fetchExtendedLeaders() {
    if (_extCache) return _extCache;
    if (_extPromise) return _extPromise;
    _extPromise = (async () => {
      const j = await getJSON(CORE_LEADERS);
      const out = {};
      const athleteCache = new Map();
      const resolveAthlete = async (ref) => {
        const url = ref.replace(/^http:/, "https:");
        if (!athleteCache.has(url)) {
          athleteCache.set(url, getJSON(url).catch(() => null));
        }
        return athleteCache.get(url);
      };
      for (const cat of j.categories || []) {
        const key = EXT_CATS[cat.name];
        if (!key) continue;
        const top = (cat.leaders || []).slice(0, 12);
        const rows = await Promise.all(top.map(async (l) => {
          const a = l.athlete?.$ref ? await resolveAthlete(l.athlete.$ref) : null;
          let team = "", teamLogo = "";
          if (a?.team?.$ref) {
            const t = await resolveAthlete(a.team.$ref);
            team = canonicalName(t?.displayName || ""); teamLogo = t?.logos?.[0]?.href || "";
          }
          return a ? {
            name: a.displayName || a.fullName || "?",
            pos: a.position?.abbreviation || "",
            team, teamLogo, value: l.value, extra: null,
          } : null;
        }));
        const clean = rows.filter(Boolean).filter((r) => r.value > 0);
        if (clean.length) out[key === "shots" ? "shots" : key] = clean;
      }
      _extCache = out;
      return out;
    })();
    try { return await _extPromise; }
    catch (e) { _extPromise = null; throw e; }
  }

  /* ---- match summary (deep dive) ---- */
  const summaryCache = new Map();
  async function fetchSummary(eventId) {
    const cached = summaryCache.get(eventId);
    if (cached && Date.now() - cached.t < 60_000) return cached.v;
    const j = await getJSON(`${BASE}/summary?event=${eventId}`);
    const v = parseSummary(j);
    summaryCache.set(eventId, { v, t: Date.now() });
    return v;
  }

  // curated boxscore stats, display order
  const BOX_STATS = [
    ["possessionPct", "Possession %"], ["totalShots", "Shots"],
    ["shotsOnTarget", "On target"], ["wonCorners", "Corners"],
    ["accuratePasses", "Accurate passes"], ["passPct", "Pass accuracy"],
    ["foulsCommitted", "Fouls"], ["offsides", "Offsides"],
    ["saves", "Saves"], ["yellowCards", "Yellow cards"], ["redCards", "Red cards"],
    ["totalTackles", "Tackles"], ["interceptions", "Interceptions"],
  ];

  function parseSummary(j) {
    const out = { stats: [], events: [], lineups: [], shootout: null };
    // -- team stats
    const teams = j.boxscore?.teams || [];
    if (teams.length === 2) {
      const homeIdx = teams.findIndex((t) => (t.homeAway || "").toLowerCase() === "home");
      const hi = homeIdx >= 0 ? homeIdx : 0, ai = hi === 0 ? 1 : 0;
      const stat = (ti, name) => teams[ti].statistics?.find((s) => s.name === name)?.displayValue;
      for (const [name, label] of BOX_STATS) {
        let h = stat(hi, name), a = stat(ai, name);
        if (h == null && a == null) continue;
        if (name === "passPct") { h = h != null ? Math.round(parseFloat(h) * 100) + "%" : "-"; a = a != null ? Math.round(parseFloat(a) * 100) + "%" : "-"; }
        out.stats.push({ label, home: h ?? "-", away: a ?? "-" });
      }
    }
    // -- key events timeline
    for (const ke of j.keyEvents || []) {
      const tt = (ke.type?.text || "").toLowerCase();
      if (/kickoff|halftime|end |full time|start /.test(tt)) continue;
      const icon = tt.includes("own goal") ? "&#9917;&#65039;&#8595;"
        : tt.includes("goal") || tt.includes("penalty - scored") ? "&#9917;"
        : tt.includes("yellow") ? "&#129000;"
        : tt.includes("red") ? "&#128997;"
        : tt.includes("substitution") ? "&#8646;"
        : tt.includes("penalty") ? "&#10060;" : "&bull;";
      out.events.push({
        clock: ke.clock?.displayValue || "",
        icon,
        text: ke.text || ke.shortText || "",
      });
    }
    // -- lineups
    for (const r of j.rosters || []) {
      const starters = (r.roster || []).filter((p) => p.starter).map((p) => ({
        jersey: p.jersey, pos: p.position?.abbreviation || "",
        name: p.athlete?.shortName || p.athlete?.displayName || "?",
        off: !!p.subbedOut,
      }));
      if (starters.length) out.lineups.push({
        team: canonicalName(r.team?.displayName || ""),
        homeAway: r.homeAway, formation: r.formation || "", starters,
      });
    }
    // -- shootout sequence
    if (Array.isArray(j.shootout) && j.shootout.length) {
      out.shootout = j.shootout.map((s) => ({
        team: canonicalName(s.team || ""),
        shots: (s.shots || []).map((x) => ({ player: x.player, scored: !!x.didScore })),
      }));
    }
    return out;
  }

  /* ---- master fetch ---- */
  async function fetchAll() {
    const [sb, official] = await Promise.all([
      getJSON(`${BASE}/scoreboard?dates=${RANGE}&limit=400`),
      fetchStandings(),
    ]);
    const matches = (sb.events || []).map(normalizeEvent).filter(Boolean)
      .sort((a, b) => a.date - b.date);
    const groups = computeGroups(matches, official);
    const teamMeta = {};
    for (const m of matches) {
      for (const s of [m.home, m.away]) {
        if (s.name && !teamMeta[s.name]) teamMeta[s.name] = { id: s.id, abbr: s.abbr, logo: s.logo };
      }
    }
    // leaders: refresh at most every 5 min
    let leaders;
    if (!fetchAll._leadersAt || Date.now() - fetchAll._leadersAt > 300_000) {
      leaders = await fetchLeaders();
      if (leaders) fetchAll._leadersAt = Date.now();
    }
    return { matches, groups, teamMeta, leaders };
  }

  return { fetchAll, fetchSummary, fetchExtendedLeaders };
})();
