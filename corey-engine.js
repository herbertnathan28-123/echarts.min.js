/* ATLAS FX — corey-engine.js
   COREY: macro mechanism chain — cause → effect propagation.
   Builds a live chain of nodes based on the current direction of DXY, US10Y, EQUITIES, USDJPY. */
(function(){
var A = window.ATLAS;
function dirWord(d, up, down, flat){ return d>0 ? up : (d<0 ? down : flat); }
function fmtMove(m, d){ return (m.pc>=0?"+":"")+(+m.pc).toFixed(2)+"%"; }
function node(label, text, cls){
  return '<div class="node"><div class="nk">'+label+'</div><div class="nv '+(cls||"")+'">'+text+'</div></div>';
}
function arrow(){ return '<div class="arrow">→</div>'; }
A.Corey = {
  update: function(){
    var st = A.Macro && A.Macro.state; if(!st || !st.moves) return;
    var m = st.moves;
    var root = document.getElementById("mech-chain"); if(!root) return;
    /* DRIVER */
    var driverText, driverCls;
    if(Math.abs(m.y10.pc) > Math.abs(m.dxy.pc)){
      driverText = "US10Y "+dirWord(m.y10.dir,"rising","falling","flat")+" "+fmtMove(m.y10)+" — rates pricing shift leads";
      driverCls = m.y10.dir>0?"up":m.y10.dir<0?"dn":"mut";
    } else {
      driverText = "DXY "+dirWord(m.dxy.dir,"bid","offered","flat")+" "+fmtMove(m.dxy)+" — USD demand leads";
      driverCls = m.dxy.dir>0?"up":m.dxy.dir<0?"dn":"mut";
    }
    /* TRANSMISSION */
    var trans;
    if(m.y10.dir>0 && m.dxy.dir>0) trans = { t:"Real yield advantage pulls global capital into USD assets", c:"up" };
    else if(m.y10.dir<0 && m.dxy.dir<0) trans = { t:"Yield compression erodes USD carry edge, reserve flows rotate out", c:"dn" };
    else if(m.y10.dir>0 && m.dxy.dir<=0) trans = { t:"Yields rise but USD fails to follow — growth/risk channel dominates", c:"hi" };
    else if(m.y10.dir<0 && m.dxy.dir>=0) trans = { t:"USD bid despite soft yields — safe-haven/stress channel active", c:"hi" };
    else trans = { t:"Cross-asset signals mixed — transmission uncertain", c:"mut" };
    /* CROSS-ASSET RESPONSE */
    var cross;
    if(m.eq.dir>0 && m.dxy.dir<0) cross = { t:"Equities bid, USD offered — risk-on reflation tape", c:"up" };
    else if(m.eq.dir<0 && m.dxy.dir>0) cross = { t:"Equities offered, USD bid — classic risk-off rotation", c:"dn" };
    else if(m.eq.dir>0 && m.dxy.dir>0) cross = { t:"Equities and USD both bid — US exceptionalism / growth surprise", c:"up" };
    else if(m.eq.dir<0 && m.dxy.dir<0) cross = { t:"Equities and USD both offered — systemic de-risking, funding unwind", c:"dn" };
    else cross = { t:"Risk assets churning — awaiting directional catalyst", c:"mut" };
    /* FX TERMINAL */
    var fx;
    if(m.jpy.dir>0 && m.y10.dir>0) fx = { t:"USDJPY bid with yields — rate differential expanding, JPY carry short funded", c:"up" };
    else if(m.jpy.dir<0 && m.y10.dir<0) fx = { t:"USDJPY offered with yields — carry unwind, JPY strength via BoJ/risk-off", c:"dn" };
    else if(m.jpy.dir>0) fx = { t:"USDJPY rising against yield direction — intervention risk / risk-off funding", c:"hi" };
    else if(m.jpy.dir<0) fx = { t:"USDJPY falling — JPY strength on repatriation or yield collapse", c:"dn" };
    else fx = { t:"USDJPY flat — equilibrium, watch carry spread", c:"mut" };
    /* OUTCOME */
    var outcome;
    if(st.biasDir>=1) outcome = { t:"Net USD-long regime — long USD crosses preferred, short EUR/GBP reflation trades", c:"gn" };
    else if(st.biasDir<=-1) outcome = { t:"Net USD-short regime — long AUD/NZD/commodity FX preferred, short DXY", c:"dn" };
    else outcome = { t:"Balanced regime — range-trade majors, scalp news catalysts only", c:"hi" };
    root.innerHTML =
      node("CATALYST", driverText, driverCls)+arrow()+
      node("TRANSMISSION", trans.t, trans.c)+arrow()+
      node("RISK RESPONSE", cross.t, cross.c)+arrow()+
      node("FX TERMINAL", fx.t, fx.c)+arrow()+
      node("OUTCOME", outcome.t, outcome.c);
  }
};
})();
