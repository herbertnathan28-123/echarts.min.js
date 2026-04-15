/* ATLAS FX - data-feed.js
   LIVE OHLC FEED. Single source: TwelveData REST via the local /twelvedata proxy
   (the proxy on the Node server injects process.env.TWELVE_DATA_API_KEY so the
   key is never exposed to the browser). No mock, no demo, no fallback providers. */
(function(){
var A = window.ATLAS = window.ATLAS || {};
A.COLORS = { bull:"#07f911", bear:"#ff0015", grid:"#1a1a1a", axis:"#6c7a89", bg:"#000000",
  hi:"#2962ff", lo:"#2962ff", mid:"#fb8c00", bid:"#ffee58", ask:"#b22833", cross:"#ffffff" };
/* Macro drivers via TwelveData ETF proxies (the index/rate tickers are not
   available on the standard TwelveData tier; the ETFs track the same flow
   direction which is all the macro engine uses). */
A.SYMBOLS = {
  DXY:      { td:"UUP",     label:"DXY",    digits:2 },
  US10Y:    { td:"IEF",     label:"US10Y",  digits:2 },
  EQUITIES: { td:"SPY",     label:"S&P500", digits:2 },
  USDJPY:   { td:"USD/JPY", label:"USDJPY", digits:3 }
};
A.FX = {
  EURUSD: { td:"EUR/USD", digits:5 },
  GBPUSD: { td:"GBP/USD", digits:5 },
  USDJPY: { td:"USD/JPY", digits:3 },
  AUDJPY: { td:"AUD/JPY", digits:3 },
  USDCAD: { td:"USD/CAD", digits:5 },
  USDCHF: { td:"USD/CHF", digits:5 },
  AUDUSD: { td:"AUD/USD", digits:5 },
  NZDUSD: { td:"NZD/USD", digits:5 },
  EURJPY: { td:"EUR/JPY", digits:3 },
  GBPJPY: { td:"GBP/JPY", digits:3 }
};
/* Map UI timeframes -> TwelveData interval strings. Native TD resolutions only. */
A.TFS = {
  "1M":  { td:"1min",   barsMax:200 },
  "5M":  { td:"5min",   barsMax:200 },
  "15M": { td:"15min",  barsMax:200 },
  "30M": { td:"30min",  barsMax:200 },
  "1H":  { td:"1h",     barsMax:200 },
  "4H":  { td:"4h",     barsMax:180 },
  "1D":  { td:"1day",   barsMax:180 },
  "1W":  { td:"1week",  barsMax:150 }
};
/* legacy aliases */
A.TFS["5m"]=A.TFS["5M"]; A.TFS["15m"]=A.TFS["15M"]; A.TFS["1h"]=A.TFS["1H"];
A.TFS["4h"]=A.TFS["4H"]; A.TFS["1d"]=A.TFS["1D"]; A.TFS["1w"]=A.TFS["1W"];
A.src = { provider:null, t:0 };

A.fmt = function(v, d){ if(v==null||isNaN(v)) return "-"; d=(d==null?2:d); return (+v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}); };
A.pct = function(v){ if(v==null||isNaN(v)) return "-"; return (v>=0?"+":"")+(+v).toFixed(2)+"%"; };
A.sign = function(v){ return v>0?"up":v<0?"dn":"mut"; };

/* Proxy host: same-origin when served over http(s); else fall back to the dashboard's
   Node server on localhost:3000 (matches the SSE bridge logic in index.html). */
A.proxyHost = function(){
  try {
    if(typeof location !== "undefined" && location.protocol && location.protocol.indexOf("http")===0 && location.origin){
      return location.origin;
    }
  } catch(e){}
  return "http://localhost:3000";
};

A.fetchJSON = function(url, opts){
  opts = opts || {};
  var ctrl = new AbortController();
  var to = setTimeout(function(){ ctrl.abort(); }, opts.timeout || 8000);
  return fetch(url, { signal:ctrl.signal, mode:"cors", cache:"no-store" })
    .then(function(r){ clearTimeout(to); if(!r.ok) throw new Error("HTTP "+r.status); return r.text(); })
    .then(function(t){ try { return JSON.parse(t); } catch(e){ throw new Error("bad json"); } })
    .catch(function(e){ clearTimeout(to); throw e; });
};

A.tdFetch = function(sym, tf){
  var s = A.SYMBOLS[sym] || A.FX[sym], t = A.TFS[tf];
  if(!s || !t) return Promise.reject(new Error("bad sym/tf: "+sym+"/"+tf));
  var url = A.proxyHost() +
    "/twelvedata?symbol=" + encodeURIComponent(s.td) +
    "&interval="   + encodeURIComponent(t.td) +
    "&outputsize=" + encodeURIComponent(t.barsMax + 20);
  return A.fetchJSON(url, { timeout: 9000 }).then(function(j){
    if(!j || j.status === "error") throw new Error("twelvedata: " + (j && j.message || "error"));
    if(!j.values || !j.values.length) throw new Error("twelvedata: empty values");
    return {
      provider: "TWELVEDATA",
      bars: j.values.slice().reverse().map(function(b){
        return [
          new Date(b.datetime.replace(" ","T") + (b.datetime.length<=10 ? "T00:00:00Z" : "Z")).getTime(),
          +b.open, +b.high, +b.low, +b.close
        ];
      }).filter(function(b){
        return isFinite(b[0]) && isFinite(b[1]) && isFinite(b[2]) && isFinite(b[3]) && isFinite(b[4]);
      })
    };
  });
};

A.Feed = {
  fetchSymbol: function(sym, tf){
    var t = A.TFS[tf] || A.TFS["1H"];
    return A.tdFetch(sym, tf).then(function(r){
      r.bars = r.bars.slice(-t.barsMax);
      A.src.provider = r.provider; A.src.t = Date.now();
      return r;
    });
  },
  fetchEvents: function(){
    var url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
    return A.fetchJSON(url, { timeout:7000 }).then(function(j){
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
