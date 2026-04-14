/* ATLAS FX — data-feed.js
   Unified market data feed. Primary: TradingView UDF lightweight. Fallback: TwelveData REST. Tertiary: Yahoo Finance. */
(function(){
var A = window.ATLAS = window.ATLAS || {};
A.COLORS = { bull:"#07f911", bear:"#ff0015", grid:"#182230", axis:"#6c7a89", bg:"#000",
  high:"#FFD600", cur:"#00FF5A", ent:"#FF9100", low:"#00B0FF" };
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
  AUDJPY: { tv:"FX:AUDJPY", td:"AUD/JPY", yf:"AUDJPY=X", digits:3 }
};
A.TFS = {
  "5m":  { yf:"5m",  range:"5d",  tv:5,  td:"5min",  agg:1, barsMax:200 },
  "15m": { yf:"15m", range:"5d",  tv:15, td:"15min", agg:1, barsMax:200 },
  "1h":  { yf:"60m", range:"1mo", tv:60, td:"1h",    agg:1, barsMax:200 },
  "4h":  { yf:"60m", range:"3mo", tv:60, td:"1h",    agg:4, barsMax:200 }
};
A.src = { provider:null, t:0 };
A.proxies = [
  function(u){ return "https://corsproxy.io/?"+encodeURIComponent(u); },
  function(u){ return "https://api.allorigins.win/raw?url="+encodeURIComponent(u); },
  function(u){ return "https://api.codetabs.com/v1/proxy/?quest="+encodeURIComponent(u); }
];
A.fmt = function(v, d){ if(v==null||isNaN(v)) return "—"; d=(d==null?2:d); return (+v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}); };
A.pct = function(v){ if(v==null||isNaN(v)) return "—"; return (v>=0?"+":"")+(+v).toFixed(2)+"%"; };
A.sign = function(v){ return v>0?"up":v<0?"dn":"mut"; };
A.fetchRaw = function(url, opts){
  opts = opts || {};
  var attempts = [url];
  if(opts.proxy!==false) attempts = attempts.concat(A.proxies.map(function(p){return p(url);}));
  var i = 0;
  return new Promise(function(res,rej){
    (function go(){
      if(i>=attempts.length){ rej(new Error("fetch fail: "+url)); return; }
      var a = attempts[i++];
      var ctrl = new AbortController();
      var to = setTimeout(function(){ ctrl.abort(); }, opts.timeout||6000);
      fetch(a,{signal:ctrl.signal,mode:"cors",cache:"no-store"}).then(function(r){
        clearTimeout(to);
        if(!r.ok) throw new Error("HTTP "+r.status);
        return r.text();
      }).then(function(t){ res(t); }).catch(function(){ clearTimeout(to); go(); });
    })();
  });
};
A.fetchJSON = function(url, opts){
  return A.fetchRaw(url, opts).then(function(t){ try { return JSON.parse(t); } catch(e){ throw new Error("bad json"); } });
};
A.tvFetch = function(sym, tf){
  var s = A.SYMBOLS[sym] || A.FX[sym], t = A.TFS[tf];
  if(!s || !t) return Promise.reject("bad sym/tf");
  var now = Math.floor(Date.now()/1000);
  var span = t.tv*60*(t.barsMax+30)*t.agg;
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
A.Feed = {
  fetchSymbol: function(sym, tf){
    var t = A.TFS[tf];
    var providers = [A.tvFetch, A.tdFetch, A.yfFetch];
    var idx = 0;
    return new Promise(function(res,rej){
      (function go(){
        if(idx>=providers.length){ rej(new Error("no provider for "+sym)); return; }
        providers[idx++](sym, tf).then(function(r){
          r.bars = A.aggregate(r.bars, t.agg).slice(-t.barsMax);
          A.src.provider = r.provider;
          A.src.t = Date.now();
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
})();
