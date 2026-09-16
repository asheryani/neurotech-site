#!/usr/bin/env node
// Static site generator for neurotech-ai.de.
// Zero dependencies. Run: node src/build.mjs
//
// Reads src/site.json (routes, groups, UI strings) and src/content/**/*.json
// (one file per page, both languages inside) and writes the finished HTML
// into the repository root, which GitHub Pages serves as-is.

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync,
  rmSync, rmdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SRC, "..");
const CONTENT_DIR = join(SRC, "content");
const MANIFEST = join(SRC, ".build-manifest.json");

const SITE = JSON.parse(readFileSync(join(SRC, "site.json"), "utf8"));
const { origin: ORIGIN, langs: LANGS, defaultLang: DEFAULT_LANG } = SITE;

const CHECK = process.argv.includes("--check");      // validate + render, write nothing
const PARTIAL = CHECK || process.env.PARTIAL === "1"; // stub pages that have no content yet

const FORBIDDEN = [/purser/i, /\borbit\b/i, /testflight/i, /dynamic island/i, /lock screen/i, /\bios\s?1\d\b/i];

const errors = [];
const warnings = [];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const attr = esc;

function pathFor(id, lang) {
  const reg = SITE.pages[id];
  if (!reg) return null;
  const slug = reg[lang];
  if (slug === undefined) return null;
  const prefix = lang === DEFAULT_LANG ? "/" : `/${lang}/`;
  return slug ? `${prefix}${slug}/` : prefix;
}

function urlFor(id, lang) {
  const p = pathFor(id, lang);
  return p ? ORIGIN + p : null;
}

