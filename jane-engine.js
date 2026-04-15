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
  var s = (""+symbol).toUpperCase().replace(/[^A-Z]/g,"");
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

var EV_FALLBACK =
  '<div class="ev-fallback">'+
    '<div class="evf-hd">No scheduled news is moving the trade right now.</div>'+
    '<div class="evf-sub">Price is being driven by macro flow rather than headlines:</div>'+
    '<ul class="evf-list">'+
      '<li>The strength or weakness of the US Dollar</li>'+
      '<li>Movement in US interest rates</li>'+
      '<li>The direction of risk in the stock market</li>'+
    '</ul>'+
    '<div class="evf-interp"><b>What this means for the trade:</b> Without an active news catalyst, the trade should be based on the macro picture in the Status and Mechanism sections. A surprise headline can change the picture quickly - keep position size sensible.</div>'+
  '</div>';

var TERMS = [
  ["DXY","US Dollar Index. Weighted average of USD vs EUR, JPY, GBP, CAD, SEK, CHF. Proxy for broad USD strength."],
  ["US10Y","Yield on the 10-year US Treasury. Benchmark for long-duration rates; drives USD carry and discount rates."],
  ["EQUITIES","S&P 500 futures. Primary risk proxy - rising equities generally correlate with risk-on flows."],
  ["USDJPY","Dollar-Yen spot. Most rate-sensitive major via the 10Y differential; carries global risk and stress signals."],
  ["CPI","Consumer Price Index. Headline inflation print; dominates front-end rates and USD reaction."],
  ["NFP","Non-Farm Payrolls. Monthly US jobs report; drives yields and DXY on labour tightness signal."],
  ["FOMC","Federal Open Market Committee. Sets US policy rate; statement and presser shift term premium and USD."],
  ["GDP","Gross Domestic Product. Backward-looking growth gauge; revisions move Fed pricing."],
  ["PMI","Purchasing Managers Index. Forward-looking activity gauge; above 50 = expansion, below 50 = contraction."],
  ["CB SPEAKERS","Central bank officials speaking publicly. Often pre-signal policy pivots outside of meetings."],
  ["BIAS","Net directional conviction in USD or risk, composited from DXY, yields, equities, and FX."],
  ["CONVICTION","Degree of alignment across cross-asset signals. High = majors confirm the same narrative."],
  ["FLOW","Aggregate flow direction into or out of USD, inferred from DXY and USDJPY behaviour."],
  ["REGIME","Macro market mode - RISK-ON, RISK-OFF or MIXED - from equity, yield, and USD behaviour."],
  ["VALIDITY","Window during which the current thesis is assumed to hold absent an invalidation trigger."],
  ["ENTRY","Price at which the execution plan engages. Computed from mid of latest candle plus an ATR buffer."],
  ["STOP","Risk invalidation level. Derived from an ATR multiple beyond the structural pivot."],
  ["TARGET","Primary profit objective. 2R baseline, extended on regime alignment."],
  ["R-MULTIPLE","Ratio of profit to initial risk. 1R = distance from entry to stop."],
  ["ATR","Average True Range. Volatility measure used for stop and target sizing."],
  ["Z-SCORE","Number of standard deviations the current move is from its mean. Above 2 = regime-breaking."],
  ["PERCENTILE","Rank of the current move within the recent distribution of moves."],
  ["CARRY","Return from holding a higher-yielding currency funded by a lower-yielding one."],
  ["YIELD DIFFERENTIAL","Spread between two sovereign yields. Primary driver of FX pairs like USDJPY."],
  ["RISK-ON","Regime favouring growth and credit exposure - equities up, USD/JPY bid, defensives lag."],
  ["RISK-OFF","Regime favouring safe-haven flows - USD, CHF, JPY bid, equities lower."],
  ["POI","Point of Interest. A price level the plan is targeting or defending - entry, stop, or target zone."]
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
      /* Only show high-impact items that are landing inside the next ~24 hours
         or that landed in the last 4 hours (those that may still be moving the
         tape). Anything else is noise for an FX trader. */
      var filtered = (evts||[]).filter(function(e){
        if(!e || !e.title) return false;
        if(!includeEvent(e.title)) return false;
        if(!/high/i.test(e.impact||"")) return false;
        var t = new Date(e.date).getTime();
        return t >= now - 4*3600*1000 && t <= now + 24*3600*1000;
      }).sort(function(a,b){ return new Date(a.date) - new Date(b.date); }).slice(0,12);
      if(!filtered.length){ list.innerHTML = EV_FALLBACK; return; }
      list.innerHTML = filtered.map(function(e){
        var dt = new Date(e.date);
        var cls = evClass(e.impact);
        var ty = evType(e.title);
        var when = dt.toISOString().substr(5,11).replace("T"," ") + "Z";
        var ccy = e.country || "";
        var landed = dt.getTime() < now;
        var fc = (e.forecast!=null && e.forecast!=="") ? ("Forecast " + e.forecast) : "";
        var pv = (e.previous!=null && e.previous!=="") ? (" . Previous " + e.previous) : "";
        var plain = landed
          ? 'This event has already landed and may still be moving the trade. Compare the actual print to the forecast - a surprise in either direction will keep the move running.'
          : 'This event is scheduled. The market will likely tighten ranges before it lands and move sharply when it prints. Plan position size accordingly.';
        return '<div class="ev '+cls+'">'+
          '<div class="ev-top"><span>'+ccy+' . '+ty+'</span><span>'+when+'</span></div>'+
          '<div class="ev-tt">'+e.title+'</div>'+
          '<div class="ev-ft">'+fc+pv+'</div>'+
          '<div class="ev-plain">'+plain+'</div>'+
        '</div>';
      }).join("");
    }).catch(function(){
      list.innerHTML = EV_FALLBACK;
    });
  },
  update: function(){ renderMatrix(); },
  renderTerms: function(){
    var host = document.getElementById("terms-list"); if(!host) return;
    host.innerHTML = TERMS.map(function(r){
      return '<div class="term"><div class="tt">'+r[0]+'</div><div class="td">'+r[1]+'</div></div>';
    }).join("");
  }
};
})();
