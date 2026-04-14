/* ATLAS FX - execution-engine.js
   LOCKED two-column execution table. LEFT: RECOMMENDED | RIGHT: RANGE/ACTION.
   Row order: header | ENTRY | ENTRY EXT | EXIT | TREND | NEUTRAL | STOP 1 | STOP 2 | SELECT ONE STOP.
   Row markers are CSS color bars (no emojis, no unicode). Greenhorn explainer rendered below. */
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
  var s = A.activeSymbol || "USDJPY";
  var id = "ch-htf-1H";
  if(A.chartData[id] && A.chartData[id].bars && A.chartData[id].bars.length) return { sym:s, bars:A.chartData[id].bars };
  var j = "ch-macro-USDJPY";
  return { sym:"USDJPY", bars:(A.chartData[j]||{}).bars || [] };
}
function digits(sym){ return (A.SYMBOLS[sym]||A.FX[sym]||{digits:4}).digits; }
function row(label, rec, ra, colorClass){
  return '<tr class="xr '+colorClass+'">'+
    '<td class="xr-l"><span class="xr-bar"></span><span class="xr-lab">'+label+'</span>'+
      (rec!=null?'<span class="xr-rec">'+rec+'</span>':'')+
    '</td>'+
    '<td class="xr-r">'+ra+'</td>'+
  '</tr>';
}
function fmtR(v, d){ return A.fmt(v, d); }
var GH_EXPLAINER = [
  { lbl:"ENTRY POINT (GREEN)", txt:"The price where the plan is designed to enter. Do not chase - wait for price to come to this level. If it never arrives, you do not take the trade." },
  { lbl:"ENTRY EXTENDED (ORANGE)", txt:"A secondary entry level if price overshoots the first. Use it to add or to initiate a partial if you missed the primary. Never size larger than the primary." },
  { lbl:"EXIT POINT (RED)", txt:"The primary profit target. Take profit or trail here - do not hold past it without a plan. Most trades fail because winners are held too long, not because entries are wrong." },
  { lbl:"TREND (YELLOW)", txt:"Direction relative to the Point of Interest (POI). UP TOWARDS POI means price is moving into the level you care about. DOWN AWAY FROM POI means price is leaving it." },
  { lbl:"NEUTRAL MARKET (GREY)", txt:"Shown only when there is no bias. NO BIAS - WAIT - HOLD is not a position, it is an instruction. When drivers do not align, standing aside is the trade." },
  { lbl:"SET STOP LOSS (1) (RED)", txt:"The conservative stop. Tighter risk, tighter targets. Use this for range-trading or uncertain regimes. Pick ONLY ONE stop - not both." },
  { lbl:"EXTENDED STOP LOSS (2) (RED)", txt:"The wider stop. More room to breathe, larger risk, needs a larger position objective to justify. Use for trending regimes with strong conviction. Pick ONLY ONE stop - not both." },
  { lbl:"SELECT ONE STOP LOSS ONLY (YELLOW)", txt:"You are choosing between the two stops above, not using both. The trade is sized off the stop you pick. If your stop changes, your position size changes." }
];
function flowText(dir, st){
  if(!st || !st.moves) return { hd:"FLOW UNKNOWN", body:"awaiting macro data." };
  var m = st.moves;
  if(dir>0){
    return {
      hd:"USD INFLOW",
      body:"Capital is rotating into US assets. DXY "+A.pct(m.dxy.pc)+", US10Y "+A.pct(m.y10.pc)+", equities "+A.pct(m.eq.pc)+", USDJPY "+A.pct(m.jpy.pc)+". The dollar is winning the session."
    };
  }
  if(dir<0){
    return {
      hd:"USD OUTFLOW",
      body:"Capital is rotating out of US assets. DXY "+A.pct(m.dxy.pc)+", US10Y "+A.pct(m.y10.pc)+", equities "+A.pct(m.eq.pc)+", USDJPY "+A.pct(m.jpy.pc)+". The dollar is losing the session."
    };
  }
  return {
    hd:"ROTATIONAL",
    body:"Flows are mixed. DXY "+A.pct(m.dxy.pc)+", US10Y "+A.pct(m.y10.pc)+", equities "+A.pct(m.eq.pc)+", USDJPY "+A.pct(m.jpy.pc)+". No side owns the tape - expect chop."
  };
}
function whyText(sym, dir, st){
  if(!st || !st.moves) return "Macro state pending.";
  var m = st.moves;
  if(dir>0){
    return "DXY and yields confirm USD demand, equities and USDJPY line up with the tape. "+
      "A long "+sym+" bias expresses that flow with the cleanest risk/reward: entry is one-quarter of an average range below price, exit is 2.25 ranges above. "+
      "The stops sit outside the noise band where the thesis is clearly wrong.";
  }
  if(dir<0){
    return "DXY and yields are confirming USD supply while equities and USDJPY align with a weaker-dollar tape. "+
      "A short "+sym+" bias expresses that flow with the cleanest risk/reward: entry is one-quarter of a range above price, exit is 2.25 ranges below. "+
      "The stops sit above the noise band where the thesis is clearly wrong.";
  }
  return "Cross-asset signals are not aligned. There is no edge to chase. The plan converts to a range fade with minimum size - the only trade that pays in a regime like this.";
}
function whatText(dir, ranges){
  if(dir>0){
    return [
      "WAIT for price to reach the ENTRY zone ("+ranges.entryRange+"). Do not chase.",
      "CHOOSE one stop: SET STOP LOSS (1) at "+ranges.stopAFmt+" (conservative) or EXTENDED STOP LOSS (2) at "+ranges.stopBFmt+" (wider). Never use both.",
      "SIZE the position from the distance between entry and the chosen stop. The stop defines the size.",
      "EXIT at the target "+ranges.exitFmt+" unless the mechanism chain flips. Take profit at plan - do not improvise."
    ];
  }
  if(dir<0){
    return [
      "WAIT for price to reach the ENTRY zone ("+ranges.entryRange+"). Do not sell into weakness.",
      "CHOOSE one stop: SET STOP LOSS (1) at "+ranges.stopAFmt+" (conservative) or EXTENDED STOP LOSS (2) at "+ranges.stopBFmt+" (wider). Never use both.",
      "SIZE the position from the distance between entry and the chosen stop. The stop defines the size.",
      "EXIT at the target "+ranges.exitFmt+" unless the mechanism chain flips. Take profit at plan - do not improvise."
    ];
  }
  return [
    "STAND DOWN unless price reaches a range extreme. No conviction trade today.",
    "If fading: sell near "+ranges.entryExtFmt+", cover near "+ranges.exitFmt+". Small size only.",
    "If the market breaks out of range with expansion > 1.5 ATR, invalidate the fade immediately.",
    "Preserve capital. Poor regimes are where accounts die from forced trades."
  ];
}
A.Execution = {
  state: {},
  update: function(){
    var pick = pickSymbol();
    var sym = pick.sym, bars = pick.bars;
    var host = document.getElementById("exec-grid");
    var ctxHost = document.getElementById("exec-context");
    var ghHost = document.getElementById("exec-explainer");
    if(!host) return;
    if(!bars || !bars.length){
      host.innerHTML = '<div class="mut" style="padding:10px">awaiting data...</div>';
      if(ctxHost) ctxHost.innerHTML = '<div class="mut" style="padding:10px">awaiting data...</div>';
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
    var entryRange    = fmtR(entry-a*0.15,d)+"  to  "+fmtR(entry+a*0.15,d);
    var entryExtRange = fmtR(entryExt-a*0.15,d)+"  to  "+fmtR(entryExt+a*0.15,d);
    var exitRange     = fmtR(exit-a*0.15,d)+"  to  "+fmtR(exit+a*0.15,d);
    var stopARange    = fmtR(stopA-a*0.15,d)+"  to  "+fmtR(stopA+a*0.15,d);
    var stopBRange    = fmtR(stopB-a*0.15,d)+"  to  "+fmtR(stopB+a*0.15,d);
    var trendAction   = dir>0 ? '<span class="up">UP - TOWARDS POI</span>' :
                        dir<0 ? '<span class="dn">DOWN - AWAY FROM POI</span>' :
                        '<span class="mut">TOWARDS POI / AWAY FROM POI</span>';
    var neutralAction = dir===0 ? '<span class="hi">NO BIAS - WAIT - HOLD</span>'
                                : '<span class="mut">bias engaged - standby</span>';
    var provider = A.src.provider || "-";
    host.innerHTML =
      '<table class="exec-tbl">'+
        '<thead><tr class="xr xr-hdr">'+
          '<th><span class="xr-bar"></span><span class="xr-lab">RECOMMENDED</span><span class="xr-sub">'+sym+' . ATR '+fmtR(a,d)+' . '+provider+'</span></th>'+
          '<th class="xr-r">RANGE / ACTION</th>'+
        '</tr></thead>'+
        '<tbody>'+
          row('ENTRY POINT',          fmtR(entry,d),    entryRange,    'xc-entry')+
          row('ENTRY EXTENDED',       fmtR(entryExt,d), entryExtRange, 'xc-ext')+
          row('EXIT POINT',           fmtR(exit,d),     exitRange,     'xc-exit')+
          row('TREND',                null,             trendAction,   'xc-trend')+
          row('NEUTRAL MARKET',       null,             neutralAction, 'xc-neu')+
          row('SET STOP LOSS (1)',    fmtR(stopA,d),    stopARange,    'xc-stop')+
          row('EXTENDED STOP LOSS (2)',fmtR(stopB,d),   stopBRange,    'xc-stop')+
          '<tr class="xr xc-warn"><td colspan="2"><span class="xr-bar"></span><span class="xr-lab">SELECT ONE STOP LOSS ONLY</span></td></tr>'+
        '</tbody>'+
      '</table>';
    if(ctxHost){
      var flow = flowText(dir, st);
      var why  = whyText(sym, dir, st);
      var whatItems = whatText(dir, {
        entryRange:entryRange, entryExtRange:entryExtRange, exitRange:exitRange,
        entryFmt:fmtR(entry,d), entryExtFmt:fmtR(entryExt,d), exitFmt:fmtR(exit,d),
        stopAFmt:fmtR(stopA,d), stopBFmt:fmtR(stopB,d)
      });
      var flowCls = dir>0?"up":dir<0?"dn":"hi";
      ctxHost.innerHTML =
        '<div class="ctx-sec">'+
          '<div class="ctx-k">FLOW</div>'+
          '<div class="ctx-hd '+flowCls+'">'+flow.hd+'</div>'+
          '<div class="ctx-body">'+flow.body+'</div>'+
        '</div>'+
        '<div class="ctx-sec">'+
          '<div class="ctx-k">WHY THIS TRADE</div>'+
          '<div class="ctx-body">'+why+'</div>'+
        '</div>'+
        '<div class="ctx-sec">'+
          '<div class="ctx-k">WHAT TO DO</div>'+
          '<ol class="ctx-list">'+whatItems.map(function(t){return '<li>'+t+'</li>';}).join("")+'</ol>'+
        '</div>';
    }
    if(ghHost){
      ghHost.innerHTML = '<div class="exec-gh-hd">HOW TO READ THIS TABLE</div>' +
        '<div class="exec-gh-body">' +
        GH_EXPLAINER.map(function(e){
          return '<div class="exec-gh-row"><span class="exec-gh-lbl">'+e.lbl+'</span><span class="exec-gh-txt">'+e.txt+'</span></div>';
        }).join("") +
        '</div>';
    }
    A.Execution.state = { sym:sym, dir:dir, entry:entry, entryExt:entryExt, exit:exit, stopA:stopA, stopB:stopB, atr:a };
  }
};
window.ExecutionEngine = {
  init: async function(){ A.Execution.update(); return true; },
  run:  async function(symbol){ if(symbol) A.activeSymbol = (""+symbol).toUpperCase(); A.Execution.update(); return true; },
  load: async function(symbol){ if(symbol) A.activeSymbol = (""+symbol).toUpperCase(); A.Execution.update(); return true; }
};
})();