function outFileFor(id, lang) {
  const p = pathFor(id, lang);
  return join(ROOT, p.replace(/^\//, ""), "index.html");
}

/** Resolve a link target used in content: page:ID, page:ID#anchor, mailto:, https://, /path, #anchor */
function resolveHref(target, lang, ctx) {
  if (target.startsWith("page:")) {
    const [id, anchor] = target.slice(5).split("#");
    const p = pathFor(id, lang);
    if (!p) {
      errors.push(`${ctx}: link to unknown page id "${id}"`);
      return "#";
    }
    return anchor ? `${p}#${anchor}` : p;
  }
  return target;
}

/** Inline markup: **bold**, *italic*, [text](target). Input is escaped first. */
function inline(s, lang, ctx) {
  let out = esc(s);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, target) => {
    const href = resolveHref(target, lang, ctx);
    const external = /^https?:/i.test(href);
    return `<a href="${attr(href)}"${external ? ' rel="noopener"' : ""}>${text}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(>„"“'])\*([^*\n]+?)\*(?=[\s.,;:!?)<»"”'’]|$)/g, "$1<em>$2</em>");
  return out;
}

/** Plain text (for meta/JSON-LD): strip inline markup. */
function plain(s) {
  return String(s ?? "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s.,;:!?)]|$)/g, "$1$2");
}

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/<\//g, "<\\/")}</script>`;
}

function countWords(text) {
  return plain(text).split(/\s+/).filter(Boolean).length;
}

function formatDate(iso, lang) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

/* ------------------------------------------------------------------ */
/* Icons (34x34, stroke-based, consistent with the original site)     */
/* ------------------------------------------------------------------ */

const ICON_ATTRS = 'viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
const ICONS = {
  strategy: '<path d="M6 27L13 18l6 5 9-12"/><path d="M22 11h6v6"/><path d="M5 30h24" opacity="0.4"/>',
  search: '<circle cx="15" cy="15" r="8"/><path d="M21 21l7 7"/><path d="M12 15h6M15 12v6" opacity="0.6"/>',
  workflow: '<rect x="4" y="6" width="9" height="7" rx="2"/><rect x="21" y="6" width="9" height="7" rx="2"/><rect x="12.5" y="21" width="9" height="7" rx="2"/><path d="M8.5 13v4h17v-4M17 17v4"/>',
  agent: '<circle cx="17" cy="12" r="6"/><path d="M6 29c0-6 5-9 11-9s11 3 11 9"/><path d="M14 12h6M17 4v2" opacity="0.6"/>',
  book: '<path d="M6 6h9a3 3 0 0 1 3 3v19a3 3 0 0 0-3-3H6z"/><path d="M28 6h-9a3 3 0 0 0-3 3v19a3 3 0 0 1 3-3h9z"/><path d="M10 12h4M10 16h4M21 12h4M21 16h4" opacity="0.5"/>',
  shield: '<path d="M17 4l10 4v8c0 6.5-4.2 11.5-10 14-5.8-2.5-10-7.5-10-14V8l10-4z"/><path d="M12.5 17l3 3 6-6"/>',
  people: '<circle cx="12" cy="12" r="4.5"/><circle cx="23" cy="13" r="3.5"/><path d="M4 27c0-5 3.5-8 8-8s8 3 8 8"/><path d="M21 26c0-4 2.5-6.5 6.5-6.5S30 22 30 26" opacity="0.6"/>',
  compass: '<circle cx="17" cy="17" r="12"/><path d="M22 12l-3 8-8 3 3-8z"/><circle cx="17" cy="17" r="1.2" fill="currentColor" stroke="none"/>',
  gauge: '<path d="M5 24a12 12 0 1 1 24 0"/><path d="M17 24l6-9"/><circle cx="17" cy="24" r="2"/><path d="M5 29h24" opacity="0.4"/>',
  layers: '<path d="M17 5l12 6-12 6-12-6z"/><path d="M5 17l12 6 12-6" opacity="0.7"/><path d="M5 23l12 6 12-6" opacity="0.4"/>',
  megaphone: '<path d="M5 14v6h5l10 6V8L10 14z"/><path d="M24 12a6 6 0 0 1 0 10" opacity="0.7"/><path d="M27 8a11 11 0 0 1 0 18" opacity="0.4"/>',
  handshake: '<path d="M4 13l6-4 7 4 7-4 6 4"/><path d="M10 9v11l7 7 7-7V9"/><path d="M13 17l4 4 4-4" opacity="0.6"/>',
  chat: '<path d="M6 8h22v15H16l-6 5v-5H6z"/><path d="M12 14h10M12 18h6" opacity="0.6"/>',
  gear: '<circle cx="17" cy="17" r="5"/><path d="M17 4v4M17 26v4M4 17h4M26 17h4M7.8 7.8l2.8 2.8M23.4 23.4l2.8 2.8M7.8 26.2l2.8-2.8M23.4 10.6l2.8-2.8"/>',
  chart: '<path d="M7 27V15M17 27V7M27 27v-8"/><circle cx="17" cy="7" r="2.4" fill="currentColor" stroke="none"/><path d="M4 30h26" opacity="0.4"/>',
  scale: '<path d="M17 5v24M8 29h18"/><path d="M6 12h22"/><path d="M9 12l-5 9a5 5 0 0 0 10 0zM25 12l-5 9a5 5 0 0 0 10 0z"/>',
  code: '<path d="M12 10l-7 7 7 7M22 10l7 7-7 7"/><path d="M19 7l-4 20" opacity="0.6"/>',
  cart: '<path d="M4 6h4l3 15h15l3-10H10"/><circle cx="13" cy="27" r="2"/><circle cx="24" cy="27" r="2"/>',
  rocket: '<path d="M17 4c5 3 7 9 7 15l-7 6-7-6c0-6 2-12 7-15z"/><circle cx="17" cy="14" r="2.5"/><path d="M10 19l-4 4 3 1M24 19l4 4-3 1" opacity="0.6"/><path d="M15 27l2 4 2-4" opacity="0.6"/>',
  factory: '<path d="M4 29V13l8 5v-5l8 5v-5l10 6v10z"/><path d="M6 8h4v5H6z"/><path d="M11 24h3M18 24h3M25 24h3" opacity="0.6"/>',
  building: '<rect x="7" y="5" width="20" height="24" rx="1.5"/><path d="M12 10h3M19 10h3M12 15h3M19 15h3M12 20h3M19 20h3" opacity="0.6"/><path d="M15 29v-5h4v5"/>',
  briefcase: '<rect x="4" y="10" width="26" height="17" rx="2.5"/><path d="M12 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"/><path d="M4 17h26" opacity="0.6"/>',
  bank: '<path d="M4 12l13-7 13 7z"/><path d="M7 12v11M13 12v11M21 12v11M27 12v11"/><path d="M4 28h26M6 23h22"/>',
  truck: '<path d="M4 8h16v14H4z"/><path d="M20 12h6l4 5v5h-10z"/><circle cx="9" cy="25" r="2.5"/><circle cx="24" cy="25" r="2.5"/>',
  globe: '<circle cx="17" cy="17" r="12"/><path d="M5 17h24M17 5c4 4 4 20 0 24M17 5c-4 4-4 20 0 24" opacity="0.6"/>',
  target: '<circle cx="17" cy="17" r="12" opacity="0.35"/><circle cx="17" cy="17" r="6"/><circle cx="17" cy="17" r="1.6" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="17" cy="17" r="12"/><path d="M17 10v7l5 3"/>',
  doc: '<path d="M9 4h11l6 6v20H9z"/><path d="M20 4v6h6"/><path d="M13 16h8M13 21h8M13 26h5" opacity="0.6"/>',
  bolt: '<path d="M19 4L8 19h8l-1 11 11-15h-8z"/>',
  spark: '<path d="M17 4v8M17 22v8M4 17h8M22 17h8"/><path d="M8 8l5 5M21 21l5 5M8 26l5-5M21 13l5-5" opacity="0.5"/>',
  mail: '<rect x="4" y="8" width="26" height="18" rx="2.5"/><path d="M4 10l13 9 13-9"/>',
  lock: '<rect x="8" y="15" width="18" height="14" rx="2.5"/><path d="M12 15v-4a5 5 0 0 1 10 0v4"/><circle cx="17" cy="22" r="1.6" fill="currentColor" stroke="none"/>',
  eye: '<path d="M3 17s5-9 14-9 14 9 14 9-5 9-14 9S3 17 3 17z"/><circle cx="17" cy="17" r="4"/>',
  puzzle: '<path d="M12 6h6v3a2.5 2.5 0 0 0 5 0V6h5v6h-3a2.5 2.5 0 0 0 0 5h3v11h-6v-3a2.5 2.5 0 0 0-5 0v3H6V17h3a2.5 2.5 0 0 0 0-5H6V6z"/>',
  map: '<path d="M4 8l9-3 8 3 9-3v21l-9 3-8-3-9 3z"/><path d="M13 5v21M21 8v21" opacity="0.6"/>',
  refresh: '<path d="M27 15a10 10 0 0 0-18-4"/><path d="M7 19a10 10 0 0 0 18 4"/><path d="M6 6v6h6M28 28v-6h-6"/>',
  hand: '<path d="M10 17V8a2 2 0 0 1 4 0v8V6a2 2 0 0 1 4 0v10V8a2 2 0 0 1 4 0v9V12a2 2 0 0 1 4 0v9a9 9 0 0 1-18 0v-3a2 2 0 0 1 4 0z"/>',
  sparkles: '<path d="M12 5l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M24 17l1.5 3.5L29 22l-3.5 1.5L24 27l-1.5-3.5L19 22l3.5-1.5z" opacity="0.7"/>',
};
const iconSvg = (name) => {
  const body = ICONS[name] || ICONS.spark;
  return `<span class="icon" aria-hidden="true"><svg ${ICON_ATTRS}>${body}</svg></span>`;
};

const MARK = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="13" stroke="#B23A18" stroke-width="1.6"/><circle cx="16" cy="16" r="6" stroke="currentColor" stroke-width="1.6"/><circle cx="27.5" cy="16" r="2.2" fill="#B23A18"/></svg>`;
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='13' fill='none' stroke='%23B23A18' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='6' fill='none' stroke='%23141310' stroke-width='2'/%3E%3Ccircle cx='27.5' cy='16' r='2.5' fill='%23B23A18'/%3E%3C/svg%3E";

/* ------------------------------------------------------------------ */
/* Content loading and validation                                      */
/* ------------------------------------------------------------------ */

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

const CONTENT = new Map();
for (const file of walk(CONTENT_DIR)) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    errors.push(`${file}: invalid JSON (${e.message})`);
    continue;
  }
  if (!data.id) { errors.push(`${file}: missing "id"`); continue; }
  if (!SITE.pages[data.id]) { errors.push(`${file}: id "${data.id}" is not registered in site.json`); continue; }
  if (CONTENT.has(data.id)) { errors.push(`${file}: duplicate content for "${data.id}"`); continue; }
  data.__file = file;
  CONTENT.set(data.id, data);
}
for (const id of Object.keys(SITE.pages)) {
  if (CONTENT.has(id)) continue;
  if (!PARTIAL) { errors.push(`no content file for registered page "${id}"`); continue; }
  warnings.push(`stubbed missing page "${id}"`);
  const stub = (lang) => ({ metaTitle: id, metaDescription: id, cardTitle: id, cardText: "", hero: { title: id }, sections: [] });
  CONTENT.set(id, { id, __stub: true, date: SITE.launchDate, en: stub("en"), de: stub("de") });
}

function validatePage(page) {
  const ctx = page.id;
  const reg = SITE.pages[page.id];
  for (const lang of LANGS) {
    const L = page[lang];
    if (!L) { errors.push(`${ctx}: missing "${lang}" content`); continue; }
    for (const key of ["metaTitle", "metaDescription", "cardTitle", "hero"]) {
      if (!L[key]) errors.push(`${ctx}/${lang}: missing "${key}"`);
    }
    if (L.hero && !L.hero.title) errors.push(`${ctx}/${lang}: hero.title missing`);
    if (L.metaTitle && L.metaTitle.length > 70) warnings.push(`${ctx}/${lang}: metaTitle is ${L.metaTitle.length} chars (aim ≤ 65)`);
    if (L.metaDescription && L.metaDescription.length > 165) warnings.push(`${ctx}/${lang}: metaDescription is ${L.metaDescription.length} chars (aim ≤ 160)`);
    if (!Array.isArray(L.sections)) errors.push(`${ctx}/${lang}: "sections" must be an array`);
    if (reg.type !== "hub" && reg.type !== "home" && !L.cardText) warnings.push(`${ctx}/${lang}: missing cardText`);
    const text = JSON.stringify(L);
    for (const re of FORBIDDEN) {
      if (re.test(text)) errors.push(`${ctx}/${lang}: forbidden term ${re}`);
    }
  }
  if (page.en && page.de && Array.isArray(page.en.sections) && Array.isArray(page.de.sections)) {
    const a = page.en.sections.map((s) => s.type).join(",");
    const b = page.de.sections.map((s) => s.type).join(",");
    if (a !== b) warnings.push(`${ctx}: EN/DE section structure differs (${a} vs ${b})`);
  }
  if (reg.type === "article" && !page.date) errors.push(`${ctx}: articles need a "date" (YYYY-MM-DD)`);
}
for (const page of CONTENT.values()) if (!page.__stub) validatePage(page);

/* ------------------------------------------------------------------ */
/* Block renderers                                                     */
/* ------------------------------------------------------------------ */

function cardFor(id, lang, ctx, opts = {}) {
  const page = CONTENT.get(id);
  const reg = SITE.pages[id];
  if (!page || !reg) { errors.push(`${ctx}: links block references unknown page "${id}"`); return ""; }
  const L = page[lang];
  const href = pathFor(id, lang);
  const icon = reg.icon ? iconSvg(reg.icon) : "";
  const meta = reg.type === "article" && page.date
    ? `<span class="card-meta">${formatDate(page.date, lang)} · ${readingTime(page, lang)} ${SITE.ui[lang].minRead}</span>`
    : "";
  return `<a class="card card-link reveal" href="${href}">${icon}${meta}<h3>${esc(L.cardTitle)}</h3><p>${inline(L.cardText || "", lang, ctx)}</p><span class="card-arrow" aria-hidden="true">→</span></a>`;
}

function kicker(no, heading, lang, level = 2) {
  if (!heading) return "";
  return `<div class="kicker"><span class="no">${String(no).padStart(2, "0")}</span><h${level}>${esc(heading)}</h${level}></div>`;
}

function renderProseContent(items, lang, ctx) {
  const out = [];
  for (const item of items) {
    if (typeof item === "string") { out.push(`<p>${inline(item, lang, ctx)}</p>`); continue; }
    if (item.h2) out.push(`<h2 id="${slugify(item.h2)}">${inline(item.h2, lang, ctx)}</h2>`);
    else if (item.h3) out.push(`<h3>${inline(item.h3, lang, ctx)}</h3>`);
    else if (item.p) out.push(`<p>${inline(item.p, lang, ctx)}</p>`);
    else if (item.ul) out.push(`<ul>${item.ul.map((li) => `<li>${inline(li, lang, ctx)}</li>`).join("")}</ul>`);
    else if (item.ol) out.push(`<ol>${item.ol.map((li) => `<li>${inline(li, lang, ctx)}</li>`).join("")}</ol>`);
    else if (item.quote) out.push(`<blockquote><p>${inline(item.quote, lang, ctx)}</p>${item.cite ? `<cite>${inline(item.cite, lang, ctx)}</cite>` : ""}</blockquote>`);
    else if (item.table) out.push(renderTable(item.table, lang, ctx));
    else if (item.note) out.push(`<aside class="note"><p>${inline(item.note, lang, ctx)}</p></aside>`);
    else if (item.dl) out.push(`<dl class="glossary-list">${item.dl.map((d) => `<div class="glossary-item" id="${slugify(d.term)}"><dt>${inline(d.term, lang, ctx)}</dt><dd>${inline(d.def, lang, ctx)}</dd></div>`).join("")}</dl>`);
    else errors.push(`${ctx}: unknown prose item ${JSON.stringify(item).slice(0, 60)}`);
  }
  return out.join("\n");
}

function slugify(s) {
  return plain(s).toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function renderTable(t, lang, ctx) {
  const head = t.columns ? `<thead><tr>${t.columns.map((c) => `<th scope="col">${inline(c, lang, ctx)}</th>`).join("")}</tr></thead>` : "";
  const body = `<tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${inline(c, lang, ctx)}</th>` : `<td>${inline(c, lang, ctx)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<div class="table-wrap"><table class="data-table">${t.caption ? `<caption>${inline(t.caption, lang, ctx)}</caption>` : ""}${head}${body}</table></div>`;
}

function renderBlock(block, i, lang, ctx, page) {
  const ui = SITE.ui[lang];
  const no = i + 1;
  const id = block.anchor ? ` id="${attr(block.anchor)}"` : "";
  switch (block.type) {
    case "lede": {
      const facts = block.facts ? `<ul class="fact-list">${block.facts.map(([k, v]) => `<li><span>${inline(k, lang, ctx)}</span><span>${inline(v, lang, ctx)}</span></li>`).join("")}</ul>` : "";
      const link = block.link ? `<a class="crumb-link" href="${attr(resolveHref(block.link.page ? `page:${block.link.page}` : block.link.href, lang, ctx))}">${esc(block.link.label)} →</a>` : "";
      const body = (block.body || []).map((p) => `<p class="body-copy">${inline(p, lang, ctx)}</p>`).join("");
      return `<section${id}>${kicker(no, block.heading, lang)}<div class="cols"><div class="reveal"><p class="lede">${inline(block.lede || "", lang, ctx)}</p></div><div>${body}${facts}${link}</div></div></section>`;
    }
    case "cards": {
      const intro = block.intro ? `<p class="section-intro">${inline(block.intro, lang, ctx)}</p>` : "";
      const items = block.items.map((it, k) => {
        const inner = `${it.icon ? iconSvg(it.icon) : ""}<span class="idx">${toRoman(k + 1)}.</span><h3>${inline(it.title, lang, ctx)}</h3><p>${inline(it.text, lang, ctx)}</p>`;
        if (it.page) return `<a class="card card-link reveal" href="${pathFor(it.page, lang) || (errors.push(`${ctx}: unknown page ${it.page}`), "#")}">${inner}<span class="card-arrow" aria-hidden="true">→</span></a>`;
        return `<div class="card reveal">${inner}</div>`;
      }).join("");
      return `<section${id}>${kicker(no, block.heading, lang)}${intro}<div class="card-grid">${items}</div></section>`;
    }
    case "steps": {
      const intro = block.intro ? `<p class="section-intro">${inline(block.intro, lang, ctx)}</p>` : "";
      const items = block.items.map((it, k) => `<li class="reveal"><span class="step-no" aria-hidden="true">${k + 1}</span><div><h3>${inline(it.title, lang, ctx)}</h3><p>${inline(it.text, lang, ctx)}</p>${it.meta ? `<span class="step-meta">${inline(it.meta, lang, ctx)}</span>` : ""}</div></li>`).join("");
      return `<section${id}>${kicker(no, block.heading, lang)}${intro}<ol class="steps">${items}</ol></section>`;
    }
    case "list": {
      const intro = block.intro ? `<p class="section-intro">${inline(block.intro, lang, ctx)}</p>` : "";
      const items = block.items.map((it) => `<li class="reveal"><h3>${inline(it.title, lang, ctx)}</h3><p>${inline(it.text, lang, ctx)}</p></li>`).join("");
      return `<section${id}>${kicker(no, block.heading, lang)}${intro}<ul class="principle-list${block.variant === "check" ? " check" : ""}">${items}</ul></section>`;
    }
    case "prose": {
      return `<section${id}>${kicker(no, block.heading, lang)}<div class="prose">${renderProseContent(block.content, lang, ctx)}</div></section>`;
    }
    case "table": {
      const intro = block.intro ? `<p class="section-intro">${inline(block.intro, lang, ctx)}</p>` : "";
      return `<section${id}>${kicker(no, block.heading, lang)}${intro}${renderTable(block, lang, ctx)}</section>`;
    }
    case "tags": {
      const intro = block.intro ? `<p class="section-intro">${inline(block.intro, lang, ctx)}</p>` : "";
      return `<section${id}>${kicker(no, block.heading, lang)}${intro}<ul class="tag-list">${block.items.map((t) => `<li>${inline(t, lang, ctx)}</li>`).join("")}</ul>${block.note ? `<p class="tag-note">${inline(block.note, lang, ctx)}</p>` : ""}</section>`;
    }
    case "faq": {
      page.__faq = page.__faq || [];
      page.__faq.push(...block.items);
      const items = block.items.map((it) => `<details class="faq-item"><summary><h3>${inline(it.q, lang, ctx)}</h3></summary><div class="faq-body">${(Array.isArray(it.a) ? it.a : [it.a]).map((p) => `<p>${inline(p, lang, ctx)}</p>`).join("")}</div></details>`).join("");
      return `<section${id}>${kicker(no, block.heading || ui.faqHeading, lang)}<div class="faq">${items}</div></section>`;
    }
    case "links": {
      const ids = block.group ? SITE.groups[block.group] : block.pages;
      if (!ids) { errors.push(`${ctx}: links block needs "pages" or a valid "group"`); return ""; }
      const intro = block.intro ? `<p class="section-intro">${inline(block.intro, lang, ctx)}</p>` : "";
      const cards = ids.filter((pid) => pid !== page.id).map((pid) => cardFor(pid, lang, ctx)).join("");
      const more = block.morePage ? `<p class="more-link"><a class="crumb-link" href="${pathFor(block.morePage, lang)}">${esc(block.moreLabel || CONTENT.get(block.morePage)?.[lang]?.cardTitle || "")} →</a></p>` : "";
      return `<section${id}>${kicker(no, block.heading ?? ui.related, lang)}${intro}<div class="card-grid">${cards}</div>${more}</section>`;
    }
    case "cta": {
      return renderCta(lang, block);
    }
    case "contactForm": {
      return renderContactForm(lang);
    }
    case "html": {
      return `<section${id}>${kicker(no, block.heading, lang)}${block.html}</section>`;
    }
    default:
      errors.push(`${ctx}: unknown block type "${block.type}"`);
      return "";
  }
}

