/* ATLAS FX - charts-engine.js
   HTF MATRIX (2x2): 1W / 1D / 4H / 1H for active symbol
   LTF MATRIX (2x2): 30M / 15M / 5M / 1M for active symbol
   MACRO DATA loaded silently in background (no UI panel) for macro engine consumption.
   Each visible panel: TV-style header + right-side price ladder via ECharts graphic layer.
   Ladder order top->bottom: HIGH (blue) / ASK (red) / CURRENT (orange) / BID (yellow) / LOW (blue).
   ASCII only. No emojis. No arrows. */
(function(){
var A = window.ATLAS;
A.charts = {};
A.chartData = {};
A.chartMeta = {};
A.activeSymbol = A.activeSymbol || "EURUSD";
A.MACRO_PANELS = [
  { id:"ch-macro-DXY",      sym:"DXY",      tf:"1H" },
  { id:"ch-macro-US10Y",    sym:"US10Y",    tf:"1H" },
  { id:"ch-macro-EQUITIES", sym:"EQUITIES", tf:"1H" },
  { id:"ch-macro-USDJPY",   sym:"USDJPY",   tf:"1H" }
];
A.HTF_TFS = ["1W","1D","4H","1H"];
A.LTF_TFS = ["30M","15M","5M","1M"];
function digitsFor(sym){ return (A.SYMBOLS[sym]||A.FX[sym]||{digits:4}).digits; }
function spreadPx(sym, close){
  if(A.FX[sym] && A.FX[sym].digits>=5) return Math.max(close*0.000008, 0.00005);
  if(A.FX[sym] && A.FX[sym].digits===3) return Math.max(close*0.00007, 0.007);
  if(sym==="US10Y") return 0.003;
  if(sym==="EQUITIES") return 0.25;
  if(sym==="DXY") return 0.02;
  return close*0.00012;
}
function updatePanelHeader(panelId){
  var m = A.chartMeta[panelId]; if(!m) return;
  var d = A.chartData[panelId]; if(!d || !d.bars || !d.bars.length) return;
  var el = document.getElementById(panelId); if(!el) return;
  var wrap = el.closest(".chart-panel"); if(!wrap) return;
  var h = wrap.querySelector(".panel-hdr"); if(!h) return;
  var sym = m.sym, tf = m.tf, dg = digitsFor(sym);
  var last = d.bars[d.bars.length-1];
  var close = last[4];
  var sp = spreadPx(sym, close);
  var bid = close - sp/2, ask = close + sp/2;
  var first = d.bars[0][4];
  var chg = close - first, pc = first ? (chg/first*100) : 0;
  h.querySelector(".sym").textContent  = sym;
  h.querySelector(".tf").textContent   = tf;
  h.querySelector(".last").textContent = A.fmt(close, dg);
  var chgEl = h.querySelector(".chg");
  chgEl.textContent = (chg>=0?"+":"")+A.fmt(chg,dg)+" ("+A.pct(pc)+")";
  chgEl.className = "chg " + (chg>0?"up":chg<0?"dn":"mut");
  h.querySelector(".sell .v").textContent = A.fmt(bid, dg);
  h.querySelector(".buy .v").textContent  = A.fmt(ask, dg);
  var spDisp = (dg>=5) ? Math.round(sp*100000) : (dg===3 ? Math.round(sp*100) : sp.toFixed(2));
  h.querySelector(".spread .v").textContent = spDisp;
}
function renderLadder(panelId){
  var ch = A.charts[panelId]; if(!ch) return;
  var d = A.chartData[panelId]; if(!d || !d.bars || !d.bars.length) return;
  var m = A.chartMeta[panelId]; if(!m) return;
  var sym = m.sym, dg = digitsFor(sym);
  var bars = d.bars;
  var last = bars[bars.length-1];
  var close = last[4];
  var hi = -Infinity, lo = Infinity;
  for(var i=0;i<bars.length;i++){ if(bars[i][2]>hi) hi=bars[i][2]; if(bars[i][3]<lo) lo=bars[i][3]; }
  var sp = spreadPx(sym, close);
  var bid = close - sp/2, ask = close + sp/2;
  var levels = [
    { lbl:"HIGH", price:hi,    fill:A.COLORS.hi,  text:"#ffffff" },
    { lbl:"ASK",  price:ask,   fill:A.COLORS.ask, text:"#ffffff" },
    { lbl:"CUR",  price:close, fill:A.COLORS.mid, text:"#000000" },
    { lbl:"BID",  price:bid,   fill:A.COLORS.bid, text:"#000000" },
    { lbl:"LOW",  price:lo,    fill:A.COLORS.lo,  text:"#ffffff" }
  ];
  var boxW = 62, boxH = 18, rightInset = 2;
  var elements = levels.map(function(L){
    var yPx;
    try { yPx = ch.convertToPixel({yAxisIndex:0}, L.price); } catch(e){ yPx = null; }
    if(yPx==null || !isFinite(yPx)) return null;
    return {
      type:"group",
      right: rightInset,
      top:  Math.max(0, yPx - boxH/2),
      z: 100,
      children:[
        { type:"rect", shape:{x:0, y:0, width:boxW, height:boxH},
          style:{ fill:L.fill, stroke:null } },
        { type:"text", style:{ x:4, y:2, text:L.lbl, fill:L.text,
          font:"700 8px 'SF Mono',Menlo,Consolas,monospace", textAlign:"left", textVerticalAlign:"top" } },
        { type:"text", style:{ x:22, y:2, text:A.fmt(L.price, dg), fill:L.text,
          font:"700 10px 'SF Mono',Menlo,Consolas,monospace", textAlign:"left", textVerticalAlign:"top" } }
      ]
    };
  }).filter(Boolean);
  ch.setOption({ graphic:{ elements: [{ type:"group", id:"ladder", children: elements }] } });
}
function buildChart(panelId){
  var el = document.getElementById(panelId);
  if(!el) return null;
  var m = A.chartMeta[panelId] || { sym:"-", tf:"-" };
  var sym = m.sym;
  var ch = echarts.init(el, null, {renderer:"canvas"});
  ch.setOption({
    animation:false,
    backgroundColor:A.COLORS.bg,
    grid:{ left:6, right:72, top:4, bottom:20, containLabel:false },
    xAxis:{
      type:"category", data:[], boundaryGap:true,
      axisLine:{lineStyle:{color:A.COLORS.grid}},
      axisTick:{lineStyle:{color:A.COLORS.grid}},
      axisLabel:{color:A.COLORS.axis, fontSize:9, hideOverlap:true},
      splitLine:{show:false},
      axisPointer:{ lineStyle:{color:A.COLORS.cross, type:"solid", width:1},
        label:{backgroundColor:"#000",color:A.COLORS.cross,fontSize:10,borderColor:A.COLORS.cross,borderWidth:1}}
    },
    yAxis:{
      scale:true, position:"right",
      axisLine:{lineStyle:{color:A.COLORS.grid}},
      axisTick:{show:false},
      axisLabel:{color:A.COLORS.axis, fontSize:9, inside:false, margin:4,
        formatter:function(v){ return (+v).toFixed(digitsFor((A.chartMeta[panelId]||{}).sym||sym)); }},
      splitLine:{lineStyle:{color:A.COLORS.grid, type:"dashed", opacity:0.25}},
      axisPointer:{ lineStyle:{color:A.COLORS.cross, type:"solid", width:1},
        label:{backgroundColor:"#000",color:A.COLORS.cross,fontSize:10,borderColor:A.COLORS.cross,borderWidth:1,
          formatter:function(p){ return (+p.value).toFixed(digitsFor((A.chartMeta[panelId]||{}).sym||sym)); }}}
    },
    dataZoom:[{type:"inside", throttle:40, filterMode:"filter", start:55, end:100,
      zoomOnMouseWheel:true, moveOnMouseMove:true}],
    tooltip:{ trigger:"axis",
      axisPointer:{type:"cross", snap:true,
        crossStyle:{color:A.COLORS.cross}, lineStyle:{color:A.COLORS.cross}},
      backgroundColor:"rgba(0,0,0,0.92)", borderColor:A.COLORS.grid, borderWidth:1,
      textStyle:{color:"#fff", fontSize:11},
      formatter:function(ps){
        if(!ps||!ps.length||!ps[0].data) return "";
        var v = ps[0].data, mm = A.chartMeta[panelId]||{}, d = digitsFor(mm.sym||sym);
        return "<b style='color:#FFD600'>"+(mm.sym||sym)+"</b> "+(mm.tf||"")+" "+ps[0].axisValueLabel+
          "<br>O <b>"+(+v[1]).toFixed(d)+"</b>"+
          "<br>H <b style='color:"+A.COLORS.bull+"'>"+(+v[4]).toFixed(d)+"</b>"+
          "<br>L <b style='color:"+A.COLORS.bear+"'>"+(+v[3]).toFixed(d)+"</b>"+
          "<br>C <b>"+(+v[2]).toFixed(d)+"</b>";
      }
    },
    series:[{ type:"candlestick", name:sym, data:[], barMaxWidth:8,
      itemStyle:{ color:A.COLORS.bull, color0:A.COLORS.bear,
                  borderColor:A.COLORS.bull, borderColor0:A.COLORS.bear, borderWidth:1 },
      emphasis:{disabled:true} }]
  });
  A.charts[panelId] = ch;
  return ch;
}
function applyData(panelId){
  var d = A.chartData[panelId]; var ch = A.charts[panelId]; var m = A.chartMeta[panelId];
  if(!d || !ch || !m) return;
  var tf = m.tf;
  var cats = d.bars.map(function(b){
    var dt = new Date(b[0]);
    if(tf==="1M"||tf==="5M"||tf==="15M"||tf==="30M") return dt.toISOString().substr(11,5);
    if(tf==="1H"||tf==="4H") return dt.toISOString().substr(5,11).replace("T"," ");
    if(tf==="1D"||tf==="1W") return dt.toISOString().substr(0,10);
    return dt.toISOString().substr(5,11).replace("T"," ");
  });
  var series = d.bars.map(function(b){ return [b[1], b[4], b[3], b[2]]; });
  ch.setOption({ xAxis:{data:cats}, series:[{data:series}] });
  requestAnimationFrame(function(){ updatePanelHeader(panelId); renderLadder(panelId); });
}
function loadPanel(panelId, sym, tf){
  A.chartMeta[panelId] = { sym:sym, tf:tf };
  return A.Feed.fetchSymbol(sym, tf).then(function(r){
    A.chartData[panelId] = r;
    if(A.charts[panelId]) applyData(panelId);
    return r;
  });
}
function loadMacroSilent(){
  /* no DOM, just populate A.chartData for macro engine */
  return Promise.allSettled(A.MACRO_PANELS.map(function(p){
    A.chartMeta[p.id] = { sym:p.sym, tf:p.tf };
    return A.Feed.fetchSymbol(p.sym, p.tf).then(function(r){ A.chartData[p.id] = r; });
  }));
}
function buildAllCharts(){
  A.HTF_TFS.forEach(function(tf){
    var id = "ch-htf-"+tf; A.chartMeta[id] = { sym:A.activeSymbol, tf:tf }; buildChart(id);
  });
  A.LTF_TFS.forEach(function(tf){
    var id = "ch-ltf-"+tf; A.chartMeta[id] = { sym:A.activeSymbol, tf:tf }; buildChart(id);
  });
  A.HTF_TFS.forEach(function(tf){ var c=A.charts["ch-htf-"+tf]; if(c) c.group="atlas-htf"; });
  A.LTF_TFS.forEach(function(tf){ var c=A.charts["ch-ltf-"+tf]; if(c) c.group="atlas-ltf"; });
  try { echarts.connect("atlas-htf"); echarts.connect("atlas-ltf"); } catch(e){}
}
function resizeAll(){
  Object.keys(A.charts).forEach(function(k){
    try { A.charts[k].resize(); } catch(e){}
    updatePanelHeader(k);
    renderLadder(k);
  });
}
function wireEvents(){
  window.addEventListener("resize", resizeAll);
  Object.keys(A.charts).forEach(function(k){
    A.charts[k].on("datazoom", function(){ renderLadder(k); });
    A.charts[k].on("finished", function(){ renderLadder(k); });
  });
  /* collapsible-open event: charts may have been hidden, force resize when visible */
  document.addEventListener("atlas:refresh-charts", resizeAll);
}
function setSymbolLabels(sym){
  var els = document.querySelectorAll(".sym-label");
  for(var i=0;i<els.length;i++) els[i].textContent = sym;
}
A.Charts = {
  init: buildAllCharts,
  wireEvents: wireEvents,
  resizeAll: resizeAll,
  loadMacro: loadMacroSilent,
  loadHTF: function(sym){
    sym = sym || A.activeSymbol;
    return Promise.allSettled(A.HTF_TFS.map(function(tf){ return loadPanel("ch-htf-"+tf, sym, tf); }));
  },
  loadLTF: function(sym){
    sym = sym || A.activeSymbol;
    return Promise.allSettled(A.LTF_TFS.map(function(tf){ return loadPanel("ch-ltf-"+tf, sym, tf); }));
  },
  loadAll: function(){
    return Promise.all([loadMacroSilent(), A.Charts.loadHTF(), A.Charts.loadLTF()]).then(function(res){
      var prov = A.src.provider || "-";
      A.status && A.status("ok", prov, "LIVE");
      return res;
    });
  },
  setActiveSymbol: function(sym){
    if(!sym) return;
    A.activeSymbol = (""+sym).toUpperCase().replace(/[^A-Z]/g,"");
    setSymbolLabels(A.activeSymbol);
  }
};
window.ChartsEngine = {
  init: async function(){
    A.Charts.init();
    A.Charts.setActiveSymbol(A.activeSymbol);
    await A.Charts.loadAll();
    A.Charts.wireEvents();
    return true;
  },
  load: async function(symbol){
    if(symbol){ A.Charts.setActiveSymbol(symbol); }
    await Promise.all([A.Charts.loadMacro(), A.Charts.loadHTF(), A.Charts.loadLTF()]);
    return true;
  },
  run:     async function(symbol){ return window.ChartsEngine.load(symbol); },
  loadAll: async function(){ return A.Charts.loadAll(); }
};
})();
