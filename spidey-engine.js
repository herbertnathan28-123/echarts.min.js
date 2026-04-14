/* ATLAS FX — spidey-engine.js
   SPIDEY: pattern / threat detection. Owns Historical Context Engine + Scenario Engine (primary/alternative/invalidation).
   All values derive from live bar data — percentile, z-score, ATR, etc. */
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
  var a = Math.abs(v);
  var k = 0;
  for(var i=0;i<n;i++){ if(Math.abs(arr[i])<=a) k++; }
  return k/n*100;
}
function barRet(bars){
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
function ctxCell(label, bars){
  if(!bars || bars.length<5) return '<div class="cell"><div class="ck">'+label+'</div><div class="cv mut">—</div></div>';
  var rets = barRet(bars);
  var last = bars[bars.length-1][4];
  var first = bars[0][4];
  var chg = last-first, pc = pct(last, first);
  var sd = stdev(rets)*100;
  var perc = absPercentile(rets, rets[rets.length-1]);
  var z = sd? (rets[rets.length-1]*100)/sd : 0;
  var cls = pc>0?"up":pc<0?"dn":"mut";
  var intensity = perc>=90?"EXTREME": perc>=75?"ELEVATED": perc>=50?"NORMAL":"QUIET";
  var intCls = perc>=90?"dn": perc>=75?"hi": perc>=50?"gn":"mut";
  return '<div class="cell"><div class="ck">'+label+'</div>'+
    '<div class="cv '+cls+'">'+A.pct(pc)+' <span class="mut">window</span></div>'+
    '<div class="cv mut">σ '+sd.toFixed(3)+'% · z '+z.toFixed(2)+'</div>'+
    '<div class="cv '+intCls+'">'+intensity+' · p'+perc.toFixed(0)+'</div></div>';
}
A.Spidey = {
  update: function(){
    var cd = A.chartData;
    var grid = document.getElementById("hist-grid");
    if(grid){
      grid.innerHTML = ctxCell("DXY", cd.DXY && cd.DXY.bars) +
                       ctxCell("US10Y", cd.US10Y && cd.US10Y.bars) +
                       ctxCell("EQUITIES", cd.EQUITIES && cd.EQUITIES.bars) +
                       ctxCell("USDJPY", cd.USDJPY && cd.USDJPY.bars);
    }
    /* SCENARIO ENGINE */
    var st = A.Macro && A.Macro.state; if(!st || !st.moves) return;
    var m = st.moves;
    var usdjpy = cd.USDJPY && cd.USDJPY.bars;
    var dxy = cd.DXY && cd.DXY.bars;
    if(!usdjpy || !dxy) return;
    var lastJ = usdjpy[usdjpy.length-1][4];
    var atrJ = atr(usdjpy,14);
    var lastD = dxy[dxy.length-1][4];
    var atrD = atr(dxy,14);
    var primary, alt, inv;
    if(st.biasDir>=1){
      primary = { t:"Long USDJPY on pullbacks toward "+A.fmt(lastJ-atrJ,3)+" — target "+A.fmt(lastJ+2*atrJ,3)+" as yield differential widens.", c:"gn" };
      alt = { t:"If DXY fades below "+A.fmt(lastD-atrD,2)+" with equities bid, rotate to long AUDJPY / short EURUSD reversal.", c:"hi" };
      inv = { t:"Invalidate USD-long thesis on DXY close below "+A.fmt(lastD-1.5*atrD,2)+" or US10Y reversal >1.5 ATR.", c:"dn" };
    } else if(st.biasDir<=-1){
      primary = { t:"Short USDJPY on bounces toward "+A.fmt(lastJ+atrJ,3)+" — target "+A.fmt(lastJ-2*atrJ,3)+" as yields roll.", c:"dn" };
      alt = { t:"If DXY reclaims "+A.fmt(lastD+atrD,2)+" with yields bid, flip to long USD/JPY retest and short EURUSD.", c:"hi" };
      inv = { t:"Invalidate USD-short thesis on DXY close above "+A.fmt(lastD+1.5*atrD,2)+" or equities breakdown.", c:"up" };
    } else {
      primary = { t:"Range-trade USDJPY between "+A.fmt(lastJ-atrJ,3)+" and "+A.fmt(lastJ+atrJ,3)+" — fade extremes.", c:"hi" };
      alt = { t:"Breakout setup: a decisive DXY close outside ±"+A.fmt(atrD,2)+" triggers directional extension trade.", c:"hi" };
      inv = { t:"Invalidate range-fade on two-candle breakout with expansion >1.5 ATR on DXY or US10Y.", c:"dn" };
    }
    var sg = document.getElementById("scen-grid");
    if(sg){
      sg.innerHTML =
        '<div class="cell"><div class="ck">PRIMARY</div><div class="cv '+primary.c+'">'+primary.t+'</div></div>'+
        '<div class="cell"><div class="ck">ALTERNATIVE</div><div class="cv '+alt.c+'">'+alt.t+'</div></div>'+
        '<div class="cell"><div class="ck">INVALIDATION</div><div class="cv '+inv.c+'">'+inv.t+'</div></div>';
    }
    A.Spidey.state = { primary:primary, alt:alt, inv:inv, atrJ:atrJ, atrD:atrD };
  }
};
})();
