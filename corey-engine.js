/* ATLAS FX - corey-engine.js
   COREY: Mechanism Chain - five boxes explaining cause -> effect propagation.
     Catalyst -> Transmission -> Risk Response -> FX Terminal -> Outcome
   Each box contains full readable text derived from live macro state - no jargon without
   a plain-English translation underneath, so a greenhorn can follow the logic. */
(function(){
var A = window.ATLAS;
function fmtMove(m){ return (m.pc>=0?"+":"")+(+m.pc).toFixed(2)+"%"; }
function word(dir, up, dn, flat){ return dir>0?up : dir<0?dn : flat; }
function box(step, label, text, greenhorn, cls){
  return '<div class="chain-box '+(cls||"")+'">'+
    '<div class="cb-step">STEP '+step+'</div>'+
    '<div class="cb-lbl">'+label+'</div>'+
    '<div class="cb-body">'+text+'</div>'+
    '<div class="cb-gh">'+greenhorn+'</div>'+
  '</div>';
}
A.Corey = {
  update: function(){
    var st = A.Macro && A.Macro.state;
    var root = document.getElementById("mech-chain"); if(!root) return;
    if(!st || !st.moves){ root.innerHTML = '<div class="mut">awaiting macro data...</div>'; return; }
    var m = st.moves;
    /* STEP 1 CATALYST */
    var catalyst, cgh, cCls;
    if(Math.abs(m.y10.pc) > Math.abs(m.dxy.pc)){
      catalyst = "US 10-year Treasury yield is "+word(m.y10.dir,"rising","falling","flat")+" "+fmtMove(m.y10)+". Bond pricing leads the cycle today - the rates market is repricing expectations of Fed policy or growth before FX does.";
      cgh = "Translation: the bond market moved first. When US yields rise, holding dollars pays more; when they fall, the dollar becomes less attractive. Everything else reacts to this.";
      cCls = m.y10.dir>0?"up":m.y10.dir<0?"dn":"mut";
    } else {
      catalyst = "The Dollar Index (DXY) is "+word(m.dxy.dir,"bid","offered","flat")+" "+fmtMove(m.dxy)+". The USD itself is leading - likely reserve flow, risk-off funding demand, or intervention - rather than yields.";
      cgh = "Translation: dollars are being bought or sold directly. That usually means big institutions are moving money in or out of US assets for reasons beyond just interest rates.";
      cCls = m.dxy.dir>0?"up":m.dxy.dir<0?"dn":"mut";
    }
    /* STEP 2 TRANSMISSION */
    var trans, tgh, tCls;
    if(m.y10.dir>0 && m.dxy.dir>0){
      trans = "Rising yields AND a stronger dollar confirm each other. Global capital is rotating into USD assets because real returns there look better than alternatives. This is the cleanest USD-long signal.";
      tgh = "Translation: bonds and dollars are both attractive. When they both go up together, the rest of the world is sending money to America.";
      tCls = "up";
    } else if(m.y10.dir<0 && m.dxy.dir<0){
      trans = "Falling yields AND a weaker dollar. The reserve edge is compressing. Funds are leaving USD paper for higher-yielding currencies or for riskier assets abroad.";
      tgh = "Translation: people don't want the dollar as much. They're moving money out of the US and into other countries or assets.";
      tCls = "dn";
    } else if(m.y10.dir>0){
      trans = "Yields up but DXY not confirming. Growth/risk channel is dominating the rates channel - higher rates are being offset by risk-on flows into non-USD risk.";
      tgh = "Translation: yields are rising but the dollar isn't - the market is treating rising rates as a growth story, not a defensive one, so money flows to riskier assets elsewhere.";
      tCls = "hi";
    } else if(m.y10.dir<0){
      trans = "Yields down but DXY bid. Safe-haven or funding-stress channel is dominating. When US rates fall and the dollar still rises, something is breaking somewhere.";
      tgh = "Translation: yields are dropping but the dollar is still strong - that's unusual, and usually means traders are nervous and parking cash in dollars for safety.";
      tCls = "hi";
    } else {
      trans = "Cross-asset signals are unclear. Yield and USD are not aligned - the transmission channel is undecided.";
      tgh = "Translation: the bond market and the dollar disagree. Wait for clearer signals before taking positions.";
      tCls = "mut";
    }
    /* STEP 3 RISK RESPONSE */
    var risk, rgh, rCls;
    if(m.eq.dir>0 && m.dxy.dir<0){
      risk = "Equities bid while USD is offered - textbook reflation tape. Investors prefer stocks over bonds/cash; risk appetite is high.";
      rgh = "Translation: stocks up, dollar down = risk-on. People are feeling confident and buying growth assets.";
      rCls = "up";
    } else if(m.eq.dir<0 && m.dxy.dir>0){
      risk = "Equities offered while USD is bid - classic risk-off rotation. Stocks are being sold and proceeds parked in dollars.";
      rgh = "Translation: stocks down, dollar up = risk-off. Investors are scared and hiding in dollars.";
      rCls = "dn";
    } else if(m.eq.dir>0 && m.dxy.dir>0){
      risk = "Equities AND USD both bid - this is the US-exceptionalism / growth-surprise pattern. Foreign capital is chasing US assets specifically.";
      rgh = "Translation: both stocks and the dollar are up - the world is betting on America outperforming everyone else.";
      rCls = "up";
    } else if(m.eq.dir<0 && m.dxy.dir<0){
      risk = "Equities AND USD both offered - de-risking with dollar funding unwinds. Leverage is being reduced across the board, including USD-financed positions.";
      rgh = "Translation: stocks and the dollar are falling together - markets are deleveraging, and even the dollar isn't safe.";
      rCls = "dn";
    } else {
      risk = "Risk assets are churning without clear direction. No dominant flow has emerged.";
      rgh = "Translation: markets are indecisive. Wait for a catalyst.";
      rCls = "mut";
    }
    /* STEP 4 FX TERMINAL */
    var fx, fgh, fCls;
    if(m.jpy.dir>0 && m.y10.dir>0){
      fx = "USDJPY is rising with yields - the US-Japan rate spread is widening in America's favour, and the yen carry trade is being re-funded.";
      fgh = "Translation: traders borrow yen cheaply and buy dollars because dollars pay higher interest. More dollar demand lifts USDJPY.";
      fCls = "up";
    } else if(m.jpy.dir<0 && m.y10.dir<0){
      fx = "USDJPY falling with yields - carry is unwinding. Japanese investors are repatriating, or the BoJ / risk-off is forcing yen strength.";
      fgh = "Translation: the interest rate edge is shrinking. Traders are unwinding the borrow-yen-buy-dollar trade and sending the yen higher.";
      fCls = "dn";
    } else if(m.jpy.dir>0){
      fx = "USDJPY rising against the yield signal - intervention risk or risk-off funding flows are driving the pair.";
      fgh = "Translation: USDJPY is rising for reasons other than interest rates. Japan may intervene - be cautious here.";
      fCls = "hi";
    } else if(m.jpy.dir<0){
      fx = "USDJPY falling - yen strength via repatriation, safe-haven demand, or yield collapse.";
      fgh = "Translation: the yen is strengthening against the dollar - the world wants yen for safety or Japanese investors are bringing money home.";
      fCls = "dn";
    } else {
      fx = "USDJPY is flat - the rate differential is at equilibrium for now.";
      fgh = "Translation: USDJPY isn't moving. Watch the rate spread - when that moves, USDJPY will follow.";
      fCls = "mut";
    }
    /* STEP 5 OUTCOME */
    var out, ogh, oCls;
    if(st.biasDir>=1){
      out = "Net USD-LONG regime. Preferred expressions: long USD crosses (USDJPY, USDCAD), short commodity FX (AUD, NZD), short EUR and GBP into strength.";
      ogh = "Translation: bet with the dollar. Trade setups that benefit when the dollar keeps rising - these are higher-probability today.";
      oCls = "gn";
    } else if(st.biasDir<=-1){
      out = "Net USD-SHORT regime. Preferred expressions: long commodity FX (AUD, NZD), short DXY, long EUR/USD into dips.";
      ogh = "Translation: bet against the dollar. Trade setups that benefit when the dollar falls - those are higher-probability today.";
      oCls = "dn";
    } else {
      out = "Balanced regime - no dominant trend. Range-trade majors, fade extremes, or stand aside until a catalyst forces direction.";
      ogh = "Translation: the market is indecisive. Small trades at range edges or wait for news before committing size.";
      oCls = "hi";
    }
    root.innerHTML =
      box(1,"CATALYST",      catalyst, cgh, cCls)+
      box(2,"TRANSMISSION",  trans,    tgh, tCls)+
      box(3,"RISK RESPONSE", risk,     rgh, rCls)+
      box(4,"FX TERMINAL",   fx,       fgh, fCls)+
      box(5,"OUTCOME",       out,      ogh, oCls);
  }
};
})();