function toRoman(n) {
  const map = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let s = ""; for (const [v, r] of map) { while (n >= v) { s += r; n -= v; } } return s;
}

function renderCta(lang, block = {}) {
  const ui = SITE.ui[lang];
  const href = block.page ? pathFor(block.page, lang) : pathFor("contact", lang);
  return `<section class="cta-band"><div class="cta-inner"><span class="eyebrow">${esc(block.eyebrow || ui.ctaEyebrow)}</span><h2>${esc(block.title || ui.ctaTitle)}</h2><p>${inline(block.text || ui.ctaText, lang, "cta")}</p><div class="cta-actions"><a class="btn btn-primary" href="${href}">${esc(block.label || ui.ctaLabel)}</a><a class="btn btn-ghost" href="mailto:${SITE.email}">${esc(block.secondary || ui.ctaSecondary)}</a></div></div></section>`;
}

function renderContactForm(lang) {
  const f = SITE.ui[lang].form;
  const opts = (arr) => arr.map((o) => `<option>${esc(o)}</option>`).join("");
  return `<section id="form"><div class="kicker"><span class="no">01</span><h2>${esc(f.title)}</h2></div>
<p class="section-intro">${esc(f.intro)}</p>
<form class="contact-form" method="post" action="mailto:${SITE.email}" enctype="text/plain" data-email="${SITE.email}" data-subject="${attr(f.subject)}" data-success-text="${attr(f.success)}">
  <div class="form-row">
    <label>${esc(f.name)}<input type="text" name="name" autocomplete="name" required></label>
    <label>${esc(f.company)}<input type="text" name="company" autocomplete="organization" required></label>
  </div>
  <div class="form-row">
    <label>${esc(f.email)}<input type="email" name="email" autocomplete="email" required></label>
    <label>${esc(f.size)}<select name="size">${opts(f.sizeOptions)}</select></label>
  </div>
  <label>${esc(f.interest)}<select name="interest">${opts(f.interestOptions)}</select></label>
  <label>${esc(f.message)}<textarea name="message" rows="6" placeholder="${attr(f.messagePlaceholder)}" required></textarea></label>
  <label class="check"><input type="checkbox" name="consent" required><span>${esc(f.consent)}</span></label>
  <div class="form-actions"><button class="btn btn-primary" type="submit">${esc(f.submit)}</button><span class="form-note">${esc(f.note)}</span></div>
</form></section>`;
}

