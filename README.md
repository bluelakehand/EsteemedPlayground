# Esteemed Playground

A playground for esteemed comrades: a growing arcade of small daily browser games.

## Games

- [Perfect Pocket](games/perfect-pocket/) - a daily billiards puzzle with bonus pockets, powerups, and shareable practice seeds.
- [Portdle](games/portdle/) - a seeded wizard maze puzzle where portals let you bend routes to the exit.
- [Deck Measuring Contest](games/deck-measuring/) - a daily wood sizing challenge. Study a 10 m² reference deck, then estimate the area of 5 seeded decks. Golf scoring, custom seeds, and spoiler-free sharing.
- [One More Orbit](games/one-more-orbit/) - a daily gravity puzzle about slingshotting a probe through beacons and docking with limited burns.
- [Wordforge](games/wordforge/) - a robot civilization builder where mined letters become crafted words and rebuilt systems.

## Run

Open `index.html` directly in a browser, or serve the folder with any static server.

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Playwright Bot

Install dependencies once:

```powershell
npm install
npx playwright install chromium
```

Watch the bot play:

```powershell
npm run play
```

Run headless:

```powershell
npm run play:headless
```

## Deploy To S3

This repo deploys to `s3://esteemed-playground-bucket` from GitHub Actions on every push to `main`.

Required GitHub secret:

```text
AWS_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/github-push
```

The workflow uses GitHub OIDC, so no long-lived AWS access keys are stored in GitHub.

The AWS role `github-push` needs:

- Trust relationship allowing `repo:bluelakehand/EsteemedPlayground:ref:refs/heads/main`
- S3 permissions for `esteemed-playground-bucket` and `esteemed-playground-bucket/*`

## Perfect Pocket Features

- Deterministic daily layout seeded by date
- Random practice games with shareable seeds
- Canvas billiards physics with rail bounces, ball collisions, pockets, and scratches
- Drag/release cue controls for desktop and mobile pointer input
- Shot count, remaining balls, reset, undo, and share result
- Local best score and streak tracking via `localStorage`
- Chance-based bonus pockets: sink the matching colored ball in the glowing pocket for a one-shot credit
- Collectible powerup orbs: one-shot Accuracy aim previews and draggable one-shot Bumpers
