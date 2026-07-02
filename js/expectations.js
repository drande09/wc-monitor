/* ============================================================
   expectations.js — static PRE-TOURNAMENT data (June 2026).
   fifaRank: FIFA release of 11 Jun 2026 (last before kickoff).
   elo: eloratings.net-based snapshot, ~10 Jun 2026.
   titleOdds: Opta supercomputer pre-tournament %, gaps filled
   from bookmaker outrights (implied probability).
   expectedRound: teams ranked by titleOdds (FIFA rank tiebreak)
   mapped to slots — #1 champion, #2 final, #3-4 sf, #5-8 qf,
   #9-16 r16, #17-32 r32, #33-48 group.
   ============================================================ */

const PRETOURNAMENT = {
  rankingRelease: "2026-06-11",

  groups: {
    A: ["Mexico", "South Africa", "South Korea", "Czechia"],
    B: ["Canada", "Switzerland", "Qatar", "Bosnia and Herzegovina"],
    C: ["Brazil", "Morocco", "Haiti", "Scotland"],
    D: ["United States", "Paraguay", "Australia", "Türkiye"],
    E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
    F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
    G: ["Belgium", "Egypt", "Iran", "New Zealand"],
    H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
    I: ["France", "Senegal", "Iraq", "Norway"],
    J: ["Argentina", "Algeria", "Austria", "Jordan"],
    K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
    L: ["England", "Croatia", "Ghana", "Panama"]
  },

  teams: {
    // Group A
    "Mexico":                 { fifaRank: 14, elo: 1834, titleOdds: 1.0,  confederation: "CONCACAF", espnAbbr: "MEX", expectedRound: "r32",      group: "A" },
    "South Africa":           { fifaRank: 60, elo: 1529, titleOdds: 0.1,  confederation: "CAF",      espnAbbr: "RSA", expectedRound: "group",    group: "A" },
    "South Korea":            { fifaRank: 25, elo: 1784, titleOdds: 0.25, confederation: "AFC",      espnAbbr: "KOR", expectedRound: "r32",      group: "A" },
    "Czechia":                { fifaRank: 40, elo: 1731, titleOdds: 0.4,  confederation: "UEFA",     espnAbbr: "CZE", expectedRound: "r32",      group: "A" },
    // Group B
    "Canada":                 { fifaRank: 30, elo: 1806, titleOdds: 0.8,  confederation: "CONCACAF", espnAbbr: "CAN", expectedRound: "r32",      group: "B" },
    "Switzerland":            { fifaRank: 19, elo: 1897, titleOdds: 1.0,  confederation: "UEFA",     espnAbbr: "SUI", expectedRound: "r32",      group: "B" },
    "Qatar":                  { fifaRank: 56, elo: 1427, titleOdds: 0.07, confederation: "AFC",      espnAbbr: "QAT", expectedRound: "group",    group: "B" },
    "Bosnia and Herzegovina": { fifaRank: 64, elo: 1571, titleOdds: 0.2,  confederation: "UEFA",     espnAbbr: "BIH", expectedRound: "group",    group: "B" },
    // Group C
    "Brazil":                 { fifaRank: 6,  elo: 1979, titleOdds: 6.6,  confederation: "CONMEBOL", espnAbbr: "BRA", expectedRound: "qf",       group: "C" },
    "Morocco":                { fifaRank: 7,  elo: 1806, titleOdds: 1.9,  confederation: "CAF",      espnAbbr: "MAR", expectedRound: "r16",      group: "C" },
    "Haiti":                  { fifaRank: 83, elo: 1542, titleOdds: 0.04, confederation: "CONCACAF", espnAbbr: "HAI", expectedRound: "group",    group: "C" },
    "Scotland":               { fifaRank: 42, elo: 1790, titleOdds: 0.2,  confederation: "UEFA",     espnAbbr: "SCO", expectedRound: "group",    group: "C" },
    // Group D
    "United States":          { fifaRank: 17, elo: 1747, titleOdds: 1.2,  confederation: "CONCACAF", espnAbbr: "USA", expectedRound: "r16",      group: "D" },
    "Paraguay":               { fifaRank: 41, elo: 1833, titleOdds: 0.3,  confederation: "CONMEBOL", espnAbbr: "PAR", expectedRound: "r32",      group: "D" },
    "Australia":              { fifaRank: 27, elo: 1774, titleOdds: 0.3,  confederation: "AFC",      espnAbbr: "AUS", expectedRound: "r32",      group: "D" },
    "Türkiye":                { fifaRank: 22, elo: 1880, titleOdds: 1.0,  confederation: "UEFA",     espnAbbr: "TUR", expectedRound: "r32",      group: "D" },
    // Group E
    "Germany":                { fifaRank: 10, elo: 1910, titleOdds: 5.1,  confederation: "UEFA",     espnAbbr: "GER", expectedRound: "qf",       group: "E" },
    "Curaçao":                { fifaRank: 82, elo: 1467, titleOdds: 0.04, confederation: "CONCACAF", espnAbbr: "CUW", expectedRound: "group",    group: "E" },
    "Ivory Coast":            { fifaRank: 33, elo: 1637, titleOdds: 0.4,  confederation: "CAF",      espnAbbr: "CIV", expectedRound: "r32",      group: "E" },
    "Ecuador":                { fifaRank: 23, elo: 1933, titleOdds: 1.4,  confederation: "CONMEBOL", espnAbbr: "ECU", expectedRound: "r16",      group: "E" },
    // Group F
    "Netherlands":            { fifaRank: 8,  elo: 1959, titleOdds: 3.6,  confederation: "UEFA",     espnAbbr: "NED", expectedRound: "qf",       group: "F" },
    "Japan":                  { fifaRank: 18, elo: 1879, titleOdds: 1.5,  confederation: "AFC",      espnAbbr: "JPN", expectedRound: "r16",      group: "F" },
    "Sweden":                 { fifaRank: 38, elo: 1660, titleOdds: 1.0,  confederation: "UEFA",     espnAbbr: "SWE", expectedRound: "r32",      group: "F" },
    "Tunisia":                { fifaRank: 45, elo: 1614, titleOdds: 0.2,  confederation: "CAF",      espnAbbr: "TUN", expectedRound: "group",    group: "F" },
    // Group G
    "Belgium":                { fifaRank: 9,  elo: 1849, titleOdds: 2.4,  confederation: "UEFA",     espnAbbr: "BEL", expectedRound: "r16",      group: "G" },
    "Egypt":                  { fifaRank: 29, elo: 1660, titleOdds: 0.4,  confederation: "CAF",      espnAbbr: "EGY", expectedRound: "r32",      group: "G" },
    "Iran":                   { fifaRank: 20, elo: 1754, titleOdds: 0.15, confederation: "AFC",      espnAbbr: "IRN", expectedRound: "group",    group: "G" },
    "New Zealand":            { fifaRank: 85, elo: 1586, titleOdds: 0.07, confederation: "OFC",      espnAbbr: "NZL", expectedRound: "group",    group: "G" },
    // Group H
    "Spain":                  { fifaRank: 2,  elo: 2171, titleOdds: 16.1, confederation: "UEFA",     espnAbbr: "ESP", expectedRound: "champion", group: "H" },
    "Cape Verde":             { fifaRank: 67, elo: 1561, titleOdds: 0.1,  confederation: "CAF",      espnAbbr: "CPV", expectedRound: "group",    group: "H" },
    "Saudi Arabia":           { fifaRank: 61, elo: 1592, titleOdds: 0.1,  confederation: "AFC",      espnAbbr: "KSA", expectedRound: "group",    group: "H" },
    "Uruguay":                { fifaRank: 16, elo: 1890, titleOdds: 1.0,  confederation: "CONMEBOL", espnAbbr: "URU", expectedRound: "r32",      group: "H" },
    // Group I
    "France":                 { fifaRank: 3,  elo: 2063, titleOdds: 13.0, confederation: "UEFA",     espnAbbr: "FRA", expectedRound: "final",    group: "I" },
    "Senegal":                { fifaRank: 15, elo: 1869, titleOdds: 1.1,  confederation: "CAF",      espnAbbr: "SEN", expectedRound: "r32",      group: "I" },
    "Iraq":                   { fifaRank: 57, elo: 1583, titleOdds: 0.07, confederation: "AFC",      espnAbbr: "IRQ", expectedRound: "group",    group: "I" },
    "Norway":                 { fifaRank: 31, elo: 1922, titleOdds: 3.5,  confederation: "UEFA",     espnAbbr: "NOR", expectedRound: "r16",      group: "I" },
    // Group J
    "Argentina":              { fifaRank: 1,  elo: 2113, titleOdds: 10.4, confederation: "CONMEBOL", espnAbbr: "ARG", expectedRound: "sf",       group: "J" },
    "Algeria":                { fifaRank: 28, elo: 1728, titleOdds: 0.3,  confederation: "CAF",      espnAbbr: "ALG", expectedRound: "r32",      group: "J" },
    "Austria":                { fifaRank: 24, elo: 1818, titleOdds: 0.7,  confederation: "UEFA",     espnAbbr: "AUT", expectedRound: "r32",      group: "J" },
    "Jordan":                 { fifaRank: 63, elo: 1691, titleOdds: 0.1,  confederation: "AFC",      espnAbbr: "JOR", expectedRound: "group",    group: "J" },
    // Group K
    "Portugal":               { fifaRank: 5,  elo: 1976, titleOdds: 7.0,  confederation: "UEFA",     espnAbbr: "POR", expectedRound: "qf",       group: "K" },
    "DR Congo":               { fifaRank: 46, elo: 1625, titleOdds: 0.1,  confederation: "CAF",      espnAbbr: "COD", expectedRound: "group",    group: "K" },
    "Uzbekistan":             { fifaRank: 50, elo: 1735, titleOdds: 0.1,  confederation: "AFC",      espnAbbr: "UZB", expectedRound: "group",    group: "K" },
    "Colombia":               { fifaRank: 13, elo: 1998, titleOdds: 2.1,  confederation: "CONMEBOL", espnAbbr: "COL", expectedRound: "r16",      group: "K" },
    // Group L
    "England":                { fifaRank: 4,  elo: 2042, titleOdds: 11.2, confederation: "UEFA",     espnAbbr: "ENG", expectedRound: "sf",       group: "L" },
    "Croatia":                { fifaRank: 11, elo: 1933, titleOdds: 1.6,  confederation: "UEFA",     espnAbbr: "CRO", expectedRound: "r16",      group: "L" },
    "Ghana":                  { fifaRank: 73, elo: 1680, titleOdds: 0.3,  confederation: "CAF",      espnAbbr: "GHA", expectedRound: "r32",      group: "L" },
    "Panama":                 { fifaRank: 34, elo: 1743, titleOdds: 0.1,  confederation: "CONCACAF", espnAbbr: "PAN", expectedRound: "group",    group: "L" }
  },

  // name aliases: ESPN display name → our canonical key
  aliases: {
    "USA": "United States",
    "Korea Republic": "South Korea",
    "Turkey": "Türkiye",
    "Turkiye": "Türkiye",
    "Czech Republic": "Czechia",
    "Cote d'Ivoire": "Ivory Coast",
    "Côte d'Ivoire": "Ivory Coast",
    "Curacao": "Curaçao",
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Congo DR": "DR Congo",
    "Democratic Republic of the Congo": "DR Congo",
    "IR Iran": "Iran",
    "Cabo Verde": "Cape Verde"
  },

  _notes: "Ghana and DR Congo Elo are estimates (missing from source). Elo snapshot labeled Jun 2026, may differ slightly from exact 10 Jun values. Odds below the Opta-published favorites converted from US bookmaker outrights."
};
