/* ATLAS DOCTRINE v1 — Glossary 8-section modal content.
   Each term has: definition, meansInMarkets, whyMatters, howIdentify,
   realExample, commonMistakes, atlasInterpretation, checklist.
   Keys are the display code uppercased with non-alphanumeric stripped
   (matches the key built by jane-engine.js renderTerms). */
window.TERM_MODALS = {
  DOLLARSTRENGTHINDEXDXYPROXY: {
    plain: 'US Dollar Strength Index',
    definition: 'A weighted index tracking the US Dollar against a basket of six major currencies (EUR, JPY, GBP, CAD, SEK, CHF). The ATLAS dashboard uses UUP ETF as a tradable proxy.',
    meansInMarkets: 'When DXY rises, the dollar is strengthening broadly — FX pairs with USD as the quote will fall, pairs with USD as the base will rise.',
    whyMatters: 'The dollar is on one side of every major FX pair. DXY direction sets the first-order bias for every USD-linked trade.',
    howIdentify: 'Look at the DXY macro panel on the dashboard. A series of higher highs + higher lows over recent hours = bullish USD; the opposite = bearish USD.',
    realExample: 'DXY rallies from 103.50 to 104.20 while EURUSD falls from 1.0850 to 1.0760. The dollar is winning; fading EURUSD longs is the cleaner trade.',
    commonMistakes: 'Reading DXY in isolation without checking US10Y and equity flows. Trading USD-quoted crosses without checking dollar-side alignment first.',
    atlasInterpretation: 'DXY direction is the first driver in the ATLAS 4-driver alignment check. Execution viability degrades when DXY disagrees with the trade direction.',
    checklist: '<ul><li>Is DXY trending or ranging?</li><li>Does DXY agree with the trade direction?</li><li>Is DXY move confirmed by US10Y and equities?</li></ul>'
  },
  US10Y: {
    plain: 'US 10-Year Interest Rate',
    definition: 'The yield paid on a 10-year US Treasury bond. Expressed as a percentage; ATLAS uses the IEF ETF as a tradable inverse proxy (higher yields = lower IEF price).',
    meansInMarkets: 'Rising yields make holding USD more rewarding, supporting the dollar. Falling yields reduce the carry advantage, weakening the dollar.',
    whyMatters: 'Yields and FX are tightly coupled. The 10Y is the benchmark rate that defines how expensive or cheap US capital is relative to the rest of the world.',
    howIdentify: 'Check the US10Y macro panel. Rising IEF price = falling yields = dovish; falling IEF price = rising yields = hawkish for USD.',
    realExample: 'US10Y yield rises from 4.20% to 4.35% after a hot CPI print. DXY rallies 0.6% as capital flows into higher-yielding USD assets.',
    commonMistakes: 'Trading the FX reaction without checking whether yields confirmed the move. Assuming every USD move has a yield cause.',
    atlasInterpretation: 'US10Y is the second driver in the 4-driver alignment check. Divergence between US10Y and DXY is an early warning that the current move may not sustain.',
    checklist: '<ul><li>Is the yield direction aligned with DXY?</li><li>Is there a known catalyst driving yields?</li><li>Does the yield move carry across the curve?</li></ul>'
  },
  EQUITIES: {
    plain: 'Market Risk Appetite',
    definition: 'The S&P 500 — the benchmark index of US large-cap stocks. Proxy ticker on ATLAS is SPY. Used as a direct read on risk sentiment.',
    meansInMarkets: 'Rising equities = risk-on: investors buying growth, typically selling USD and safe havens. Falling equities = risk-off: capital flowing to USD, JPY, gold.',
    whyMatters: 'Risk appetite drives capital rotation. When equities sell off sharply, USD typically catches a safe-haven bid even against a dovish rates backdrop.',
    howIdentify: 'Check the equities macro panel. Sustained up days with broad breadth = risk-on. Sharp down days with rising VIX = risk-off.',
    realExample: 'S&P 500 drops 2.1% intraday on a geopolitical headline. DXY rallies 0.4% on safe-haven bid, USDJPY falls as JPY also catches bid.',
    commonMistakes: 'Assuming equities always drive the dollar — they only drive it strongly during risk-off events or extreme breadth swings.',
    atlasInterpretation: 'Equities are the third driver. In a fully aligned risk-on regime (equities up, DXY down, yields steady), short-USD trades have their highest viability.',
    checklist: '<ul><li>Is the equity move broad-based or thin?</li><li>Is there a risk catalyst?</li><li>Is VIX confirming the move?</li></ul>'
  },
  USDJPY: {
    plain: 'Global Money Flow',
    definition: 'The exchange rate of US Dollar vs Japanese Yen. Reacts fastest to global capital flow shifts because JPY is the primary funding currency for global carry trades.',
    meansInMarkets: 'Rising USDJPY = capital flowing toward USD and away from JPY (risk-on, hawkish Fed). Falling USDJPY = safe-haven JPY bid (risk-off).',
    whyMatters: 'USDJPY is the cleanest real-time read on whether capital is rotating into or out of the dollar. Often leads DXY by minutes.',
    howIdentify: 'Monitor USDJPY on the dashboard. A sharp move in USDJPY that leads DXY by 10-30 minutes is a classic flow indicator.',
    realExample: 'USDJPY breaks 150 on a hawkish FOMC. DXY follows 15 minutes later, EURUSD breaks its intraday low on the second DXY leg.',
    commonMistakes: 'Trading USDJPY for the rate differential alone, ignoring the risk-tone component. Forgetting JPY is a safe haven during stress.',
    atlasInterpretation: 'USDJPY is the fourth driver. A USDJPY move confirmed by DXY and US10Y is the highest-quality alignment signal in the system.',
    checklist: '<ul><li>Is USDJPY leading or lagging DXY?</li><li>Is the move rate-driven or risk-driven?</li><li>Does yen strength align with global risk-off?</li></ul>'
  },
  CPI: {
    plain: 'Consumer Price Index (Inflation)',
    definition: 'Monthly measure of inflation — the change in prices paid by US consumers. Headline and core readings are released together; core (ex-food/energy) carries more weight.',
    meansInMarkets: 'Above forecast = hotter inflation = hawkish = USD bullish (~68% of the time). Below forecast = cooler inflation = dovish = USD bearish (~74% of the time).',
    whyMatters: 'CPI directly shapes Fed policy expectations. A single surprise print can reprice the entire rate curve within minutes.',
    howIdentify: 'Check the Events section for scheduled CPI releases. Typical release time: 13:30 UTC. Expansion range: 60–90 pips on EURUSD.',
    realExample: 'US CPI prints 3.4% vs 3.2% forecast. EURUSD drops 85 pips in 4 minutes. DXY rallies 0.6%. Trade viability flips to INVALID during release window.',
    commonMistakes: 'Holding positions through CPI release without reducing size. Entering during the first 5 minutes (peak whipsaw).',
    atlasInterpretation: 'CPI is a high-shock event. Viability engine flags any trade within 2 hours as INVALID. Execution degradation is HIGH for ±15 minutes.',
    checklist: '<ul><li>When is the next CPI release?</li><li>Have I reduced exposure before release?</li><li>Am I waiting for the post-release settle?</li></ul>'
  },
  NFP: {
    plain: 'Non-Farm Payrolls (US Jobs)',
    definition: 'Monthly US employment report — net jobs added outside agriculture. Released first Friday of each month at 13:30 UTC. Watched for three numbers: headline, unemployment rate, average hourly earnings.',
    meansInMarkets: 'Above forecast = strong labour market = hawkish Fed path = USD bullish (~72% of the time). Below forecast = weak labour = dovish = USD bearish (~68%).',
    whyMatters: 'NFP is the highest-impact monthly event in FX. The initial reaction often reverses within 30 minutes as the wage component is digested.',
    howIdentify: 'Events panel flags NFP 48 hours ahead. First Friday of the month, 13:30 UTC. Expansion range 80–120 pips on EURUSD.',
    realExample: 'NFP prints +254k vs +150k forecast. EURUSD drops 110 pips in 2 minutes, then retraces 40 pips as the average-hourly-earnings miss is digested.',
    commonMistakes: 'Trusting the initial 60-second reaction. Ignoring the revision to the prior month. Trading the print without a preset invalidation level.',
    atlasInterpretation: 'NFP carries the highest expansion range of any scheduled event. Viability engine forces INVALID within 2 hours of release.',
    checklist: '<ul><li>Is NFP within the next 24 hours?</li><li>Have I closed or hedged positions?</li><li>Am I tracking the wage component separately?</li></ul>'
  },
  FOMC: {
    plain: 'Federal Reserve Rate Decision',
    definition: 'The Federal Open Market Committee meeting where the Fed sets the target policy rate. Eight scheduled meetings per year plus emergency meetings. Decision at 19:00 UTC, press conference 19:30 UTC.',
    meansInMarkets: 'Hawkish (rate hike, hawkish guidance) = USD bullish (~75% of the time). Dovish (rate cut, dovish guidance) = USD bearish (~70%).',
    whyMatters: 'FOMC resets the entire US rate curve and repriced USD against every currency simultaneously. The statement wording matters as much as the decision.',
    howIdentify: 'Events panel flags FOMC a week ahead. Expansion range 50–150 pips on EURUSD. Press conference commonly moves market more than the decision itself.',
    realExample: 'FOMC holds rates but signals two cuts ahead (more dovish than expected). EURUSD rallies 120 pips in 25 minutes. DXY drops 0.9%.',
    commonMistakes: 'Trading the initial decision before the statement and press conference. Ignoring the dot plot revisions.',
    atlasInterpretation: 'FOMC is the highest-shock policy event. Viability engine flags INVALID for 3 hours (decision + presser + settle).',
    checklist: '<ul><li>Is FOMC today or this week?</li><li>Have I closed positions before the decision?</li><li>Am I waiting until after the press conference to re-engage?</li></ul>'
  },
  GDP: {
    plain: 'Gross Domestic Product (Growth)',
    definition: 'Quarterly measure of total economic output. Released in three estimates (advance, second, third). Advance print has the largest market impact.',
    meansInMarkets: 'Above forecast = stronger growth = supports the local currency (~61% of the time). Below forecast = weaker growth = bearish (~65%).',
    whyMatters: 'GDP informs central bank growth outlook. A surprise miss raises cut expectations; a surprise beat raises hike expectations.',
    howIdentify: 'Events panel flags GDP releases. Advance print typically has 30–60 pip expansion range. Quarterly, not monthly.',
    realExample: 'US GDP prints 3.1% vs 2.4% forecast. EURUSD drops 55 pips. DXY rallies 0.3%. Yields rise across the curve.',
    commonMistakes: 'Treating all three GDP prints as equal. Ignoring the implicit deflator (inflation inside GDP).',
    atlasInterpretation: 'GDP is a medium-shock event. Viability engine flags MARGINAL within 2 hours of release; monitor execution.',
    checklist: '<ul><li>Is this the advance, second, or third print?</li><li>Does GDP align with the current policy narrative?</li><li>How does the deflator component compare?</li></ul>'
  },
  PMI: {
    plain: 'Purchasing Managers Index',
    definition: 'Monthly survey-based indicator of business activity. Two main variants: Manufacturing and Services. Scale: above 50 = expansion, below 50 = contraction.',
    meansInMarkets: 'Above 50 = growth = supports local currency (~58%). Below 50 = contraction = bearish (~62%). The new-orders sub-component leads.',
    whyMatters: 'PMI is the earliest monthly read on the real economy — released before GDP and hard data. Moves markets more when it crosses 50.',
    howIdentify: 'Events panel flags PMI releases. Expansion range 20–40 pips. Released early in the month.',
    realExample: 'US Services PMI crosses from 49.8 to 51.3. EURUSD drops 35 pips on the growth re-rating. DXY adds 0.2%.',
    commonMistakes: 'Ignoring the sub-components. Treating headline PMI as the only number that matters.',
    atlasInterpretation: 'PMI is a medium-shock event. Viability engine flags MARGINAL within 2 hours but usually clears within 30 minutes.',
    checklist: '<ul><li>Is PMI above or below 50?</li><li>Is the cross-over confirmed by new orders?</li><li>Does PMI align with GDP direction?</li></ul>'
  },
  CBSPEAKERS: {
    plain: 'Central Bank Officials Speaking',
    definition: 'Scheduled or unscheduled public remarks by Federal Reserve, ECB, BoE, BoJ, or other central bank officials. Tone — hawkish or dovish — often previews policy direction before meetings.',
    meansInMarkets: 'Hawkish remarks = bullish home currency. Dovish remarks = bearish. Impact scales with the speaker\'s seniority and how much the remarks deviate from consensus.',
    whyMatters: 'CB speakers signal policy pivots earlier than the formal meeting. Chair/President remarks move markets; rank-and-file officials less so.',
    howIdentify: 'Events panel flags scheduled CB speeches. Unscheduled remarks hit headlines mid-session. Expansion range 15–40 pips.',
    realExample: 'Fed Chair signals caution on further hikes in a Jackson Hole speech. EURUSD rallies 60 pips over 90 minutes as the dovish re-pricing spreads.',
    commonMistakes: 'Overreacting to rank-and-file speakers. Missing the tone shift in a scheduled speech that reads as neutral on the surface.',
    atlasInterpretation: 'CB speakers are medium-shock. Viability engine flags MARGINAL within 2 hours of Chair/President remarks; lower weight for others.',
    checklist: '<ul><li>Who is speaking?</li><li>Is this a scheduled policy speech?</li><li>Does the tone deviate from the last meeting?</li></ul>'
  },
  BIAS: {
    plain: 'Overall Direction',
    definition: 'The net directional lean of the US Dollar derived from the four ATLAS macro drivers (DXY, US10Y, Equities, USDJPY). Expressed as USD LONG, USD SHORT, or USD FLAT.',
    meansInMarkets: 'Bias is the starting point of every trade decision. A USD LONG bias argues for buying USD-base pairs and selling USD-quote pairs.',
    whyMatters: 'Trades aligned with bias have significantly higher viability than counter-bias setups. The viability engine penalises counter-bias trades.',
    howIdentify: 'Status section displays current bias. Bias strength is shown as a dot fill (0–5). Full green fill = highest conviction in the direction.',
    realExample: 'Three of four drivers point USD-bullish (DXY up, US10Y up, USDJPY up; equities flat). Status shows USD LONG bias with 4/5 strength.',
    commonMistakes: 'Trading against a clearly defined bias without a specific invalidation. Ignoring bias strength and treating all directional reads as equal.',
    atlasInterpretation: 'Bias sets the directional filter. Viability VALID is only available for trades aligned with the dominant bias AND supported by ≥6/10 strength.',
    checklist: '<ul><li>What is the current bias?</li><li>How many drivers support it?</li><li>Is my trade aligned with bias?</li></ul>'
  },
  CONVICTION: {
    plain: 'How Much the Drivers Agree',
    definition: 'The degree of alignment across the four ATLAS macro drivers. High conviction = all four drivers point the same way. Low conviction = drivers disagree.',
    meansInMarkets: 'High conviction trades have the highest success rate. Low conviction setups are range-bound or transitional — size down or stand aside.',
    whyMatters: 'Conviction is the second filter after bias. A strong bias without conviction is unreliable; driver disagreement is an early warning of regime change.',
    howIdentify: 'Status section shows conviction dots (0–5). Check the probability model row — driver alignment count (X of 4) is the direct measure.',
    realExample: 'All four drivers USD-bullish: conviction 5/5. EURUSD short has viability VALID. Continuation probability 75%.',
    commonMistakes: 'Trading a strong-bias/low-conviction setup at full size. Assuming conviction is stable within the session — it shifts hour by hour.',
    atlasInterpretation: 'Conviction ≥ 6/10 is required for viability VALID. Below 4/10 forces MARGINAL or INVALID regardless of other factors.',
    checklist: '<ul><li>How many drivers agree?</li><li>Is conviction rising or falling?</li><li>Does conviction support full size?</li></ul>'
  },
  FLOW: {
    plain: 'Direction of Money Movement',
    definition: 'The real-time direction of capital into or out of the US Dollar, read primarily from DXY + USDJPY agreement. Independent of bias; captures current momentum.',
    meansInMarkets: 'Strong inflow = dollar being accumulated across products. Strong outflow = dollar being distributed. Flow can contradict bias at session turns.',
    whyMatters: 'Flow is the leading indicator for bias changes. A persistent counter-flow during a stable bias is the earliest signal the bias is about to flip.',
    howIdentify: 'Status section flow category. Watch DXY and USDJPY in lock-step for strong flow; divergence = weak or conflicted flow.',
    realExample: 'Bias remains USD LONG but USDJPY starts falling while DXY stalls. Flow downgrades from strong-in to weak. First sign of a bias rotation within 2–4 hours.',
    commonMistakes: 'Confusing flow with bias. Expecting flow to stay stable across the session when it often rotates 2–3 times per day.',
    atlasInterpretation: 'Flow is used as a conviction multiplier. Trade viability is boosted when flow confirms bias; downgraded when flow contradicts it.',
    checklist: '<ul><li>Is flow aligned with bias?</li><li>Is DXY and USDJPY moving together?</li><li>Has flow rotated in the last 2 hours?</li></ul>'
  },
  REGIME: {
    plain: 'Market Mood',
    definition: 'The prevailing market environment — risk-on (investors buying growth) vs risk-off (investors seeking safety). Derived from equities, VIX, and cross-asset correlations.',
    meansInMarkets: 'Risk-on regime favours short-USD trades, long equity-linked FX (AUD, NZD), sells safe havens (JPY, CHF). Risk-off inverts this.',
    whyMatters: 'Regime changes override technical setups. A chart pattern that works in risk-on may fail in risk-off even with identical price levels.',
    howIdentify: 'Status section regime category. Sustained equity up-days with low VIX = risk-on. Equity down-days with rising VIX = risk-off.',
    realExample: 'S&P 500 -2% day with VIX spike from 14 to 22. Regime flips to risk-off. Any long-AUDUSD trade viability drops to MARGINAL regardless of setup quality.',
    commonMistakes: 'Ignoring regime when back-testing. Assuming a prior winning setup still works across a regime shift.',
    atlasInterpretation: 'Regime is a gating filter on the bias/conviction output. Mis-aligned regime can flip viability from VALID to MARGINAL in a single session.',
    checklist: '<ul><li>What is the current regime?</li><li>Is the regime consistent across the session?</li><li>Does my trade belong in this regime?</li></ul>'
  },
  VALIDITY: {
    plain: 'How Long the Analysis Stays Current',
    definition: 'Estimated duration the current macro read remains valid before a data release, regime shift, or breakout invalidates it. Expressed in hours.',
    meansInMarkets: 'Validity defines the window inside which entry/exit/stop levels remain executable. After expiry, the full analysis must be refreshed.',
    whyMatters: 'A stale read is worse than no read. Validity prevents traders from operating on out-of-date levels while conditions have moved on.',
    howIdentify: 'Status section validity strength (0–5). Timestamp shown. Any high-impact event within the window reduces remaining validity.',
    realExample: 'Analysis generated at 12:00 UTC with 4-hour validity. CPI release at 13:30 UTC resets validity to the next scheduled refresh.',
    commonMistakes: 'Trading off levels computed 8+ hours ago. Ignoring validity decay from scheduled events.',
    atlasInterpretation: 'Validity feeds into the viability engine as a recency check. Stale levels force viability toward MARGINAL; expired levels force INVALID.',
    checklist: '<ul><li>When was this analysis generated?</li><li>How much validity remains?</li><li>Is a high-impact event inside the window?</li></ul>'
  },
  ENTRY: {
    plain: 'Where the Trade Starts',
    definition: 'The precision price level at which the trade is designed to begin. Always a single price ± a tick-normalized buffer. No zones, no ranges, no extended entries.',
    meansInMarkets: 'The central entry price is the target; the buffer defines the tolerance window for order-fill slippage. Orders are placed at the central price, filled inside the buffer.',
    whyMatters: 'Precision entries are the difference between a disciplined trade and a speculative one. Vague zones produce inconsistent results.',
    howIdentify: 'Execution section: Entry displayed as central_price ± buffer with (lower – upper) bounds below. Dollar value and pip reference shown underneath.',
    realExample: 'EURUSD Entry: 1.08450 ± 0.00001 (1.08449 – 1.08451). Limit order placed at 1.08450; filled anywhere in the bound window.',
    commonMistakes: 'Chasing price beyond the buffer. Widening the entry into a zone. Holding bias-triggered entry orders after validity expires.',
    atlasInterpretation: 'Entry is always single-price with tick-normalized buffer. Zone-based entries are removed from the doctrine.',
    checklist: '<ul><li>Is my entry a single price?</li><li>Is the buffer tick-normalized?</li><li>Has price already moved past the buffer?</li></ul>'
  },
  STOPLOSS: {
    plain: 'Where the Trade is Wrong',
    definition: 'The precision price level that proves the trade idea is no longer valid. Closing the trade here protects the account. Single price ± tick buffer.',
    meansInMarkets: 'The stop defines the maximum loss for the trade. Position size is derived from the stop distance and account risk tolerance.',
    whyMatters: 'A well-placed stop outside recent noise but inside the structural invalidation level is the single biggest determinant of long-term profitability.',
    howIdentify: 'Execution section: Stop displayed as central_price ± buffer with (lower – upper) bounds. Dollar risk shown underneath.',
    realExample: 'EURUSD Stop: 1.08280 ± 0.00001 (1.08279 – 1.08281). A close below 1.08281 invalidates the setup; market order closes the position.',
    commonMistakes: 'Placing stops inside normal noise — frequent stop-outs. Moving stops further away to avoid being stopped — larger losses when wrong.',
    atlasInterpretation: 'Stop distance is derived from ATR and structure. Risk in dollars is the primary sizing input; pips are reference only.',
    checklist: '<ul><li>Is my stop outside normal noise?</li><li>Does the stop respect structural invalidation?</li><li>Is the dollar risk acceptable?</li></ul>'
  },
  EXIT: {
    plain: 'Where the Trade Ends',
    definition: 'The precision price level at which the trade is designed to take profit. Single price ± tick buffer. Target distance is ATR-scaled against the expected move.',
    meansInMarkets: 'Exit defines the trade objective. Price reaching the exit is the primary success condition; the trade is closed in full at this level.',
    whyMatters: 'Pre-defined exits remove emotion and prevent giving back gains. They also anchor the reward-to-risk ratio that drives viability.',
    howIdentify: 'Execution section: Exit displayed as central_price ± buffer with (lower – upper) bounds. Dollar target shown underneath.',
    realExample: 'EURUSD Exit: 1.08790 ± 0.00001 (1.08789 – 1.08791). Limit order closes the position on touch. Reward-to-risk 2.2 against the stop.',
    commonMistakes: 'Moving the exit further away when price approaches — eroding R:R. Closing before the exit on discretion — inconsistent P&L.',
    atlasInterpretation: 'Exit is single-price. Expected move is computed as abs(exit − entry). R:R = expected / risk feeds directly into viability.',
    checklist: '<ul><li>Is my exit a single price?</li><li>Does the R:R support viability VALID?</li><li>Is the exit inside a structure level?</li></ul>'
  },
  ATR: {
    plain: 'Average True Range — Typical Move Size',
    definition: 'The average size of price movement over a recent window (typically 14 bars). Measures how much an instrument typically moves in the active timeframe.',
    meansInMarkets: 'ATR scales the distance from entry to stop and exit. Larger ATR = wider noise tolerance required = wider stops = larger dollar risk per pip.',
    whyMatters: 'Without ATR scaling, stops and targets are arbitrary. Two instruments with the same nominal pip distance behave completely differently if ATR differs.',
    howIdentify: 'Execution section header shows current ATR on the active timeframe. Cross-check against daily ATR for context.',
    realExample: 'EURUSD 1H ATR is 0.00065 (6.5 pips). A stop 0.85×ATR away from entry = 5.5 pips. On a standard lot, risk ≈ $55.',
    commonMistakes: 'Using fixed pip stops across instruments. Ignoring ATR expansion during events — stops placed inside normal noise during a surprise release.',
    atlasInterpretation: 'All ATLAS precision levels are ATR-scaled. Entry = last − 0.20×ATR; Stop = last − 0.85×ATR; Exit = last + 2.0×ATR.',
    checklist: '<ul><li>What is the current ATR?</li><li>Are stops outside 0.5×ATR noise?</li><li>Is ATR expanding due to an upcoming event?</li></ul>'
  },
  RISKON: {
    plain: 'Investors Buying Growth',
    definition: 'A market mood where investors are bidding growth assets (equities, commodities, growth currencies) and offering safe havens (USD, JPY, gold, bonds).',
    meansInMarkets: 'Risk-on favours long AUDUSD, NZDUSD, long equity indices, short USDJPY, short XAUUSD. The FX pairs with commodity exposure rally hardest.',
    whyMatters: 'Risk-on sets the direction of cross-asset rotation. Trades that agree with risk-on tone carry higher viability than counter-regime trades.',
    howIdentify: 'Rising equities, falling VIX, falling USD, falling JPY, rising AUD/NZD. Confirmed when all four markers align.',
    realExample: 'S&P 500 +1.2%, VIX −8%, DXY −0.4%, AUDUSD +0.6%. Regime clearly risk-on. Any long-AUD trade viability upgrades.',
    commonMistakes: 'Assuming risk-on persists after a single down day in equities. Missing the flip when VIX breaks through key levels.',
    atlasInterpretation: 'Risk-on is the dominant regime for short-USD trade viability. Confirms bias and boosts strength.',
    checklist: '<ul><li>Is the regime risk-on?</li><li>Are VIX and equities confirming?</li><li>Do commodity FX pairs agree?</li></ul>'
  },
  RISKOFF: {
    plain: 'Investors Seeking Safety',
    definition: 'A market mood where investors are selling growth assets and bidding safe havens. Capital flows into USD, JPY, CHF, gold, Treasuries.',
    meansInMarkets: 'Risk-off favours long USD across the board, long JPY against commodity currencies, long gold, long US Treasuries.',
    whyMatters: 'Risk-off can override every other signal. A strong risk-off move during a dovish Fed backdrop still lifts USD as capital seeks safety.',
    howIdentify: 'Falling equities, rising VIX, rising DXY, falling AUD/NZD, rising XAUUSD. Sharp VIX spikes are the clearest trigger.',
    realExample: 'Geopolitical shock drops S&P 3%, lifts VIX from 14 to 24, DXY rallies 0.8%, USDJPY falls 0.4% (JPY safe-haven bid).',
    commonMistakes: 'Fading the first leg of a risk-off move. Forgetting JPY is a safe haven — shorting USDJPY in risk-off can be wrong despite USD strength.',
    atlasInterpretation: 'Risk-off forces viability to MARGINAL or INVALID for short-USD setups. Gate applied to the viability engine automatically.',
    checklist: '<ul><li>Is the regime risk-off?</li><li>Is VIX breaking higher?</li><li>Are safe havens bid?</li></ul>'
  },
  FAVOURABLE: {
    plain: 'Conditions Support the Trade',
    definition: 'ATLAS Trade Condition rating indicating the macro picture lines up with the proposed trade direction. Signal strength ≥ 7/10.',
    meansInMarkets: 'FAVOURABLE is the green-light rating. Bias, conviction, flow, and regime all argue in favour of the trade. Execute at full size.',
    whyMatters: 'FAVOURABLE is the only condition state where full-size execution is permitted by the doctrine. Below this, reduced size or stand aside.',
    howIdentify: 'Status section displays Trade Condition. Colour-coded: green FAVOURABLE, amber CAUTION, red UNFAVOURABLE.',
    realExample: 'Four drivers aligned bullish USD, strength 8/10, VIX stable, no high-impact events within 6 hours. Condition FAVOURABLE. Short EURUSD with full size.',
    commonMistakes: 'Treating FAVOURABLE as permanent. Holding positions into a regime change without re-checking condition.',
    atlasInterpretation: 'FAVOURABLE is the only condition that enables VALID viability. Any downgrade flips viability to MARGINAL or INVALID.',
    checklist: '<ul><li>Is condition FAVOURABLE?</li><li>Is signal strength ≥ 7/10?</li><li>Are there no events in the next 6 hours?</li></ul>'
  },
  CAUTION: {
    plain: 'Mixed Conditions',
    definition: 'ATLAS Trade Condition rating indicating partial alignment across drivers. Signal strength 4–6/10.',
    meansInMarkets: 'CAUTION is the amber light. Some drivers support the trade; others disagree. Reduce size or wait for clearer alignment before executing.',
    whyMatters: 'Many profitable traders operate in CAUTION conditions with reduced size, avoiding the full-blown losers of UNFAVOURABLE and the euphoria mistakes of FAVOURABLE.',
    howIdentify: 'Status section condition shown as amber. Probability model shows mixed driver alignment (2 of 4 or 3 of 4).',
    realExample: 'DXY and US10Y bullish, but equities neutral and USDJPY lagging. Strength 5/10. Condition CAUTION. Short EURUSD at 50% normal size.',
    commonMistakes: 'Treating CAUTION as a stand-aside signal when reduced-size trades are still viable. Or taking full-size CAUTION trades.',
    atlasInterpretation: 'CAUTION forces viability to MARGINAL at best. Full size is doctrine-prohibited. Reduced size or stand aside only.',
    checklist: '<ul><li>Is the condition CAUTION?</li><li>Have I reduced size?</li><li>Is the setup worth the reduced-size trade?</li></ul>'
  },
  UNFAVOURABLE: {
    plain: 'Conditions Are Against the Trade',
    definition: 'ATLAS Trade Condition rating indicating the macro picture opposes the proposed trade direction. Signal strength < 4/10.',
    meansInMarkets: 'UNFAVOURABLE is the red light. Drivers disagree with the trade; executing here typically produces losses even with good entry technique.',
    whyMatters: 'Respecting UNFAVOURABLE saves more capital than any winning setup earns. Standing aside is a position.',
    howIdentify: 'Status section condition shown as red. Probability model shows 0 or 1 drivers aligned (of 4).',
    realExample: 'DXY ranging, US10Y falling, equities up, USDJPY down. No directional argument for USD long. Condition UNFAVOURABLE. Close existing USD longs; no new entries.',
    commonMistakes: 'Forcing a trade in UNFAVOURABLE conditions on the basis of a chart pattern alone. Revenge trading after a loss during UNFAVOURABLE.',
    atlasInterpretation: 'UNFAVOURABLE forces viability to INVALID. No execution permitted by the doctrine.',
    checklist: '<ul><li>Is the condition UNFAVOURABLE?</li><li>Have I stood aside?</li><li>Am I waiting for condition to improve?</li></ul>'
  },
  SIGNALSTRENGTH: {
    plain: 'Quality of the Signal Out of 10',
    definition: 'Composite 0–10 score derived from the four ATLAS macro drivers, weighted by agreement with the favoured trade direction.',
    meansInMarkets: '≥8 → high conviction, full size. 6–7 → moderate, reduced size. 4–5 → wait or light participation. 1–3 → stand aside.',
    whyMatters: 'Signal strength is the single-number summary of bias, conviction, flow, and regime. It is the fastest read on whether to trade.',
    howIdentify: 'Status section Signal Strength meter (0–10). Probability model row translates strength into continuation/range/reversal percentages.',
    realExample: 'Strength 8/10 = FULL SIZE (continuation 75%, range 15%, reversal 10%). Strength 3/10 = STAND ASIDE (continuation 30%, reversal 30%).',
    commonMistakes: 'Acting on strength alone without checking regime or events. Assuming strength ≥ 6 always justifies full size (event risk can override).',
    atlasInterpretation: 'Signal strength is a direct input to the viability engine. Combined with R:R, it produces VALID/MARGINAL/INVALID.',
    checklist: '<ul><li>What is the current signal strength?</li><li>Does strength support the intended size?</li><li>Is strength trending higher or lower?</li></ul>'
  }
};


