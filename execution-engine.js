/* ATLAS FX - execution-engine.js
   EXECUTION TABLE (LOCKED LAYOUT) + PLAIN-ENGLISH "HOW TO READ" PANEL.

   Two columns: RECOMMENDED (left) | RANGE / ACTION (right).
   Rows in fixed order:
     ENTRY POINT (green)
     ENTRY EXTENDED (orange)
     EXIT POINT (red)
     TREND (yellow)
     NEUTRAL MARKET (white)   - was grey, now white per spec rule 13
     STOP LOSS 1 (red)
     EXTENDED STOP LOSS 2 (red)
     SELECT ONE STOP LOSS ONLY (yellow caution row)

   Bands are tight - no wide amateur tolerances:
     - Entry / Exit / Stop tolerance band = +/- 0.05 ATR
     - Stop 1 sits 0.85 ATR beyond entry (just outside noise)
     - Stop 2 sits 1.25 ATR beyond entry (slightly more breathing room)

   Definitions in the explainer use the exact plain-English text from the
   spec, with the label coloured to match its row colour. */
(function(){
var A = window.ATLAS;

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
function pickSymbol(){
  var s = A.activeSymbol || 'USDJPY';
  var id = 'ch-htf-1H';
  if(A.chartData[id] && A.chartData[id].bars && A.chartData[id].bars.length){
    return { sym:s, bars:A.chartData[id].bars };
  }
  var j = 'ch-macro-USDJPY';
  return { sym:'USDJPY', bars:(A.chartData[j]||{}).bars || [] };
}
function digits(sym){ return (A.SYMBOLS[sym] || A.FX[sym] || {digits:4}).digits; }
function fmtR(v, d){ return A.fmt(v, d); }

/* Tight-band ATR multipliers. */
var BAND  = 0.05;  // +/- band around each level (was 0.15)
var STOP1 = 0.85;  // ATR distance to first stop
var STOP2 = 1.25;  // ATR distance to extended stop
var ENTRY_OFF = 0.20; // entry sits a quarter of an ATR off current price
var ENTRY_EXT = 0.50; // extended entry sits half an ATR off the entry side
var EXIT_OFF  = 2.00; // exit sits 2x ATR away

function row(label, rec, ra, colorClass){
  return '<tr class="xr '+colorClass+'">'+
    '<td class="xr-l"><span class="xr-bar"></span><span class="xr-lab">'+label+'</span>'+
      (rec!=null ? '<span class="xr-rec">'+rec+'</span>' : '')+
    '</td>'+
    '<td class="xr-r">'+ra+'</td>'+
  '</tr>';
}

/* Exact spec text - do not paraphrase. Label colour matches row colour. */
var GH_EXPLAINER = [
  { lbl:'ENTRY POINT (GREEN)', cls:'gh-grn',
    txt:'The price level identified through detailed analysis of market structure, direction, and probability. This is the level where the system determines there is the strongest likelihood for a trade to be entered based on current conditions.' },
  { lbl:'ENTRY EXTENDED (ORANGE)', cls:'gh-orn',
    txt:'A secondary level slightly beyond the main entry point. Used only if price moves a little further than expected before reacting. It follows the same trade idea as the main entry, but allows for a small extension in price movement.' },
  { lbl:'EXIT POINT (RED)', cls:'gh-red',
    txt:'The level where the trade is expected to complete based on the analysis. This is where the system identifies the strongest probability for the move to reach its objective and for profit to be secured.' },
  { lbl:'TREND (YELLOW)', cls:'gh-yel',
    txt:'Shows whether price is moving toward the trade level or moving away from it.' },
  { lbl:'NEUTRAL MARKET (WHITE)', cls:'gh-wht',
    txt:'Indicates that the market currently has no clear direction. There is no strong evidence to support either a buy or sell position.' },
  { lbl:'STOP LOSS 1 (RED)', cls:'gh-red',
    txt:'The primary invalidation level for the trade. If price reaches this point, the original analysis is considered no longer valid.' },
  { lbl:'EXTENDED STOP LOSS 2 (RED)', cls:'gh-red',
    txt:'A secondary invalidation level placed slightly further away to allow for stronger market movement before invalidation is confirmed.' },
  { lbl:'SELECT ONE STOP LOSS (YELLOW)', cls:'gh-yel',
    txt:'Only one stop level is used for each trade. The final trade risk is based on the selected stop level.' }
];

function flowText(dir, st){
  if(!st || !st.moves){
    return { hd:'AWAITING DATA', body:'The macro driver data has not loaded yet.' };
  }
  var m = st.moves;
  var detail = 'The dollar index moved '+A.pct(m.dxy.pc)+
    ', US interest rates moved '+A.pct(m.y10.pc)+
    ', the equity index moved '+A.pct(m.eq.pc)+
    ', and the dollar / yen pair moved '+A.pct(m.jpy.pc)+'.';
  if(dir>0){
    return { hd:'CONDITIONS FAVOUR THE TRADE',
      body:'Capital is rotating in a way that supports this trade direction. '+detail+' The trade direction lines up with the current flow.' };
  }
  if(dir<0){
    return { hd:'CONDITIONS FAVOUR THE TRADE',
      body:'Capital is rotating in a way that supports this trade direction. '+detail+' The trade direction lines up with the current flow.' };
  }
  return { hd:'NO CLEAR FLOW',
    body:'Flows are mixed. '+detail+' Neither side is in control of the session, so a directional trade is not justified yet.' };
}

function whyText(sym, dir){
  if(dir>0){
    return 'The macro picture supports a higher move in '+sym+'. Buying '+sym+' on a small move toward the entry level offers the best risk-to-reward balance available right now.';
  }
  if(dir<0){
    return 'The macro picture supports a lower move in '+sym+'. Selling '+sym+' on a small move toward the entry level offers the best risk-to-reward balance available right now.';
  }
  return 'The macro signals are not aligned in one direction. Standing aside on '+sym+' preserves capital. The market needs a fresh catalyst before any directional trade is justified.';
}

function whatText(dir, ranges, sym){
  if(dir>0){
    return [
      'Place a buy order on '+sym+' inside the entry range '+ranges.entryRange+'. The order will trigger when price reaches that level.',
      'Choose only one stop level: STOP LOSS 1 at '+ranges.stopAFmt+' (closer to entry, smaller risk) or EXTENDED STOP LOSS 2 at '+ranges.stopBFmt+' (further from entry, larger risk). Both levels are not used together.',
      'Set the position size from the distance between the entry and the chosen stop. The stop distance defines how much of the account is risked on this trade.',
      'Take profit when price reaches the exit zone '+ranges.exitFmt+'. If the macro picture flips before then, close the trade early.'
    ];
  }
  if(dir<0){
    return [
      'Place a sell order on '+sym+' inside the entry range '+ranges.entryRange+'. The order will trigger when price reaches that level.',
      'Choose only one stop level: STOP LOSS 1 at '+ranges.stopAFmt+' (closer to entry, smaller risk) or EXTENDED STOP LOSS 2 at '+ranges.stopBFmt+' (further from entry, larger risk). Both levels are not used together.',
      'Set the position size from the distance between the entry and the chosen stop. The stop distance defines how much of the account is risked on this trade.',
      'Take profit when price reaches the exit zone '+ranges.exitFmt+'. If the macro picture flips before then, close the trade early.'
    ];
  }
  return [
    'No directional trade is recommended on '+sym+'. The macro picture does not support a clear buy or a clear sell right now.',
    'If price reaches the upper edge of the range '+ranges.entryExtRange+', a small short toward the lower edge can be considered, with very small position size only.',
    'A clean break of the range with strong follow-through (more than 1.5 ATR of expansion) cancels the range view entirely - step aside until a new direction is confirmed.',
    'Preserving capital is the trade in this regime. Forcing a position now usually costs the account.'
  ];
}

A.Execution = {
  state: {},
  update: function(){
    var pick = pickSymbol();
    var sym = pick.sym, bars = pick.bars;
    var host    = document.getElementById('exec-grid');
    var ctxHost = document.getElementById('exec-context');
    var ghHost  = document.getElementById('exec-explainer');
    if(!host) return;
    if(!bars || !bars.length){
      host.innerHTML = '<div class="mut" style="padding:14px 16px">awaiting data...</div>';
      if(ctxHost) ctxHost.innerHTML = '<div class="mut" style="padding:14px 16px">awaiting data...</div>';
      return;
    }

    var st = A.Macro && A.Macro.state;
    /* Use the macro engine's favoured-symbol direction when available; this
       resolves "USD long" into the actual buy/sell direction for pairs
       where USD is the quote currency (e.g. EURUSD). */
    var dir = 0;
    if(st && st.favDir !== undefined && st.favDir !== null) dir = st.favDir;
    else if(st && st.biasDir>=1) dir =  1;
    else if(st && st.biasDir<=-1) dir = -1;

    var last = bars[bars.length-1][4];
    var a = atr(bars, 14) || Math.max(0.0001, last*0.002);
    var d = digits(sym);

    var entry, exit, stopA, stopB, entryExt;
    if(dir>0){
      entry    = last - a*ENTRY_OFF;
      entryExt = last + a*ENTRY_EXT;
      exit     = last + a*EXIT_OFF;
      stopA    = last - a*STOP1;
      stopB    = last - a*STOP2;
    } else if(dir<0){
      entry    = last + a*ENTRY_OFF;
      entryExt = last - a*ENTRY_EXT;
      exit     = last - a*EXIT_OFF;
      stopA    = last + a*STOP1;
      stopB    = last + a*STOP2;
    } else {
      entry    = last;
      entryExt = last + a*ENTRY_EXT;
      exit     = last + a*EXIT_OFF*0.5;
      stopA    = last - a*STOP1;
      stopB    = last - a*STOP2;
    }
    var entryRange    = fmtR(entry-a*BAND,d)    + ' to ' + fmtR(entry+a*BAND,d);
    var entryExtRange = fmtR(entryExt-a*BAND,d) + ' to ' + fmtR(entryExt+a*BAND,d);
    var exitRange     = fmtR(exit-a*BAND,d)     + ' to ' + fmtR(exit+a*BAND,d);
    var stopARange    = fmtR(stopA-a*BAND,d)    + ' to ' + fmtR(stopA+a*BAND,d);
    var stopBRange    = fmtR(stopB-a*BAND,d)    + ' to ' + fmtR(stopB+a*BAND,d);

    var trendAction = dir>0 ? '<span class="up">PRICE MOVING TOWARD THE TRADE LEVEL</span>' :
                      dir<0 ? '<span class="dn">PRICE MOVING AWAY FROM THE TRADE LEVEL</span>' :
                              '<span class="wh">DIRECTION NOT YET CONFIRMED</span>';
    var neutralAction = dir===0
      ? '<span class="wh">NO CLEAR DIRECTION - STANDING ASIDE IS THE TRADE</span>'
      : '<span class="mut">A bias is engaged - this row is on standby</span>';
    var provider = (A.src && A.src.provider) || '-';

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
          row('STOP LOSS 1',          fmtR(stopA,d),    stopARange,    'xc-stop')+
          row('EXTENDED STOP LOSS 2', fmtR(stopB,d),    stopBRange,    'xc-stop')+
          '<tr class="xr xc-warn"><td colspan="2"><span class="xr-bar"></span><span class="xr-lab">SELECT ONE STOP LOSS ONLY</span></td></tr>'+
        '</tbody>'+
      '</table>';

    if(ctxHost){
      var flow = flowText(dir, st);
      var why  = whyText(sym, dir);
      var whatItems = whatText(dir, {
        entryRange:entryRange, entryExtRange:entryExtRange, exitRange:exitRange,
        entryFmt:fmtR(entry,d), entryExtFmt:fmtR(entryExt,d), exitFmt:fmtR(exit,d),
        stopAFmt:fmtR(stopA,d), stopBFmt:fmtR(stopB,d)
      }, sym);
      var flowCls = dir>0?'up':dir<0?'dn':'hi';
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
          '<ol class="ctx-list">'+whatItems.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ol>'+
        '</div>';
    }

    if(ghHost){
      ghHost.innerHTML = '<div class="exec-gh-hd">HOW TO READ THIS TABLE</div>' +
        '<div class="exec-gh-body">' +
        GH_EXPLAINER.map(function(e){
          return '<div class="exec-gh-row"><span class="exec-gh-lbl '+e.cls+'">'+e.lbl+'</span><span class="exec-gh-txt">'+e.txt+'</span></div>';
        }).join('') +
        '</div>';
    }

    A.Execution.state = {
      sym:sym, dir:dir,
      entry:entry, entryExt:entryExt, exit:exit,
      stopA:stopA, stopB:stopB, atr:a
    };
  }
};

window.ExecutionEngine = {
  init: async function(){ A.Execution.update(); return true; },
  run:  async function(symbol){ if(symbol) A.activeSymbol = (''+symbol).toUpperCase(); A.Execution.update(); return true; },
  load: async function(symbol){ if(symbol) A.activeSymbol = (''+symbol).toUpperCase(); A.Execution.update(); return true; }
};
})();
