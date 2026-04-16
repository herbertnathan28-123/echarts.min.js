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
      var code = r[0], plain = r[1], def = r[2];
      return '<div class="term">'+
        '<details>'+
          '<summary>'+code+'<span class="plain">'+plain+'</span></summary>'+
          '<div class="body">'+def+'</div>'+
        '</details>'+
      '</div>';
    }).join("");
  }
};
})();
