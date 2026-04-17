/* ATLAS FX - execution-engine.js (ATLAS DOCTRINE v1)
   PRECISION EXECUTION + VIABILITY ENGINE.

   Precision levels only. No zones. No extended entries. Every level is a
   single price with dollar value (primary) and pip reference (bracketed).

   Output:
     Entry : [central_price] ± [buffer]
             ([lower_bound] – [upper_bound])   — [$ value] ([pips])
     Exit  : [central_price] ± [buffer]
             ([lower_bound] – [upper_bound])   — [$ value] ([pips])
     Stop  : [central_price] ± [buffer]
             ([lower_bound] – [upper_bound])   — [$ value] ([pips])
     Execution Cost : spread + slippage   — [$] ([pips])
     Trade Viability: VALID / MARGINAL / INVALID

   Viability is computed in data-feed.js (A.computeViability) and controls
   the executable state of the trade. It is not cosmetic. */
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
  /* ATLAS DOCTRINE: user-requested symbol MUST NEVER be replaced.
     Returns the requested symbol; bars may be empty if data is
     unavailable. No substitution, no fallback. */
  var s = A.activeSymbol;
  if(!s) return { sym:null, bars:[] };
  var id = 'ch-htf-1H';
  var bars = (A.chartData[id] && A.chartData[id].bars) || [];
  return { sym:s, bars:bars };
}

/* Doctrine buffer: ±0.00001 default, normalised per instrument tick size. */
function normaliseBuffer(meta){
  return Math.max(0.00001, meta.pipSize * 0.1);
}

/* ATR multipliers — precision levels, not zones. */
var ENTRY_OFF = 0.20;
var EXIT_OFF  = 2.00;
var STOP_OFF  = 0.85;

function fmtPrice(v, digits){
  if(v == null || !isFinite(v)) return '-';
  return (+v).toFixed(digits);
}
function fmtUSD(v){
  if(v == null || !isFinite(v)) return '-';
  var abs = Math.abs(v);
  if(abs >= 1000) return '$' + (+v).toLocaleString(undefined,{maximumFractionDigits:0});
  return '$' + (+v).toFixed(0);
}
function fmtPips(v){
  if(v == null || !isFinite(v)) return '-';
  return (+v).toFixed(1) + 'p';
}

function viabilityPill(state){
  var cls = state === 'VALID' ? 'vb-valid' : state === 'MARGINAL' ? 'vb-marginal' : 'vb-invalid';
  return '<span class="vb-pill ' + cls + '">' + state + '</span>';
}

function levelRow(label, central, buffer, dollars, pips, rowCls, digits){
  var lower = central - buffer;
  var upper = central + buffer;
  return '<tr class="xr ' + rowCls + '">' +
    '<td class="xr-l"><span class="xr-bar"></span><span class="xr-lab">' + label + '</span></td>' +
    '<td class="xr-r">' +
      '<div class="px-line"><span class="px-price">' + (+central).toFixed(digits) + '</span> <span class="px-buffer">± ' + (+buffer).toFixed(digits) + '</span></div>' +
      '<div class="px-bounds">(' + (+lower).toFixed(digits) + ' – ' + (+upper).toFixed(digits) + ')</div>' +
      '<div class="px-meta"><span class="px-dollars">' + dollars + '</span> <span class="px-pips">(' + pips + ')</span></div>' +
    '</td>' +
  '</tr>';
}
function ctxRow(label, html){
  return '<tr class="xr xc-neu">' +
    '<td class="xr-l"><span class="xr-bar"></span><span class="xr-lab">' + label + '</span></td>' +
    '<td class="xr-r">' + html + '</td>' +
  '</tr>';
}

