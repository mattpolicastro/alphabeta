# ⍺lphaβeta

A static Next.js app for analyzing A/B test experiments. All data stays in the browser via IndexedDB; statistical analysis runs client-side through Pyodide/WASM (with an optional AWS Lambda fallback).

See `architecture.md` for tech stack details and `requirements.md` for product requirements.

## Quick Start

```bash
cd apps/web
npm install
npm run dev       # local dev server
npm run build     # static export to out/
npm test          # run Jest test suite
```

## Build Configuration

Build-time options are set via environment variables in `apps/web/.env`. Next.js inlines any `NEXT_PUBLIC_*` variable at build time.

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_TITLE` | `⍺lphaβeta` | Site title displayed in the navigation bar |

### Overriding defaults

The `.env` file is committed and provides shared defaults. To override for your local environment without affecting the repo:

1. **`.env.local`** (recommended) — create `apps/web/.env.local` with your overrides. This file is gitignored by Next.js automatically.

   ```env
   NEXT_PUBLIC_APP_TITLE="My Team's Experiment Hub"
   ```

2. **Shell environment** — set variables before building:

   ```bash
   NEXT_PUBLIC_APP_TITLE="Staging" npm run build
   ```

Precedence (highest wins): shell env > `.env.local` > `.env`
