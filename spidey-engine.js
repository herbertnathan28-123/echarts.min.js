/* ATLAS FX - spidey-engine.js
   SPIDEY: Historical Context Engine + Scenario Engine.
     Historical: four columns (DXY / US10Y / EQUITIES / USDJPY) - move %, volatility,
     readable meaning per driver, conclusion, collective takeaway, and a "why these four"
     explainer so a beginner understands the selection.
     Scenario: primary / alternative / invalidation - plain English, actionable. */
(function(){
var A = window.ATLAS;
function pct(a,b){ return b? ((a-b)/b*100) : 0; }
function stdev(arr){
  if(!arr || arr.length<2) return 0;
  var m = arr.reduce(function(s,v){return s+v;},0)/arr.length;
  return Math.sqrt(arr.reduce(function(s,x){return s+(x-m)*(x-m);},0)/(arr.length-1));
}
function absPercentile(arr, v){
  var n = arr.length; if(!n) return 0;
  var a = Math.abs(v), k = 0;
  for(var i=0;i<n;i++){ if(Math.abs(arr[i])<=a) k++; }
  return k/n*100;
}
function returns(bars){
  var r=[]; for(var i=1;i<bars.length;i++){ r.push((bars[i][4]-bars[i-1][4])/bars[i-1][4]); } return r;
}
function atr(bars, n){
  n = n||14; if(!bars || bars.length<2) return 0;
  var trs=[];
  for(var i=1;i<bars.length;i++){
    var h=bars[i][2], l=bars[i][3], pc=bars[i-1][4];
    trs.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
  }
  var slice = trs.slice(-n);
  return slice.reduce(function(s,v){return s+v;},0)/slice.length;
}
var EXPLAIN = {
  DXY: {
    title: "DXY - US DOLLAR INDEX",
    role: "The broad strength of the US dollar against six major trading partners. If DXY rises, the dollar is winning against the world.",
    up: "Dollar is bid - capital is flowing into US assets. Risk assets in non-USD terms get pressured.",
    dn: "Dollar is offered - capital is leaving US assets. Relief for commodities, EM, and non-USD risk.",
    flat: "Dollar indecisive - no dominant flow this window."
  },
  US10Y: {
    title: "US10Y - 10-YEAR TREASURY YIELD",
    role: "The price of long-duration US debt. It reflects growth expectations, inflation, and Fed policy - the backbone discount rate for everything.",
    up: "Yields rising - markets pricing stronger growth, stickier inflation, or tighter Fed. Discount rate pressure on long-duration assets.",
    dn: "Yields falling - markets pricing slower growth, cooling inflation, or a more dovish Fed. Tailwind for duration-sensitive assets.",
    flat: "Yields anchored - no repricing of the rate path this window."
  },
  EQUITIES: {
    title: "EQUITIES - S&P 500 FUTURES",
    role: "Primary risk proxy. When stocks rise, the market is willing to take risk; when they fall, risk appetite is retreating.",
    up: "Risk-on - capital chasing growth exposure. Expect commodity FX bid, JPY/CHF offered.",
    dn: "Risk-off - capital exiting growth. Expect safe-haven FX bid, commodity FX pressured.",
    flat: "Risk appetite neutral - no dominant tone this window."
  },
  USDJPY: {
    title: "USDJPY - DOLLAR / JAPANESE YEN",
    role: "The most rate-sensitive major pair in the world. Carries the global yield differential and funds the biggest carry trade in FX. Also a stress barometer.",
    up: "USDJPY rising - yield differential widening and/or carry being funded. Often confirms a USD-strong, risk-on tape.",
    dn: "USDJPY falling - differential compressing, carry unwinding, or risk-off flows into yen. Often confirms a USD-weak or stress tape.",
    flat: "USDJPY stable - no impulse from the rate spread or from funding."
  }
};
function columnCell(key, bars){
  var E = EXPLAIN[key];
  if(!bars || bars.length<5){
    return '<div class="hist-col"><div class="hc-k">'+E.title+'</div><div class="hc-role">'+E.role+'</div><div class="mut">awaiting data...</div></div>';
  }
  var rets = returns(bars);
  var last = bars[bars.length-1][4];
  var first = bars[0][4];
  var chg = last-first, pc = pct(last, first);
  var sd = stdev(rets)*100;
  var perc = absPercentile(rets, rets[rets.length-1]);
  var z = sd ? (rets[rets.length-1]*100)/sd : 0;
  var cls = pc>0?"up":pc<0?"dn":"mut";
  var intensity = perc>=90?"EXTREME":perc>=75?"ELEVATED":perc>=50?"NORMAL":"QUIET";
  var intCls = perc>=90?"dn":perc>=75?"hi":perc>=50?"gn":"mut";
  var dir = pc>0?"up":pc<0?"dn":"flat";
  var meaning = E[dir];
  var conclusion;
  if(intensity==="EXTREME") conclusion = "Move is in the top 10% of recent activity - respect it, it's meaningful.";
  else if(intensity==="ELEVATED") conclusion = "Move is larger than usual - trade with awareness, not complacency.";
  else if(intensity==="NORMAL") conclusion = "Move is within typical range - standard playbook applies.";
  else conclusion = "Move is compressed - breakout risk elevated, position smaller.";
  return '<div class="hist-col">'+
    '<div class="hc-k">'+E.title+'</div>'+
    '<div class="hc-role">'+E.role+'</div>'+
    '<div class="hc-stats">'+
      '<div class="hc-row"><span class="hc-lbl">CHANGE</span><span class="'+cls+'">'+A.pct(pc)+'</span></div>'+
      '<div class="hc-row"><span class="hc-lbl">VOLATILITY</span><span>sigma '+sd.toFixed(3)+'%</span></div>'+
      '<div class="hc-row"><span class="hc-lbl">Z-SCORE</span><span>'+z.toFixed(2)+'sigma</span></div>'+
      '<div class="hc-row"><span class="hc-lbl">INTENSITY</span><span class="'+intCls+'">'+intensity+' * p'+perc.toFixed(0)+'</span></div>'+
    '</div>'+
    '<div class="hc-mean"><b>MEANING.</b> '+meaning+'</div>'+
    '<div class="hc-conc"><b>CONCLUSION.</b> '+conclusion+'</div>'+
  '</div>';
}
function collectiveTakeaway(st){
  if(!st || !st.moves) return "";
  var m = st.moves;
  if(st.biasDir>=1){
    return "All four drivers line up for a <b class='gn'>USD-LONG regime</b>. The dollar is strong, yields support carry, and risk flows favour US assets. The cleanest trades are with the dollar: long USDJPY, long USDCAD, short commodity FX, short EUR / GBP into strength. Size full, stops honoured.";
  }
  if(st.biasDir<=-1){
    return "All four drivers line up for a <b class='dn'>USD-SHORT regime</b>. The dollar is offered, yields are compressing, and risk flows favour non-US assets. The cleanest trades are against the dollar: long EURUSD on dips, long AUD/NZD, short DXY. Size full, stops honoured.";
  }
  return "The four drivers <b class='hi'>do not align</b>. Don't force a trend. Range-trade the majors, fade extremes, or stand aside until a catalyst resets the tape. Conviction trades today will pay poorly - scale down.";
}
var WHY_FOUR = "These four drivers form the minimum macro picture for trading FX. <b>DXY</b> tells you the dollar's direction in one number. <b>US10Y</b> tells you the world's benchmark cost of money. <b>Equities</b> tell you risk appetite. <b>USDJPY</b> is the cleanest real-time readout of carry and stress in global FX. Watch these four and you see everything else - ignore any of them and you're flying blind on at least one vector.";
A.Spidey = {
  state: {},
  update: function(){
    var cd = A.chartData || {};
    var grid = document.getElementById("hist-grid");
    if(grid){
      grid.innerHTML =
        columnCell("DXY",      (cd["ch-macro-DXY"]      || {}).bars) +
        columnCell("US10Y",    (cd["ch-macro-US10Y"]    || {}).bars) +
        columnCell("EQUITIES", (cd["ch-macro-EQUITIES"] || {}).bars) +
        columnCell("USDJPY",   (cd["ch-macro-USDJPY"]   || {}).bars);
    }
    var narr = document.getElementById("hist-narrative");
    var why  = document.getElementById("hist-why");
    var st = A.Macro && A.Macro.state;
    if(narr) narr.innerHTML = '<div class="hist-take"><div class="hc-k">COLLECTIVE TAKEAWAY</div><div>'+collectiveTakeaway(st)+'</div></div>';
    if(why)  why.innerHTML  = '<div class="hist-why"><div class="hc-k">WHY THESE FOUR DRIVERS</div><div>'+WHY_FOUR+'</div></div>';
    /* SCENARIO ENGINE */
    var jpy = (cd["ch-macro-USDJPY"] || {}).bars;
    var dxy = (cd["ch-macro-DXY"]    || {}).bars;
    if(!jpy || !dxy || !st || !st.moves) return;
    var lastJ = jpy[jpy.length-1][4], atrJ = atr(jpy,14);
    var lastD = dxy[dxy.length-1][4], atrD = atr(dxy,14);
    var primary, alt, inv;
    if(st.biasDir>=1){
      primary = {
        hd:"BUY USDJPY ON PULLBACK",
        t:"Wait for USDJPY to dip toward "+A.fmt(lastJ-atrJ,3)+" (roughly one average day's range below current). Enter long there. Target "+A.fmt(lastJ+2*atrJ,3)+" - that's two ranges above current.",
        g:"Translation: the dollar is strong. Don't chase - wait for a small pullback, then buy, and aim for a decent move higher.",
        c:"gn"
      };
      alt = {
        hd:"ROTATE TO LONG AUDJPY / SHORT EURUSD",
        t:"If DXY fades below "+A.fmt(lastD-atrD,2)+" WITH equities still bid, the dollar thesis is softening but risk is on. Rotate from USDJPY into long AUDJPY (carry + risk-on) or short EURUSD reversal setups.",
        g:"Translation: if the dollar stops rising but stocks keep going up, switch to trades that win when risk is on but the euro is weak.",
        c:"hi"
      };
      inv = {
        hd:"STOP TRADING LONG-USD IF...",
        t:"Invalidate the USD-long thesis if DXY closes below "+A.fmt(lastD-1.5*atrD,2)+" OR US10Y reverses more than 1.5 ATR against the current direction. Either event means the macro picture has flipped.",
        g:"Translation: if the dollar index falls below that level, or yields collapse, tear up the plan - the edge is gone.",
        c:"dn"
      };
    } else if(st.biasDir<=-1){
      primary = {
        hd:"SELL USDJPY ON BOUNCE",
        t:"Wait for USDJPY to bounce toward "+A.fmt(lastJ+atrJ,3)+". Enter short there. Target "+A.fmt(lastJ-2*atrJ,3)+" - two ranges lower.",
        g:"Translation: the dollar is weak. Don't short blindly - wait for a bounce, then sell, and aim for a meaningful drop.",
        c:"dn"
      };
      alt = {
        hd:"FLIP TO LONG USDJPY / SHORT EURUSD",
        t:"If DXY reclaims "+A.fmt(lastD+atrD,2)+" WITH yields bid, the regime is flipping back. Flip to long USDJPY on the retest and short EURUSD reversal.",
        g:"Translation: if the dollar suddenly turns up with rising yields, flip your view - go with the new move.",
        c:"hi"
      };
      inv = {
        hd:"STOP TRADING SHORT-USD IF...",
        t:"Invalidate the USD-short thesis if DXY closes above "+A.fmt(lastD+1.5*atrD,2)+" OR equities break down sharply. Either signals a regime reversal.",
        g:"Translation: if the dollar breaks through that level or stocks crash, the short-dollar trade is dead - step aside.",
        c:"up"
      };
    } else {
      primary = {
        hd:"RANGE-TRADE USDJPY",
        t:"Fade the extremes between "+A.fmt(lastJ-atrJ,3)+" and "+A.fmt(lastJ+atrJ,3)+". Short the top, buy the bottom, small size.",
        g:"Translation: no clear trend. Sell the high end of the range, buy the low end, keep sizes small.",
        c:"hi"
      };
      alt = {
        hd:"WAIT FOR BREAKOUT",
        t:"A decisive DXY close outside +/-"+A.fmt(atrD,2)+" triggers a directional trade - follow the breakout with stops just inside the range.",
        g:"Translation: if the dollar index breaks out of its recent range, jump on that move in the breakout direction.",
        c:"hi"
      };
      inv = {
        hd:"ABANDON RANGE IF...",
        t:"Invalidate the range-fade on a two-candle breakout expansion greater than 1.5 ATR on DXY or US10Y. That is the range failing.",
        g:"Translation: if the market decisively breaks out with strong candles, stop fading - the range is done.",
        c:"dn"
      };
    }
    var sg = document.getElementById("scen-grid");
    if(sg){
      var render = function(col, s){
        return '<div class="scen-col '+col+'">'+
          '<div class="sc-k">'+col.toUpperCase()+'</div>'+
          '<div class="sc-hd '+s.c+'">'+s.hd+'</div>'+
          '<div class="sc-t">'+s.t+'</div>'+
          '<div class="sc-gh"><b>IN PLAIN ENGLISH.</b> '+s.g+'</div>'+
        '</div>';
      };
      sg.innerHTML = render("primary",primary)+render("alternative",alt)+render("invalidation",inv);
    }
    A.Spidey.state = { primary:primary, alt:alt, inv:inv, atrJ:atrJ, atrD:atrD };
  }
};
})();
