/* ATLAS FX - data-feed.js
   Unified market data feed. Primary: TradingView UDF. Fallback: TwelveData REST. Tertiary: Yahoo Finance. Demo last. */
(function(){
var A = window.ATLAS = window.ATLAS || {};
A.COLORS = { bull:"#07f911", bear:"#ff0015", grid:"#1a1a1a", axis:"#6c7a89", bg:"#000000",
  hi:"#2962ff", lo:"#2962ff", mid:"#fb8c00", bid:"#ffee58", ask:"#b22833", cross:"#ffffff" };
A.SYMBOLS = {
  DXY:      { tv:"TVC:DXY",       td:"DXY",     yf:"DX-Y.NYB", label:"DXY",    digits:2 },
  US10Y:    { tv:"TVC:US10Y",     td:"US10Y",   yf:"^TNX",     label:"US10Y",  digits:3 },
  EQUITIES: { tv:"CME_MINI:ES1!", td:"SPX",     yf:"ES=F",     label:"S&P500", digits:2 },
  USDJPY:   { tv:"FX:USDJPY",     td:"USD/JPY", yf:"JPY=X",    label:"USDJPY", digits:3 }
};
A.FX = {
  EURUSD: { tv:"FX:EURUSD", td:"EUR/USD", yf:"EURUSD=X", digits:5 },
  GBPUSD: { tv:"FX:GBPUSD", td:"GBP/USD", yf:"GBPUSD=X", digits:5 },
  USDJPY: { tv:"FX:USDJPY", td:"USD/JPY", yf:"JPY=X",    digits:3 },
  AUDJPY: { tv:"FX:AUDJPY", td:"AUD/JPY", yf:"AUDJPY=X", digits:3 },
  USDCAD: { tv:"FX:USDCAD", td:"USD/CAD", yf:"CAD=X",    digits:5 },
  USDCHF: { tv:"FX:USDCHF", td:"USD/CHF", yf:"CHF=X",    digits:5 },
  AUDUSD: { tv:"FX:AUDUSD", td:"AUD/USD", yf:"AUDUSD=X", digits:5 },
  NZDUSD: { tv:"FX:NZDUSD", td:"NZD/USD", yf:"NZDUSD=X", digits:5 },
  EURJPY: { tv:"FX:EURJPY", td:"EUR/JPY", yf:"EURJPY=X", digits:3 },
  GBPJPY: { tv:"FX:GBPJPY", td:"GBP/JPY", yf:"GBPJPY=X", digits:3 }
};
A.TFS = {
  "1M":  { yf:"1m",  range:"1d",  tv:1,   td:"1min",  agg:1, barsMax:200 },
  "5M":  { yf:"5m",  range:"5d",  tv:5,   td:"5min",  agg:1, barsMax:200 },
  "15M": { yf:"15m", range:"5d",  tv:15,  td:"15min", agg:1, barsMax:200 },
  "30M": { yf:"30m", range:"1mo", tv:30,  td:"30min", agg:1, barsMax:200 },
  "1H":  { yf:"60m", range:"1mo", tv:60,  td:"1h",    agg:1, barsMax:200 },
  "4H":  { yf:"60m", range:"3mo", tv:240, td:"4h",    agg:4, barsMax:180 },
  "1D":  { yf:"1d",  range:"1y",  tv:"D", td:"1day",  agg:1, barsMax:180 },
  "1W":  { yf:"1wk", range:"5y",  tv:"W", td:"1week", agg:1, barsMax:150 }
};
/* legacy aliases */
A.TFS["5m"]=A.TFS["5M"]; A.TFS["15m"]=A.TFS["15M"]; A.TFS["1h"]=A.TFS["1H"];
A.TFS["4h"]=A.TFS["4H"]; A.TFS["1d"]=A.TFS["1D"]; A.TFS["1w"]=A.TFS["1W"];
A.src = { provider:null, t:0 };
A.proxies = [
  function(u){ return "https://corsproxy.io/?"+encodeURIComponent(u); },
  function(u){ return "https://api.allorigins.win/raw?url="+encodeURIComponent(u); },
  function(u){ return "https://api.codetabs.com/v1/proxy/?quest="+encodeURIComponent(u); }
];
A.fmt = function(v, d){ if(v==null||isNaN(v)) return "-"; d=(d==null?2:d); return (+v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}); };
A.pct = function(v){ if(v==null||isNaN(v)) return "-"; return (v>=0?"+":"")+(+v).toFixed(2)+"%"; };
A.sign = function(v){ return v>0?"up":v<0?"dn":"mut"; };
A.fetchRaw = function(url, opts){
  opts = opts || {}; var attempts = [url];
  if(opts.proxy!==false) attempts = attempts.concat(A.proxies.map(function(p){return p(url);}));
  var i = 0;
  return new Promise(function(res,rej){
    (function go(){
      if(i>=attempts.length){ rej(new Error("fetch fail: "+url)); return; }
      var a = attempts[i++], ctrl = new AbortController();
      var to = setTimeout(function(){ ctrl.abort(); }, opts.timeout||6000);
      fetch(a,{signal:ctrl.signal,mode:"cors",cache:"no-store"}).then(function(r){
        clearTimeout(to); if(!r.ok) throw new Error("HTTP "+r.status); return r.text();
      }).then(function(t){ res(t); }).catch(function(){ clearTimeout(to); go(); });
    })();
  });
};
A.fetchJSON = function(url, opts){
  return A.fetchRaw(url, opts).then(function(t){ try{ return JSON.parse(t); }catch(e){ throw new Error("bad json"); } });
};
A.tvFetch = function(sym, tf){
  var s = A.SYMBOLS[sym] || A.FX[sym], t = A.TFS[tf];
  if(!s || !t) return Promise.reject("bad sym/tf");
  var now = Math.floor(Date.now()/1000);
  var unitSec = (typeof t.tv === "string") ? (t.tv==="W"?7*86400:86400) : t.tv*60;
  var span = unitSec*(t.barsMax+30)*t.agg;
  var from = now - span;
  var url = "https://udf.tradingview.com/history?symbol="+encodeURIComponent(s.tv)+"&resolution="+t.tv+"&from="+from+"&to="+now;
  return A.fetchJSON(url,{timeout:5500}).then(function(j){
    if(!j || j.s!=="ok" || !j.t || !j.t.length) throw new Error("tv empty");
    return { provider:"TRADINGVIEW",
      bars: j.t.map(function(ts,i){ return [ts*1000, +j.o[i], +j.h[i], +j.l[i], +j.c[i]]; })
    };
  });
};
A.tdFetch = function(sym, tf){
  var s = A.SYMBOLS[sym] || A.FX[sym], t = A.TFS[tf];
  if(!s || !t) return Promise.reject("bad sym/tf");
  var url = "https://api.twelvedata.com/time_series?symbol="+encodeURIComponent(s.td)+"&interval="+t.td+"&outputsize="+(t.barsMax*t.agg+20)+"&apikey=demo&format=JSON";
  return A.fetchJSON(url,{timeout:6000,proxy:false}).then(function(j){
    if(!j || !j.values || !j.values.length) throw new Error("td empty");
    return { provider:"TWELVEDATA",
      bars: j.values.slice().reverse().map(function(b){
        return [new Date(b.datetime.replace(" ","T")+"Z").getTime(), +b.open, +b.high, +b.low, +b.close];
      })
    };
  });
};
A.yfFetch = function(sym, tf){
  var s = A.SYMBOLS[sym] || A.FX[sym], t = A.TFS[tf];
  if(!s || !t) return Promise.reject("bad sym/tf");
  var url = "https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(s.yf)+"?interval="+t.yf+"&range="+t.range;
  return A.fetchJSON(url,{timeout:7000}).then(function(j){
    var r = j && j.chart && j.chart.result && j.chart.result[0];
    if(!r || !r.timestamp) throw new Error("yf empty");
    var q = r.indicators.quote[0];
    return { provider:"YAHOO",
      bars: r.timestamp.map(function(ts,i){ return [ts*1000, q.open[i], q.high[i], q.low[i], q.close[i]]; })
        .filter(function(b){ return b[1]!=null && b[4]!=null; })
    };
  });
};
A.aggregate = function(bars, factor){
  if(factor<=1) return bars;
  var out=[], bucket=null, count=0;
  for(var i=0;i<bars.length;i++){
    var b = bars[i];
    if(!bucket){ bucket=[b[0],b[1],b[2],b[3],b[4]]; count=1; continue; }
    bucket[2] = Math.max(bucket[2], b[2]);
    bucket[3] = Math.min(bucket[3], b[3]);
    bucket[4] = b[4]; count++;
    if(count>=factor){ out.push(bucket); bucket=null; count=0; }
  }
  if(bucket) out.push(bucket);
  return out;
};
A.demoFallback = function(sym, tf){
  var seedMap = { DXY:103.2, US10Y:4.25, EQUITIES:5200, USDJPY:151.5, EURUSD:1.085, GBPUSD:1.265, AUDJPY:97.5,
                  USDCAD:1.37, USDCHF:0.91, AUDUSD:0.655, NZDUSD:0.59, EURJPY:164.5, GBPJPY:191.5 };
  var base = seedMap[sym] != null ? seedMap[sym] : 100;
  var t = A.TFS[tf] || A.TFS["1H"];
  var unitMs = (typeof t.tv === "string") ? (t.tv==="W"?7*86400000:86400000) : t.tv*60000;
  var step = unitMs * t.agg;
  var now = Date.now(), bars = [], p = base;
  for(var i=t.barsMax-1;i>=0;i--){
    var o = p;
    var drift = (Math.sin(i*0.11)+Math.cos(i*0.23))*base*0.0008;
    var noise = (Math.random()-0.5)*base*0.0015;
    var c = o + drift + noise;
    var h = Math.max(o,c) + Math.abs(noise)*1.2;
    var l = Math.min(o,c) - Math.abs(noise)*1.2;
    bars.push([now - i*step, o, h, l, c]);
    p = c;
  }
  return { provider:"DEMO", bars:bars };
};
A.Feed = {
  fetchSymbol: function(sym, tf){
    var t = A.TFS[tf] || A.TFS["1H"];
    var providers = [A.tvFetch, A.tdFetch, A.yfFetch];
    var idx = 0;
    return new Promise(function(res){
      (function go(){
        if(idx>=providers.length){
          var d = A.demoFallback(sym, tf);
          d.bars = A.aggregate(d.bars, t.agg).slice(-t.barsMax);
          A.src.provider = "DEMO"; A.src.t = Date.now();
          res(d); return;
        }
        providers[idx++](sym, tf).then(function(r){
          r.bars = A.aggregate(r.bars, t.agg).slice(-t.barsMax);
          A.src.provider = r.provider; A.src.t = Date.now();
          res(r);
        }).catch(function(){ go(); });
      })();
    });
  },
  fetchEvents: function(){
    var url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
    return A.fetchJSON(url,{timeout:7000}).then(function(j){
      if(!Array.isArray(j)) throw new Error("evt bad");
      return j;
    });
  }
};
window.DataFeed = {
  init: async function(){ return true; },
  getBars: async function(symbol, timeframe){
    var tf = timeframe || "1H";
    var r = await A.Feed.fetchSymbol(symbol, tf);
    return r.bars.map(function(b){ return { time:b[0], open:b[1], high:b[2], low:b[3], close:b[4] }; });
  },
  getProvider: function(){ return A.src.provider; }
};
})();
