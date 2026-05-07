# Perfect Pocket

A dependency-free daily billiards puzzle for the EsteemedPlayground repo. Everyone gets one table per local calendar day and tries to clear the object balls in the fewest shots.

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

## MVP Features

- Deterministic daily layout seeded by date
- Random practice games with shareable seeds
- Canvas billiards physics with rail bounces, ball collisions, pockets, and scratches
- Drag/release cue controls for desktop and mobile pointer input
- Shot count, remaining balls, reset, undo, and share result
- Local best score and streak tracking via `localStorage`
- Chance-based bonus pockets: sink the matching colored ball in the glowing pocket for a one-shot credit
- Collectible powerup orbs: one-shot Accuracy aim previews and draggable one-shot Bumpers
