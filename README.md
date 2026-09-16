# neurotech-ai.de

Bilingual (EN/DE) website of Neurotech AI Solutions GmbH, an AI and
agentic-workflow consultancy in Berlin. Static HTML, served by GitHub Pages
from the `main` branch root (custom domain via `CNAME`).

## How the site is built

The HTML in the repository root is **generated**. Do not edit it by hand.

- `src/site.json` — routes for every page in both languages, navigation,
  page groups, UI strings (buttons, footer, form labels).
- `src/content/**/*.json` — one file per page, containing the English and
  German versions. See `src/CONTENT_GUIDE.md` for the schema, voice and rules.
- `src/build.mjs` — zero-dependency generator (Node ≥ 18). Renders pages,
  hreflang links, JSON-LD, sitemap, robots.txt, llms.txt, 404 and redirects.
- `styles.css`, `site.js` — design system and progressive enhancement.

```bash
npm run build     # regenerate everything into the repo root
npm run check     # validate content without writing (links, schema, terms)
npm run verify    # check the generated HTML (broken links, SEO basics)
npm run serve     # preview at http://127.0.0.1:8765
```

Deploying is a push to `main`; GitHub Pages publishes within a minute or two.

## Adding a page

1. Register the id and both slugs in `src/site.json` (`pages`, and the
   relevant `groups` entry so it appears in hubs, footer and sitemap).
2. Add `src/content/<id>.json` following `src/CONTENT_GUIDE.md`.
3. `npm run build && npm run verify`, then commit the source and the output.

## Contact form

The form on `/contact/` composes an email in the visitor's mail client, so no
data is processed by the site. To use a form backend instead, set
`data-endpoint="https://…"` on the `<form>` in `src/build.mjs`
(`renderContactForm`); `site.js` will POST the fields as JSON and fall back to
mailto if the request fails.
