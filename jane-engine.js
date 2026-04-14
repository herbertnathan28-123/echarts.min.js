/* ATLAS FX — jane-engine.js
   JANE: price matrix (EURUSD/GBPUSD/USDJPY/AUDJPY) + Event Intelligence (ForexFactory feed) + Terminology glossary.
   Matrix refreshes 30s. Calendar refreshes 10m. All live — no static data. */
(function(){
var A = window.ATLAS;
A.pmCache = {};
function matrixRow(pair){
  var c = A.pmCache[pair]; var dg = A.FX[pair].digits;
  if(!c) return '<tr><td>'+pair+'</td><td colspan="7" class="mut">loading…</td></tr>';
  var pc = c.pc, chg = c.chg, cls = pc>0?"up":pc<0?"dn":"mut";
  var biasWord = pc>0.2?"LONG": pc<-0.2?"SHORT":"FLAT";
  var biasCls = pc>0.2?"up": pc<-0.2?"dn":"mut";
  return '<tr>'+
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
  var pairs = Object.keys(A.FX);
  body.innerHTML = pairs.map(matrixRow).join("");
}
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
A.Jane = {
  loadMatrix: function(){
    var pairs = Object.keys(A.FX);
    return Promise.allSettled(pairs.map(function(p){
      return A.Feed.fetchSymbol(p, "1h").then(function(r){
        var b = r.bars; if(!b||!b.length) return;
        var last = b[b.length-1][4];
        var first = b[0][4];
        var hi = -Infinity, lo = Infinity;
        for(var i=0;i<b.length;i++){ if(b[i][2]>hi) hi=b[i][2]; if(b[i][3]<lo) lo=b[i][3]; }
        A.pmCache[p] = { last:last, first:first, chg:last-first, pc:(last-first)/first*100, hi:hi, lo:lo };
      });
    })).then(function(){ renderMatrix(); });
  },
  loadEvents: function(){
    var list = document.getElementById("ev-list"); if(!list) return;
    return A.Feed.fetchEvents().then(function(evts){
      var now = Date.now();
      var filtered = evts.filter(function(e){
        if(!e || !e.title) return false;
        if(!includeEvent(e.title)) return false;
        var t = new Date(e.date).getTime();
        return t >= now - 6*3600*1000 && t <= now + 7*24*3600*1000;
      }).sort(function(a,b){ return new Date(a.date) - new Date(b.date); }).slice(0,24);
      if(!filtered.length){ list.innerHTML = '<div class="ev l"><div class="ev-top"><span>—</span><span>—</span></div><div class="ev-tt">no high-impact events in window</div></div>'; return; }
      list.innerHTML = filtered.map(function(e){
        var dt = new Date(e.date);
        var cls = evClass(e.impact);
        var ty = evType(e.title);
        var when = dt.toISOString().substr(5,11).replace("T"," ") + "Z";
        var ccy = e.country||"";
        var fc = (e.forecast!=null&&e.forecast!=="")?("F "+e.forecast):"";
        var pv = (e.previous!=null&&e.previous!=="")?(" · P "+e.previous):"";
        return '<div class="ev '+cls+'">'+
          '<div class="ev-top"><span>'+ccy+' · '+ty+'</span><span>'+when+'</span></div>'+
          '<div class="ev-tt">'+e.title+'</div>'+
          '<div class="ev-ft">'+fc+pv+'</div></div>';
      }).join("");
    }).catch(function(){
      list.innerHTML = '<div class="ev l"><div class="ev-top"><span>—</span><span>OFFLINE</span></div><div class="ev-tt">calendar feed unavailable</div></div>';
    });
  },
  update: function(){ renderMatrix(); },
  renderTerms: function(){
    var T = [
      ["DXY","US Dollar Index. Weighted geometric average of USD vs EUR, JPY, GBP, CAD, SEK, CHF. Proxy for broad USD strength."],
      ["US10Y","Yield on 10-year US Treasury. Benchmark for long-duration rates; drives USD carry and discount rates."],
      ["EQUITIES","S&P 500 E-mini futures (ES) — primary risk proxy. Rising equities generally correlate with risk-on flows."],
      ["USDJPY","Dollar-Yen spot. Highly rate-sensitive via 10Y differential; global carry and risk-off funding vehicle."],
      ["CPI","Consumer Price Index. Headline inflation print; dominates front-end rates and USD reaction function."],
      ["NFP","Non-Farm Payrolls. Monthly US jobs report; drives yields and DXY on labour tightness signal."],
      ["FOMC","Federal Open Market Committee. Sets US policy rate; statement/presser shifts term premium and USD."],
      ["GDP","Gross Domestic Product. Backward-looking growth gauge; revisions move Fed pricing."],
      ["PMI","Purchasing Managers Index. Forward-looking activity gauge. >50 expansion, <50 contraction."],
      ["CB SPEAKERS","Central bank official communications — often pre-signal policy pivots outside meetings."],
      ["BIAS","Net directional conviction in USD or risk, composited from DXY, yields, equities, FX."],
      ["CONVICTION","Degree of alignment across cross-asset signals. High = majors confirm the same narrative."],
      ["FLOW","Aggregate flow direction into or out of USD — inferred from DXY × JPY behaviour."],
      ["REGIME","Macro market mode — RISK-ON, RISK-OFF or MIXED — from equity + yield + USD behaviour."],
      ["VALIDITY","Window during which the current thesis is assumed to hold absent invalidation trigger."],
      ["ENTRY","Price at which the execution plan engages. Computed from mid of latest candle ± ATR buffer."],
      ["STOP","Risk invalidation level. Derived from ATR multiple beyond structural pivot."],
      ["TARGET","Primary profit objective. 2R baseline, extended on regime alignment."],
      ["R-MULTIPLE","Ratio of profit to initial risk. 1R = distance from entry to stop."],
      ["ATR","Average True Range. Volatility measure used for stop and target sizing."],
      ["Z-SCORE","Number of standard deviations the current move is from its mean. >|2| = regime-breaking."],
      ["PERCENTILE","Rank of the current move within the recent distribution of moves."],
      ["CARRY","Return from holding a higher-yielding currency funded by a lower-yielding one."],
      ["YIELD DIFFERENTIAL","Spread between two sovereign yields — primary driver of FX pairs like USDJPY."],
      ["RISK-ON","Regime favouring growth/credit exposure — equities up, USD/JPY bid, defensives lag."],
      ["RISK-OFF","Regime favouring safe-haven flows — USD/CHF/JPY bid, equities lower."],
      ["MECHANISM","Causal chain: catalyst → transmission → cross-asset response → FX terminal → outcome."],
      ["SCENARIO","Branching plan: primary (base case), alternative (contrarian), invalidation (kill switch)."],
      ["PRIMARY","Base-case trade aligned with current regime and conviction."],
      ["ALTERNATIVE","Contingent trade activated if primary regime fails specific criteria."],
      ["INVALIDATION","Hard level or condition negating thesis; forces exit/flip."]
    ];
    var host = document.getElementById("terms-list"); if(!host) return;
    host.innerHTML = T.map(function(r){
      var id = "t-"+r[0].toLowerCase().replace(/[^a-z0-9]+/g,"");
      return '<div class="term" id="'+id+'"><div class="tt">'+r[0]+'</div><div class="td">'+r[1]+'</div></div>';
    }).join("");
  }
};
})();