/* ------------------------------------------------------------------ */
/* Page assembly                                                       */
/* ------------------------------------------------------------------ */

function readingTime(page, lang) {
  const words = countWords(JSON.stringify(page[lang].sections));
  return Math.max(2, Math.round(words / 200));
}

function breadcrumbs(page, lang) {
  const ui = SITE.ui[lang];
  const trail = [];
  let cur = page.id;
  while (cur) {
    trail.unshift(cur);
    cur = SITE.pages[cur].parent;
  }
  const items = [{ id: "home", label: ui.home }, ...trail.map((id) => ({ id, label: CONTENT.get(id)[lang].cardTitle }))];
  const html = `<nav class="breadcrumb" aria-label="${attr(ui.breadcrumb)}"><ol>${items.map((it, i) => i === items.length - 1
    ? `<li aria-current="page">${esc(it.label)}</li>`
    : `<li><a href="${pathFor(it.id, lang)}">${esc(it.label)}</a></li>`).join("")}</ol></nav>`;
  const ld = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: plain(it.label), item: urlFor(it.id, lang) })),
  };
  return { html, ld };
}

function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "ProfessionalService"],
    "@id": `${ORIGIN}/#organization`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: ORIGIN + "/",
    email: SITE.email,
    foundingDate: "2025",
    founder: { "@type": "Person", name: SITE.managingDirector },
    address: { "@type": "PostalAddress", streetAddress: SITE.address.street, postalCode: SITE.address.postalCode, addressLocality: SITE.address.city, addressCountry: SITE.address.country },
    areaServed: ["DE", "AT", "CH", "EU"],
    knowsLanguage: ["en", "de"],
    description: "AI and agentic-workflow consultancy in Berlin for startups, Mittelstand companies and corporates.",
    logo: `${ORIGIN}/assets/mark.svg`,
  };
}

