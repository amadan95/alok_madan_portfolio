# Alok Madan — Photography Portfolio

A cinematic, static-export photography portfolio for Alok Madan. The site presents 13 collections and 104 photographs through gallery, list, archive, and raw browsing modes.

## Stack

- Next.js with the App Router and static export
- React, TypeScript, GSAP, and Zustand
- Responsive WebP/JPEG image variants generated from selected masters
- Vercel hosting configuration in `vercel.json`

## Project structure

```text
site/
  app/                 Routes and global styles
  components/          Gallery, navigation, intro, and page experiences
  content/             Editorial manifest and site metadata
  lib/                 Types, validation, and display helpers
  public/              Original and generated image assets
  tests/               Content and static-export checks
scripts/               Asset catalog and static-server utilities
tests/                 Asset catalog tests
```

The editorial source of truth is [`site/content/exhibit-manifest.json`](site/content/exhibit-manifest.json). It preserves collection order, asset IDs, titles, descriptions, image passages, and legacy essay fields for compatibility.

## Local development

```bash
npm install
npm run dev
```

The development site runs at [http://localhost:3000](http://localhost:3000).

To build and serve the static export locally:

```bash
npm run build
npm start
```

## Checks

Run the complete release check before publishing:

```bash
npm run release:check
```

This validates the selected masters and responsive variants, runs Python and JavaScript tests, checks types and lint, builds the static export, and verifies the exported routes and image references.

Useful focused commands:

```bash
npm run catalog       # Validate asset catalog integrity
npm run typecheck     # Run TypeScript checks
npm run lint          # Run ESLint
npm test              # Run content and asset tests
npm run test:export   # Check the generated static export
```

## Editorial and interaction principles

- Collections open directly on photograph `01 / 08`.
- Category pages support mouse, touch, scroll, visible Previous/Next controls, and arrow-key navigation.
- The cinematic entrance runs once per browser session and respects reduced-motion preferences.
- Image passages remain available without hover and use literal, useful alt text separately from the poetic copy.
- The original sequence, routes, collection names, asset IDs, and source checksums remain stable.

## Deployment

The project is configured for Vercel through [`vercel.json`](vercel.json). Deploy the generated Next.js static output using the repository’s configured Vercel project. Run `npm run release:check` before deployment.
