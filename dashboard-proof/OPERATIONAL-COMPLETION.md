# ATLAS FX Dashboard — Operational Completion Proof

Captured headless against the operationally completed `index.html` with
`/twelvedata` requests intercepted to TwelveData-shaped payloads.

## What's now visible above the fold

10 · MU operational ATF — `WAIT — NO TRADE` red action pill. Verdict strip
splits Bias Direction (`Neutral / Mixed`), Trade Permission (`No entry
authorised`), Valid Until (`06:00 UTC / 06:00 UTC (in <countdown>)`),
Reassess (same). Execution strip shows `Pending / Not active /
Not authorised / Not authorised / Not active / 06:00 UTC` with sub-notes.
Candidate Levels (NOT ACTIVE) section shows bullish + bearish candidate
entry/target/stop with explicit requirement sentences. Condition grid
(8 dims in 2 rows of 4) with state chip (RED/AMBER/GOLD/GREEN), state
label, and Effect line per dim.

11 · MU operational full page — Forward Expectation rewritten with
operational fields: Expected Behaviour, Reassess At, Upper Boundary,
Lower Boundary, Daily Movement, Tradability, Confirms Bullish, Confirms
Bearish, Keeps Blocked. Trigger Map per spec. 8 candlestick panels
stamped MU. Source footer `source=twelvedata/live · panels=8/8`.

12 · EURUSD operational ATF — `ARMED — WAITING FOR TRIGGER` gold tone.
Bias `Bullish`, Permission `Armed — entry not yet authorised`. Real
levels (1.07900 / 1.08600 / 1.07550 / 1.07350 / $350 / $700 / $8). FX
language only.

13 · EURUSD operational full — Forward Expectation operational, candle
panels, deeper tabs.

## Render rules implemented

- Clock helpers compute next-boundary times for validity / reassess and
  print `<UTC> / <local> <tz> (in <countdown>)`.
- Score → chip mapping: 5=GREEN, 4=GOLD, 3=GOLD (mixed/developing),
  2=AMBER, 1=RED.
- Candidate cards keyed off `bullishCandidate` / `bearishCandidate` per
  symbol; each card shows candidate entry area, target, stop, and an
  explicit "Becomes valid only after…" requirement sentence.
- Mechanism tab: structured `mechanismDetail` with cause / reaction /
  impact / outcome / what-changes-it; falls back to the legacy summary
  string in the footer.
- Scenario tab: `scenarioDetail.primary / alternative / invalidation`
  with name + probability + trigger + window; legacy 3-card percentage
  view kept above for quick read.
- Events tab: `whenISO` → live UTC + local + countdown; columns
  expanded to include Channel, Pre-event rule, Post-event rule.

## Banned-string grep (active surface)

```
grep -nE "DATA · MOCK|session mock|Math\.sin|generateMock|sampleData|demoData|mock-|mockData" index.html
→ no matches
```
