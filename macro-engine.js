/* ATLAS FX — macro-engine.js
   Derives the Macro Header (Bias/Conviction/Risk/USD/Volatility) from live chart data.
   All values are computed from loaded bars — no static values. */
(function(){
var A = window.ATLAS;
function last(bars){ return bars[bars.length-1]; }
function first(bars){ return bars[0]; }
function pct(a,b){ return b? ((a-b)/b*100) : 0; }
function stdev(arr){
  if(!arr || arr.length<2) return 0;
  var m = arr.reduce(function(s,v){return s+v;},0)/arr.length;
  var v = arr.reduce(function(s,x){return s+(x-m)*(x-m);},0)/(arr.length-1);
  return Math.sqrt(v);
}
function returns(bars){
  var r=[]; for(var i=1;i<bars.length;i++){ r.push((bars[i][4]-bars[i-1][4])/bars[i-1][4]); } return r;
}
function mmove(bars){
  if(!bars || !bars.length) return { chg:0, pc:0, dir:0 };
  var c = last(bars)[4], f = first(bars)[4];
  return { chg:c-f, pc:pct(c,f), dir: c>f?1:(c<f?-1:0) };
}
function conviction(scores){
  /* scores are aligned directions (-1,0,1). absolute sum / count */
  var total = 0, n = scores.length;
  for(var i=0;i<n;i++) total += scores[i];
  var r = Math.abs(total)/n;
  if(r>=0.75) return { label:"HIGH", cls:"gn" };
  if(r>=0.5) return { label:"MEDIUM", cls:"hi" };
  if(r>=0.25) return { label:"LOW", cls:"or" };
  return { label:"FLAT", cls:"mut" };
}
A.Macro = {
  state: {},
  update: function(){
    var cd = A.chartData;
    var dxy = cd.DXY && cd.DXY.bars;
    var y10 = cd.US10Y && cd.US10Y.bars;
    var eq  = cd.EQUITIES && cd.EQUITIES.bars;
    var jpy = cd.USDJPY && cd.USDJPY.bars;
    if(!dxy || !y10 || !eq || !jpy) return;
    var mDxy = mmove(dxy), mY = mmove(y10), mE = mmove(eq), mJ = mmove(jpy);
    /* BIAS: USD strength composite */
    var usdScore = 0;
    if(mDxy.dir>0) usdScore++; if(mDxy.dir<0) usdScore--;
    if(mJ.dir>0)  usdScore++; if(mJ.dir<0)  usdScore--;
    var biasLabel = usdScore>=1?"USD LONG": usdScore<=-1?"USD SHORT":"USD FLAT";
    var biasCls = usdScore>0?"gn":usdScore<0?"dn":"mut";
    /* CONVICTION: composite of all four direction alignments relative to USD-long */
    var conv = conviction([
      mDxy.dir, -mE.dir /* equities weaker supports USD long */, mY.dir /* yields up supports USD */, mJ.dir
    ].map(function(x){ return Math.sign(x); }));
    /* RISK */
    var riskScore = 0;
    if(mE.dir>0) riskScore++; if(mE.dir<0) riskScore--;
    if(mY.dir>0) riskScore++; /* yields up often risk-on initially */
    if(mDxy.dir<0) riskScore++; /* weak USD = risk-on */
    var riskLabel = riskScore>=2?"RISK-ON": riskScore<=-1?"RISK-OFF":"MIXED";
    var riskCls = riskScore>=2?"gn":riskScore<=-1?"dn":"hi";
    /* USD */
    var usdLabel = mDxy.dir>0?"STRENGTH":mDxy.dir<0?"WEAKNESS":"STABLE";
    var usdCls = mDxy.dir>0?"up":mDxy.dir<0?"dn":"mut";
    /* VOLATILITY */
    var rets = returns(dxy).concat(returns(jpy));
    var vol = stdev(rets)*100;
    var volLabel = vol<0.05?"LOW": vol<0.15?"NORMAL": vol<0.3?"ELEVATED":"EXTREME";
    var volCls = vol<0.05?"mut": vol<0.15?"gn": vol<0.3?"hi":"dn";
    var set = function(id, txt, sub, cls){
      var el = document.getElementById(id); if(!el) return;
      el.textContent = txt;
      el.className = "v " + (cls||"");
      var se = document.getElementById(id+"-s"); if(se && sub) se.textContent = sub;
    };
    set("mh-bias", biasLabel, "DXY "+A.pct(mDxy.pc)+" · JPY "+A.pct(mJ.pc), biasCls);
    set("mh-conv", conv.label, "alignment "+(conv.label.toLowerCase()), conv.cls);
    set("mh-risk", riskLabel, "ES "+A.pct(mE.pc)+" · 10Y "+A.pct(mY.pc), riskCls);
    set("mh-usd",  usdLabel,  "DXY "+A.fmt(last(dxy)[4],2)+" "+A.pct(mDxy.pc), usdCls);
    set("mh-vol",  volLabel,  "σ "+vol.toFixed(3)+"%", volCls);
    /* TRADE STATUS block */
    var flowLabel = mDxy.dir>0 && mJ.dir>0 ? "USD INFLOW" : (mDxy.dir<0 && mJ.dir<0 ? "USD OUTFLOW" : "ROTATION");
    var flowCls   = mDxy.dir>0 && mJ.dir>0 ? "gn" : (mDxy.dir<0 && mJ.dir<0 ? "dn" : "hi");
    var validity = new Date(Date.now()+4*3600*1000).toISOString().substr(11,5)+"Z";
    set("ts-bias", biasLabel, null, biasCls);
    set("ts-conv", conv.label, null, conv.cls);
    set("ts-flow", flowLabel, null, flowCls);
    set("ts-regime", riskLabel, null, riskCls);
    set("ts-validity", "valid until "+validity, null, "mut");
    A.Macro.state = {
      bias:biasLabel, biasCls:biasCls, biasDir:usdScore,
      conv:conv.label, convCls:conv.cls,
      risk:riskLabel, riskCls:riskCls,
      usd:usdLabel, vol:vol, volLabel:volLabel,
      moves:{dxy:mDxy, y10:mY, eq:mE, jpy:mJ},
      flow:flowLabel
    };
  }
};
/* PUBLIC MODULE API */
window.MacroEngine = {
  init: async function(){
    A.Macro.update();
    if(A.Corey) A.Corey.update();
    if(A.Spidey) A.Spidey.update();
    if(A.Jane){
      A.Jane.renderTerms && A.Jane.renderTerms();
      A.Jane.update && A.Jane.update();
      A.Jane.loadMatrix && A.Jane.loadMatrix();
      A.Jane.loadEvents && A.Jane.loadEvents();
    }
    return true;
  }
};
})();
