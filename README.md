# The World Cup Monitor

A self-contained FIFA World Cup 2026 fan dashboard. No build step, no API keys, no accounts —
plain HTML/JS that pulls live data from ESPN's public JSON API in your browser.

**Live site: https://drande09.github.io/wc-monitor/** (deploys automatically from `main` via GitHub Pages)

## Run it locally

Double-click **START.bat** (starts a tiny local server on port 8642 and opens the site).

Or manually: `python -m http.server 8642` in this folder, then open http://localhost:8642.
Opening `index.html` directly from disk usually works too (ESPN's API allows any origin).

## What's inside

| Tab | What you get |
|---|---|
| Overview | Tournament pulse (goals, upsets, teams alive), live matches with in-game stats, today's fixtures, over/underperformer snapshot, Golden Boot race, biggest upsets |
| Matches | Every match, filterable by round/team; click any match for box score, key-event timeline, lineups, shootouts |
| Groups | All 12 group tables with official ranks, qualification status, and points vs. Elo-expected points |
| Bracket | Full knockout tree, live-updating, penalty scores included |
| Federations | Performance vs. pre-tournament expectations aggregated by confederation, then team-by-team |
| Teams | All 48 teams with expectation badges; click for a team deep dive |
| Players | Stat leaderboards: goals, assists, shots, shots on target, saves, cards, fouls won |

## Refresh cadence

- Any match live: refetches every **60 seconds**
- Otherwise: every **5 minutes**
- Manual refresh button in the header

## The expectations model

Pre-tournament data is frozen in `js/expectations.js` (FIFA ranking of 11 Jun 2026, Elo ratings
~10 Jun 2026, Opta/bookmaker title odds, and a derived expected finishing round per team).

**Performance score** = (knockout rounds beyond/short of expected finish × 3) +
(actual group points − Elo-model expected group points). Teams still alive are never
penalized for rounds they haven't played yet. Federation index = average across member teams.

## Data sources

- Live scores/standings/stats: ESPN public API (`site.api.espn.com`, unofficial)
- Pre-tournament expectations: FIFA rankings, eloratings.net, Opta supercomputer + bookmaker outrights

Unofficial fan project; not affiliated with FIFA or ESPN.