A.Execution = {
  state: {},
  update: function(){
    var requestedSymbol = A.activeSymbol;
    var pick = pickSymbol();
    var sym = pick.sym, bars = pick.bars;
    var host    = document.getElementById('exec-grid');
    var ctxHost = document.getElementById('exec-context');
    var ghHost  = document.getElementById('exec-explainer');
    if(!host) return;

    /* ATLAS DOCTRINE: symbol integrity check. The symbol we render for
       MUST match the requested active symbol. Any mismatch is a
       SYMBOL INTEGRITY FAILURE and we refuse to draw. */
    if(requestedSymbol && sym && sym !== requestedSymbol){
      console.error('[ATLAS] SYMBOL INTEGRITY FAILURE: requested=' + requestedSymbol + ' resolved=' + sym);
      host.innerHTML = '<div class="mut" style="padding:14px 16px;color:#ff0015">SYMBOL INTEGRITY FAILURE — requested ' + requestedSymbol + ', resolver returned ' + sym + '. No render.</div>';
      return;
    }
    if(!sym){
      host.innerHTML = '<div class="mut" style="padding:14px 16px">No symbol requested. Use !SYMBOL via Discord or ?symbol= in the URL.</div>';
      A.Execution.state = {};
      return;
    }

    var meta = A.instrumentMeta(sym);
    var d = meta.digits;

    if(!bars || !bars.length){
      host.innerHTML =
        '<div class="mut" style="padding:14px 16px;color:#ff0015;border:1px solid #1a1a1a">' +
          'Data unavailable for requested symbol: <b style="color:#FFD600">' + sym + '</b>.<br>' +
          'No fallback applied. Please retry.' +
        '</div>';
      if(ctxHost) ctxHost.innerHTML =
        '<div class="ctx-sec"><div class="ctx-k">VIABILITY</div>' +
        '<div class="ctx-body">No levels computed yet. Viability will resolve when bars load.</div></div>';
      A.Execution.state = { sym:sym, dir:0, entry:null, exit:null, stopA:null, stopB:null, atr:0 };
      return;
    }

    var st = A.Macro && A.Macro.state;
    var dir = 0;
    if(st && st.favDir !== undefined && st.favDir !== null) dir = st.favDir;
    else if(st && st.biasDir>=1) dir =  1;
    else if(st && st.biasDir<=-1) dir = -1;

    var last = bars[bars.length-1][4];
    var a = atr(bars, 14) || Math.max(0.0001, last*0.002);
    var buf = normaliseBuffer(meta);

    /* Precision levels — single prices, no zones. */
    var entry, exit, stopA;
    if(dir>0){
      entry = last - a*ENTRY_OFF;
      exit  = last + a*EXIT_OFF;
      stopA = last - a*STOP_OFF;
    } else if(dir<0){
      entry = last + a*ENTRY_OFF;
      exit  = last - a*EXIT_OFF;
      stopA = last + a*STOP_OFF;
    } else {
      /* No clean direction: project defensive long-biased levels from last print. */
      entry = last;
      exit  = last + a*EXIT_OFF*0.5;
      stopA = last - a*STOP_OFF;
    }

    /* Snap to instrument tick grid within the precision buffer. */
    var snap = function(p){
      var ticks = Math.round(p / meta.pipSize);
      return ticks * meta.pipSize;
    };
    entry = snap(entry);
    exit  = snap(exit);
    stopA = snap(stopA);

    /* Persist state before viability (so computeViability reads fresh). */
    A.Execution.state = {
      sym:sym, dir:dir,
      entry:entry, exit:exit, stopA:stopA, stopB:stopA,
      atr:a, buffer:buf, meta:meta
    };

    /* Pull event shock forecaster if available (set by EventsForward engine). */
    var v = A.computeViability();
    A.Execution.viability = v;

    /* ---- Render precision execution table ---- */
    var pipsEntry = (entry - last) / meta.pipSize;
    var pipsExit  = (exit  - entry) / meta.pipSize;
    var pipsStop  = (stopA - entry) / meta.pipSize;
    var usdEntry  = Math.abs(pipsEntry) * meta.pipValueUSD;
    var usdExit   = Math.abs(pipsExit)  * meta.pipValueUSD;
    var usdStop   = Math.abs(pipsStop)  * meta.pipValueUSD;
    var sgnExit   = pipsExit >= 0 ? '+' : '';
    var sgnStop   = pipsStop >= 0 ? '+' : '';
    var sgnEntry  = pipsEntry >= 0 ? '+' : '';

    host.innerHTML =
      '<table class="exec-tbl">' +
        '<thead><tr class="xr xr-hdr">' +
          '<th><span class="xr-bar"></span><span class="xr-lab">' + sym + ' — ATLAS LEVELS</span><span class="xr-sub">ATR ' + (+a).toFixed(d) + ' · tick ' + meta.pipSize + '</span></th>' +
          '<th class="xr-r">PRICE — $ VALUE (PIPS)</th>' +
        '</tr></thead>' +
        '<tbody>' +
          levelRow('Entry',     entry, buf, fmtUSD(usdEntry), sgnEntry + fmtPips(Math.abs(pipsEntry)), 'xc-entry', d) +
          levelRow('Exit',      exit,  buf, fmtUSD(usdExit),  sgnExit  + fmtPips(Math.abs(pipsExit)),  'xc-exit',  d) +
          levelRow('Stop',      stopA, buf, fmtUSD(usdStop),  sgnStop  + fmtPips(Math.abs(pipsStop)),  'xc-stop',  d) +
          ctxRow('Execution Cost', '<span class="px-price">' + fmtPrice(v.execCostPrice, d) + '</span><span class="px-dash"> — </span><span class="px-dollars">' + fmtUSD(v.execCostUSD) + '</span><span class="px-pips"> (' + fmtPips(v.execCostPips) + ')</span>') +
          ctxRow('Trade Viability', viabilityPill(v.state)) +
        '</tbody>' +
      '</table>';

    /* ---- Context panel: viability reasoning + actionable summary ---- */
    if(ctxHost){
      var reason;
      if(v.state === 'VALID'){
        reason = 'Expected move (' + v.expectedPips + 'p / ' + fmtUSD(v.expectedUSD) + ') exceeds execution cost + risk by R:R ' + v.rr + '. Signal strength ' + v.strength + '/10.';
      } else if(v.state === 'MARGINAL'){
        reason = 'Expected move (' + v.expectedPips + 'p / ' + fmtUSD(v.expectedUSD) + ') covers costs but reward-to-risk is ' + v.rr + '. Reduce size or await stronger alignment.';
      } else {
        reason = 'Required move (cost + risk) exceeds expected move, or signal strength (' + v.strength + '/10) is insufficient. R:R ' + v.rr + '. Do not execute.';
      }
      var direction = dir > 0 ? '<span class="up">LONG</span>' : dir < 0 ? '<span class="dn">SHORT</span>' : '<span class="wh">FLAT</span>';
      ctxHost.innerHTML =
        '<div class="ctx-sec">' +
          '<div class="ctx-k">DIRECTION</div>' +
          '<div class="ctx-hd">' + direction + ' ' + sym + '</div>' +
          '<div class="ctx-body">Bias resolved from macro drivers. Precision levels snap to tick size ' + meta.pipSize + '.</div>' +
        '</div>' +
        '<div class="ctx-sec">' +
          '<div class="ctx-k">RISK / REWARD</div>' +
          '<div class="ctx-body">Risk: <b>' + fmtUSD(v.riskUSD) + '</b> (' + v.riskPips + 'p). Target: <b>' + fmtUSD(v.expectedUSD) + '</b> (' + v.expectedPips + 'p). R:R <b>' + v.rr + '</b>.</div>' +
        '</div>' +
        '<div class="ctx-sec">' +
          '<div class="ctx-k">VIABILITY</div>' +
          '<div class="ctx-hd">' + viabilityPill(v.state) + '</div>' +
          '<div class="ctx-body">' + reason + '</div>' +
        '</div>';
    }

    if(ghHost){
      ghHost.innerHTML =
        '<div class="exec-gh-hd">DOCTRINE</div>' +
        '<div class="exec-gh-body">' +
          '<div class="exec-gh-row"><span class="exec-gh-lbl gh-grn">VALID</span><span class="exec-gh-txt">Expected move covers execution cost and delivers R:R ≥ 2 with signal strength ≥ 6. Trade is executable at full size.</span></div>' +
          '<div class="exec-gh-row"><span class="exec-gh-lbl gh-orn">MARGINAL</span><span class="exec-gh-txt">Setup covers costs but either R:R or alignment is weaker. Reduce size or wait.</span></div>' +
          '<div class="exec-gh-row"><span class="exec-gh-lbl gh-red">INVALID</span><span class="exec-gh-txt">Required move exceeds expected move after costs, or drivers disagree. Do not execute.</span></div>' +
          '<div class="exec-gh-row"><span class="exec-gh-lbl gh-yel">PRECISION</span><span class="exec-gh-txt">All levels are single prices snapped to instrument tick size. No zones. No extended entries.</span></div>' +
        '</div>';
    }
  }
};

window.ExecutionEngine = {
  init: async function(){ A.Execution.update(); return true; },
  run:  async function(symbol){ if(symbol) A.activeSymbol = (''+symbol).toUpperCase(); A.Execution.update(); return true; },
  load: async function(symbol){ if(symbol) A.activeSymbol = (''+symbol).toUpperCase(); A.Execution.update(); return true; }
};
})();