function headHtml(page, lang, extraLd) {
  const L = page[lang];
  const reg = SITE.pages[page.id];
  const url = urlFor(page.id, lang);
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${urlFor(page.id, l)}">`).join("\n");
  const ogType = reg.type === "article" ? "article" : "website";
  const title = plain(L.metaTitle);
  const desc = plain(L.metaDescription);
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${url}">
${alternates}
<link rel="alternate" hreflang="x-default" href="${urlFor(page.id, DEFAULT_LANG)}">
<meta property="og:site_name" content="${attr(SITE.shortName)}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="${lang === "de" ? "de_DE" : "en_GB"}">
<meta property="og:image" content="${ORIGIN}/assets/og-${lang}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="icon" href="${FAVICON}">
<link rel="sitemap" type="application/xml" href="${ORIGIN}/sitemap.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${extraLd.map(jsonLd).join("\n")}`;
}

function headerHtml(page, lang) {
  const ui = SITE.ui[lang];
  const otherLang = LANGS.find((l) => l !== lang);
  const navItems = SITE.nav.map((id) => {
    const active = page.id === id || SITE.pages[page.id].parent === id || page.id.startsWith(id + "/");
    const label = CONTENT.get(id)[lang].navLabel || CONTENT.get(id)[lang].cardTitle;
    return `<a href="${pathFor(id, lang)}"${active ? ' class="active" aria-current="page"' : ""}>${esc(label)}</a>`;
  }).join("");
  return `<a class="skip-link" href="#main">${esc(ui.skip)}</a>
<header class="site-header">
  <a class="brand" href="${pathFor("home", lang)}" aria-label="${attr(SITE.shortName)}">NEUROTECH <em>AI</em> SOLUTIONS</a>
  <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-label-open="${attr(ui.menu)}" data-label-close="${attr(ui.close)}">${esc(ui.menu)}</button>
  <nav id="site-nav" class="site-nav" aria-label="Main">
    ${navItems}
    <a class="lang-switch" href="${pathFor(page.id, otherLang)}" hreflang="${otherLang}" lang="${otherLang}" title="${attr(ui.switchTitle)}">${esc(ui.switchLabel)}</a>
    <a class="btn btn-primary btn-sm nav-cta" href="${pathFor("contact", lang)}">${esc(ui.bookCall)}</a>
  </nav>
</header>`;
}

