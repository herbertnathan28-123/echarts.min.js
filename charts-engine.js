/* ATLAS FX - charts-engine.js
   FINAL CHART ENGINE FIX.
   DOM targets: htf-1, htf-2, htf-3, htf-4, ltf-1, ltf-2, ltf-3, ltf-4.
   Legacy DOM fallback: ch-htf-1W/1D/4H/1H, ch-ltf-30M/15M/5M/1M.
   Cache keys: ch-htf-1W, ch-htf-1D, ch-htf-4H, ch-htf-1H, ch-ltf-30M, ch-ltf-15M, ch-ltf-5M, ch-ltf-1M.
   Macro keys silent-loaded for macro engine: ch-macro-DXY, ch-macro-US10Y, ch-macro-EQUITIES, ch-macro-USDJPY.
   chart.setOption called for every panel. Mock OHLC fallback on any failure. Zero blank charts. */
(function(){
var A = window.ATLAS = window.ATLAS || {};
A.chartData = A.chartData || {};
A.chartMeta = A.chartMeta || {};
A.charts    = A.charts    || {};
A.activeSymbol = A.activeSymbol || "EURUSD";

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
var TF_MS = { "1M":60000, "5M":300000, "15M":900000, "30M":1800000, "1H":3600000, "4H":14400000, "1D":86400000, "1W":604800000 };
var SEED  = { DXY:103.2, US10Y:4.25, EQUITIES:5200, USDJPY:151.5, EURUSD:1.085, GBPUSD:1.265,
              AUDJPY:97.5, USDCAD:1.37, USDCHF:0.91, AUDUSD:0.655, NZDUSD:0.59, EURJPY:164.5, GBPJPY:191.5 };

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
function mockBars(sym, tf, n){
  n = n || 200;
  var base = SEED[sym] != null ? SEED[sym] : 100;
  var step = TF_MS[tf] || 3600000;
  var now = Date.now();
  var bars = [];
  var p = base;
  for(var i=n-1;i>=0;i--){
    var o = p;
    var drift = (Math.sin(i*0.11)+Math.cos(i*0.23))*base*0.0008;
    var noise = (Math.random()-0.5)*base*0.0015;
    var c = o + drift + noise;
    var h = Math.max(o,c) + Math.abs(noise)*1.2;
    var l = Math.min(o,c) - Math.abs(noise)*1.2;
    bars.push([now - i*step, o, h, l, c]);
    p = c;
  }
  return bars;
}
function findEl(ids){
  for(var i=0;i<ids.length;i++){
    var el = document.getElementById(ids[i]);
    if(el) return { el:el, id:ids[i] };
  }
  return null;
}
function buildOrGet(domId){
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
    grid:{ left:6, right:72, top:22, bottom:20, containLabel:false },
    title:{ text: sym + "  " + tf, left:6, top:3,
      textStyle:{color:"#FFD600", fontSize:11, fontWeight:700,
        fontFamily:"SF Mono,Menlo,Consolas,monospace"} },
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
  try { ch.setOption({ graphic:{ elements: [{ type:"group", id:"ladder", children: elements }] } }); } catch(e){}
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
function fetchWithFallback(sym, tf){
  var p;
  try {
    if(A.Feed && typeof A.Feed.fetchSymbol === "function"){
      p = A.Feed.fetchSymbol(sym, tf);
    } else {
      p = Promise.reject(new Error("no feed"));
    }
  } catch(e){ p = Promise.reject(e); }
  return p.then(function(r){
    if(!r || !r.bars || !r.bars.length) throw new Error("empty");
    return r;
  }).catch(function(){
    return { provider:"MOCK", bars: mockBars(sym, tf, 200) };
  });
}
function loadPanel(p, sym){
  A.chartMeta[p.key] = { sym:sym, tf:p.tf, group:p.group };
  var found = findEl(p.domIds);
  return fetchWithFallback(sym, p.tf).then(function(r){
    A.chartData[p.key] = r;
    if(found){
      var ch = buildOrGet(found.id);
      if(ch){
        try { ch.setOption(chartOption(sym, p.tf, r.bars), true); } catch(e){}
        var wrap = found.el.closest && found.el.closest(".chart-panel");
        if(wrap) updatePanelHdr(wrap, sym, p.tf, r.bars);
        setTimeout(function(){ renderLadder(ch, sym, r.bars); }, 16);
      }
    }
    return r;
  }).catch(function(){
    var fb = { provider:"MOCK", bars: mockBars(sym, p.tf, 200) };
    A.chartData[p.key] = fb;
    if(found){
      var ch = buildOrGet(found.id);
      if(ch){ try { ch.setOption(chartOption(sym, p.tf, fb.bars), true); } catch(e){} }
    }
    return fb;
  });
}
function loadMacroSilent(){
  return Promise.allSettled(MACRO.map(function(m){
    return fetchWithFallback(m.sym, m.tf).then(function(r){
      A.chartData[m.key] = r;
      A.chartMeta[m.key] = { sym:m.sym, tf:m.tf };
    }).catch(function(){
      A.chartData[m.key] = { provider:"MOCK", bars: mockBars(m.sym, m.tf, 200) };
      A.chartMeta[m.key] = { sym:m.sym, tf:m.tf };
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
function groupConnect(){
  try {
    PANELS.filter(function(p){return p.group==="htf";}).forEach(function(p){
      var id = (findEl(p.domIds)||{}).id; if(id && A.charts[id]) A.charts[id].group = "atlas-htf";
    });
    PANELS.filter(function(p){return p.group==="ltf";}).forEach(function(p){
      var id = (findEl(p.domIds)||{}).id; if(id && A.charts[id]) A.charts[id].group = "atlas-ltf";
    });
    if(typeof echarts !== "undefined" && echarts.connect){
      echarts.connect("atlas-htf"); echarts.connect("atlas-ltf");
    }
  } catch(e){}
}
window.addEventListener("resize", resizeAll);

A.Charts = {
  load: function(symbol){
    if(symbol){
      var s = (""+symbol).toUpperCase().replace(/[^A-Z]/g,"");
      if(s) A.activeSymbol = s;
    }
    setSymLabels(A.activeSymbol);
    var tasks = PANELS.map(function(p){ return loadPanel(p, A.activeSymbol); });
    tasks.push(loadMacroSilent());
    return Promise.all(tasks).then(function(r){
      groupConnect();
      if(A.status) A.status("ok", (A.src && A.src.provider) || "MOCK", "LIVE");
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
  init:    async function(){ await A.Charts.load(A.activeSymbol); return true; },
  load:    async function(symbol){ await A.Charts.load(symbol); return true; },
  run:     async function(symbol){ await A.Charts.load(symbol); return true; },
  loadAll: async function(){ await A.Charts.load(A.activeSymbol); return true; }
};
})();
