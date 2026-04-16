"use strict";
/* ATLAS FX - index.js
   Discord -> Dashboard bridge.

   Serves the dashboard on :3000 (static from repo root).
   Endpoint:   GET /load?symbol=XYZ   -> broadcasts to all connected dashboards (SSE).
   Endpoint:   GET /events            -> Server-Sent Events stream pushing {symbol,t} payloads.
   Endpoint:   GET /latest            -> current latest symbol (diagnostic).

   Discord bot (activates if DISCORD_TOKEN env var is set and discord.js is installed)
   listens for messages matching !SYMBOL, SYMBOL, or $SYMBOL. Strips prefix, forwards
   to /load?symbol= via local fetch, and reacts with the bar-chart emoji.

   Run:   DISCORD_TOKEN=<token> node index.js   */

const http  = require("http");
const https = require("https");
const fs    = require("fs");
const path  = require("path");
const url   = require("url");

const PORT = process.env.PORT ? parseInt(process.env.PORT,10) : 3000;
const ROOT = __dirname;
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "";
const TD_INTERVALS = new Set(["1min","5min","15min","30min","45min","1h","2h","4h","1day","1week","1month"]);

const MIME = {
  ".html":"text/html; charset=utf-8",
  ".js":"application/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".ico":"image/x-icon",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".map":"application/json"
};

let latestSymbol = null;
const subscribers = new Set();

function cors(res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","*");
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
}
function broadcast(symbol){
  const payload = `data: ${JSON.stringify({symbol, t:Date.now()})}\n\n`;
  for (const s of subscribers){ try { s.write(payload); } catch(e){} }
}
function sanitizeSymbol(raw){
  if(!raw) return null;
  const s = (""+raw).toUpperCase().replace(/[^A-Z]/g,"");
  if(s.length < 2 || s.length > 10) return null;
  return s;
}

