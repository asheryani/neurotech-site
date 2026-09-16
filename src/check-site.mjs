#!/usr/bin/env node
// Post-build checks over the generated HTML: broken internal links, missing
// SEO essentials, forbidden terms, thin pages. Run: node src/check-site.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set([".git", "src", "node_modules", ".claude"]);
const FORBIDDEN = [/purser/i, /\borbit\b/i, /testflight/i, /dynamic island/i, /lock screen/i, /[>"]undefined[<"]/, /\[object Object\]/, /NaN/];
const SUSPICIOUS = [/\b\d{1,3}\s?%/, /case stud/i, /fallstudie/i, /testimonial/i, /clients? (such as|like|include)/i, /kunden wie/i, /guarantee/i, /garantier/i, /certified/i, /zertifiziert/i, /partner(ship)? with/i, /partnerschaft mit/i, /according to (mckinsey|gartner|forrester|bcg|deloitte|pwc|mit)/i, /laut (mckinsey|gartner|forrester|bcg|deloitte|pwc|mit)/i];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const problems = [];
const suspicious = [];
const stats = [];

function resolveLink(href, fromFile) {
  let h = href.split("#")[0].split("?")[0];
  if (!h) return null; // pure anchor
  if (/^(https?:|mailto:|tel:|data:)/i.test(h)) return null;
  let abs;
  if (h.startsWith("/")) abs = join(ROOT, h);
  else abs = join(dirname(fromFile), h);
  if (h.endsWith("/")) abs = join(abs, "index.html");
  return abs;
}

for (const file of files) {
  const rel = relative(ROOT, file);
  const html = readFileSync(file, "utf8");
  const isRedirect = /http-equiv="refresh"/.test(html);
  if (isRedirect || rel === "404.html") continue;

  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = resolveLink(m[1], file);
    if (target && !existsSync(target)) problems.push(`${rel}: broken link ${m[1]}`);
  }
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) problems.push(`${rel}: ${h1s} <h1> elements`);
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${rel}: missing <title>`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) problems.push(`${rel}: missing/short meta description`);
  if (!/<link rel="canonical"/.test(html)) problems.push(`${rel}: missing canonical`);
  for (const l of ["en", "de", "x-default"]) if (!html.includes(`hreflang="${l}"`)) problems.push(`${rel}: missing hreflang ${l}`);
  if (!/<html lang="(en|de)">/.test(html)) problems.push(`${rel}: missing html lang`);
  if (html.includes('href="#"')) problems.push(`${rel}: unresolved link href="#"`);

  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<footer[\s\S]*?<\/footer>/g, " ")
    .replace(/<header[\s\S]*?<\/header>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/\s+/g, " ");
  for (const re of FORBIDDEN) if (re.test(text)) problems.push(`${rel}: forbidden term ${re}`);
  for (const re of SUSPICIOUS) {
    const m = text.match(re);
    if (m) suspicious.push(`${rel}: "${text.slice(Math.max(0, m.index - 60), m.index + 60).trim()}"`);
  }
  const words = text.split(" ").filter(Boolean).length;
  stats.push({ rel, words });
}

stats.sort((a, b) => a.words - b.words);
console.log(`Checked ${stats.length} pages.`);
console.log("Thinnest pages:");
for (const s of stats.slice(0, 8)) console.log(`  ${String(s.words).padStart(5)}  ${s.rel}`);
console.log("Longest pages:");
for (const s of stats.slice(-5)) console.log(`  ${String(s.words).padStart(5)}  ${s.rel}`);
const total = stats.reduce((a, s) => a + s.words, 0);
console.log(`Total words across pages: ${total}`);

if (suspicious.length) {
  console.log(`\n${suspicious.length} passages to review (statistics, guarantees, partnerships, case studies):`);
  for (const s of suspicious) console.log("  ? " + s);
}
if (problems.length) {
  console.error(`\n${problems.length} problems:`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log("\nNo structural problems found.");
