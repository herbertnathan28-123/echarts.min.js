/* ATLAS FX - macro-engine.js
   STATUS SECTION ENGINE.
   Builds the entire #status-root content from the four live macro-driver bars
   (DXY / US10Y / EQUITIES / USDJPY) and the currently active symbol.
   Plain English throughout - no jargon, no abbreviations without explanation.

   Output sections (per the UI spec):
     A. System Summary - what is happening, what it means for the symbol,
        what should be favoured.
     B. Trade Condition - FAVOURABLE / CAUTION / UNFAVOURABLE.
     C. Signal Strength - X / 10 with bar.
     D. Per-category dot system (5 dots each):
        BIAS, CONVICTION, FLOW, REGIME
        - green dot  = supports the favoured trade direction
        - red dot    = opposes the favoured trade direction
        - white dot  = active but neutral for this trade
        - empty dot  = unused / inactive level of intensity
        Each category has a one-paragraph plain-English explanation.
     E. Expandable colour key.
     F. VALIDITY card - how long this analysis is current, in plain English.

   Side-effect: keeps A.Macro.state populated with biasDir + moves so that
   Corey, Spidey, and Execution engines continue to work unchanged. */
(function(){
var A = window.ATLAS;

function last(b){ return b[b.length-1]; }
function first(b){ return b[0]; }
function pct(a,b){ return b? ((a-b)/b*100) : 0; }
function mmove(bars){
  if(!bars || !bars.length) return { chg:0, pc:0, dir:0 };
  var c = last(bars)[4], f = first(bars)[4];
  return { chg:c-f, pc:pct(c,f), dir: c>f?1:(c<f?-1:0) };
}
function stdev(arr){
  if(!arr || arr.length<2) return 0;
  var m = arr.reduce(function(s,v){return s+v;},0)/arr.length;
  return Math.sqrt(arr.reduce(function(s,x){return s+(x-m)*(x-m);},0)/(arr.length-1));
}
function returns(bars){
  var r=[]; for(var i=1;i<bars.length;i++){ r.push((bars[i][4]-bars[i-1][4])/bars[i-1][4]); } return r;
}
function panelBars(panelId){
  var d = A.chartData && A.chartData[panelId];
  return (d && d.bars) || null;
}
/* Translate a USD direction (-1/0/+1) into the favoured direction for the
   active symbol. USDxxx pairs follow USD; xxxUSD pairs invert; non-USD
   crosses defer to zero. */
function favouredSymDir(sym, usdDir){
  if(!usdDir) return 0;
  if(/^USD/.test(sym)) return usdDir;
  if(/USD$/.test(sym)) return -usdDir;
  return 0;
}
function dotsHtml(filled, colour){
  filled = Math.max(0, Math.min(5, Math.round(filled)));
  var html = '<div class="dots">';
  for(var i=0;i<5;i++){
    html += (i<filled) ? '<span class="dot '+colour+'"></span>' : '<span class="dot"></span>';
  }
  return html + '</div>';
}
function buildSummary(sym, biasDir, favDir){
  var usd = biasDir>0 ? '<b>strengthening</b>' : biasDir<0 ? '<b>weakening</b>' : '<b>showing no clear direction</b>';
  var move;
  if(favDir>0)      move = sym + ' is more likely to <b>move higher</b>';
  else if(favDir<0) move = sym + ' is more likely to <b>move lower</b>';
  else              move = sym + ' is more likely to <b>remain in its current range</b>';
  var act;
  if(favDir>0)      act = '<b>Buying ' + sym + '</b> is currently more favourable than selling.';
  else if(favDir<0) act = '<b>Selling ' + sym + '</b> is currently more favourable than buying.';
  else              act = '<b>Standing aside on ' + sym + '</b> is currently more favourable than entering a position.';
  return 'The US Dollar is ' + usd + '. ' + move + '. ' + act;
}

/* [COREY] driver readiness inspector — collapses the four per-key chartStatus
   values into one of LOADING / READY / FAILED. READY requires all four bars
   present AND all four marked 'ready'. FAILED fires the moment any driver is
   marked 'failed'. Anything else is LOADING. */
function macroReadiness(){
  var keys = ['ch-macro-DXY','ch-macro-US10Y','ch-macro-EQUITIES','ch-macro-USDJPY'];
  var byKey = {};
  var anyFailed = false, allReady = true;
  keys.forEach(function(k){
    var st = (A.chartStatus && A.chartStatus[k]) || 'loading';
    var bars = panelBars(k);
    byKey[k] = {
      status: st,
      bars: (bars && bars.length) ? bars.length : 0,
      reason: (A.chartFailReason && A.chartFailReason[k]) || null
    };
    if(st === 'failed') anyFailed = true;
    if(st !== 'ready' || !bars || !bars.length) allReady = false;
  });
  var overall = anyFailed ? 'FAILED' : (allReady ? 'READY' : 'LOADING');
  return { overall:overall, byKey:byKey };
}

A.Macro = {
  state: {},
  readiness: macroReadiness,
  update: function(){
    var dxy = panelBars('ch-macro-DXY');
    var y10 = panelBars('ch-macro-US10Y');
    var eq  = panelBars('ch-macro-EQUITIES');
    var jpy = panelBars('ch-macro-USDJPY');
    var sym = A.activeSymbol || 'EURUSD';
    var root = document.getElementById('status-root');
    if(!root) return;

    /* [COREY] instrumentation point 5 — macro panel readiness state for all
       four macro drivers. Logged on every update() call so the console reflects
       the current state snapshot. */
    var ready = macroReadiness();
    console.log("[COREY] macro readiness", ready);

    if(ready.overall !== 'READY'){
      var rows = ['DXY','US10Y','EQUITIES','USDJPY'].map(function(label){
        var k = 'ch-macro-' + label;
        var info = ready.byKey[k];
        var tag = info.status === 'ready'   ? '<span class="macro-tag rdy">READY</span>'
                : info.status === 'failed'  ? '<span class="macro-tag fail">FAILED</span>'
                :                             '<span class="macro-tag load">LOADING</span>';
        var detail = info.status === 'failed' ? ' <span class="macro-reason">' + (info.reason || 'unknown') + '</span>' : '';
        return '<div class="macro-row"><span class="macro-k">' + label + '</span>' + tag + detail + '</div>';
      }).join('');
      var headline = ready.overall === 'FAILED'
        ? 'Macro drivers <b>FAILED</b> &mdash; one or more of the four macro feeds is unavailable. Status cannot be computed until the failure is cleared.'
        : 'Macro drivers <b>LOADING</b> &mdash; awaiting DXY, US10Y, Equities, and USDJPY bars.';
      root.innerHTML =
        '<div class="sx-summary sx-macro-status ' + ready.overall.toLowerCase() + '">' +
          headline +
          '<div class="macro-grid">' + rows + '</div>' +
        '</div>';
      /* [COREY] preserve downstream-visible state shape; mark not-ready so
         Corey / Spidey / Jane / Execution consumers do not treat stale or
         partial data as a computable snapshot. */
      A.Macro.state = { ready:false, overallStatus:ready.overall, byKey:ready.byKey };
      return;
    }

    var mDxy = mmove(dxy), mY = mmove(y10), mE = mmove(eq), mJ = mmove(jpy);

    /* Bias direction: USD long if DXY+JPY both up, USD short if both down. */
    var usdScore = 0;
    if(mDxy.dir>0) usdScore++;
    if(mDxy.dir<0) usdScore--;
    if(mJ.dir>0)   usdScore++;
    if(mJ.dir<0)   usdScore--;
    var biasDir = usdScore>=1 ? 1 : usdScore<=-1 ? -1 : 0;

    /* Favoured trade direction for the active symbol. */
    var favDir = favouredSymDir(sym, biasDir);

    /* Driver alignment: how many of the 4 drivers point the same way as USD bias?
       Equities are inversely correlated with USD strength so we negate that one. */
    var drivers = [mDxy.dir, mJ.dir, mY.dir, -mE.dir];
    var aligned = 0;
    if(biasDir!==0){
      drivers.forEach(function(d){ if(Math.sign(d)===Math.sign(biasDir)) aligned++; });
    }

    function colourFor(signalDir){
      if(favDir===0 || signalDir===0) return 'wh';
      return Math.sign(signalDir)===Math.sign(favDir) ? 'gn' : 'dn';
    }

    /* BIAS - intensity from |usdScore| plus a magnitude bonus. */
    var biasFill = Math.min(5, Math.abs(usdScore)*2 + (Math.abs(mDxy.pc)>0.3?1:0));
    var biasCol  = colourFor(favouredSymDir(sym, biasDir));
    var biasVal  = biasDir>0 ? 'US DOLLAR LONG' : biasDir<0 ? 'US DOLLAR SHORT' : 'NO CLEAR BIAS';
    var biasExpl = biasDir>0
      ? 'The US Dollar is moving higher overall. Currencies and assets that compete with the dollar are losing ground.'
      : biasDir<0
      ? 'The US Dollar is moving lower overall. Currencies and assets that compete with the dollar are gaining ground.'
      : 'The US Dollar is showing no clear direction. Neither buyers nor sellers of the dollar are in control.';

    /* CONVICTION - how many of 4 drivers agree with the bias. */
    var convFill = aligned;
    var convCol  = (biasDir===0 || favDir===0) ? 'wh' : (aligned>=3 ? 'gn' : aligned===2 ? 'wh' : 'dn');
    var convVal  = aligned>=3 ? 'STRONG ALIGNMENT' : aligned===2 ? 'PARTIAL ALIGNMENT' : 'WEAK ALIGNMENT';
    var convExpl = aligned>=3
      ? 'Three or more macro drivers are pointing the same way. The signal is consistent and trustworthy.'
      : aligned===2
      ? 'Two of the four drivers agree. The picture is partial - some confirmation, some doubt.'
      : 'The drivers are not agreeing with each other. Treat any signal lightly until more drivers line up.';

    /* FLOW - dollar in/out flow strength based on DXY + USDJPY agreement. */
    var flowDir = (mDxy.dir>0 && mJ.dir>0) ? 1 : (mDxy.dir<0 && mJ.dir<0) ? -1 : 0;
    var flowMag = Math.abs(mDxy.pc) + Math.abs(mJ.pc);
    var flowFill = Math.min(5, Math.max(flowDir===0 ? 1 : 2, Math.round(flowMag * 4)));
    var flowCol  = colourFor(favouredSymDir(sym, flowDir));
    var flowVal  = flowDir>0 ? 'MONEY FLOWING INTO US DOLLAR' : flowDir<0 ? 'MONEY FLOWING OUT OF US DOLLAR' : 'MIXED - MONEY ROTATING, NOT COMMITTING';
    var flowExpl = flowDir>0
      ? 'Money is flowing into the US Dollar. The dollar index and the dollar / yen pair are both moving higher together.'
      : flowDir<0
      ? 'Money is flowing out of the US Dollar. The dollar index and the dollar / yen pair are both moving lower together.'
      : 'Flow is mixed - the dollar index and the dollar / yen pair are not moving together. Money is rotating between assets rather than committing one way.';

    /* REGIME - risk-on / risk-off. */
    var riskScore = 0;
    if(mE.dir>0) riskScore++; if(mE.dir<0) riskScore--;
    if(mY.dir>0) riskScore++;
    if(mDxy.dir<0) riskScore++;
    var regimeDir = riskScore>=2 ? 1 : riskScore<=-1 ? -1 : 0;
    var regimeFill = Math.min(5, Math.abs(riskScore) + 1);
    var regimeCol;
    if(favDir===0 || regimeDir===0) regimeCol = 'wh';
    else regimeCol = (Math.sign(regimeDir)===Math.sign(biasDir)) ? 'gn' : 'dn';
    var regimeVal  = regimeDir>0 ? 'RISK-ON (BUYING GROWTH)' : regimeDir<0 ? 'RISK-OFF (SEEKING SAFETY)' : 'MIXED - NO CLEAR APPETITE';
    var regimeExpl = regimeDir>0
      ? 'Markets are in a risk-on mood. Investors are buying growth assets and equities are bid - that usually weighs against the dollar.'
      : regimeDir<0
      ? 'Markets are in a risk-off mood. Investors are selling growth assets and seeking safety - that usually supports the dollar.'
      : 'Risk appetite is mixed. There is no clear preference for risk-taking or for safety this session.';

    /* Validity - based on volatility of macro returns. Calmer markets keep
       the analysis valid for longer. */
    var rets = returns(dxy).concat(returns(jpy));
    var vol  = stdev(rets) * 100;
    var validityFill = vol<0.05 ? 5 : vol<0.15 ? 4 : vol<0.3 ? 3 : 2;
    var hours = vol<0.05 ? '6 to 8 hours'
              : vol<0.15 ? '3 to 4 hours'
              : vol<0.3  ? '1 to 2 hours'
              : 'less than 1 hour';
    var pace = vol<0.15 ? 'normal' : vol<0.3 ? 'elevated' : 'volatile';

    /* Signal strength X / 10 - average dot fill scaled to 10, weighted down
       by the proportion of opposing-coloured (red) dots. */
    var allCols = [biasCol, convCol, flowCol, regimeCol];
    var greens = allCols.filter(function(c){return c==='gn';}).length;
    var reds   = allCols.filter(function(c){return c==='dn';}).length;
    var avgFill = (biasFill + convFill + flowFill + regimeFill) / 4;
    var strength;
    if(favDir===0){
      strength = Math.max(0, Math.min(5, Math.round(avgFill * 1.4)));
    } else {
      var quality = greens / Math.max(1, greens + reds*2);
      strength = Math.max(0, Math.min(10, Math.round(avgFill * 2 * Math.max(0.3, quality))));
    }

    /* Trade condition. */
    var cond, condCls;
    if(favDir===0){       cond = 'CAUTION';      condCls = 'cau'; }
    else if(strength>=7){ cond = 'FAVOURABLE';   condCls = 'fav'; }
    else if(strength>=4){ cond = 'CAUTION';      condCls = 'cau'; }
    else                { cond = 'UNFAVOURABLE'; condCls = 'unf'; }

    var summary = buildSummary(sym, biasDir, favDir);

    var html = '';
    /* A. Summary */
    html += '<div class="sx-summary">' + summary + '</div>';
    /* B + C. Condition + Signal Strength */
    html += '<div class="sx-condrow">';
    html +=   '<div class="sx-cond ' + condCls + '">';
    html +=     '<span class="lbl">TRADE CONDITION</span>';
    html +=     '<span class="val">' + cond + '</span>';
    html +=   '</div>';
    html +=   '<div class="sx-cond sx-strength">';
    html +=     '<span class="lbl">SIGNAL STRENGTH</span>';
    html +=     '<span class="val">' + strength + ' / 10</span>';
    html +=     '<div class="meter"><div class="fill" style="width:' + (strength*10) + '%"></div></div>';
    html +=   '</div>';
    html += '</div>';
    /* D. Categories */
    function cat(key, val, fill, col, expl){
      return '<div class="sx-cat">'+
        '<div class="ck">' + key + '</div>'+
        '<div class="cv">' + val + '</div>'+
        dotsHtml(fill, col) +
        '<div class="cx">' + expl + '</div>'+
      '</div>';
    }
    html += '<div class="sx-cats">';
    html += cat('BIAS',       biasVal,   biasFill,     biasCol,   biasExpl);
    html += cat('CONVICTION', convVal,   convFill,     convCol,   convExpl);
    html += cat('FLOW',       flowVal,   flowFill,     flowCol,   flowExpl);
    html += cat('REGIME',     regimeVal, regimeFill,   regimeCol, regimeExpl);
    html += '</div>';
    /* E. Colour key */
    html += '<details class="sx-key" open>';
    html +=   '<summary>Colour key &mdash; how to read the dots</summary>';
    html +=   '<div class="key-body">';
    html +=     '<div class="row"><span class="swatch gn"></span><span><b>Green</b> &mdash; this signal supports the favoured trade direction. The more green dots, the stronger the support.</span></div>';
    html +=     '<div class="row"><span class="swatch dn"></span><span><b>Red</b> &mdash; this signal is against the favoured trade direction. The more red dots, the stronger the opposition.</span></div>';
    html +=     '<div class="row"><span class="swatch wh"></span><span><b>White</b> &mdash; this signal is neutral. It is neither helping nor hurting the trade.</span></div>';
    html +=     '<div class="row"><span class="swatch empty"></span><span><b>Empty</b> &mdash; this much of the signal is currently inactive. Add more bright dots and the case strengthens.</span></div>';
    html +=   '</div>';
    html += '</details>';
    /* F. Validity */
    html += '<div class="sx-validity">';
    html +=   '<span class="vk">VALIDITY</span>';
    html +=   'Markets are currently moving at a <b>' + pace + '</b> pace. ';
    html +=   'This analysis should be treated as current for approximately <b>' + hours + '</b>, ';
    html +=   'unless a major economic event lands or the dollar index breaks out of its current range. ';
    html +=   'Validity strength: <b>' + validityFill + ' / 5</b>.';
    html += '</div>';

    root.innerHTML = html;

    /* Preserve state shape used by Corey, Spidey, and Execution engines. */
    A.Macro.state = {
      ready:    true,
      overallStatus: 'READY',
      bias:     biasDir>0 ? 'USD LONG' : biasDir<0 ? 'USD SHORT' : 'USD FLAT',
      biasCls:  biasDir>0 ? 'gn' : biasDir<0 ? 'dn' : 'mut',
      biasDir:  biasDir,
      conv:     convVal,
      convCls:  convCol==='gn' ? 'gn' : convCol==='dn' ? 'dn' : 'mut',
      risk:     regimeVal,
      riskCls:  regimeCol==='gn' ? 'gn' : regimeCol==='dn' ? 'dn' : 'mut',
      usd:      mDxy.dir>0 ? 'STRENGTH' : mDxy.dir<0 ? 'WEAKNESS' : 'STABLE',
      vol:      vol,
      volLabel: vol<0.05 ? 'LOW' : vol<0.15 ? 'NORMAL' : vol<0.3 ? 'ELEVATED' : 'EXTREME',
      moves:    { dxy:mDxy, y10:mY, eq:mE, jpy:mJ },
      flow:     flowVal,
      strength: strength,
      cond:     cond,
      favDir:   favDir,
      sym:      sym
    };
  }
};

function macroRun(){
  A.Macro.update();
  if(A.Corey  && A.Corey.update)   A.Corey.update();
  if(A.Spidey && A.Spidey.update)  A.Spidey.update();
  if(A.Jane   && A.Jane.update)    A.Jane.update();
}

window.MacroEngine = {
  init: async function(){
    macroRun();
    if(A.Jane){
      A.Jane.renderTerms && A.Jane.renderTerms();
      A.Jane.loadEvents  && A.Jane.loadEvents();
    }
    return true;
  },
  run:  async function(){ macroRun(); return true; },
  load: async function(){ macroRun(); return true; }
};
})();
