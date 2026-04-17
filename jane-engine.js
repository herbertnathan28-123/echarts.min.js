/* ATLAS FX - jane-engine.js (MINIMAL)
   Price matrix (last 5, dedupe, click reload) + event intelligence fallback + short glossary. */
(function(){
var A = window.ATLAS;
A.pmCache = {};
A.searchHistory = [];
A.activeSymbol = A.activeSymbol || "EURUSD";

function digitsFor(sym){ if(A.FX && A.FX[sym]) return A.FX[sym].digits; if(A.SYMBOLS && A.SYMBOLS[sym]) return A.SYMBOLS[sym].digits; return 4; }

function matrixRow(pair){
  var c = A.pmCache[pair]; var dg = digitsFor(pair);
  var active = (A.activeSymbol===pair);
  var attrs = ' data-sym="'+pair+'" class="pm-row'+(active?' active':'')+'"';
  if(!c) return '<tr'+attrs+'><td>'+pair+'</td><td colspan="7" class="mut">queued...</td></tr>';
  var pc = c.pc, chg = c.chg, cls = pc>0?"up":pc<0?"dn":"mut";
  var biasWord = pc>0.2?"LONG": pc<-0.2?"SHORT":"FLAT";
  var biasCls  = pc>0.2?"up":  pc<-0.2?"dn":"mut";
  return '<tr'+attrs+'>'+
    '<td>'+pair+'</td>'+
    '<td>'+A.fmt(c.last,dg)+'</td>'+
    '<td class="'+cls+'">'+(chg>=0?"+":"")+A.fmt(chg,dg)+'</td>'+
    '<td class="'+cls+'">'+A.pct(pc)+'</td>'+
    '<td>'+A.fmt(c.hi,dg)+'</td>'+
    '<td>'+A.fmt(c.lo,dg)+'</td>'+
    '<td>'+A.fmt(c.hi-c.lo,dg)+'</td>'+
    '<td class="'+biasCls+'">'+biasWord+'</td></tr>';
}

function renderMatrix(){
  var body = document.getElementById("pm-body"); if(!body) return;
  if(!A.searchHistory.length){
    body.innerHTML = '<tr><td colspan="8" class="mut" style="text-align:left">no search history - use input above or trigger via !SYMBOL / $SYMBOL from Discord</td></tr>';
    return;
  }
  body.innerHTML = A.searchHistory.map(matrixRow).join("");
  Array.prototype.forEach.call(body.querySelectorAll("tr.pm-row"), function(tr){
    tr.addEventListener("click", function(){
      var s = tr.getAttribute("data-sym");
      if(s) window.reloadSymbol(s);
    });
  });
}

function fetchMatrixPair(p){
  return A.Feed.fetchSymbol(p, "1H").then(function(r){
    var b = r.bars; if(!b||!b.length) return;
    var last = b[b.length-1][4];
    var first = b[0][4];
    var hi = -Infinity, lo = Infinity;
    for(var i=0;i<b.length;i++){ if(b[i][2]>hi) hi=b[i][2]; if(b[i][3]<lo) lo=b[i][3]; }
    A.pmCache[p] = { last:last, first:first, chg:last-first, pc:(last-first)/first*100, hi:hi, lo:lo };
  });
}

window.addSearch = function(symbol){
  if(!symbol) return;
  var s = (""+symbol).toUpperCase().replace(/[^A-Z]/g,"");
  if(!s) return;
  A.searchHistory = A.searchHistory.filter(function(x){ return x!==s; });
  A.searchHistory.unshift(s);
  if(A.searchHistory.length>5) A.searchHistory.length=5;
  if(!A.pmCache[s]) fetchMatrixPair(s).then(renderMatrix).catch(renderMatrix);
  renderMatrix();
};

window.reloadSymbol = function(symbol){
  if(!symbol) return;
  var s = window.resolveSymbol ? window.resolveSymbol(symbol) : (""+symbol).toUpperCase().replace(/[^A-Z0-9]/g,"");
  A.activeSymbol = s;
  window.addSearch(s);
  try { window.ChartsEngine    && ChartsEngine.load    && ChartsEngine.load(s); } catch(e){}
  try { window.MacroEngine     && MacroEngine.run      && MacroEngine.run(s); } catch(e){}
  try { window.ExecutionEngine && ExecutionEngine.load && ExecutionEngine.load(s); } catch(e){}
};

function evClass(imp){
  var s = (imp||"").toLowerCase();
  if(s.indexOf("high")>=0) return "h";
  if(s.indexOf("med")>=0) return "m";
  return "l";
}
function evType(title){
  var t = (title||"").toLowerCase();
  if(/cpi|inflation|core pce|ppi/.test(t)) return "CPI";
  if(/nfp|non-farm|non farm|payroll|unemployment/.test(t)) return "NFP";
  if(/fomc|rate decision|boe|ecb|boj|snb|rba|rbnz|boc/.test(t)) return "RATES";
  if(/speech|speaks|testifies|press conf/.test(t)) return "CB SPK";
  if(/gdp|growth/.test(t)) return "GDP";
  if(/pmi|ism|manufacturing|services/.test(t)) return "PMI";
  return "MACRO";
}
function includeEvent(title){
  var t = (title||"").toLowerCase();
  return /cpi|inflation|pce|ppi|nfp|non-farm|non farm|payroll|unemployment|fomc|rate decision|speech|speaks|testifies|press conf|gdp|growth|pmi|ism|manufacturing|services/.test(t);
}

/* ATLAS DOCTRINE — forward-impact event engine.
   Replaces descriptive commentary with directional bias risk,
   expansion range, volatility shock scenario, execution degradation,
   viability effect. Output is forecasting language, not narration. */
var EV_FALLBACK =
  '<div class="ev-fallback">'+
    '<div class="evf-hd">No scheduled high-impact events.</div>'+
    '<div class="evf-sub">Market is currently flow-driven: DXY movement, US10Y, Equity flows.</div>'+
    '<div class="evf-interp">Interpretation: Conditions are data-flow driven, not news-driven.</div>'+
  '</div>';

/* Event-type forward impact library (pip expansion + shock severity). */
var EV_IMPACT = {
  NFP:   {expandLow:80,expandHigh:120,shock:'high',direction:'USD-symmetric'},
  CPI:   {expandLow:60,expandHigh:90, shock:'high',direction:'USD-symmetric'},
  RATES: {expandLow:50,expandHigh:150,shock:'high',direction:'currency-symmetric'},
  GDP:   {expandLow:30,expandHigh:60, shock:'medium',direction:'currency-asymmetric'},
  PMI:   {expandLow:20,expandHigh:40, shock:'medium',direction:'currency-asymmetric'},
  'CB SPK': {expandLow:15,expandHigh:40,shock:'medium',direction:'policy-signal'},
  MACRO: {expandLow:15,expandHigh:35, shock:'low',direction:'context-only'}
};

/* Forward-impact store consumed by viability engine (see data-feed.js). */
A.EventsForward = {
  store: [],
  imminentShock: function(){
    var now = Date.now();
    var max = 0;
    for(var i=0;i<A.EventsForward.store.length;i++){
      var e = A.EventsForward.store[i];
      var t = e.landAt - now;
      if(t < 0 || t > 6*3600*1000) continue;
      var sev = e.shock === 'high' ? 3 : e.shock === 'medium' ? 2 : 1;
      if(t < 2*3600*1000) sev += 1;
      if(sev > max) max = sev;
    }
    return max;
  }
};

function viabilityEffect(shock, minutesUntil){
  if(shock === 'high' && minutesUntil < 120) return 'INVALID during release window';
  if(shock === 'high' && minutesUntil < 360) return 'MARGINAL — reduce size, widen stops';
  if(shock === 'medium' && minutesUntil < 120) return 'MARGINAL — monitor execution';
  return 'Minimal impact on current setup';
}

function degradationLabel(shock, minutesUntil){
  if(shock === 'high' && minutesUntil < 120) return '<span class="dn">HIGH — spread blow-out + whipsaw</span>';
  if(shock === 'high') return '<span class="or">MEDIUM — wider spreads expected</span>';
  if(shock === 'medium' && minutesUntil < 180) return '<span class="or">MEDIUM — brief spread widening</span>';
  return '<span class="mut">LOW — normal execution expected</span>';
}

function directionalBias(title, sym){
  var t = (title||'').toLowerCase();
  if(/hawk|tighten|cut.*surprise.*hold/.test(t)) return 'Bullish currency (hawkish)';
  if(/dov|ease|hike.*surprise.*hold/.test(t)) return 'Bearish currency (dovish)';
  if(/cpi|inflation|core pce|ppi/.test(t)) return 'Above forecast → bullish USD · below → bearish USD';
  if(/nfp|non-farm|payroll/.test(t)) return 'Above forecast → bullish USD · below → bearish USD';
  if(/gdp/.test(t)) return 'Above forecast → bullish local currency';
  if(/pmi|ism/.test(t)) return 'Above 50 → bullish · below → bearish';
  if(/rate decision|fomc|boe|ecb|boj|snb|rba|rbnz|boc/.test(t)) return 'Hawkish → bullish currency · dovish → bearish';
  return 'Context-only — no direct directional bias';
}

/* Glossary entries: [code, plain-english one-liner used as a sub-label,
   full beginner-readable definition]. Beginner-readable: every entry is
   written so a non-trader can understand the term in two short sentences. */
var TERMS = [
  ["Dollar Strength Index (DXY proxy)","US Dollar Strength Index","A single number that tracks how strong the US Dollar is against six major currencies. When it rises, the dollar is winning across the board; when it falls, the dollar is losing."],
  ["US10Y","US 10-Year Interest Rate","The return paid on a 10-year US government bond. Higher yields make holding dollars more rewarding; lower yields make dollars less attractive."],
  ["EQUITIES","Market Risk Appetite","The S&P 500 (the main US stock market). Rising stocks usually mean investors are willing to take risk; falling stocks mean investors want safety."],
  ["USDJPY","Global Money Flow","The dollar against the Japanese yen. The cleanest live read on whether money is flowing into or out of the dollar in size."],
  ["CPI","Consumer Price Index (Inflation)","The official measure of how fast prices are rising. A high inflation print usually pushes interest rates higher and the dollar with them."],
  ["NFP","Non-Farm Payrolls (US Jobs Report)","Monthly snapshot of how many people the US economy hired. A strong number usually lifts interest rates and the dollar; a weak number does the opposite."],
  ["FOMC","Federal Reserve Rate Decision","The committee that sets the official US interest rate. Their statement and press conference can move the dollar sharply within minutes."],
  ["GDP","Gross Domestic Product (Growth)","The total value of everything an economy produces. Stronger growth usually supports the local currency."],
  ["PMI","Purchasing Managers Index","A monthly survey of business activity. Above 50 means the economy is growing; below 50 means it is shrinking."],
  ["CB SPEAKERS","Central Bank Officials Speaking","Senior central bankers talking in public. Their words often hint at coming policy changes before official meetings."],
  ["BIAS","Overall Direction","The net direction the system thinks the dollar is moving, built from the four macro drivers."],
  ["CONVICTION","How Much the Drivers Agree","A measure of how many of the four macro drivers point the same way. High conviction means a strong, consistent signal."],
  ["FLOW","Direction of Money Movement","Whether money is flowing into or out of the US Dollar overall, judged from the dollar index and USDJPY together."],
  ["REGIME","Market Mood","Whether markets are in a risk-on mood (buying growth) or a risk-off mood (seeking safety)."],
  ["VALIDITY","How Long the Analysis Stays Current","Roughly how many hours the current view should be trusted before the macro picture has likely changed."],
  ["ENTRY","Where the Trade Starts","The price at which the trade is designed to begin. Wait for price to come to this level rather than chasing it elsewhere."],
  ["STOP LOSS","Where the Trade is Wrong","The price level that proves the trade idea is no longer valid. Closing the trade here protects the account."],
  ["EXIT","Where the Trade Ends","The price at which the trade is designed to take profit, based on the macro picture."],
  ["ATR","Average True Range (Typical Daily Move)","A measure of how much a market typically moves in a session. Used to set tight, sensible stops and targets."],
  ["RISK-ON","Investors Buying Growth","A market mood where stocks are bid, the dollar is offered, and investors prefer higher-return assets."],
  ["RISK-OFF","Investors Seeking Safety","A market mood where stocks are sold, the dollar is bid, and investors prefer safer assets."],
  ["FAVOURABLE","Conditions Support the Trade","The system rates the current setup as favourable - the macro picture lines up with the trade direction."],
  ["CAUTION","Mixed Conditions","Some signals support the trade, some oppose it. Reduce position size or wait for more alignment."],
  ["UNFAVOURABLE","Conditions Are Against the Trade","The macro picture is working against the proposed trade direction. Standing aside is more favourable than entering."],
  ["SIGNAL STRENGTH","Quality of the Signal Out of 10","A 0-10 score combining all macro drivers. Higher is better; below 4 is unfavourable."]
];

A.Jane = {
  loadMatrix: function(){
    if(!A.searchHistory.length){
      ["EURUSD","GBPUSD","USDJPY","AUDJPY"].forEach(function(s){ window.addSearch(s); });
    }
    var pairs = A.searchHistory.slice();
    return Promise.allSettled(pairs.map(fetchMatrixPair)).then(function(){ renderMatrix(); });
  },
  loadEvents: function(){
    var list = document.getElementById("ev-list"); if(!list) return;
    return A.Feed.fetchEvents().then(function(evts){
      var now = Date.now();
      var sym = A.activeSymbol || 'EURUSD';
      var filtered = (evts||[]).filter(function(e){
        if(!e || !e.title) return false;
        if(!includeEvent(e.title)) return false;
        if(!/high/i.test(e.impact||"")) return false;
        var t = new Date(e.date).getTime();
        return t >= now - 2*3600*1000 && t <= now + 24*3600*1000;
      }).sort(function(a,b){ return new Date(a.date) - new Date(b.date); }).slice(0,10);

      /* Populate forward-impact store used by viability engine. */
      A.EventsForward.store = filtered.map(function(e){
        var ty = evType(e.title);
        var impact = EV_IMPACT[ty] || EV_IMPACT.MACRO;
        return { title:e.title, ccy:e.country||'', type:ty, landAt:new Date(e.date).getTime(), shock:impact.shock };
      });

      if(!filtered.length){ list.innerHTML = EV_FALLBACK; return; }

      list.innerHTML = filtered.map(function(e){
        var dt = new Date(e.date);
        var cls = evClass(e.impact);
        var ty = evType(e.title);
        var impact = EV_IMPACT[ty] || EV_IMPACT.MACRO;
        var when = dt.toISOString().substr(5,11).replace("T"," ") + "Z";
        var ccy = e.country || "";
        var minutesUntil = (dt.getTime() - now) / 60000;
        var dirBias = directionalBias(e.title, sym);
        var expansion = impact.expandLow + '–' + impact.expandHigh + ' pips expected';
        var shockScenario = impact.shock === 'high'
          ? 'Spread blow-out, 3–5x normal range, whipsaw risk first 5 min'
          : impact.shock === 'medium'
            ? 'Brief spread widening, 1.5–2x normal range'
            : 'Minimal volatility disturbance expected';
        var degradation = degradationLabel(impact.shock, minutesUntil);
        var viability = viabilityEffect(impact.shock, minutesUntil);
        return '<div class="ev '+cls+'">'+
          '<div class="ev-top"><span>'+ccy+' · '+ty+'</span><span>'+when+'</span></div>'+
          '<div class="ev-tt">'+e.title+'</div>'+
          '<div class="ev-fwd">'+
            '<div class="ev-row"><span class="ev-k">DIRECTIONAL BIAS</span><span class="ev-v">'+dirBias+'</span></div>'+
            '<div class="ev-row"><span class="ev-k">EXPANSION RANGE</span><span class="ev-v">'+expansion+'</span></div>'+
            '<div class="ev-row"><span class="ev-k">VOL SHOCK</span><span class="ev-v">'+shockScenario+'</span></div>'+
            '<div class="ev-row"><span class="ev-k">EXECUTION RISK</span><span class="ev-v">'+degradation+'</span></div>'+
            '<div class="ev-row"><span class="ev-k">VIABILITY EFFECT</span><span class="ev-v">'+viability+'</span></div>'+
          '</div>'+
        '</div>';
      }).join("");
    }).catch(function(){
      A.EventsForward.store = [];
      list.innerHTML = EV_FALLBACK;
    });
  },
  update: function(){ renderMatrix(); },
  renderTerms: function(){
    var host = document.getElementById("terms-list"); if(!host) return;
    host.innerHTML = TERMS.map(function(r){
      var code = r[0], plain = r[1];
      var key = code.toUpperCase().replace(/[^A-Z0-9]/g,'');
      return '<div class="term">'+
        '<button type="button" class="term-open" data-term="'+key+'" data-code="'+code+'">'+
          '<span class="term-code">'+code+'</span>'+
          '<span class="term-plain">'+plain+'</span>'+
          '<span class="term-more">OPEN</span>'+
        '</button>'+
      '</div>';
    }).join("");
    Array.prototype.forEach.call(host.querySelectorAll('.term-open'), function(btn){
      btn.addEventListener('click', function(){
        var k = btn.getAttribute('data-term');
        var c = btn.getAttribute('data-code');
        if(window.openTermModal) window.openTermModal(k, c);
      });
    });
  }
};
})();
