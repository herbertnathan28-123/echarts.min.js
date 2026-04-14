/* ATLAS FX — execution-engine.js
   Computes live execution map: ENTRY / STOP / TARGET / FLOW for the active bias,
   using USDJPY as primary execution vehicle and DXY as confirming proxy. Values are ATR-based. */
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
A.Execution = {
  state: {},
  update: function(){
    var cd = A.chartData; var st = A.Macro && A.Macro.state;
    if(!st || !cd.USDJPY || !cd.USDJPY.bars || !cd.USDJPY.bars.length) return;
    var jpy = cd.USDJPY.bars;
    var last = jpy[jpy.length-1][4];
    var a = atr(jpy, 14);
    var dir = st.biasDir>=1 ? 1 : st.biasDir<=-1 ? -1 : 0;
    var entry, stop, target, flowLabel, flowCls, rMultiple;
    if(dir>0){
      entry = last - a*0.25;
      stop  = last - a*1.25;
      target = last + a*2.25;
      flowLabel = "USD INFLOW · LONG USDJPY";
      flowCls = "gn";
    } else if(dir<0){
      entry = last + a*0.25;
      stop  = last + a*1.25;
      target = last - a*2.25;
      flowLabel = "USD OUTFLOW · SHORT USDJPY";
      flowCls = "dn";
    } else {
      entry = last;
      stop  = last - a*1.0;
      target = last + a*1.0;
      flowLabel = "RANGE · FADE EXTREMES";
      flowCls = "hi";
    }
    var risk = Math.abs(entry-stop);
    var reward = Math.abs(target-entry);
    rMultiple = risk? (reward/risk) : 0;
    var dg = A.SYMBOLS.USDJPY.digits;
    var grid = document.getElementById("exec-grid");
    if(grid){
      grid.innerHTML =
        '<div class="cell"><div class="ck">ENTRY</div>'+
          '<div class="cb or">'+A.fmt(entry,dg)+'</div>'+
          '<div class="cv mut">USDJPY · '+(dir>0?"buy pullback":dir<0?"sell bounce":"neutral mid")+'</div></div>'+
        '<div class="cell"><div class="ck">STOP</div>'+
          '<div class="cb dn">'+A.fmt(stop,dg)+'</div>'+
          '<div class="cv mut">ATR × 1.25 · '+A.fmt(risk,dg)+' pips risk</div></div>'+
        '<div class="cell"><div class="ck">TARGET</div>'+
          '<div class="cb gn">'+A.fmt(target,dg)+'</div>'+
          '<div class="cv mut">R '+rMultiple.toFixed(2)+' · '+A.fmt(reward,dg)+' reach</div></div>'+
        '<div class="cell"><div class="ck">FLOW</div>'+
          '<div class="cb '+flowCls+'">'+flowLabel+'</div>'+
          '<div class="cv mut">DXY '+A.pct(st.moves.dxy.pc)+' · 10Y '+A.pct(st.moves.y10.pc)+'</div></div>';
    }
    A.Execution.state = { dir:dir, entry:entry, stop:stop, target:target, r:rMultiple, atr:a, flow:flowLabel };
  }
};
/* PUBLIC MODULE API */
window.ExecutionEngine = {
  init: async function(){
    A.Execution.update();
    return true;
  }
};
})();