function footerHtml(page, lang) {
  const ui = SITE.ui[lang];
  const col = (heading, ids) => `<div class="footer-col"><h2>${esc(heading)}</h2><ul>${ids.map((id) => `<li><a href="${pathFor(id, lang)}">${esc(CONTENT.get(id)[lang].navLabel || CONTENT.get(id)[lang].cardTitle)}</a></li>`).join("")}</ul></div>`;
  const otherLang = LANGS.find((l) => l !== lang);
  return `<footer class="site-footer">
  <div class="footer-top">
    <div class="footer-brand">
      <span class="brand">NEUROTECH <em>AI</em> SOLUTIONS</span>
      <p>${esc(ui.footerTagline)}</p>
      <a class="footer-mail" href="mailto:${SITE.email}">${SITE.email}</a>
      <p class="footer-address">${esc(SITE.name)}<br>${esc(SITE.address.street)}<br>${esc(SITE.address.postalCode)} ${esc(SITE.address.city)}</p>
    </div>
    <div class="footer-grid">
      ${col(ui.footerServices, ["services", ...SITE.groups.services])}
      ${col(ui.footerSolutions, ["solutions", ...SITE.groups.solutions])}
      <div class="footer-stack">
        ${col(ui.footerAudiences, SITE.groups.audiences)}
        ${col(ui.footerIndustries, ["industries", ...SITE.groups.industries])}
      </div>
      <div class="footer-stack">
        ${col(ui.footerCompany, ["insights", ...SITE.groups.company])}
        ${col(ui.footerLegal, SITE.groups.legal)}
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© 2026 ${esc(SITE.name)}, Berlin</span>
    <span class="foot-links"><a href="${pathFor(page.id, otherLang)}" hreflang="${otherLang}" lang="${otherLang}">${esc(ui.switchLabel)}</a>${SITE.groups.legal.map((id) => `<a href="${pathFor(id, lang)}">${esc(CONTENT.get(id)[lang].cardTitle)}</a>`).join("")}</span>
  </div>
</footer>`;
}

