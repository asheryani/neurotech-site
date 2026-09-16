# Content guide — neurotech-ai.de

This site is generated from JSON content files by `src/build.mjs`
(`node src/build.mjs` from the repo root). Each page is **one file** in
`src/content/` that contains **both languages**. Routes, page types and icons
are registered centrally in `src/site.json`; content files only need the `id`.

## Who we are (facts you may use)

- **Neurotech AI Solutions GmbH**, Lückstraße 24, 10317 Berlin. Founded 2025.
  Managing Director: Ashraf Al-Eryani. Email: hello@neurotech-ai.de.
- A **founder-led, senior-only boutique consultancy** for AI strategy, agentic
  workflows and AI agents across all business functions. Vendor-neutral.
- Clients: **startups, Mittelstand (German SMEs), corporates** in Germany,
  Austria, Switzerland and wider Europe. We work in English and German,
  remote-first, on site in Berlin and across Germany when useful.
- Engagement formats: AI readiness assessment (2–3 weeks), strategy & roadmap
  (4–6 weeks), agent pilot (6–8 weeks to a production-grade pilot), scale-out
  programs, managed AI operations (monthly retainer), training, fractional
  Chief AI Officer (1–2 days/week). Timeframes may be described as "typically".
- Positioning: **production over pilots, governance built in, humans in the
  loop, EU data protection (GDPR) and EU AI Act by design, measurable ROI.**

## Hard rules (content integrity)

1. **No fabricated proof.** No client names, logos, testimonials, quotes from
   clients, case-study results, revenue figures, "we saved X%", awards,
   certifications, partner/vendor partnerships, team sizes, team members.
   Illustrative scenarios are fine when clearly framed as examples
   ("A typical scenario:", "Beispiel:"), never as past results.
2. **No third-party statistics or study citations** (no "McKinsey says 70%…").
   Make qualitative claims instead ("most pilots never reach production").
3. **No prices.** Describe formats and durations, not euros.
4. **No guarantees** ("guaranteed ROI"). Say what we aim for and how we measure.
5. **Never mention** the company's former product work, any iOS app, or the
   words Purser / Orbit. This is a standalone consultancy site.
6. Third-party product names (Microsoft Copilot Studio, Salesforce Agentforce,
   SAP Joule, ServiceNow, n8n, Make, Zapier, LangGraph, CrewAI, OpenAI, Anthropic
   Claude, Google Gemini, Mistral, Aleph Alpha, Azure, AWS Bedrock, Google
   Vertex AI, Langfuse, Model Context Protocol (MCP), etc.) may be named as
   things we work with or evaluate. Never claim partnership or certification.
7. Legal/regulatory content (EU AI Act, GDPR): describe obligations in general
   terms, recommend checking the current legal status, and never give the
   impression of legal advice. Safe facts: the AI Act entered into force
   August 2024; obligations apply in phases through 2026–2027; prohibited
   practices and AI-literacy duties (Art. 4) have applied since February 2025;
   general-purpose AI obligations since August 2025; high-risk obligations
   follow later (timelines may shift, say so). GDPR applies to personal data
   regardless.

## Voice and style

- Calm, precise, editorial. Confident but never hype. Plain words over jargon;
  explain a term the first time it appears. Short paragraphs (2–4 sentences).
- Write for a decision maker (CEO, COO, CFO, department head, founder) who is
  smart but busy. Lead with the business problem, then the mechanism, then how
  we work. Concrete examples beat abstractions.
- Use "we" for Neurotech, "you"/"your team" for the reader.
- Avoid: "unlock", "leverage", "seamless", "cutting-edge", "revolutionize",
  "game-changer", "in today's fast-paced world", "delve", rhetorical questions
  in every paragraph, bullet lists of one-word items, exclamation marks.
