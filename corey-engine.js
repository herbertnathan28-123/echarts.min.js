/* ATLAS FX - corey-engine.js
   MECHANISM ENGINE - four blocks, plain English, no jargon.
     1. CAUSE          - what triggered the move
     2. MARKET REACTION - how rates / equities responded
     3. FX IMPACT      - how that fed through to the dollar and FX
     4. TRADE OUTCOME  - what direction is more favourable now

   Every block answers, in this order:
     - What happened
     - Why it matters
     - What it means for this trade

   Forbidden vocabulary removed: transmission, terminal, carry trade,
   yield differential. */
(function(){
var A = window.ATLAS;

function favouredSymDir(sym, usdDir){
  if(!usdDir) return 0;
  if(/^USD/.test(sym)) return usdDir;
  if(/USD$/.test(sym)) return -usdDir;
  return 0;
}

function blk(klass, label, text){
  return '<div class="hc-block '+klass+'"><div class="blk-k">'+label+'</div><div class="blk-v">'+text+'</div></div>';
}

function box(step, label, cls, what, why, means){
  return '<div class="chain-box '+(cls||'')+'">'+
    '<div class="cb-step">STEP '+step+'</div>'+
    '<div class="cb-lbl">'+label+'</div>'+
    blk('what',  'WHAT HAPPENED',                  what) +
    blk('why',   'WHY IT MATTERS',                 why) +
    blk('means '+(cls||''), 'WHAT IT MEANS FOR THIS TRADE', means) +
  '</div>';
}

A.Corey = {
  update: function(){
    var st = A.Macro && A.Macro.state;
    var root = document.getElementById('mech-chain');
    if(!root) return;
    if(!st || !st.moves){
      root.innerHTML = '<div class="mut" style="padding:14px 16px">awaiting macro data...</div>';
      return;
    }
    if(!A.activeSymbol) return;
    var sym = A.activeSymbol;
    var m = st.moves;
    var favDir = favouredSymDir(sym, st.biasDir);

    /* STEP 1 - CAUSE */
    var causeWhat, causeWhy, causeMeans, causeCls;
    if(Math.abs(m.y10.pc) > Math.abs(m.dxy.pc)){
      causeWhat = 'US interest rates moved first this session, '+(m.y10.dir>0?'rising':m.y10.dir<0?'falling':'flat at')+' '+A.pct(m.y10.pc)+'. The bond market repriced before the currency market.';
      causeWhy  = 'Interest rates are the foundation for currency pricing. When US rates change, the value of holding dollars changes, and FX adjusts to follow.';
      causeMeans = (favDir>0)
        ? 'The cause supports a higher move in '+sym+'.'
        : (favDir<0)
        ? 'The cause supports a lower move in '+sym+'.'
        : 'The cause has no clean read for '+sym+' yet.';
      causeCls = m.y10.dir>0 ? 'up' : m.y10.dir<0 ? 'dn' : 'wh';
    } else {
      causeWhat = 'The dollar moved first this session, '+(m.dxy.dir>0?'being bought':m.dxy.dir<0?'being sold':'staying flat')+' for '+A.pct(m.dxy.pc)+'. The currency market repriced before the bond market.';
      causeWhy  = 'When the dollar moves on its own without rates leading, big institutions are usually moving capital in or out of US assets directly.';
      causeMeans = (favDir>0)
        ? 'The cause supports a higher move in '+sym+'.'
        : (favDir<0)
        ? 'The cause supports a lower move in '+sym+'.'
        : 'The cause has no clean read for '+sym+' yet.';
      causeCls = m.dxy.dir>0 ? 'up' : m.dxy.dir<0 ? 'dn' : 'wh';
    }

    /* STEP 2 - MARKET REACTION */
    var rxWhat, rxWhy, rxMeans, rxCls;
    if(m.eq.dir>0 && m.dxy.dir<0){
      rxWhat = 'The stock market moved higher while the dollar moved lower. Investors are buying risk and selling safety.';
      rxWhy  = 'Money tends to leave the dollar when risk appetite is strong. This combination is a classic risk-on tape.';
      rxCls  = 'up';
    } else if(m.eq.dir<0 && m.dxy.dir>0){
      rxWhat = 'The stock market moved lower while the dollar moved higher. Investors are selling risk and buying safety.';
      rxWhy  = 'Money flows into the dollar when investors are nervous. This combination is a classic risk-off tape.';
      rxCls  = 'dn';
    } else if(m.eq.dir>0 && m.dxy.dir>0){
      rxWhat = 'Both the stock market and the dollar moved higher together.';
      rxWhy  = 'When risk and safety are both bid, foreign capital is chasing US assets specifically - a "US is winning" tape.';
      rxCls  = 'up';
    } else if(m.eq.dir<0 && m.dxy.dir<0){
      rxWhat = 'Both the stock market and the dollar moved lower together.';
      rxWhy  = 'When risk and safety are both being sold, the market is reducing leverage across the board. Even the dollar is not a hiding place.';
      rxCls  = 'dn';
    } else {
      rxWhat = 'The stock market and the dollar are not telling the same story this session. The reaction is mixed.';
      rxWhy  = 'When risk assets and the dollar disagree, there is no dominant theme yet. The market is waiting for a clearer signal.';
      rxCls  = 'wh';
    }
    rxMeans = (favDir>0)
      ? 'The market reaction supports the trade direction. Buying '+sym+' is more favourable while this picture holds.'
      : (favDir<0)
      ? 'The market reaction supports the trade direction. Selling '+sym+' is more favourable while this picture holds.'
      : 'The market reaction does not yet point to a clear trade direction for '+sym+'.';

    /* STEP 3 - FX IMPACT */
    var fxWhat, fxWhy, fxMeans, fxCls;
    if(m.jpy.dir>0){
      fxWhat = 'The dollar / yen pair moved higher, '+A.pct(m.jpy.pc)+'. The dollar gained ground against the yen.';
      fxWhy  = 'A rising dollar / yen pair usually means money is flowing into dollars in size. It is the cleanest live read on global money flow.';
      fxCls  = 'up';
    } else if(m.jpy.dir<0){
      fxWhat = 'The dollar / yen pair moved lower, '+A.pct(m.jpy.pc)+'. The dollar lost ground against the yen.';
      fxWhy  = 'A falling dollar / yen pair usually means money is flowing out of dollars in size. The yen is being bought as a safer alternative.';
      fxCls  = 'dn';
    } else {
      fxWhat = 'The dollar / yen pair is broadly flat. There is no committed money-flow direction in the FX market right now.';
      fxWhy  = 'When this pair stalls, the global money flow is undecided. FX direction needs a fresh push from rates or risk assets to commit.';
      fxCls  = 'wh';
    }
    fxMeans = (favDir>0)
      ? 'The FX impact supports the trade. The flow signal lines up with what is favoured for '+sym+'.'
      : (favDir<0)
      ? 'The FX impact supports the trade. The flow signal lines up with what is favoured for '+sym+'.'
      : 'The FX impact does not point cleanly for or against the trade yet.';

    /* STEP 4 - TRADE OUTCOME */
    var outWhat, outWhy, outMeans, outCls;
    if(st.biasDir>=1){
      outWhat = 'The full picture lines up for a stronger US Dollar.';
      outWhy  = 'When the dollar is strong, currency pairs that have the dollar on the buying side go higher and pairs that have the dollar on the selling side go lower.';
      outMeans = (favDir>0)
        ? 'Buying '+sym+' becomes the more favourable direction. The trade lines up with the macro picture.'
        : (favDir<0)
        ? 'Selling '+sym+' becomes the more favourable direction. The trade lines up with the macro picture.'
        : 'No US Dollar in '+sym+' - this signal does not directly map to a buy or sell.';
      outCls = 'gn';
    } else if(st.biasDir<=-1){
      outWhat = 'The full picture lines up for a weaker US Dollar.';
      outWhy  = 'When the dollar is weak, currency pairs that have the dollar on the buying side go lower and pairs that have the dollar on the selling side go higher.';
      outMeans = (favDir>0)
        ? 'Buying '+sym+' becomes the more favourable direction. The trade lines up with the macro picture.'
        : (favDir<0)
        ? 'Selling '+sym+' becomes the more favourable direction. The trade lines up with the macro picture.'
        : 'No US Dollar in '+sym+' - this signal does not directly map to a buy or sell.';
      outCls = 'dn';
    } else {
      outWhat = 'The full picture is mixed. The drivers are not lining up in one direction.';
      outWhy  = 'When the macro signals disagree, no trade direction has a clear edge. Forced trades in this regime tend to lose money.';
      outMeans = 'Standing aside on '+sym+' is more favourable than buying or selling. Wait for the picture to sharpen before committing capital.';
      outCls = 'wh';
    }

    root.innerHTML =
      box(1, 'CAUSE',           causeCls, causeWhat, causeWhy, causeMeans) +
      box(2, 'MARKET REACTION', rxCls,    rxWhat,    rxWhy,    rxMeans) +
      box(3, 'FX IMPACT',       fxCls,    fxWhat,    fxWhy,    fxMeans) +
      box(4, 'TRADE OUTCOME',   outCls,   outWhat,   outWhy,   outMeans);
  }
};
})();
