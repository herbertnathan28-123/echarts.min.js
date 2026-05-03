# ATLAS FX Dashboard — Jane-Integration + Independent-Zoom Proof

This pass replaces the frontend STAGED_PLAN demo dictionary with a real
Jane-packet integration. The execution-decision surface (action state,
entry, target, stop, candidate levels, condition grid, forward expectation,
trigger map, historical/mechanism/scenario/events) is now sourced
exclusively from Jane packets POSTed by the Discord bot. When no Jane
packet exists for a symbol, the surface is WITHHELD with an explicit
banner — no fabricated values.

## Source-status row

Every load shows six pills with real engine status:

  marketData=<live|unavailable|pending>
  corey=<ok|partial|degraded|unavailable: ...>
  coreyClone=<unavailable: not implemented>      (no Corey Clone exists yet)
  spidey=<ok|partial|unavailable: ...>
  jane=<final|unavailable: ...>
  historical=<partial: 15Y-cache|no-match|unavailable: ...>

15-A    `dashboard-proof/15-MU-JANE-AVAILABLE-full.png` — Jane packet present:
        all six pills tonal-coded, full execution surface populated.

17-W    `dashboard-proof/17-MU-JANE-WITHHELD-full.png` — Jane absent:
        all six pills RED, big "JANE DECISION UNAVAILABLE" banner,
        action pill / execution strip / candidate / condition grid /
        forward expectation / trigger map all hidden, secondary tabs
        for Historical / Mechanism / Scenario / Events / Final Read all
        hidden via nav. Only Charts + Matrix + Glossary remain visible.
        Charts still render real candlesticks (marketData layer is
        independent of Jane decision layer).

## Independent per-pane zoom (PRODUCTION FAIL GATE — PASS)

Acceptance test (run headless via Puppeteer wheel-event dispatch on each
target pane separately):

  zoom-test 15M → PASS  (15M went 100%→45%, all 7 others unchanged)
  zoom-test 1H  → PASS  (1H went 100%→45%, all 7 others unchanged)
  zoom-test 5M  → PASS  (5M went 100%→45%, all 7 others unchanged)

Implementation:
- Each chart pane has its own `_zoomState = { start, end }` closure.
- Each pane has its own wheel handler with `e.stopPropagation()` and
  `e.preventDefault()` so wheeling on one pane never bubbles to siblings.
- Each pane has its own RESET chip that affects only that pane.
- Each pane has its own click-and-drag pan handler scoped to that pane.
- No `echarts.connect`, no `chart.group`, no shared `dataZoom` group, no
  global wheel dispatcher. Implementation is plain SVG + per-pane closures.

## What is NOT faked

- Action State           — sourced from `packet.actionState`
- Bias Direction         — `packet.biasDirection`
- Trade Permission       — `packet.tradePermission`
- Entry / Stop / Target  — `packet.entry / stopLoss / extendedStopLoss / target`
- Candidate Levels       — `packet.bullishCandidate / bearishCandidate`
- Condition Grid         — `packet.grid + gridNotes + gridEffects`
- Forward Expectation    — `packet.forward`
- Trigger Map            — `packet.triggers`
- Historical Analogues   — `packet.historical`
- Mechanism              — `packet.mechanismDetail`
- Scenario               — `packet.scenarioDetail`
- Events                 — `packet.events`

If any of these is missing from the packet, the corresponding section
either shows the explicit string from the packet (`Withheld`,
`Not authorised`, `Pending`) or is not rendered at all.

## Where the packet comes from

`atlas_discord_pathway/index.js → deliverResult()` calls
`postJanePacketToDashboard(symbol, corey, spideyHTF, spideyLTF, jane)`
after the macro pipeline runs. That function builds the packet from the
real engine outputs, stamps real source statuses, and POSTs it to
`${ATLAS_DASHBOARD_BASE}/load`. The dashboard service stores it in
`SESSION_STORE` keyed by `session_id`.

The dashboard frontend fetches `GET /jane?symbol=<sym>` (a new endpoint
on the dashboard server) which scans the store for the latest entry
matching that symbol and returns the packet, or 404 if none exist.