- Em-dashes sparingly (max one per paragraph). No emojis.
- **German**: formal *Sie*, natural business German (not a literal translation).
  "KI" not "AI", except in fixed terms: "EU AI Act" (also "KI-Verordnung"),
  "Agentic AI" (established term, may be used alongside "agentische KI"),
  product names. Established anglicisms are fine (Workflow, Use Case, Pilot,
  Roadmap, Onboarding, Governance). Use „deutsche Anführungszeichen“ where
  quoting. Meta titles and H1s must be idiomatic German, not word-for-word.
- Both languages must carry the **same structure and meaning**, but each must
  read as if written natively. Adapt examples where helpful (e.g. "Mittelstand"
  needs no explanation in German; in English explain it once).

## SEO

- `metaTitle` ≤ 60–65 characters, keyword first, brand optional (the site name
  is NOT appended automatically; end with " | Neurotech AI Solutions" only if it
  fits). `metaDescription` 140–160 characters, a real sentence with the
  primary keyword and a reason to click.
- One H1 per page (`hero.title` + optional `hero.titleAccent`). Section
  headings become H2s; prose `h2`/`h3` items add further headings. Use
  keyword-bearing headings that a searcher would type.
- Target word count: service/solution/industry/audience pages 900–1,400 words
  per language; articles 1,200–1,800; hubs 400–700.
- Cross-link generously with `[text](page:ID)` links inside prose and a
  `links` block near the end (3–4 related ids).
- Include a `faq` block with 4–6 real questions on every service, solution,
  industry, audience and article page (rendered as FAQPage schema).

## File format

```json
{
  "id": "services/ai-strategy",
  "date": "2026-09-16",            // articles only (YYYY-MM-DD), optional elsewhere
  "en": { ...language block... },
  "de": { ...language block... }
}
```

Language block:

```json
{
  "metaTitle": "AI Strategy Consulting for Startups, Mittelstand & Corporates",
  "metaDescription": "…140–160 chars…",
  "cardTitle": "AI strategy & roadmap",       // short title used in nav/cards/breadcrumbs
  "navLabel": "Services",                     // optional, hubs only
  "cardText": "One sentence used on hub grids and related-links cards.",
  "hero": {
    "eyebrow": "Service · 4–6 weeks",         // optional small pill above the H1
    "title": "AI strategy that turns into",   // H1 (plain text, no markup)
    "titleAccent": "shipped systems.",        // optional, rendered italic in oxide
    "standfirst": "1–3 sentences. Inline markup allowed.",
    "cta": { "label": "Book an intro call", "page": "contact" },   // optional
    "cta2": { "label": "See how we work", "page": "approach" }     // optional
  },
  "sections": [ …blocks… ]
}
```

### Inline markup (in any text field except titles)

`**bold**`, `*italic*`, `[link text](page:ID)`, `[link](page:ID#anchor)`,
`[link](https://…)`, `[link](mailto:…)`. HTML is escaped, so write plain text.

### Blocks

Every block may carry `"anchor": "some-id"` (used for `page:ID#anchor` links)
and most take a `heading` (short, becomes a small uppercase H2 with a number).

