# PRICE-GUARD + Fine-Grained Jane States — Proof

## Scenario A — PRICE DATA MISMATCH (live $542.21-on-MU bug)

```
[PRICE-GUARD] fail symbol=MU header=542.21 latestClose=91.69 tolerance=5% diff=491.35%
[PRICE] symbol=MU source=mismatch timeframe=1M rawClose=91.69 packetPrice=542.21 headerPrice=PRICE DATA MISMATCH status=mismatch
```
- Header price → `PRICE DATA MISMATCH` (red)
- Header chg → `BLOCKED`
- Action state → `PRICE DATA MISMATCH — DECISION BLOCKED`
- Big red banner above action pill explaining packet vs OHLC values
- Decision surface withheld

Screenshot: `21-MU-PRICE-MISMATCH-blocked.png`

## Scenario B — EMPTY DECISION PACKET (corey/spidey ok, jane empty)

```
[DASHBOARD] jane=withheld:empty_decision_packet
```
- Jane pill: `withheld:empty_decision_packet` (amber)
- Banner: `JANE WITHHELD — CORE/SPIDEY STATUS PRESENT BUT DECISION PACKET EMPTY`
- Explicit list of missing fields: `actionState`, `triggerMap`, `conditionGrid`, `forwardExpectation`, `candidates`
- Why-this-matters explainer + bot command to re-populate

Screenshot: `22-AMD-EMPTY-DECISION-PACKET.png`

## Scenario C — Clean `final:no_trade` packet

```
[DASHBOARD] jane=final:no_trade
```
- Jane pill: `final:no_trade` (green)
- Action state: `WAIT — NO TRADE` from packet
- Full surface populated from packet

Screenshot: `23-NVDA-FINAL-NO-TRADE-clean.png`

## Spec-required fine-grained Jane states

All implemented and tone-mapped:
- `unavailable:no_packet`        → red
- `withheld:source_incomplete`   → amber
- `withheld:empty_decision_packet` → amber
- `final:no_trade`               → green
- `final:armed`                  → green
- `final:entry_authorised`       → green
- `final:trade_confirmed`        → green