function heroHtml(page, lang) {
  const L = page[lang];
  const reg = SITE.pages[page.id];
  const ui = SITE.ui[lang];
  const h = L.hero;
  const accent = h.titleAccent ? ` <span class="accent">${esc(h.titleAccent)}</span>` : "";
  const eyebrow = h.eyebrow ? `<p class="status-line"><span class="dot"></span> ${esc(h.eyebrow)}</p>` : "";
  const ctas = [];
  if (h.cta) ctas.push(`<a class="btn btn-primary" href="${attr(resolveHref(h.cta.page ? `page:${h.cta.page}` : h.cta.href, lang, page.id))}">${esc(h.cta.label)}</a>`);
  if (h.cta2) ctas.push(`<a class="btn btn-ghost" href="${attr(resolveHref(h.cta2.page ? `page:${h.cta2.page}` : h.cta2.href, lang, page.id))}">${esc(h.cta2.label)}</a>`);
  const ctaHtml = ctas.length ? `<div class="hero-actions">${ctas.join("")}</div>` : "";
  if (reg.type === "home") {
    return `<div class="hero">${eyebrow}<h1>${esc(h.title)}${accent}</h1><p>${inline(h.standfirst || "", lang, page.id)}</p>${ctaHtml}
<svg class="orbits" viewBox="0 0 300 300" aria-hidden="true" fill="none">
  <circle cx="150" cy="150" r="132" stroke="currentColor" opacity="0.25" stroke-width="1"/>
  <circle cx="150" cy="150" r="96" stroke="currentColor" opacity="0.25" stroke-width="1"/>
  <circle cx="150" cy="150" r="60" stroke="currentColor" opacity="0.7" stroke-width="1.2"/>
  <circle cx="150" cy="150" r="6" fill="currentColor" class="pulse"/>
  <g class="spin-slow"><circle cx="246" cy="150" r="5" fill="#B23A18"/></g>
  <g class="spin-fast"><circle cx="150" cy="54" r="3.5" fill="currentColor" opacity="0.55"/></g>
  <g class="spin-slow" style="animation-delay:-16s"><circle cx="282" cy="150" r="2.5" fill="currentColor" opacity="0.4"/></g>
</svg></div>`;
  }
  let meta = "";
  if (reg.type === "article") {
    meta = `<p class="article-meta"><time datetime="${page.date}">${formatDate(page.date, lang)}</time> · ${readingTime(page, lang)} ${esc(ui.minRead)}${page.updated && page.updated !== page.date ? ` · ${esc(ui.updated)} <time datetime="${page.updated}">${formatDate(page.updated, lang)}</time>` : ""}</p>`;
  }
  return `<div class="page-hero">${eyebrow}<h1>${esc(h.title)}${accent}</h1>${meta}<p class="standfirst">${inline(h.standfirst || "", lang, page.id)}</p>${ctaHtml}</div>`;
}

function renderPage(page, lang) {
  const L = page[lang];
  const reg = SITE.pages[page.id];
  const ui = SITE.ui[lang];
  page.__faq = [];

  const sections = L.sections.map((b, i) => renderBlock(b, i, lang, `${page.id}/${lang}`, page)).join("\n");
  const hasCta = L.sections.some((b) => b.type === "cta");
  const cta = (!hasCta && !page.noCta && reg.type !== "legal" && reg.type !== "contact") ? renderCta(lang) : "";

  const ld = [];
  if (reg.type === "home") {
    ld.push(organizationLd());
    ld.push({ "@context": "https://schema.org", "@type": "WebSite", "@id": `${ORIGIN}/#website`, url: ORIGIN + "/", name: SITE.shortName, inLanguage: LANGS, publisher: { "@id": `${ORIGIN}/#organization` } });
  }
  let crumbs = { html: "" };
  if (reg.type !== "home") {
    crumbs = breadcrumbs(page, lang);
    ld.push(crumbs.ld);
  }
  if (reg.type === "service" || reg.type === "solution") {
    ld.push({ "@context": "https://schema.org", "@type": "Service", name: plain(L.cardTitle), serviceType: plain(L.cardTitle), description: plain(L.metaDescription), url: urlFor(page.id, lang), provider: { "@id": `${ORIGIN}/#organization` }, areaServed: ["DE", "AT", "CH", "EU"], availableLanguage: ["en", "de"] });
  }
  if (reg.type === "article") {
    ld.push({ "@context": "https://schema.org", "@type": "Article", headline: plain(L.hero.title + (L.hero.titleAccent ? " " + L.hero.titleAccent : "")), description: plain(L.metaDescription), datePublished: page.date, dateModified: page.updated || page.date, inLanguage: lang, mainEntityOfPage: urlFor(page.id, lang), author: { "@type": "Organization", name: SITE.name, url: ORIGIN + "/" }, publisher: { "@id": `${ORIGIN}/#organization` } });
  }
  if (page.__faq.length) {
    ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: page.__faq.map((f) => ({ "@type": "Question", name: plain(f.q), acceptedAnswer: { "@type": "Answer", text: plain(Array.isArray(f.a) ? f.a.join(" ") : f.a) } })) });
  }
  if (reg.type === "contact") {
    ld.push({ "@context": "https://schema.org", "@type": "ContactPage", url: urlFor(page.id, lang), mainEntity: { "@id": `${ORIGIN}/#organization` } });
  }

  const bodyClass = `page-${reg.type}`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
${headHtml(page, lang, ld)}
</head>
<body class="${bodyClass}">
<div class="frame">
${headerHtml(page, lang)}
<main id="main">
${crumbs.html}
${heroHtml(page, lang)}
${sections}
${cta}
</main>
<div class="foot-mark" aria-hidden="true">${MARK}</div>
${footerHtml(page, lang)}
</div>
<script src="/site.js" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* Ancillary files                                                     */
/* ------------------------------------------------------------------ */

