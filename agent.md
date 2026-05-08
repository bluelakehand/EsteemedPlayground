# Agent Notes

This repo is a static browser arcade. Treat it as a plain static site first; there is no app bundler, build step, or framework runtime.

## Project Shape

- `index.html` is the landing page.
- `arcade.css` styles the landing page.
- `ArcadeLogo.png` is the landing page hero artwork.
- `games/perfect-pocket/index.html` is the Perfect Pocket entry page.
- `games/portdle/index.html` is the Portdle entry page.
- `games/crokinole/Crokinole.html` is the Crokinole entry page.
- `arcade-home-link.css` is the shared stylesheet for the small link back to the landing page from individual games.
- `scripts/play-game.mjs` is a Playwright helper for Perfect Pocket. It starts a local static server with `python -m http.server`; do not reintroduce a custom `server.js`.

## Local Run

The site can be opened directly from `index.html`, but a local static server is better for testing relative links:

```powershell
python -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

The optional Playwright bot requires npm dependencies:

```powershell
npm install
npx playwright install chromium
npm run play:headless
```

There is intentionally no `package-lock.json` in the repo.

## Home Links From Game Pages

Every game page should include the shared home-link stylesheet and one anchor back to the landing page.

For normal game pages two levels below the root, use:

```html
<link rel="stylesheet" href="../../arcade-home-link.css">
```

Near the start of `<body>`, add:

```html
<a class="arcade-home-link" href="../../">Esteemed Arcade</a>
```

Crokinole has fixed HUD panels at the top and controls at the bottom, so it uses a placement modifier:

```html
<a class="arcade-home-link arcade-home-link-crokinole" href="../../">Esteemed Arcade</a>
```

When adding a new game, prefer using the shared stylesheet instead of creating per-game home-link CSS. If the badge overlaps an existing HUD, add a small modifier class in `arcade-home-link.css` rather than editing gameplay logic or canvas code.

## Deployment

Deployment is handled by `.github/workflows/deploy-s3.yml`.

- Deploys run on pushes to `main` and manual `workflow_dispatch`.
- Files are synced to `s3://esteemed-playground-bucket`.
- AWS region is `us-east-2`.
- GitHub Actions uses OIDC through the `AWS_ROLE_ARN` secret.
- The deploy command excludes `.git`, `.github`, `node_modules`, `package-lock.json`, `package.json`, and `scripts`.

Because deploy uses `aws s3 sync . ... --delete`, deleting a tracked static asset from `main` will also remove it from the bucket on the next deploy.

## Branch And Change Discipline

- Keep personal or exploratory work on `sam` unless the user explicitly asks to push to `main`.
- Static site changes should usually be small HTML/CSS edits.
- Avoid touching game JavaScript unless the requested change affects gameplay.
- If changing shared CSS, verify all pages that consume it.
- Do not add a build system unless the user asks for one.

## Verification Checklist

For landing page or shared style changes:

```powershell
python -m http.server 8090 --bind 127.0.0.1
```

Use browser or Playwright checks for:

- `http://127.0.0.1:8090/`
- `http://127.0.0.1:8090/games/perfect-pocket/`
- `http://127.0.0.1:8090/games/portdle/`
- `http://127.0.0.1:8090/games/crokinole/Crokinole.html`

Check both desktop and mobile widths when editing layout CSS. Make sure the `Esteemed Arcade` home badge is visible, clickable, and not covering important game HUD or controls.
