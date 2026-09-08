# mejohnc.org — static replacement

A standalone Astro site based on direction 1. HTML and CSS are generated at build time. There is no auth, database, server adapter, API, analytics, or client framework. Main portfolio pages ship no JavaScript. Territories keeps its browser-only JavaScript.

## Local review

```sh
npm ci
npm run build
npm run check
npm run verify
npm run preview
```

Open http://127.0.0.1:5190. For editing, use `npm run dev` instead of preview.

## Content

- `src/pages/index.astro`: homepage selection and quotes.
- `src/pages/about.md` and `work.md`: biography and career history.
- `src/pages/work/service-delivery-automation.md`: case study overview.
- `src/data/talks.ts`: all four dated appearances.
- `src/data/public-builds.ts`: five public software projects.
- `src/data/ai-products.ts`: preserved internal product archive with status labels.
- `public/resume.pdf`: original 2025 résumé, also retained under its old filename.
- `public/projects/territories/`: standalone Territories and all its assets.
- `public/mac`: existing bootstrap script, served as a file, never executed by the site.

Fonts for portfolio pages are self-hosted through Fontsource. Territories retains its original Google Fonts stylesheet; no server API is used.

## Hosting and publishing

Cloudflare Pages serves `dist/`, including optimized images. No Netlify or Supabase runtime is required. The Cloudflare project is `mejohnc-org`.

GitHub Actions builds, checks types and links, and runs Chromium smoke tests. Successful pushes to `main` publish production. Configure the repository variable `CLOUDFLARE_ACCOUNT_ID` and secret `CLOUDFLARE_API_TOKEN` (a Cloudflare API token restricted to this account with Cloudflare Pages Edit permission). Interactive Wrangler OAuth is for local deployment, not CI.

```sh
npx wrangler pages deploy dist --project-name=mejohnc-org --branch=static-migration
```

Review the preview before connecting the custom domain. Keep the previous hosting and database available until the custom domain and redirects are verified. The legacy workspace and migration backup are retained locally.

Build prepares selected photos as metadata-stripped responsive WebP files. Generated media is ignored by Git and reproduced during build. Photo pages return to their exact position in the yearly narrative; preserve section IDs when editing labels.

### Territories: human pages and agent files

`src/data/territories/guides.json` is the editorial source. `profiles.json` adds project preferences, asset/complexity notes, and the decorative treatment used by the working examples. `scripts/territories/model.mjs` defines semantic tokens, the contract version, and acceptance criteria. Astro's config runs `generateTerritories()` for both builds and local startup; generated public files should not be edited directly.

- `/territories/start/` — project/preferences picker.
- `/territories/compare/` — three working examples, with shareable `project` and `styles` query parameters.
- `/territories/{id}/` — static human-readable guide with downloads.
- `/territories/{id}/example/` — original functional CSS study; `?project=portfolio|internal-tool|store|publication` changes the common content.
- `/territories/catalog.json` and `/territories/agent.md` — agent entrypoints.
- `/territories/{id}/guide.md`, `brief.md`, `checklist.md`, `tokens.json` — per-style resources.
- `/territories/v1/{id}/guide.md` and `tokens.json` — v1 contract aliases. Compatible content may change; record `revision` for reproducibility. These are not immutable snapshots.
- `/territories/schema.json` — the custom Territories token schema.
- `/territories/territories-design.zip` — optional skill distribution, generated from `src/data/territories/skill/`.
- `/llms.txt` — discovery links; it does not guarantee a crawler or agent will read them automatically.

All resources are static build outputs. Picker and comparison interactions run in the browser; the example forms never send or persist data. `_headers` configures public CORS and short caching on hosts that support that file. Astro preview provides local review but does not emulate all production response headers.

`npm run verify` checks all guide coverage, published resource links, v1/current parity, token/example colors, and the 72 supported picker preference combinations. The canonical domain remains a deployment target; generated endpoints become publicly available only when this static build is deployed.

The Astro build also runs `scripts/optimize-output.mjs`: it creates responsive derivatives for legacy story JPEGs, prunes unreferenced legacy/Territories images from `dist`, and minifies Territories' inline code without renaming shared globals. Source originals are retained.