const server = http.createServer((req, res) => {
  const u = url.parse(req.url, true);
  cors(res);
  if(req.method === "OPTIONS"){ res.statusCode = 204; return res.end(); }

  if(u.pathname === "/load"){
    if (req.method === 'GET') {
      const symbol = u.query.symbol || '';
      const mode = u.query.mode || '';
      const target = `/?symbol=${encodeURIComponent(symbol)}&mode=${encodeURIComponent(mode)}`;
      res.writeHead(302, { Location: target });
      res.end();
      return;
    }
    const sym = sanitizeSymbol(u.query.symbol);
    if(!sym){ res.statusCode = 400; res.setHeader("Content-Type","application/json"); return res.end(JSON.stringify({ok:false,error:"missing or invalid symbol"})); }
    latestSymbol = sym;
    broadcast(sym);
    console.log(`[atlas] /load -> ${sym}  (${subscribers.size} subscriber${subscribers.size===1?"":"s"})`);
    res.setHeader("Content-Type","application/json");
    return res.end(JSON.stringify({ok:true, symbol:sym, t:Date.now(), subscribers:subscribers.size}));
  }

  if(u.pathname === "/events"){
    res.writeHead(200, {
      "Content-Type":"text/event-stream",
      "Cache-Control":"no-cache, no-transform",
      "Connection":"keep-alive",
      "X-Accel-Buffering":"no",
      "Access-Control-Allow-Origin":"*"
    });
    res.write("retry: 5000\n\n");
    if(latestSymbol) res.write(`data: ${JSON.stringify({symbol:latestSymbol, t:Date.now()})}\n\n`);
    subscribers.add(res);
    console.log(`[atlas] subscriber +1 (total ${subscribers.size})`);
    req.on("close", () => { subscribers.delete(res); console.log(`[atlas] subscriber -1 (total ${subscribers.size})`); });
    return;
  }

  if(u.pathname === "/latest"){
    res.setHeader("Content-Type","application/json");
    return res.end(JSON.stringify({symbol:latestSymbol}));
  }

  if(u.pathname === "/twelvedata"){
    const symbol     = (u.query.symbol||"").toString().trim();
    const interval   = (u.query.interval||"").toString().trim();
    const outputsize = Math.max(1, Math.min(5000, parseInt(u.query.outputsize,10) || 200));
    res.setHeader("Content-Type","application/json");
    if(!symbol || !interval){
      res.statusCode = 400;
      return res.end(JSON.stringify({status:"error", code:400, message:"missing symbol or interval"}));
    }
    if(!TD_INTERVALS.has(interval)){
      res.statusCode = 400;
      return res.end(JSON.stringify({status:"error", code:400, message:"unsupported interval: "+interval}));
    }
    if(!TWELVE_DATA_API_KEY){
      res.statusCode = 500;
      return res.end(JSON.stringify({status:"error", code:500, message:"TWELVE_DATA_API_KEY is not set on the server"}));
    }
    const qs =
      "symbol=" + encodeURIComponent(symbol) +
      "&interval=" + encodeURIComponent(interval) +
      "&outputsize=" + outputsize +
      "&timezone=UTC" +
      "&format=JSON" +
      "&apikey=" + encodeURIComponent(TWELVE_DATA_API_KEY);
    const tdReq = https.get("https://api.twelvedata.com/time_series?" + qs, { timeout: 8000 }, (tdRes) => {
      let body = "";
      tdRes.setEncoding("utf8");
      tdRes.on("data", (chunk) => { body += chunk; });
      tdRes.on("end", () => {
        res.statusCode = tdRes.statusCode || 502;
        res.end(body);
      });
    });
    tdReq.on("timeout", () => { try { tdReq.destroy(new Error("timeout")); } catch(_){} });
    tdReq.on("error", (e) => {
      res.statusCode = 502;
      res.end(JSON.stringify({status:"error", code:502, message:"twelvedata fetch failed: "+(e && e.message || e)}));
    });
    return;
  }

  if(u.pathname === "/favicon.ico"){
    res.statusCode = 204;
    res.setHeader("Content-Type", "image/x-icon");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.end();
  }

  if(req.method==='POST'&&u.pathname==='/astra-handoff'){
    let body='';req.on('data',c=>body+=c);
    req.on('end',async()=>{
      try{
        const ctx=JSON.parse(body);
        const hooks={'AT':process.env.ASTRA_WEBHOOK_AT,'SK':process.env.SK_COMBINED_WEBHOOK,'NM':process.env.NM_COMBINED_WEBHOOK,'BR':process.env.ASTRA_WEBHOOK_BR};
        const url=hooks[ctx.user]||hooks['AT'];
        if(!url){res.writeHead(400);res.end('{"ok":false}');return;}
        const msg=['**📊 ATLAS CONTEXT — '+ctx.symbol+'**','Timestamp: '+ctx.timestamp,'','Status: '+ctx.tradeCondition+' · Signal '+ctx.signalStrength,'Bias: '+ctx.bias+' · Conviction: '+ctx.conviction+' · Regime: '+ctx.regime,'','Levels: Entry '+ctx.entry+' · Stop '+ctx.stop+' · Target '+ctx.target,'','Summary: '+ctx.summary,'','_'+ctx.note+'_','_User is now in channel. Context loaded._'].join('\n');
        const payload=JSON.stringify({content:msg});
        const u=new URL(url);
        const r=require('https').request({hostname:u.hostname,path:u.pathname,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},r2=>{r2.resume();});
        r.on('error',()=>{});r.write(payload);r.end();
        res.writeHead(200);res.end('{"ok":true}');
      }catch(e){res.writeHead(500);res.end('{"ok":false}');}
    });
    return;
  }

  /* static */
  let p = decodeURIComponent(u.pathname);
  if(p === "/") p = "/index.html";
  const file = path.join(ROOT, p);
  if(!file.startsWith(ROOT)){ res.statusCode = 403; return res.end("forbidden"); }
  fs.stat(file, (err, st) => {
    if(err || !st.isFile()){ res.statusCode = 404; return res.end("404"); }
    res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[atlas] dashboard  -> http://localhost:${PORT}`);
  console.log(`[atlas] trigger    -> http://localhost:${PORT}/load?symbol=XYZ`);
  console.log(`[atlas] events     -> http://localhost:${PORT}/events (SSE)`);
  console.log(`[atlas] twelvedata -> http://localhost:${PORT}/twelvedata?symbol=EUR/USD&interval=1h  (key ${TWELVE_DATA_API_KEY ? "loaded" : "MISSING"})`);
});

/* ----------------------- DISCORD BOT ----------------------- */
(async () => {
  const token = process.env.DISCORD_TOKEN;
  if(!token){ console.log("[atlas] DISCORD_TOKEN not set - discord bot disabled"); return; }
  let djs;
  try { djs = require("discord.js"); }
  catch(e){ console.log("[atlas] discord.js not installed - run: npm i discord.js   (bot disabled)"); return; }
  const { Client, GatewayIntentBits, Events, Partials } = djs;
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
  });
  /* Match: optional leading ! or $, then 3-10 letters, optional /base pair, end of line. */
  const SYM_RE = /^\s*([!$])?\s*([A-Za-z]{3,10}(?:[\/\.][A-Za-z]{3,10})?)\s*$/;
  const fetchLocal = async (path) => {
    if(typeof fetch === "function") return fetch(`http://127.0.0.1:${PORT}${path}`);
    return new Promise((resolve, reject) => {
      const req = http.get({host:"127.0.0.1", port:PORT, path, headers:{"x-bridge":"1"}}, (r) => {
        let b = ""; r.on("data", c => b += c); r.on("end", () => resolve({ok:r.statusCode<400, status:r.statusCode, text:async ()=>b}));
      });
      req.on("error", reject);
    });
  };
  client.on(Events.MessageCreate, async (msg) => {
    try {
      if(!msg || msg.author?.bot) return;
      const text = (msg.content||"").trim();
      if(!text || text.length > 32) return;
      const m = text.match(SYM_RE);
      if(!m) return;
      const sym = sanitizeSymbol(m[2]);
      if(!sym) return;
      const r = await fetchLocal(`/load?symbol=${encodeURIComponent(sym)}`);
      if(r && r.ok){
        try { await msg.react("\u{1F4CA}"); } catch(e){}
        console.log(`[atlas] discord -> ${sym} by ${msg.author?.tag||"?"}`);
      }
    } catch(e){ console.error("[atlas] bridge err", e.message||e); }
  });
  client.once(Events.ClientReady, (c) => console.log(`[atlas] discord bot ready -> ${c.user.tag}`));
  client.login(token).catch((e) => console.error("[atlas] discord login failed", e.message||e));
})();

process.on("SIGINT",  () => { console.log("\n[atlas] shutdown"); process.exit(0); });
process.on("SIGTERM", () => { console.log("[atlas] shutdown");  process.exit(0); });
