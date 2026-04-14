/* ATLAS FX — execution-engine.js
   LOCKED two-column execution table. LEFT: RECOMMENDED · RIGHT: RANGE/ACTION.
   Row order: header · ENTRY · ENTRY EXT · EXIT · TREND · NEUTRAL · STOP 1 · STOP 2 · WARNING.
   All values ATR-derived from USDJPY (or the active symbol if loaded). */
(function(){
var A = window.ATLAS;
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
function pickSymbol(){
  var s = A.activeSymbol;
  if(s && A.chartData[s] && A.chartData[s].bars && A.chartData[s].bars.length) return s;
  return "USDJPY";
}
function digits(sym){ if(A.FX[sym]) return A.FX[sym].digits; if(A.SYMBOLS[sym]) return A.SYMBOLS[sym].digits; return 4; }
function row(emoji, label, rec, ra, colorClass){
  return '<tr class="xr '+colorClass+'">'+
    '<td class="xr-l"><span class="xr-emo">'+emoji+'</span><span class="xr-lab">'+label+'</span>'+
      (rec!=null?'<span class="xr-rec">'+rec+'</span>':'')+
    '</td>'+
    '<td class="xr-r">'+ra+'</td>'+
  '</tr>';
}
function fmtR(v, d){ return A.fmt(v, d); }
A.Execution = {
  state: {},
  update: function(){
    var sym = pickSymbol();
    var bars = (A.chartData[sym] && A.chartData[sym].bars) || [];
    if(!bars.length){
      var grid = document.getElementById("exec-grid");
      if(grid) grid.innerHTML = '<div class="cell"><div class="cv mut">awaiting data</div></div>';
      return;
    }
    var st = A.Macro && A.Macro.state;
    var dir = st && st.biasDir>=1 ? 1 : (st && st.biasDir<=-1 ? -1 : 0);
    var last = bars[bars.length-1][4];
    var a = atr(bars, 14) || Math.max(0.0001, last*0.002);
    var d = digits(sym);
    var entry, exit, stopA, stopB, entryExt;
    if(dir>0){
      entry    = last - a*0.25;
      entryExt = last + a*0.75;
      exit     = last + a*2.25;
      stopA    = last - a*1.25;
      stopB    = last - a*1.75;
    } else if(dir<0){
      entry    = last + a*0.25;
      entryExt = last - a*0.75;
      exit     = last - a*2.25;
      stopA    = last + a*1.25;
      stopB    = last + a*1.75;
    } else {
      entry    = last;
      entryExt = last + a*0.5;
      exit     = last + a*1.0;
      stopA    = last - a*1.0;
      stopB    = last - a*1.5;
    }
    var entryRange    = fmtR(entry-a*0.15,d)+" — "+fmtR(entry+a*0.15,d);
    var entryExtRange = fmtR(entryExt-a*0.15,d)+" — "+fmtR(entryExt+a*0.15,d);
    var exitRange     = fmtR(exit-a*0.15,d)+" — "+fmtR(exit+a*0.15,d);
    var stopARange    = fmtR(stopA-a*0.15,d)+" — "+fmtR(stopA+a*0.15,d);
    var stopBRange    = fmtR(stopB-a*0.15,d)+" — "+fmtR(stopB+a*0.15,d);
    var trendAction   = dir>0 ? '<span class="up">&#x2B06; TOWARDS POI</span>' :
                        dir<0 ? '<span class="dn">&#x2B07; AWAY FROM POI</span>' :
                        '<span class="mut">&#x2B06; TOWARDS POI / &#x2B07; AWAY FROM POI</span>';
    var neutralAction = dir===0 ? '<span class="hi">NO BIAS &mdash; WAIT &mdash; HOLD</span>'
                                : '<span class="mut">bias engaged &mdash; standby</span>';
    var provider = A.src.provider || "—";
    var host = document.getElementById("exec-grid");
    if(!host) return;
    /* Rebuild host as a table */
    host.innerHTML =
      '<table class="exec-tbl">'+
        '<thead><tr class="xr xr-hdr">'+
          '<th><span class="xr-dot">&#x25CF;</span><span class="xr-lab">RECOMMENDED</span><span class="xr-sub">'+sym+' &middot; ATR '+fmtR(a,d)+' &middot; '+provider+'</span></th>'+
          '<th class="xr-r">RANGE / ACTION</th>'+
        '</tr></thead>'+
        '<tbody>'+
          row('&#x1F7E2;','ENTRY POINT',     fmtR(entry,d),    entryRange,    'xc-entry')+
          row('&#x1F7E0;','ENTRY EXTENDED',  fmtR(entryExt,d), entryExtRange, 'xc-ext')+
          row('&#x1F534;','EXIT POINT',      fmtR(exit,d),     exitRange,     'xc-exit')+
          row('&#x1F7E8;','TREND',           null,             trendAction,   'xc-trend')+
          row('&#x26AA;','NEUTRAL MARKET',   null,             neutralAction, 'xc-neu')+
          row('&#x1F6D1;','SET STOP LOSS (1)',fmtR(stopA,d),   stopARange,    'xc-stop')+
          row('&#x1F6D1;','EXTENDED STOP LOSS (2)',fmtR(stopB,d),stopBRange,  'xc-stop')+
          '<tr class="xr xc-warn"><td colspan="2"><span class="xr-emo">&#x26A0;</span><span class="xr-lab">SELECT ONE STOP LOSS ONLY</span></td></tr>'+
        '</tbody>'+
      '</table>';
    A.Execution.state = { sym:sym, dir:dir, entry:entry, entryExt:entryExt, exit:exit, stopA:stopA, stopB:stopB, atr:a };
  }
};
/* PUBLIC MODULE API */
window.ExecutionEngine = {
  init: async function(){ A.Execution.update(); return true; },
  run:  async function(symbol){ if(symbol) A.activeSymbol = (""+symbol).toUpperCase(); A.Execution.update(); return true; },
  load: async function(symbol){ if(symbol) A.activeSymbol = (""+symbol).toUpperCase(); A.Execution.update(); return true; }
};
})();
