/* ATLAS FX — index.js
   Discord → Dashboard bridge.

   Serves the dashboard on :3000 (static from repo root).
   Endpoint:   GET /load?symbol=XYZ   → broadcasts to all connected dashboards (SSE).
   Endpoint:   GET /events            → Server-Sent Events stream pushing {symbol,t} payloads.
   Endpoint:   GET /latest            → current latest symbol (diagnostic).

   Discord bot (activates if DISCORD_TOKEN env var is set and discord.js is installed)
   listens for messages matching !SYMBOL, SYMBOL, or $SYMBOL. Strips prefix, forwards
   to /load?symbol= via local fetch, and reacts with the bar-chart emoji.

   Run:   DISCORD_TOKEN=<token> node index.js   */

"use strict";

const http = require("http");
const fs   = require("fs");
const path = require("path");
const url  = require("url");

const PORT = process.env.PORT ? parseInt(process.env.PORT,10) : 3000;
const ROOT = __dirname;

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
    const sym = sanitizeSymbol(u.query.symbol);
    if(!sym){ res.statusCode = 400; res.setHeader("Content-Type","application/json"); return res.end(JSON.stringify({ok:false,error:"missing or invalid symbol"})); }
    latestSymbol = sym;
    broadcast(sym);
    console.log(`[atlas] /load → ${sym}  (${subscribers.size} subscriber${subscribers.size===1?"":"s"})`);
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
  console.log(`[atlas] dashboard → http://localhost:${PORT}`);
  console.log(`[atlas] trigger    → http://localhost:${PORT}/load?symbol=XYZ`);
  console.log(`[atlas] events     → http://localhost:${PORT}/events (SSE)`);
});

/* ----------------------- DISCORD BOT ----------------------- */
(async () => {
  const token = process.env.DISCORD_TOKEN;
  if(!token){ console.log("[atlas] DISCORD_TOKEN not set — discord bot disabled"); return; }
  let djs;
  try { djs = require("discord.js"); }
  catch(e){ console.log("[atlas] discord.js not installed — run: npm i discord.js   (bot disabled)"); return; }
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
        try { await msg.react("📊"); } catch(e){}
        console.log(`[atlas] discord → ${sym} by ${msg.author?.tag||"?"}`);
      }
    } catch(e){ console.error("[atlas] bridge err", e.message||e); }
  });
  client.once(Events.ClientReady, (c) => console.log(`[atlas] discord bot ready → ${c.user.tag}`));
  client.login(token).catch((e) => console.error("[atlas] discord login failed", e.message||e));
})();

process.on("SIGINT",  () => { console.log("\n[atlas] shutdown"); process.exit(0); });
process.on("SIGTERM", () => { console.log("[atlas] shutdown");  process.exit(0); });
