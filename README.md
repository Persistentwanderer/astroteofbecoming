# A State of Becoming

The book project *A State of Becoming* (Dinos Aristidou & Neil Farrelly),
rebuilt as an [Astro](https://astro.build/) site backed by
[Sanity](https://www.sanity.io/) and deployed on Cloudflare Workers.

The client edits all content (chapters, sections, the contributor gallery,
About/Contact pages) through the embedded Sanity Studio at `/studio`.

## Stack

- **Astro 5** (SSR via `@astrojs/cloudflare`)
- **Sanity** headless CMS + embedded Studio
- **Cloudflare Workers** hosting

## Architecture

```
Sanity Studio (/studio)  ->  Sanity dataset + asset CDN
                                     |
                                 GROQ queries
                                     v
                         Astro (SSR on Cloudflare)  ->  visitors
```

Images, audio, and video are stored in Sanity's asset CDN. A `galleryItem` can
either hold an uploaded `videoFile` (plays inline in the lightbox) or an
external `videoUrl` (Vimeo / YouTube / direct link) as an alternative.

## Content model (Sanity schemas)

Defined in `src/sanity/schemaTypes/`:

| Type | Purpose |
| --- | --- |
| `siteSettings` | Singleton: site title, homepage hero, contact email, book link |
| `chapter` | A book chapter (title, order, featured image, intro) |
| `section` | A section within a chapter (reflection lines + story) |
| `gallery` | A named gallery (e.g. "What is your power?") |
| `galleryItem` | A contributor response (image, description, video, audio, link) |
| `contributor` | A contributor profile |
| `page` | Generic editable page (About, Contact) |

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Sanity project at https://www.sanity.io/manage, then copy your
   project ID into a `.env` file (see `.env.example`):

   ```
   PUBLIC_SANITY_PROJECT_ID=your_project_id
   PUBLIC_SANITY_DATASET=production
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   - Site: http://localhost:4321
   - Studio: http://localhost:4321/studio

## Migrating the old Hugo content

A one-off script imports chapters, sections, and the gallery from the previous
Hugo site (expected one level up in `../content`). It needs a write token from
https://www.sanity.io/manage (API > Tokens, Editor permissions):

```bash
PUBLIC_SANITY_PROJECT_ID=xxxx \
PUBLIC_SANITY_DATASET=production \
SANITY_API_WRITE_TOKEN=sk... \
npm run migrate
```

By default the migration only imports the first chapter
(`you-know-what-you-have-to-do`) and its gallery. To import more, set
`ONLY_CHAPTERS`:

```bash
# everything
ONLY_CHAPTERS=all npm run migrate

# specific chapters (comma-separated slugs)
ONLY_CHAPTERS=look-closer,find-the-constant npm run migrate
```

Override the source location with `OLD_SITE_DIR=/path/to/old/site` if needed.

Note: the script converts inline HTML in gallery descriptions into Portable
Text and drops bold/italic emphasis. Review imported content in the Studio.

## Deploying to Cloudflare

```bash
npm run build
npm run deploy
```

Environment variables are resolved in this order (first match wins):

| Variable | Local dev | Deploy |
| --- | --- | --- |
| `PUBLIC_SANITY_PROJECT_ID` | `.env` | `wrangler.json` → `vars`, or Cloudflare Workers Builds env vars |
| `PUBLIC_SANITY_DATASET` | `.env` | same (defaults to `production`) |
| `SANITY_API_READ_TOKEN` | `.env` | Cloudflare dashboard secret (optional; draft preview only) |

Public Sanity IDs live in `wrangler.json` `vars` — deployment config, not
application code. Override per environment in the Cloudflare dashboard if
needed. Secrets never belong in the repo.

## Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Start the dev server (site + Studio) |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build with Wrangler |
| `npm run migrate` | Import old Hugo content into Sanity |
| `npm run deploy` | Deploy to Cloudflare Workers |