```json
{ "type": "lede", "heading": "The problem", "lede": "Big serif sentence (≤ 30 words).",
  "body": ["Paragraph.", "Paragraph."],
  "facts": [["Format", "4–6 weeks"], ["Team", "Senior consultants only"]],     // optional
  "link": { "label": "See our approach", "page": "approach" } }             // optional

{ "type": "cards", "heading": "What you get", "intro": "optional sentence",
  "items": [ { "icon": "strategy", "title": "…", "text": "…", "page": "optional-id" } ] }
  // 3–6 items. Icons: strategy search workflow agent book shield people compass
  // gauge layers megaphone handshake chat gear chart scale code cart rocket
  // factory building briefcase bank truck globe target clock doc bolt spark
  // mail lock eye puzzle map refresh hand sparkles

{ "type": "steps", "heading": "How it works", "intro": "optional",
  "items": [ { "title": "Discovery", "text": "…", "meta": "Week 1" } ] }   // meta optional

{ "type": "list", "heading": "Principles", "variant": "check",            // variant optional
  "items": [ { "title": "…", "text": "…" } ] }

{ "type": "prose", "heading": "In depth", "content": [
    { "h2": "A real heading" }, { "p": "Paragraph" }, { "h3": "Sub" },
    { "ul": ["item", "item"] }, { "ol": ["step", "step"] },
    { "quote": "Pull quote", "cite": "optional attribution (no client names)" },
    { "note": "Callout box text" },
    { "table": { "caption": "optional", "columns": ["A", "B"], "rows": [["x", "y"]] } },
    { "dl": [ { "term": "Agentic AI", "def": "…" } ] }                     // glossary only
] }

{ "type": "table", "heading": "Comparison", "intro": "optional",
  "columns": ["", "Chatbot", "Agent"], "rows": [["Goal", "Answer", "Complete a task"]] }

{ "type": "tags", "heading": "Tools & platforms we work with", "intro": "optional",
  "items": ["n8n", "Microsoft Copilot Studio", "…"], "note": "optional disclaimer sentence" }

{ "type": "faq", "heading": "optional (defaults to FAQ heading)",
  "items": [ { "q": "Question?", "a": "Answer (string or array of paragraphs)" } ] }

{ "type": "links", "heading": "Related services", "intro": "optional",
  "pages": ["services/ai-strategy", "solutions/finance"] }
{ "type": "links", "heading": "All services", "group": "services", "morePage": "services" }
  // groups: services solutions audiences industries insights company

{ "type": "cta", "title": "…", "text": "…", "label": "…", "page": "contact" }
  // optional; a default CTA band is appended automatically when absent
```

Recommended structure for a **service** page: lede (problem/what it is) →
cards (what you get / deliverables) → steps (how it works) → list (who it's for
or principles) → tags (tools) → faq → links.

**Solution (department)** page: lede (where AI agents pay off in this function)
→ cards (5–6 concrete use cases, each a real workflow) → prose (one worked
example workflow described step by step, incl. human checkpoints) → list
(guardrails/risks for this function) → steps (how we start) → faq → links.

**Industry** page: lede → cards (use cases) → list (constraints specific to the
industry: regulation, data, systems) → steps → faq → links.

**Audience** page: lede → list (their situation/challenges) → cards (what we do
for them) → steps (typical path) → faq → links.

**Article**: hero standfirst → prose with real H2/H3 structure (1,200–1,800
words), tables where useful → faq (3–5) → links.

## Registered page ids

Hubs: `home`, `services`, `solutions`, `industries`, `insights`.
Services: `services/ai-strategy`, `services/ai-readiness-assessment`,
`services/agentic-workflows`, `services/ai-agent-development`,
`services/knowledge-assistants`, `services/ai-governance`, `services/ai-training`,
`services/fractional-chief-ai-officer`, `services/managed-ai-operations`,
`services/data-foundations`.
Solutions: `solutions/marketing`, `solutions/sales`, `solutions/customer-service`,
`solutions/operations`, `solutions/finance`, `solutions/hr`, `solutions/strategy`,
`solutions/legal-compliance`, `solutions/it-engineering`, `solutions/procurement`.
Audiences: `for/startups`, `for/mittelstand`, `for/enterprise`.
Industries: `industries/manufacturing`, `industries/professional-services`,
`industries/ecommerce-retail`, `industries/financial-services`,
`industries/logistics`, `industries/software-saas`.
Insights: `insights/what-is-agentic-ai`, `insights/agents-vs-rpa-vs-chatbots`,
`insights/eu-ai-act-guide`, `insights/first-agent-use-case`, `insights/build-vs-buy`,
`insights/mcp-explained`, `insights/why-ai-pilots-fail`,
`insights/ai-readiness-checklist`, `insights/guardrails-for-agents`,
`insights/sovereign-ai-eu-hosting`.
Company: `approach`, `about`, `contact`, `faq`, `glossary`, `imprint`, `privacy`.