function notFoundPage() {
  const blocks = LANGS.map((lang) => {
    const ui = SITE.ui[lang];
    const links = ["home", "services", "solutions", "insights", "contact"].map((id) => `<a href="${pathFor(id, lang)}">${esc(CONTENT.get(id)[lang].cardTitle)}</a>`).join("");
    return `<section lang="${lang}"><h1>${esc(ui.notFoundTitle)}</h1><p class="standfirst">${esc(ui.notFoundText)}</p><p class="notfound-links">${links}</p></section>`;
  }).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 — ${esc(SITE.shortName)}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body class="page-notfound">
<div class="frame">
<header class="site-header"><a class="brand" href="/">NEUROTECH <em>AI</em> SOLUTIONS</a><nav class="site-nav" aria-label="Main"><a href="/">English</a><a href="/de/" lang="de">Deutsch</a></nav></header>
<main id="main" class="notfound">
${blocks}
</main>
<div class="foot-mark" aria-hidden="true">${MARK}</div>
<footer class="site-footer"><div class="footer-bottom"><span>© 2026 ${esc(SITE.name)}, Berlin</span><span class="foot-links"><a href="/imprint/">Imprint</a><a href="/privacy/">Privacy</a></span></div></footer>
</div>
</body>
</html>
`;
}

function redirectPage(to) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting…</title>
<meta http-equiv="refresh" content="0; url=${to}">
<link rel="canonical" href="${ORIGIN}${to}">
<meta name="robots" content="noindex">
</head>
<body><p>This page has moved to <a href="${to}">${ORIGIN}${to}</a>.</p></body>
</html>
`;
}

function sitemap(entries) {
  const urls = entries.map(({ id, lang, lastmod }) => {
    const alts = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlFor(id, l)}"/>`).join("\n");
    return `  <url>\n    <loc>${urlFor(id, lang)}</loc>\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(id, DEFAULT_LANG)}"/>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}


function llmsTxt() {
  const line = (id, lang) => {
    const p = CONTENT.get(id);
    return `- [${plain(p[lang].cardTitle)}](${urlFor(id, lang)}): ${plain(p[lang].cardText || p[lang].metaDescription)}`;
  };
  const section = (title, ids, lang) => `## ${title}\n\n${ids.map((id) => line(id, lang)).join("\n")}\n`;
  return `# ${SITE.name}

> AI and agentic-workflow consultancy in Berlin for startups, Mittelstand companies and corporates: AI strategy, readiness assessments, agentic workflow automation, custom AI agents, enterprise knowledge assistants (RAG), AI governance (EU AI Act, GDPR), training, fractional Chief AI Officer and managed AI operations. Content is available in English (${ORIGIN}/) and German (${ORIGIN}/de/).

Contact: ${SITE.email} · ${SITE.address.street}, ${SITE.address.postalCode} ${SITE.address.city}, Germany

${section("Services (English)", SITE.groups.services, "en")}
${section("AI agents by department (English)", SITE.groups.solutions, "en")}
${section("Who we work with (English)", SITE.groups.audiences, "en")}
${section("Industries (English)", SITE.groups.industries, "en")}
${section("Guides (English)", SITE.groups.insights, "en")}
${section("Company (English)", SITE.groups.company, "en")}
${section("Leistungen (Deutsch)", SITE.groups.services, "de")}
${section("KI-Agenten nach Abteilung (Deutsch)", SITE.groups.solutions, "de")}
${section("Leitfäden (Deutsch)", SITE.groups.insights, "de")}
`;
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

if (errors.length) {
  console.error("Content errors (build aborted):");
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}

const outputs = new Map(); // relative path -> content
const sitemapEntries = [];

for (const page of CONTENT.values()) {
  for (const lang of LANGS) {
    const html = renderPage(page, lang);
    const rel = pathFor(page.id, lang).replace(/^\//, "") + "index.html";
    outputs.set(rel, html);
    sitemapEntries.push({ id: page.id, lang, lastmod: page.updated || page.date || SITE.launchDate });
  }
}

if (errors.length) {
  console.error("Render errors (build aborted):");
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}

if (CHECK) {
  for (const w of warnings) console.warn("  ⚠ " + w);
  console.log(`Check passed: ${[...CONTENT.values()].filter((p) => !p.__stub).length} real pages rendered in ${LANGS.length} languages (nothing written).`);
  process.exit(0);
}

outputs.set("404.html", notFoundPage());
outputs.set("sitemap.xml", sitemap(sitemapEntries));
outputs.set("robots.txt", `User-agent: *\nAllow: /\nDisallow: /src/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
outputs.set("llms.txt", llmsTxt());
outputs.set(".nojekyll", "");
outputs.set("assets/mark.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="#B23A18" stroke-width="1.6"/><circle cx="16" cy="16" r="6" stroke="#17150F" stroke-width="1.6"/><circle cx="27.5" cy="16" r="2.2" fill="#B23A18"/></svg>`);

// Legacy URLs from the previous site.
const REDIRECTS = { "product.html": "/", "about.html": "/about/", "contact.html": "/contact/", "imprint.html": "/imprint/", "privacy.html": "/privacy/" };
for (const [file, to] of Object.entries(REDIRECTS)) outputs.set(file, redirectPage(to));

// Remove files from the previous build that are no longer generated.
let previous = [];
if (existsSync(MANIFEST)) previous = JSON.parse(readFileSync(MANIFEST, "utf8"));
for (const rel of previous) {
  if (!outputs.has(rel)) {
    const abs = join(ROOT, rel);
    if (existsSync(abs)) rmSync(abs);
    let dir = dirname(abs);
    while (dir !== ROOT && existsSync(dir) && readdirSync(dir).length === 0) { rmdirSync(dir); dir = dirname(dir); }
  }
}

for (const [rel, content] of outputs) {
  const abs = join(ROOT, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
writeFileSync(MANIFEST, JSON.stringify([...outputs.keys()].sort(), null, 2) + "\n");

for (const w of warnings) console.warn("  ⚠ " + w);
console.log(`Built ${outputs.size} files (${CONTENT.size} pages × ${LANGS.length} languages).`);
