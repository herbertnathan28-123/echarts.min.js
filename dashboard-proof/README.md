# ATLAS FX Dashboard v3.0 — Proof Screenshots

Captured headless via Chromium 141 against `index.html` on
`claude/resume-n8n-work-LdFVz`.

## 01 — MU above the fold (`?symbol=MU&user=AT`)
Asset class: equity. Action state: `WAIT — NO TRADE` (red). Above-the-fold contains:
- Final Action State pill with verdict strip (Direction · Validity · Next Reassessment)
- 12-cell Execution Strip ($-first risk/target/cost; pending Stop/Target with no fake R:R)
- 8-dim Condition Grid using same-colour 1–5 gold dot scale
- Forward Expectation block (Behaviour · Timing · Movement · Absorption · Waiting For)
- Trigger Map (Bullish / Bearish / No-Trade / Timeframe note)

## 02 — MU full page
Same view scrolled, showing secondary tab nav (Charts / Historical / Mechanism /
Scenario / Events / Matrix / Final Read / Glossary), the Charts grid (8 panes
each stamped `MU`), and the source footer.

## 03 — EURUSD above the fold (`?symbol=EURUSD&user=AT`)
Asset class: fx. Action state: `ARMED — WAITING FOR TRIGGER` (gold). Different
colour family, different language (pips/lots permitted), different mock data.

## 04 — Symbol-integrity guard block (no `?symbol=`)
The dashboard hard-blocks with `SYMBOL INTEGRITY GUARD — BLOCK` and never
falls back to EURUSD. Console log: `[SYMBOL-GUARD] fail requestedSymbol=null
action=blocked`.

## Banned strings on active surface — grep proof
```
grep -E "Signal Strength|LIGHT PARTICIPATION|Trade permit is available|distance context|broken (level|support|resistance)|matches the macro direction|fresh structural break" index.html
→ no matches
```

## Symbol integrity logs (page console captured during render)
```
[DASHBOARD] requestedSymbol=MU
[DASHBOARD] resolvedSymbol=MU
[DASHBOARD] providerSymbol=MU user=AT
[CHART] panel=1W symbol=MU validation=pass
[CHART] panel=1D symbol=MU validation=pass
[CHART] panel=4H symbol=MU validation=pass
[CHART] panel=1H symbol=MU validation=pass
[CHART] panel=30M symbol=MU validation=pass
[CHART] panel=15M symbol=MU validation=pass
[CHART] panel=5M symbol=MU validation=pass
[CHART] panel=1M symbol=MU validation=pass
```
