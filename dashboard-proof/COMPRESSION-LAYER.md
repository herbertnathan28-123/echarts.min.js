# Dashboard Compression Layer — Trader-Grade Stand-Down Language

## Problem (live evidence)

Dashboard read as backend disconnection, not deliberate stand-down:
- Top pills: Corey OK · Spidey OK · Jane FINAL:NO_TRADE
- Body: "Not authorised", "Not active", "Not supplied", "Not attached",
  "Not classified", "Not provided", "Blocked", RED chips, 0/5 — everywhere
- User read: "The left hand is not talking to the right hand."

## Doctrine

When sources are alive AND Jane issued final:no_trade, the dashboard MUST
NOT surface as a wall of red. It must read as ATLAS deliberately stood
down — a controlled professional decision, not a system failure.

## Compression rules

`compressionMode(ctx)` returns `'clean_no_trade'` when:
- `sources.marketData` ∈ {live, ok}
- `sources.corey` starts with ok|partial
- `sources.spidey` starts with ok|partial
- `sources.jane` matches `final:no_trade` OR `actionState` matches `WAIT/NO TRADE`

When that mode is active:

### Action pill
- Tone: AMBER (not red)
- Subtitle inserted under the state line:
  > No trade-quality setup is authorised at this time. Market data is
  > live. Corey and Spidey are active. Jane has issued final:no_trade
  > because bias is neutral and no approved entry trigger / candidate
  > level is present.

### Execution strip translation
| Was | Now |
|---|---|
| `Pending` | `Waiting` |
| `Not authorised` (target) | `Inactive — no live trade` |
| `Not authorised` (stop) | `Inactive — no entry exists` |
| `Not authorised` (extended stop) | `Inactive — no entry exists` |
| `Not active` / `—` (risk $) | `No active risk` |
| `Not active` / `—` (target $) | `Inactive` |
| Empty (risk sub) | `no entry / no invalidation` |

### Condition grid translation (when score ≤ 1)
| Dim | Chip | State | Note |
|---|---|---|---|
| Execution Authority | AMBER | WAITING | Jane has not authorised an entry. |
| Structure | AMBER | NO ACTIONABLE TRIGGER | Structure is not aligned enough for entry. |
| Liquidity Pressure | AMBER | INACTIVE | No usable liquidity pressure is driving an entry. |
| Event Risk | GOLD | QUIET | No active event window affecting this decision. |
| Session Energy | AMBER | LOW / WAITING | Session conditions do not justify entry. |
| Macro Alignment | GOLD | NEUTRAL | No directional macro edge strong enough for trade authorisation. |
| Conviction | AMBER | INSUFFICIENT | Not enough evidence for a live order. |
| Regime | GOLD | NEUTRAL / UNCLASSIFIED FOR TRADE | Regime is not driving a valid setup. |

Each card also gains an `Effect:` line explaining what the score does
to live execution.

### Colour rules (post-compression)
- **Green**: engine/data active or trade confirmed
- **Amber/Gold**: wait, caution, pending, no-trade
- **Grey**: inactive context not currently relevant
- **Red**: ONLY for true danger — failure, invalidation, price mismatch,
  hard risk breach (handled by the PRICE-GUARD code path)

## End-to-end test result

```js
{
  pillTone:    "amber",
  actionState: "HOLD — NO ACTIVE TRADE",
  subtitle:    "No trade-quality setup is authorised at this time. Market data is live.
                Corey and Spidey are active. Jane has issued final:no_trade because bias
                is neutral and no approved entry trigger / candidate level is present.",
  entry:       "Waiting",
  stop:        "Inactive — no entry exists",
  target:      "Inactive — no live trade",
  risk:        "No active risk",
  tgtD:        "Inactive",
  firstCellChip:  "AMBER",
  firstCellState: "WAITING — Jane has not authorised an entry."
}
```

Screenshot: `24-AMD-CLEAN-STAND-DOWN-compressed.png` — calm professional
stand-down, no wall of red.

## What is NOT changed
- ctx is never mutated. The compression layer is a presentation overlay.
- Real RED is preserved for `PRICE DATA MISMATCH` / `DECISION BLOCKED`
  (PRICE-GUARD path).
- Real RED is preserved for `withheld:source_incomplete` / `withheld:empty_decision_packet`
  diagnostic banners (those are real engine failures, not stand-downs).
- `?fake=1` demo mode untouched.
