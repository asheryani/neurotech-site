#!/usr/bin/env node
// Renders the Open Graph preview cards (assets/og-en.png, assets/og-de.png)
// with headless Chrome. Run once after changing the card design:
//   node src/make-og.mjs
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const CARDS = {
  en: { line1: "AI & agentic-workflow consultancy", line2: "AI strategy, agents and automation for startups, Mittelstand and corporates. Berlin." },
  de: { line1: "Beratung für KI & agentische Workflows", line2: "KI-Strategie, Agenten und Automatisierung für Startups, Mittelstand und Konzerne. Berlin." },
};

const html = ({ line1, line2 }) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
  body { margin:0; width:1200px; height:630px; background:#FAF8F3; color:#17150F; font-family:"Instrument Sans",Helvetica,Arial,sans-serif; position:relative; overflow:hidden; }
  .brand { position:absolute; left:80px; top:72px; font-weight:600; font-size:24px; letter-spacing:0.06em; }
  .brand em { font-style:normal; color:#B23A18; }
  h1 { position:absolute; left:80px; top:200px; margin:0; width:760px; font-family:"Instrument Serif",Georgia,serif; font-weight:400; font-size:72px; line-height:1.05; letter-spacing:-0.01em; }
  h1 em { color:#B23A18; }
  p { position:absolute; left:80px; top:430px; margin:0; width:720px; font-size:26px; line-height:1.4; color:#57534A; }
  .url { position:absolute; left:80px; bottom:60px; font-size:22px; color:#57534A; letter-spacing:0.02em; }
  svg { position:absolute; right:90px; top:150px; width:300px; height:300px; }
</style></head><body>
<div class="brand">NEUROTECH <em>AI</em> SOLUTIONS</div>
<h1>${line1.replace(/&/, "<em>&amp;</em>")}</h1>
<p>${line2}</p>
<div class="url">neurotech-ai.de</div>
<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="#B23A18" stroke-width="1.2"/><circle cx="16" cy="16" r="6" stroke="#17150F" stroke-width="1.2"/><circle cx="27.5" cy="16" r="2" fill="#B23A18"/><circle cx="16" cy="3" r="1.2" fill="#17150F" opacity="0.5"/></svg>
</body></html>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), "og-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 150 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page"); } catch {}
  if (!target) await sleep(200);
}
if (!target) { chrome.kill(); throw new Error("Chrome did not start"); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
mkdirSync(join(ROOT, "assets"), { recursive: true });
for (const [lang, card] of Object.entries(CARDS)) {
  await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html(card)) });
  await sleep(2500); // let the web fonts load
  await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
  writeFileSync(join(ROOT, "assets", `og-${lang}.png`), Buffer.from(shot.result.data, "base64"));
  console.log(`wrote assets/og-${lang}.png`);
}
ws.close();
chrome.kill();
