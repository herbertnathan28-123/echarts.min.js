/* ATLAS FX - spidey-engine.js
   "WHY THIS TRADE IS MOVING" + SCENARIO ENGINE.

   Historical (renamed): four driver cards in a 2x2 grid. Each card carries
   a relabelled, plain-english title and three sub-blocks per the spec:
     1. What is happening
     2. Why it matters
     3. What it means for this trade
   Driver labels:
     DXY        - "DXY (US Dollar Strength)"
     US10Y      - "US10Y (US Interest Rates)"
     EQUITIES   - "Equities (Market Risk Appetite)"
     USDJPY     - "USDJPY (Global Money Flow)"

   Scenario: three plain-english outlooks - PRIMARY / ALTERNATIVE /
   INVALIDATION. Each explains:
     1. What would need to happen
     2. What that would mean
     3. What trade direction becomes more favourable
   No abbreviations, no jargon. */
(function(){
var A = window.ATLAS;

function pct(a,b){ return b ? ((a-b)/b*100) : 0; }
function returns(bars){
  var r = []; for(var i=1;i<bars.length;i++){ r.push((bars[i][4]-bars[i-1][4])/bars[i-1][4]); } return r;
}
function atr(bars, n){
  n = n || 14;
  if(!bars || bars.length<2) return 0;
  var trs = [];
  for(var i=1;i<bars.length;i++){
    var h=bars[i][2], l=bars[i][3], pc=bars[i-1][4];
    trs.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
  }
  var slice = trs.slice(-n);
  return slice.reduce(function(s,v){return s+v;},0)/slice.length;
}
function favouredSymDir(sym, usdDir){
  if(!usdDir) return 0;
  if(/^USD/.test(sym)) return usdDir;
  if(/USD$/.test(sym)) return -usdDir;
  return 0;
}

/* Per-driver plain-english copy. Each function returns { what, why, means }
   strings, where "means" is direction-aware so it speaks to the trade. */
var DRIVERS = {
  DXY: {
    title: 'DXY (US Dollar Strength)',
    role:  'A single number that tracks how strong the US Dollar is against six major currencies. When this index rises the dollar is winning across the board; when it falls the dollar is losing.',
    what: function(m){
      var d = m.dxy.dir, p = A.pct(m.dxy.pc);
      if(d>0) return 'The US Dollar Index is moving higher. It has gained '+p+' across the recent window, which means the dollar is being bought against the major currencies.';
      if(d<0) return 'The US Dollar Index is moving lower. It has lost '+p+' across the recent window, which means the dollar is being sold against the major currencies.';
      return 'The US Dollar Index is broadly flat at '+p+' across the recent window. There is no clear direction in the dollar.';
    },
    why:  'The dollar is on one side of every currency pair, so when the dollar moves, every major pair moves with it. This index gives the cleanest picture of dollar direction in one number.',
    means: function(sym, m){
      var fav = favouredSymDir(sym, m.dxy.dir>0?1:m.dxy.dir<0?-1:0);
      if(fav>0) return { txt:'A stronger dollar is supportive for this trade direction. Buying '+sym+' is more favourable while this index keeps rising.', cls:'gn' };
      if(fav<0) return { txt:'A stronger dollar is against this trade direction. Buying '+sym+' will struggle while this index keeps rising.', cls:'dn' };
      return { txt:'No clear dollar direction means this driver is currently neutral for the trade.', cls:'wh' };
    }
  },
  US10Y: {
    title: 'US10Y (US Interest Rates)',
    role:  'The yield (return) on a 10-year US government bond. Higher yields make holding dollars more rewarding; lower yields make dollars less attractive.',
    what: function(m){
      var d = m.y10.dir, p = A.pct(m.y10.pc);
      if(d>0) return 'US 10-year interest rates are moving higher. Yields have risen '+p+' across the recent window, which usually attracts more money into the dollar.';
      if(d<0) return 'US 10-year interest rates are moving lower. Yields have fallen '+p+' across the recent window, which usually pushes money out of the dollar.';
      return 'US 10-year interest rates are broadly flat at '+p+'. There is no fresh repricing of the rate path in this window.';
    },
    why:  'Higher US interest rates pay more for holding dollars, so capital tends to flow into the dollar when rates rise. Falling rates have the opposite effect.',
    means: function(sym, m){
      var dir = m.y10.dir>0 ? 1 : m.y10.dir<0 ? -1 : 0;
      var fav = favouredSymDir(sym, dir);
      if(fav>0) return { txt:'Rates moving in this direction support the trade. The interest-rate signal lines up with what is favoured for '+sym+'.', cls:'gn' };
      if(fav<0) return { txt:'Rates moving in this direction work against the trade. The interest-rate signal opposes what is favoured for '+sym+'.', cls:'dn' };
      return { txt:'Flat rates leave this driver neutral for the trade.', cls:'wh' };
    }
  },
  EQUITIES: {
    title: 'Equities (Market Risk Appetite)',
    role:  'The S&P 500 (the main US stock market). Rising stocks usually mean investors are willing to take risk; falling stocks mean investors want safety.',
    what: function(m){
      var d = m.eq.dir, p = A.pct(m.eq.pc);
      if(d>0) return 'The US stock market is moving higher. It has gained '+p+' across the recent window, which signals investors are happy to take risk.';
      if(d<0) return 'The US stock market is moving lower. It has lost '+p+' across the recent window, which signals investors are seeking safety.';
      return 'The US stock market is broadly flat at '+p+'. Risk appetite is undecided in this window.';
    },
    why:  'When investors want risk, money tends to leave the dollar and chase higher returns abroad. When investors want safety, money tends to flow into the dollar.',
    means: function(sym, m){
      /* Equities rise -> usually USD weakens -> invert sign for "USD direction"
         contribution. */
      var usdDir = m.eq.dir>0 ? -1 : m.eq.dir<0 ? 1 : 0;
      var fav = favouredSymDir(sym, usdDir);
      if(fav>0) return { txt:'Risk appetite is moving in a way that supports the trade. This regime favours buying '+sym+'.', cls:'gn' };
      if(fav<0) return { txt:'Risk appetite is moving in a way that works against the trade. This regime makes buying '+sym+' harder.', cls:'dn' };
      return { txt:'Mixed risk appetite leaves this driver neutral for the trade.', cls:'wh' };
    }
  },
  USDJPY: {
    title: 'USDJPY (Global Money Flow)',
    role:  'The dollar against the Japanese yen. This pair is the cleanest real-time read on global money flow because Japan is one of the largest sources of capital that funds positions in other currencies.',
    what: function(m){
      var d = m.jpy.dir, p = A.pct(m.jpy.pc);
      if(d>0) return 'The dollar / yen pair is moving higher. It has gained '+p+' across the recent window, which usually means money is flowing into the dollar.';
      if(d<0) return 'The dollar / yen pair is moving lower. It has lost '+p+' across the recent window, which usually means money is flowing out of the dollar.';
      return 'The dollar / yen pair is broadly flat at '+p+'. There is no committed money-flow direction in this window.';
    },
    why:  'When this pair rises with rising US interest rates, money is being moved into the dollar in size. When it falls with falling US rates, money is being moved out of the dollar in size.',
    means: function(sym, m){
      var fav = favouredSymDir(sym, m.jpy.dir>0?1:m.jpy.dir<0?-1:0);
      if(fav>0) return { txt:'Money flow is supportive for this trade. The flow signal lines up with what is favoured for '+sym+'.', cls:'gn' };
      if(fav<0) return { txt:'Money flow is against this trade. The flow signal opposes what is favoured for '+sym+'.', cls:'dn' };
      return { txt:'Mixed money flow leaves this driver neutral for the trade.', cls:'wh' };
    }
  }
};

function blk(klass, label, text){
  return '<div class="hc-block '+klass+'"><div class="blk-k">'+label+'</div><div class="blk-v">'+text+'</div></div>';
}

function driverCard(key, sym, m, hasBars){
  var D = DRIVERS[key];
  if(!hasBars){
    return '<div class="hist-col">'+
      '<div class="hc-k">'+D.title+'</div>'+
      '<div class="hc-role">'+D.role+'</div>'+
      '<div class="mut">awaiting data...</div>'+
    '</div>';
  }
  var means = D.means(sym, m);
  return '<div class="hist-col">'+
    '<div class="hc-k">'+D.title+'</div>'+
    '<div class="hc-role">'+D.role+'</div>'+
    blk('what',  'WHAT IS HAPPENING',           D.what(m)) +
    blk('why',   'WHY IT MATTERS',              D.why) +
    blk('means '+means.cls, 'WHAT IT MEANS FOR THIS TRADE', means.txt) +
  '</div>';
}

function collectiveTakeaway(sym, st){
  if(!st || !st.moves) return '';
  if(st.biasDir>=1){
    return 'All four drivers line up for a <b class="gn">stronger US Dollar</b>. The cleanest action is to follow the dollar: <b>'+
      (favouredSymDir(sym, 1)>0 ? 'buying' : favouredSymDir(sym, 1)<0 ? 'selling' : 'standing aside on')+
      ' '+sym+'</b> while this picture holds.';
  }
  if(st.biasDir<=-1){
    return 'All four drivers line up for a <b class="dn">weaker US Dollar</b>. The cleanest action is to follow the move: <b>'+
      (favouredSymDir(sym, -1)>0 ? 'buying' : favouredSymDir(sym, -1)<0 ? 'selling' : 'standing aside on')+
      ' '+sym+'</b> while this picture holds.';
  }
  return 'The four drivers <b class="wh">do not agree</b>. There is no clean direction in the dollar this session. <b>Standing aside on '+sym+'</b> preserves capital until the picture sharpens.';
}

var WHY_FOUR = 'These four drivers form the smallest set that fully explains FX moves. ' +
  '<b>The Dollar Index</b> tells you the dollar\'s direction in one number. ' +
  '<b>US Interest Rates</b> tell you how rewarding it is to hold dollars. ' +
  '<b>Equities</b> tell you how willing investors are to take risk. ' +
  '<b>The Dollar / Yen pair</b> tells you which way money is actually flowing in size. ' +
  'When all four agree, the trade has the strongest case. When they disagree, the trade has the weakest case.';

A.Spidey = {
  state: {},
  update: function(){
    var cd = A.chartData || {};
    var dxy = (cd['ch-macro-DXY']      || {}).bars;
    var y10 = (cd['ch-macro-US10Y']    || {}).bars;
    var eq  = (cd['ch-macro-EQUITIES'] || {}).bars;
    var jpy = (cd['ch-macro-USDJPY']   || {}).bars;
    var sym = A.activeSymbol || 'EURUSD';
    var st  = A.Macro && A.Macro.state;

    var grid = document.getElementById('hist-grid');
    if(grid){
      var hasAll = !!(st && st.moves);
      grid.innerHTML =
        driverCard('DXY',      sym, st && st.moves, hasAll) +
        driverCard('US10Y',    sym, st && st.moves, hasAll) +
        driverCard('EQUITIES', sym, st && st.moves, hasAll) +
        driverCard('USDJPY',   sym, st && st.moves, hasAll);
    }
    var narr = document.getElementById('hist-narrative');
    var why  = document.getElementById('hist-why');
    if(narr) narr.innerHTML = '<div class="hist-take"><div class="hc-k">COLLECTIVE TAKEAWAY</div><div>'+collectiveTakeaway(sym, st)+'</div></div>';
    if(why)  why.innerHTML  = '<div class="hist-why-wrap"><div class="hc-k">WHY THESE FOUR DRIVERS</div><div>'+WHY_FOUR+'</div></div>';

    /* SCENARIO ENGINE - plain english, three blocks per scenario. */
    if(!jpy || !dxy || !st || !st.moves) return;
    var lastJ = jpy[jpy.length-1][4], atrJ = atr(jpy,14);
    var lastD = dxy[dxy.length-1][4], atrD = atr(dxy,14);

    var primary, alt, inv;
    var favDir = favouredSymDir(sym, st.biasDir);

    if(st.biasDir>=1){
      primary = {
        c:'gn', hd:(favDir>0?'BUY ':'SELL ')+sym+' ON A SMALL MOVE TO THE LEVEL',
        what:'The dollar continues to be bought, the dollar / yen pair pulls back briefly to '+A.fmt(lastJ-atrJ,3)+', and price comes back to the entry zone for '+sym+'.',
        means:'A continuation of the current dollar strength means '+sym+' should '+(favDir>0?'move higher':'move lower')+' from the entry zone.',
        fav:'<b>'+(favDir>0?'Buying':'Selling')+' '+sym+'</b> becomes more favourable. Aim for the exit zone roughly two average ranges in the trade direction.'
      };
      alt = {
        c:'wh', hd:'ROTATE INTO A RELATED RISK-ON TRADE',
        what:'The dollar index pauses below '+A.fmt(lastD-atrD,2)+' but the stock market keeps rising. The dollar story softens while risk appetite stays strong.',
        means:'Money is still flowing, but it is moving into risk assets rather than into the dollar. The original trade case weakens but a related theme stays alive.',
        fav:'A short trade on the euro / dollar reversal, or a long trade on the Australian dollar / yen pair, becomes more favourable than the original trade.'
      };
      inv = {
        c:'dn', hd:'STOP TRADING IN THIS DIRECTION',
        what:'The dollar index closes below '+A.fmt(lastD-1.5*atrD,2)+', or US interest rates reverse by more than 1.5 average ranges against the current direction.',
        means:'The macro picture has flipped. The original case for a stronger dollar is no longer valid.',
        fav:'<b>No new trade</b> in the original direction. The thesis is finished - close any open positions and wait for a new picture.'
      };
    } else if(st.biasDir<=-1){
      primary = {
        c:'gn', hd:(favDir>0?'BUY ':'SELL ')+sym+' ON A SMALL MOVE TO THE LEVEL',
        what:'The dollar continues to be sold, the dollar / yen pair bounces briefly to '+A.fmt(lastJ+atrJ,3)+', and price comes back to the entry zone for '+sym+'.',
        means:'A continuation of the current dollar weakness means '+sym+' should '+(favDir>0?'move higher':'move lower')+' from the entry zone.',
        fav:'<b>'+(favDir>0?'Buying':'Selling')+' '+sym+'</b> becomes more favourable. Aim for the exit zone roughly two average ranges in the trade direction.'
      };
      alt = {
        c:'wh', hd:'FLIP TO THE OTHER SIDE OF THE TRADE',
        what:'The dollar index reclaims '+A.fmt(lastD+atrD,2)+' while interest rates rise. The dollar story has flipped back to strong.',
        means:'The macro regime has rotated back to a stronger dollar. The original direction is no longer the most favourable.',
        fav:'<b>'+(favDir>0?'Selling':'Buying')+' '+sym+'</b> becomes more favourable. Take the new direction with smaller size until the move confirms.'
      };
      inv = {
        c:'dn', hd:'STOP TRADING IN THIS DIRECTION',
        what:'The dollar index closes above '+A.fmt(lastD+1.5*atrD,2)+', or the stock market breaks down sharply.',
        means:'The macro picture has flipped. The original case for a weaker dollar is no longer valid.',
        fav:'<b>No new trade</b> in the original direction. The thesis is finished - close any open positions and wait for a new picture.'
      };
    } else {
      primary = {
        c:'wh', hd:'TRADE THE EDGES OF THE RANGE WITH SMALL SIZE',
        what:'No clear macro direction. '+sym+' rotates between '+A.fmt(lastJ-atrJ,3)+' and '+A.fmt(lastJ+atrJ,3)+'.',
        means:'The session is range-bound. Neither buyers nor sellers have control of the tape.',
        fav:'A small short near the upper edge or a small long near the lower edge can be considered, with very small position size only.'
      };
      alt = {
        c:'wh', hd:'WAIT FOR A CLEAN BREAK OF THE RANGE',
        what:'The dollar index breaks decisively outside +/- '+A.fmt(atrD,2)+', triggering a directional move.',
        means:'A clean break would mark the start of a new trend. The range view is replaced by a directional view.',
        fav:'A trade in the breakout direction becomes more favourable, with stops placed just inside the broken range.'
      };
      inv = {
        c:'dn', hd:'STOP FADING THE RANGE IF...',
        what:'Two consecutive bars expand by more than 1.5 average ranges on either the dollar index or US interest rates.',
        means:'The range has failed. The market has chosen a side and committed.',
        fav:'<b>No more range trades.</b> Switch to following the breakout in its new direction.'
      };
    }

    var sg = document.getElementById('scen-grid');
    if(sg){
      function renderScen(col, s){
        return '<div class="scen-col '+col+'">'+
          '<div class="sc-k">'+col.toUpperCase()+'</div>'+
          '<div class="sc-hd '+s.c+'">'+s.hd+'</div>'+
          '<div class="hc-block what"><div class="blk-k">WHAT WOULD NEED TO HAPPEN</div><div class="blk-v">'+s.what+'</div></div>'+
          '<div class="hc-block why"><div class="blk-k">WHAT THAT WOULD MEAN</div><div class="blk-v">'+s.means+'</div></div>'+
          '<div class="hc-block means '+s.c+'"><div class="blk-k">WHAT BECOMES MORE FAVOURABLE</div><div class="blk-v">'+s.fav+'</div></div>'+
        '</div>';
      }
      sg.innerHTML = renderScen('primary', primary) + renderScen('alternative', alt) + renderScen('invalidation', inv);
    }
    A.Spidey.state = { primary:primary, alt:alt, inv:inv, atrJ:atrJ, atrD:atrD };
  }
};
})();
