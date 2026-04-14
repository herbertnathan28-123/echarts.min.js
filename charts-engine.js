/* ATLAS FX — charts-engine.js
   2x2 ECharts candlestick grid with synced zoom/pan/crosshair and overlaid price box stacks. */
(function(){
var A = window.ATLAS;
A.charts = {};
A.chartData = {};
A.chartTF = { DXY:"1h", US10Y:"1h", EQUITIES:"1h", USDJPY:"1h" };
function buildChart(sym){
  var el = document.getElementById("ch-"+sym);
  if(!el) return null;
  var ch = echarts.init(el, null, {renderer:"canvas"});
  ch.setOption({
    animation:false,
    backgroundColor:A.COLORS.bg,
    grid:{ left:6, right:82, top:20, bottom:22, containLabel:false },
    xAxis:{
      type:"category", data:[], boundaryGap:true,
      axisLine:{lineStyle:{color:A.COLORS.grid}},
      axisTick:{lineStyle:{color:A.COLORS.grid}},
      axisLabel:{color:A.COLORS.axis, fontSize:9, hideOverlap:true},
      splitLine:{show:false},
      axisPointer:{label:{backgroundColor:"#182230",color:"#d7dde3",fontSize:10}}
    },
    yAxis:{
      scale:true, position:"right",
      axisLine:{lineStyle:{color:A.COLORS.grid}},
      axisTick:{show:false},
      axisLabel:{color:A.COLORS.axis, fontSize:9, inside:false, margin:4,
        formatter:function(v){ return (+v).toFixed(A.SYMBOLS[sym].digits); }},
      splitLine:{lineStyle:{color:A.COLORS.grid, type:"dashed", opacity:0.35}},
      axisPointer:{label:{backgroundColor:"#182230",color:"#d7dde3",fontSize:10,
        formatter:function(p){ return (+p.value).toFixed(A.SYMBOLS[sym].digits); }}}
    },
    dataZoom:[{type:"inside", throttle:40, filterMode:"filter", start:60, end:100,
      zoomOnMouseWheel:true, moveOnMouseMove:true}],
    tooltip:{ trigger:"axis",
      axisPointer:{type:"cross", snap:true,
        crossStyle:{color:A.COLORS.axis}, lineStyle:{color:A.COLORS.axis}},
      backgroundColor:"rgba(5,10,16,0.92)", borderColor:A.COLORS.grid, borderWidth:1,
      textStyle:{color:"#d7dde3", fontSize:11},
      formatter:function(ps){
        if(!ps||!ps.length||!ps[0].data) return "";
        var v = ps[0].data, d = A.SYMBOLS[sym].digits;
        return "<b style='color:#FFD600'>"+sym+"</b> "+ps[0].axisValueLabel+
          "<br>O <b>"+(+v[1]).toFixed(d)+"</b>"+
          "<br>H <b style='color:#07f911'>"+(+v[4]).toFixed(d)+"</b>"+
          "<br>L <b style='color:#ff0015'>"+(+v[3]).toFixed(d)+"</b>"+
          "<br>C <b>"+(+v[2]).toFixed(d)+"</b>";
      }
    },
    series:[{ type:"candlestick", name:sym, data:[], barMaxWidth:8,
      itemStyle:{ color:A.COLORS.bull, color0:A.COLORS.bear,
                  borderColor:A.COLORS.bull, borderColor0:A.COLORS.bear, borderWidth:1 },
      emphasis:{disabled:true} }]
  });
  ch.group = "atlas";
  A.charts[sym] = ch;
  return ch;
}
function positionBoxes(sym){
  var ch = A.charts[sym]; if(!ch) return;
  var d = A.chartData[sym]; if(!d || !d.bars || !d.bars.length) return;
  var stack = document.getElementById("ps-"+sym); if(!stack) return;
  var last = d.bars[d.bars.length-1];
  var o=last[1], c=last[4];
  var winHi=-Infinity, winLo=Infinity;
  for(var i=0;i<d.bars.length;i++){
    if(d.bars[i][2]>winHi) winHi=d.bars[i][2];
    if(d.bars[i][3]<winLo) winLo=d.bars[i][3];
  }
  var entry = (o+c)/2;
  var dg = A.SYMBOLS[sym].digits;
  var H = stack.parentElement.getBoundingClientRect().height;
  var px = function(p){ try { return ch.convertToPixel({yAxisIndex:0}, p); } catch(e){ return null; } };
  var pyO = px(o), pyC = px(c);
  var bodyH = (pyO!=null && pyC!=null) ? Math.max(16, Math.min(30, Math.abs(pyO-pyC)+10)) : 20;
  stack.innerHTML =
    '<div class="pbox high"><div class="lbl">HIGH</div><div class="val">'+A.fmt(winHi,dg)+'</div></div>'+
    '<div class="pbox cur"><div class="lbl">CURRENT</div><div class="val">'+A.fmt(c,dg)+'</div></div>'+
    '<div class="pbox ent"><div class="lbl">ENTRY</div><div class="val">'+A.fmt(entry,dg)+'</div></div>'+
    '<div class="pbox low"><div class="lbl">LOW</div><div class="val">'+A.fmt(winLo,dg)+'</div></div>';
  var boxes = stack.children;
  var place = function(el, yPx){
    if(yPx==null || !isFinite(yPx)) { el.style.display="none"; return; }
    el.style.display="flex";
    var top = Math.max(0, Math.min(H-bodyH, yPx - bodyH/2));
    el.style.top = top+"px";
    el.style.height = bodyH+"px";
  };
  place(boxes[0], px(winHi));
  place(boxes[1], px(c));
  place(boxes[2], px(entry));
  place(boxes[3], px(winLo));
  var wrap = stack.parentElement;
  var hdr = wrap.querySelector(".chart-hdr");
  if(hdr){
    var first = d.bars[0][4], chg = c-first, pc = first?(chg/first*100):0;
    hdr.querySelector(".val").textContent = A.fmt(c,dg);
    var chgEl = hdr.querySelector(".chg");
    chgEl.textContent = (chg>=0?"+":"")+A.fmt(chg,dg)+" ("+A.pct(pc)+")";
    chgEl.className = "chg " + A.sign(chg);
    hdr.querySelector(".tf").textContent = A.chartTF[sym];
  }
}
function applyData(sym){
  var d = A.chartData[sym]; var ch = A.charts[sym]; if(!d||!ch) return;
  var tf = A.chartTF[sym];
  var cats = d.bars.map(function(b){
    var dt = new Date(b[0]);
    if(tf==="5m"||tf==="15m") return dt.toISOString().substr(11,5);
    return dt.toISOString().substr(5,11).replace("T"," ");
  });
  var series = d.bars.map(function(b){ return [b[1], b[4], b[3], b[2]]; });
  ch.setOption({ xAxis:{data:cats}, series:[{data:series}] });
  requestAnimationFrame(function(){ positionBoxes(sym); });
}
A.Charts = {
  init: function(){
    Object.keys(A.SYMBOLS).forEach(buildChart);
    var list = Object.keys(A.charts).map(function(k){return A.charts[k];});
    if(list.length>1) echarts.connect(list);
    document.querySelectorAll(".chart-wrap").forEach(function(wrap){
      var sym = wrap.getAttribute("data-sym");
      wrap.querySelectorAll(".chart-tfs button").forEach(function(btn){
        btn.addEventListener("click", function(){
          wrap.querySelectorAll(".chart-tfs button").forEach(function(b){b.classList.remove("on");});
          btn.classList.add("on");
          A.chartTF[sym] = btn.getAttribute("data-tf");
          A.Charts.loadSymbol(sym).catch(function(){});
        });
      });
    });
    window.addEventListener("resize", function(){
      Object.keys(A.charts).forEach(function(k){
        try{ A.charts[k].resize(); }catch(e){}
        positionBoxes(k);
      });
    });
    Object.keys(A.charts).forEach(function(k){
      A.charts[k].on("datazoom", function(){ positionBoxes(k); });
      A.charts[k].on("finished", function(){ positionBoxes(k); });
    });
  },
  loadSymbol: function(sym){
    var tf = A.chartTF[sym];
    return A.Feed.fetchSymbol(sym, tf).then(function(r){
      A.chartData[sym] = r;
      applyData(sym);
      return r;
    });
  },
  loadAll: function(){
    var keys = Object.keys(A.SYMBOLS);
    return Promise.allSettled(keys.map(function(k){ return A.Charts.loadSymbol(k); }))
      .then(function(res){
        var ok = res.filter(function(r){return r.status==="fulfilled";}).length;
        A.status(ok===keys.length?"ok":(ok>0?"warn":"err"), A.src.provider||"—", ok+"/"+keys.length+" LIVE");
        return res;
      });
  },
  positionBoxes: positionBoxes,
  applyData: applyData
};
})();
