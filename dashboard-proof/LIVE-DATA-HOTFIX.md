# ATLAS FX Dashboard — Live Data Hotfix Proof

Captured headless against the new index.html with the `/twelvedata` server
proxy intercepted to return realistic OHLC payloads (matching production
TwelveData response shape `{values:[{datetime,open,high,low,close,volume}], status:'ok'}`).

## 05 · MU above the fold (live)
- Header badge: `DATA · LIVE`
- 12-cell Execution Strip / 8-dim Condition Grid / Forward Expectation / Trigger Map all preserved from the prior surface — no regression on accepted UI.
- Provider mapping: `MU → MU` (TwelveData accepts US equities directly).

## 06 · MU full page (live)
- 8 candlestick panels rendered with **real OHLC**, locked colour codes
  (#00ff00 up / #ff0015 down). Wicks and bodies visible.
- Every panel sym-tagged `MU`. No sine waves anywhere.
- Source footer: `source=twelvedata/live · panels=8/8`.
- Console: `[DATA] source=twelvedata symbol=MU timeframe=<tf> status=ok candles=80 provider=MU` × 8 + `[CHART] panel=<tf> symbol=MU validation=pass source=live` × 8.

## 07 · EURUSD above the fold (live)
- Header badge: `DATA · LIVE`
- Provider mapping: `EURUSD → EUR/USD` (TwelveData FX format with slash).
- Action state preserved: `ARMED — WAITING FOR TRIGGER`.

## 08 · EURUSD full page (live)
- 8 candlestick panels stamped `EURUSD`. Real OHLC, no sine waves.
- Console: `[DATA] source=twelvedata symbol=EURUSD timeframe=<tf> status=ok candles=80 provider=EUR/USD` × 8.

## 09 · MU DATA · UNAVAILABLE (failure mode)
- Header badge: `DATA · UNAVAILABLE` (no DATA · MOCK).
- Action state, Execution Strip, Forward Expectation, Trigger Map preserved.
- Each panel below the fold shows `Live chart data unavailable for MU <TF> — chart withheld.` instead of any chart. No EURUSD fallback. No mock chart.
- Source footer: `source=unavailable · panels=0/8`.
- Console: `[DATA] source=twelvedata symbol=MU timeframe=<tf> status=fail reason=...` × 8.

## Banned-string grep on active surface
```
grep -nE "DATA · MOCK|session mock|Math\.sin|generateMock|sampleData|demoData|mock-" index.html
→ no matches
```

## Provider mapping table
| Display | Asset class | Provider symbol | Notes |
|---|---|---|---|
| MU      | equity    | MU       | TwelveData direct |
| EURUSD  | fx        | EUR/USD  | slash-form FX |
| GBPUSD  | fx        | GBP/USD  | slash-form FX |
| XAUUSD  | commodity | XAU/USD  | overridden |
| XAGUSD  | commodity | XAG/USD  | overridden |
| NAS100  | index     | NDX      | overridden |
| US500   | index     | SPX      | overridden |
| US30    | index     | DJI      | overridden |
| (other 6-letter FX) | fx | <base>/<quote> | auto-slashed |
| (other 1-5 letter)  | equity | <as-is> | direct |

## TF mapping (frontend → /twelvedata interval)
1W → 1week · 1D → 1day · 4H → 4h · 1H → 1h · 30M → 30min · 15M → 15min · 5M → 5min · 1M → 1min
