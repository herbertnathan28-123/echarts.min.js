/* ATLAS FX - charts-engine.js
   LIVE OHLC CHART ENGINE. Candlestick data comes exclusively from TwelveData
   (via the /twelvedata server proxy using TWELVE_DATA_API_KEY). No mock data.
   DOM targets: ch-htf-1W/1D/4H/1H, ch-ltf-30M/15M/5M/1M (plus legacy htf-1..4/ltf-1..4).
   Cache keys: ch-htf-1W, ch-htf-1D, ch-htf-4H, ch-htf-1H, ch-ltf-30M, ch-ltf-15M, ch-ltf-5M, ch-ltf-1M.
   Macro keys silent-loaded for macro engine: ch-macro-DXY, ch-macro-US10Y, ch-macro-EQUITIES, ch-macro-USDJPY.
   chart.setOption is called for every panel as soon as its bars arrive (under 1s typical). */
(function(){
var A = window.ATLAS = window.ATLAS || {};
A.chartData = A.chartData || {};
A.chartMeta = A.chartMeta || {};
A.charts    = A.charts    || {};
// Symbol integrity: NO silent EURUSD fallback. activeSymbol is null until a
// caller explicitly sets it via A.Charts.load(symbol). If no symbol has been
// supplied by URL/query/Discord trigger, the panels render the hard-block
// state instead of showing a different asset.
A.activeSymbol = A.activeSymbol || null;

var PANELS = [
  { domIds:["htf-1","ch-htf-1W"],  key:"ch-htf-1W",  tf:"1W",  group:"htf" },
  { domIds:["htf-2","ch-htf-1D"],  key:"ch-htf-1D",  tf:"1D",  group:"htf" },
  { domIds:["htf-3","ch-htf-4H"],  key:"ch-htf-4H",  tf:"4H",  group:"htf" },
  { domIds:["htf-4","ch-htf-1H"],  key:"ch-htf-1H",  tf:"1H",  group:"htf" },
  { domIds:["ltf-1","ch-ltf-30M"], key:"ch-ltf-30M", tf:"30M", group:"ltf" },
  { domIds:["ltf-2","ch-ltf-15M"], key:"ch-ltf-15M", tf:"15M", group:"ltf" },
  { domIds:["ltf-3","ch-ltf-5M"],  key:"ch-ltf-5M",  tf:"5M",  group:"ltf" },
  { domIds:["ltf-4","ch-ltf-1M"],  key:"ch-ltf-1M",  tf:"1M",  group:"ltf" }
];
var MACRO = [
  { key:"ch-macro-DXY",      sym:"DXY",      tf:"1H" },
  { key:"ch-macro-US10Y",    sym:"US10Y",    tf:"1H" },
  { key:"ch-macro-EQUITIES", sym:"EQUITIES", tf:"1H" },
  { key:"ch-macro-USDJPY",   sym:"USDJPY",   tf:"1H" }
];
function digitsFor(sym){
  if(A.FX && A.FX[sym]) return A.FX[sym].digits;
  if(A.SYMBOLS && A.SYMBOLS[sym]) return A.SYMBOLS[sym].digits;
  if(sym==="USDJPY"||sym==="AUDJPY"||sym==="GBPJPY"||sym==="EURJPY"||sym==="US10Y") return 3;
  if(sym==="DXY"||sym==="EQUITIES") return 2;
  return 5;
}
function spreadPx(sym, close){
  var dg = digitsFor(sym);
  if(sym==="US10Y") return 0.003;
  if(sym==="EQUITIES") return 0.25;
  if(sym==="DXY") return 0.02;
  if(dg>=5) return Math.max(close*0.000008, 0.00005);
  if(dg===3) return Math.max(close*0.00007, 0.007);
  return close*0.00012;
}
function findEl(ids){
  for(var i=0;i<ids.length;i++){
    var el = document.getElementById(ids[i]);
    if(el) return { el:el, id:ids[i] };
  }
  return null;
}
function buildOrGet(domId){
  if(typeof echarts==='undefined'){console.error('[atlas] echarts not loaded');return;}
  if(A.charts[domId]) return A.charts[domId];
  var el = document.getElementById(domId); if(!el) return null;
  var ch = echarts.init(el, null, {renderer:"canvas"});
  A.charts[domId] = ch;
  return ch;
}
function axisFmt(tf){
  return function(ts){
    var dt = new Date(+ts);
    if(tf==="1M"||tf==="5M"||tf==="15M"||tf==="30M") return dt.toISOString().substr(11,5);
    if(tf==="1H"||tf==="4H") return dt.toISOString().substr(5,11).replace("T"," ");
    if(tf==="1D"||tf==="1W") return dt.toISOString().substr(0,10);
    return dt.toISOString().substr(5,11).replace("T"," ");
  };
}
// Build the prominent timeframe badge as ECharts graphic elements. Visible
// within one second to a new user — large bold gold text on solid black with
// a thick border, fixed top-left of every panel, z-index above the canvas.
// Symbol label sits beside the TF so each panel answers "what asset" + "what
// timeframe" instantly.
function tfBadgeGraphic(sym, tf){
  var BADGE_BG     = "#000000";
  var BADGE_BORDER = "#FFD600";
  var BADGE_TEXT   = "#FFD600";
  var SYM_TEXT     = "#FFFFFF";
  var BADGE_W      = 78;
  var BADGE_H      = 38;
  var SYM_PADX     = 10;
  return {
    elements: [
      { type:"group", id:"atlas-tfbadge", left:6, top:6, z:200,
        children:[
          // Coloured rounded badge box
          { type:"rect",
            shape:{ x:0, y:0, width:BADGE_W, height:BADGE_H, r:4 },
            style:{ fill:BADGE_BG, stroke:BADGE_BORDER, lineWidth:2 } },
          // Big bold timeframe text inside the badge
          { type:"text",
            style:{ x:BADGE_W/2, y:BADGE_H/2, text:tf, fill:BADGE_TEXT,
              font:"800 22px 'SF Mono',Menlo,Consolas,monospace",
              textAlign:"center", textVerticalAlign:"middle" } },
          // Symbol label beside the badge — high contrast, bold, big enough
          // to be read instantly on iPad and desktop.
          { type:"text",
            style:{ x:BADGE_W + SYM_PADX, y:BADGE_H/2, text:sym, fill:SYM_TEXT,
              font:"700 18px 'SF Mono',Menlo,Consolas,monospace",
              textAlign:"left", textVerticalAlign:"middle" } }
        ] },
      // Preserve the price-ladder graphic group so renderLadder can keep
      // updating its own children without colliding with the badge group.
      { type:"group", id:"ladder", children:[] }
    ]
  };
}
function chartOption(sym, tf, bars){
  var dg = digitsFor(sym);
  var C = A.COLORS || {};
  var fmt = axisFmt(tf);
  var cats = bars.map(function(b){ return fmt(b[0]); });
  var series = bars.map(function(b){ return [b[1], b[4], b[3], b[2]]; });
  var bull = C.bull || "#07f911";
  var bear = C.bear || "#ff0015";
  var grid = C.grid || "#1a1a1a";
  var axis = C.axis || "#6c7a89";
  var bg   = C.bg   || "#000000";
  var cross= C.cross|| "#ffffff";
  return {
    animation:false,
    backgroundColor: bg,
    // Top padding bumped to 56px to clear the new TF badge.
    grid:{ left:6, right:72, top:56, bottom:20, containLabel:false },
    // Tiny default title removed — replaced by the high-contrast graphic
    // badge below. Title intentionally blank.
    title:{ show:false },
    // Big bold TF + symbol badge. Independent per chart instance — set via a
    // fresh option object each call so panels never share a graphic ref.
    graphic: tfBadgeGraphic(sym, tf),
    xAxis:{
      type:"category", data:cats, boundaryGap:true,
      axisLine:{lineStyle:{color:grid}},
      axisTick:{lineStyle:{color:grid}},
      axisLabel:{color:axis, fontSize:9, hideOverlap:true},
      splitLine:{show:false},
      axisPointer:{ lineStyle:{color:cross, type:"solid", width:1},
        label:{backgroundColor:"#000",color:cross,fontSize:10,borderColor:cross,borderWidth:1}}
    },
    yAxis:{
      scale:true, position:"right",
      axisLine:{lineStyle:{color:grid}},
      axisTick:{show:false},
      axisLabel:{color:axis, fontSize:9, margin:4,
        formatter:function(v){ return (+v).toFixed(dg); }},
      splitLine:{lineStyle:{color:grid, type:"dashed", opacity:0.25}},
      axisPointer:{ lineStyle:{color:cross, type:"solid", width:1},
        label:{backgroundColor:"#000",color:cross,fontSize:10,borderColor:cross,borderWidth:1,
          formatter:function(p){ return (+p.value).toFixed(dg); }}}
    },
    dataZoom:[{type:"inside", throttle:40, filterMode:"filter", start:55, end:100,
      zoomOnMouseWheel:true, moveOnMouseMove:true}],
    tooltip:{ trigger:"axis",
      axisPointer:{type:"cross", crossStyle:{color:cross}, lineStyle:{color:cross}},
      backgroundColor:"rgba(0,0,0,0.92)", borderColor:grid, borderWidth:1,
      textStyle:{color:"#fff", fontSize:11},
      formatter:function(ps){
        if(!ps||!ps.length||!ps[0].data) return "";
        var v = ps[0].data;
        return "<b style='color:#FFD600'>"+sym+"</b> "+tf+" "+ps[0].axisValueLabel+
          "<br>O <b>"+(+v[1]).toFixed(dg)+"</b>"+
          "<br>H <b style='color:"+bull+"'>"+(+v[4]).toFixed(dg)+"</b>"+
          "<br>L <b style='color:"+bear+"'>"+(+v[3]).toFixed(dg)+"</b>"+
          "<br>C <b>"+(+v[2]).toFixed(dg)+"</b>";
      }
    },
    series:[{ type:"candlestick", name:sym, data:series, barMaxWidth:8,
      itemStyle:{ color:bull, color0:bear, borderColor:bull, borderColor0:bear, borderWidth:1 },
      emphasis:{disabled:true} }]
  };
}
function renderLadder(ch, sym, bars){
  if(!ch || !bars || !bars.length) return;
  var C = A.COLORS || {};
  var dg = digitsFor(sym);
  var last = bars[bars.length-1];
  var close = last[4];
  var hi=-Infinity, lo=Infinity;
  for(var i=0;i<bars.length;i++){
    if(bars[i][2]>hi) hi=bars[i][2];
    if(bars[i][3]<lo) lo=bars[i][3];
  }
  var sp = spreadPx(sym, close);
  var bid = close - sp/2, ask = close + sp/2;
  var levels = [
    { lbl:"HIGH", price:hi,    fill:C.hi  || "#2962ff", text:"#ffffff" },
    { lbl:"ASK",  price:ask,   fill:C.ask || "#b22833", text:"#ffffff" },
    { lbl:"CUR",  price:close, fill:C.mid || "#fb8c00", text:"#000000" },
    { lbl:"BID",  price:bid,   fill:C.bid || "#ffee58", text:"#000000" },
    { lbl:"LOW",  price:lo,    fill:C.lo  || "#2962ff", text:"#ffffff" }
  ];
  var boxW = 62, boxH = 18;
  var elements = levels.map(function(L){
    var yPx;
    try { yPx = ch.convertToPixel({yAxisIndex:0}, L.price); } catch(e){ yPx = null; }
    if(yPx==null || !isFinite(yPx)) return null;
    return {
      type:"group", right:2, top: Math.max(0, yPx - boxH/2), z:100,
      children:[
        { type:"rect", shape:{x:0, y:0, width:boxW, height:boxH},
          style:{ fill:L.fill, stroke:null } },
        { type:"text", style:{ x:4, y:2, text:L.lbl, fill:L.text,
          font:"700 8px 'SF Mono',Menlo,Consolas,monospace",
          textAlign:"left", textVerticalAlign:"top" } },
        { type:"text", style:{ x:22, y:2, text:(+L.price).toFixed(dg), fill:L.text,
          font:"700 10px 'SF Mono',Menlo,Consolas,monospace",
          textAlign:"left", textVerticalAlign:"top" } }
      ]
    };
  }).filter(Boolean);
  // Merge by element id so the price ladder updates without clobbering the
  // TF badge graphic. ECharts diffs graphic elements by `id`.
  try { ch.setOption({ graphic:{ elements: [
    { id:"atlas-tfbadge" },
    { type:"group", id:"ladder", children: elements }
  ] } }); } catch(e){}
}
function updatePanelHdr(wrap, sym, tf, bars){
  if(!wrap || !bars || !bars.length) return;
  var h = wrap.querySelector(".panel-hdr");
  if(!h) return;
  var dg = digitsFor(sym);
  var close = bars[bars.length-1][4];
  var first = bars[0][4];
  var chg = close - first, pc = first ? (chg/first*100) : 0;
  var sp = spreadPx(sym, close);
  var bid = close - sp/2, ask = close + sp/2;
  var sq = function(sel){ return h.querySelector(sel); };
  if(sq(".sym"))    sq(".sym").textContent    = sym;
  if(sq(".tf"))     sq(".tf").textContent     = tf;
  if(sq(".last"))   sq(".last").textContent   = (+close).toFixed(dg);
  var chgEl = sq(".chg");
  if(chgEl){
    chgEl.textContent = (chg>=0?"+":"")+(+chg).toFixed(dg)+" ("+(pc>=0?"+":"")+(+pc).toFixed(2)+"%)";
    chgEl.className = "chg " + (chg>0?"up":chg<0?"dn":"mut");
  }
  if(sq(".sell .v")) sq(".sell .v").textContent = (+bid).toFixed(dg);
  if(sq(".buy .v"))  sq(".buy .v").textContent  = (+ask).toFixed(dg);
  var spd = sq(".spread .v");
  if(spd){
    var v = (dg>=5) ? Math.round(sp*100000) : (dg===3 ? Math.round(sp*100) : (+sp).toFixed(2));
    spd.textContent = v;
  }
}
function fetchLive(sym, tf){
  if(!A.Feed || typeof A.Feed.fetchSymbol !== "function"){
    return Promise.reject(new Error("DataFeed not initialised"));
  }
  return A.Feed.fetchSymbol(sym, tf).then(function(r){
    if(!r || !r.bars || !r.bars.length) throw new Error("twelvedata: empty bars for "+sym+"/"+tf);
    return r;
  });
}
function loadPanel(p, sym){
  A.chartMeta[p.key] = { sym:sym, tf:p.tf, group:p.group };
  var found = findEl(p.domIds);
  return fetchLive(sym, p.tf).then(function(r){
    A.chartData[p.key] = r;
    if(found){
      var ch = buildOrGet(found.id);
      if(ch){
        try { ch.setOption(chartOption(sym, p.tf, r.bars), true); } catch(e){ console.error("[atlas] setOption fail", p.key, e); }
        var wrap = found.el.closest && found.el.closest(".chart-panel");
        if(wrap) updatePanelHdr(wrap, sym, p.tf, r.bars);
        setTimeout(function(){ renderLadder(ch, sym, r.bars); }, 16);
      }
    }
    return r;
  }).catch(function(e){
    console.error("[atlas] panel load failed", p.key, sym, p.tf, e && (e.message || e));
    // Symbol integrity: do NOT silently leave the panel showing a previous
    // symbol's data. Render the hard-block state so the user can never see
    // EURUSD (or any other asset) while a different symbol was requested.
    var found2 = findEl(p.domIds);
    if(found2) renderBlockedPanel(found2.id, sym, p.tf);
    return null;
  });
}
function loadMacroSilent(){
  return Promise.allSettled(MACRO.map(function(m){
    return fetchLive(m.sym, m.tf).then(function(r){
      A.chartData[m.key] = r;
      A.chartMeta[m.key] = { sym:m.sym, tf:m.tf };
    }).catch(function(e){
      console.error("[atlas] macro load failed", m.key, e && (e.message || e));
    });
  }));
}
function setSymLabels(sym){
  var els = document.querySelectorAll(".sym-label");
  for(var i=0;i<els.length;i++) els[i].textContent = sym;
}
function resizeAll(){
  Object.keys(A.charts).forEach(function(k){ try { A.charts[k].resize(); } catch(e){} });
}
// Each chart panel must own its own zoom / pan / pointer state. ECharts
// shared groups + echarts.connect() are forbidden by spec — they make
// dragging or zooming one panel move the others. Explicitly DISCONNECT any
// previously assigned group so reloads on the same page (Discord trigger
// → SSE → reload) cannot leave stale connections in place.
function groupDisconnect(){
  try {
    Object.keys(A.charts).forEach(function(id){
      var ch = A.charts[id];
      if(!ch) return;
      // Clear any group ID we may have set in earlier builds. ECharts honours
      // the "group" property on the instance and only links charts whose
      // group string matches AND have been passed to echarts.connect(...).
      ch.group = null;
      if(typeof echarts !== "undefined" && echarts.disconnect){
        try { echarts.disconnect("atlas-htf"); } catch(e){}
        try { echarts.disconnect("atlas-ltf"); } catch(e){}
      }
    });
  } catch(e){}
}
// HARD-BLOCK panel — used when the requested symbol has no data. Spec:
// "If MU data cannot load: Show a hard blocked panel — ATLAS blocked — MU
// chart data unavailable. No fallback chart rendered." Never falls back to
// a different symbol.
function renderBlockedPanel(domId, sym, tf){
  var ch = buildOrGet(domId);
  if(!ch) return;
  try {
    ch.setOption({
      animation:false,
      backgroundColor:"#000000",
      grid:{ left:6, right:6, top:56, bottom:6, containLabel:false },
      title:{ show:false },
      xAxis:{ show:false, type:"category", data:[] },
      yAxis:{ show:false, type:"value" },
      series:[],
      // Reuse the same TF badge so the user still sees which timeframe the
      // panel is FOR, even when no data is available.
      graphic: {
        elements: tfBadgeGraphic(sym || "—", tf).elements.concat([
          { type:"text",
            left:"center", top:"middle",
            style:{ text:"⚠ ATLAS BLOCKED — " + (sym || "(no symbol)") +
              " chart data unavailable.\nNo fallback chart rendered.",
              fill:"#ff0015",
              font:"700 13px 'SF Mono',Menlo,Consolas,monospace",
              textAlign:"center", textVerticalAlign:"middle" } }
        ])
      }
    }, true);
  } catch(e){}
}
window.addEventListener("resize", resizeAll);

A.Charts = {
  load: function(symbol){
    if(symbol){
      // Allow alphanumeric symbols (MU, NAS100, US500, BCOUSD, EURUSD ...).
      // The earlier version stripped digits, which made e.g. "NAS100" → "NAS".
      var s = (""+symbol).toUpperCase().replace(/[^A-Z0-9]/g,"");
      if(s) A.activeSymbol = s;
    }
    // Hard symbol-integrity guard. If no symbol has been supplied (URL
    // lacked ?symbol=, Discord SSE hasn't fired yet), render every panel as
    // BLOCKED rather than fall back to EURUSD or any other asset.
    if(!A.activeSymbol){
      console.warn("[atlas] Charts.load called with no active symbol — rendering blocked panels.");
      setSymLabels("—");
      PANELS.forEach(function(p){
        var found = findEl(p.domIds);
        if(found) renderBlockedPanel(found.id, null, p.tf);
      });
      if(A.status) A.status("err", "-", "NO SYMBOL");
      return Promise.resolve(null);
    }
    setSymLabels(A.activeSymbol);
    var tasks = PANELS.map(function(p){ return loadPanel(p, A.activeSymbol); });
    tasks.push(loadMacroSilent());
    return Promise.all(tasks).then(function(r){
      // Each panel owns its own zoom/pan state — never connect.
      groupDisconnect();
      if(A.status){
        var prov = (A.src && A.src.provider) || null;
        if(prov) A.status("ok", prov, "LIVE");
        else     A.status("err", "-", "NO DATA");
      }
      return r;
    });
  },
  resizeAll: resizeAll,
  loadMacro: loadMacroSilent,
  loadHTF: function(sym){
    sym = sym || A.activeSymbol;
    return Promise.all(PANELS.filter(function(p){return p.group==="htf";}).map(function(p){ return loadPanel(p, sym); }));
  },
  loadLTF: function(sym){
    sym = sym || A.activeSymbol;
    return Promise.all(PANELS.filter(function(p){return p.group==="ltf";}).map(function(p){ return loadPanel(p, sym); }));
  }
};

window.ChartsEngine = {
  // init is intentionally a no-op for chart loading. The active path now
  // requires the caller (index.html boot block, SSE handler, or Discord
  // trigger) to provide the symbol explicitly via load(symbol). This
  // eliminates the previous race where init() loaded EURUSD into all 8
  // panels before load(MU) overwrote them.
  init:    async function(){ return true; },
  load:    async function(symbol){ await A.Charts.load(symbol); return true; },
  run:     async function(symbol){ await A.Charts.load(symbol); return true; },
  loadAll: async function(){ await A.Charts.load(A.activeSymbol); return true; }
};
})();
