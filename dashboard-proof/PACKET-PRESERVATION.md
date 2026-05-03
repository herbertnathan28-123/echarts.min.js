# /load Jane-Packet Preservation — Hotfix Proof

## Root cause

`echarts.min.js/index.js` lines 81-115 **was** cherry-picking only legacy
fields:
  user, mode, bias, conviction, probability, regime,
  signal_strength, viability, execution, events, verdict
…silently DROPPING every Jane v3 field the bot POSTed:
  sources, actionState, biasDirection, tradePermission,
  bullishCandidate, bearishCandidate, grid, gridNotes, gridEffects,
  forward, triggers, historical, mechanism, mechanismDetail,
  scenario, scenarioDetail, events (rich), matrix,
  sourceMissing, withholdNotes.

That is why dashboard pills showed `corey/spidey/historical = unavailable`
even though the bot was sending `corey=ok spidey=ok historical=partial:15Y-cache`.

## Fix

```js
const stored = Object.assign({}, ctx, {
  session_id, symbol: sym,
  user: ctx.user || u.query.user || 'AT',
  mode: ctx.mode || u.query.mode || '',
  timestamp: new Date().toISOString(),
  _stored: Date.now()
});
```
Spread keeps every field the bot POSTs. Backward compatibility preserved
(legacy field names still flow through verbatim if the bot ever sends them).

## End-to-end test (in-process server + browser)

```
[LOAD] packet stored symbol=MU keys=29 janeFields=21 sources=present
GET /jane?symbol=MU → 200 packet keys: 33 (includes: sources, actionState,
                       biasDirection, bullishCandidate, grid, forward, triggers)

[DASHBOARD] jane packet received symbol=MU actionState=WAIT — NO TRADE
            grid=8 triggers=present
[DASHBOARD] sources: marketData=pending corey=ok coreyClone=unavailable:
            not implemented spidey=ok jane=final historical=partial: 15Y-cache

ATF state with packet:
  price            $92.40
  chg              -1.85%
  marketDataPill   live           ← was "pending" before fix
  coreyPill        ok             ← was "unavailable" before fix
  spideyPill       ok             ← was "unavailable" before fix
  janePill         final
  historicalPill   partial: 15Y-cache  ← was "unavailable" before fix
  actionState      WAIT — NO TRADE

ATF state withheld (AAPL no packet):
  marketDataPill   live           ← charts still load (independent of Jane)
  janePill         unavailable: no_jane_packet_for_symbol
```

## Other fixes shipped in this same pass

- **marketData pill** now flips from `pending` → `live` (or `unavailable`)
  the moment `loadAllPanels()` resolves. Was previously stuck on the
  packet's initial `pending` value.
- **Header price fallback**: when `ctx.lastPrice` is null, the dashboard
  reads the most recent close from the finest-available `/twelvedata`
  panel (1M → 5M → 15M → 30M → 1H → 4H → 1D → 1W). Change % is computed
  from the 1D series; if unavailable, header shows `chg n/a` instead of
  `+0.00%`.
- **Withhold notes**: when the bot sets `sourceMissing.missingSpidey`,
  the packet now carries `withholdNotes.forwardExpectation` and
  `withholdNotes.triggerMap` — the dashboard renders those as explicit
  `FORWARD EXPECTATION WITHHELD` / `TRIGGER MAP WITHHELD` banners instead
  of empty rows.
- **Bot Jane semantics**: `jane.status` is now `final` only when the
  underlying source chain (corey ok + spidey not unavailable) is intact.
  Otherwise the packet is stamped `final-no-trade` (Jane has data but
  source chain is incomplete) or `unavailable: empty packet`. Honest
  semantics, not blanket `final`.
- **Bot logs**: `[JANE-BUILD] symbol=MU corey=<status> spidey=<status>
  historical=<status> jane=<status>` and
  `[JANE-BUILD] forwardExpectation fields=<n> triggerMap bullish=<state>
  bearish=<state>` now print before each `[JANE-POST]` to make the
  source chain visible in Render logs.

## Files in this proof package
- `19-MU-PACKET-PRESERVED-full.png`  — dashboard with packet round-tripped through real /load → /jane
- `20-MU-WITHHELD-AFTER-FIX-full.png` — withhold view (AAPL has no packet) — marketData still live
