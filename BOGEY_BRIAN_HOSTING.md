# Bogey Brian: repository build and hosting

Current local delivery (2026-10-27): Random scorecard filters and current source-hole details, Random Speedrun, centered follow zoom, terminal Continue-save clearing, Shift full-spin shortcuts, eight randomized transitions, rarity-colored shop names, readable results/Continue cards, Circle trail icon, and customizable trail gradients. Includes the latest top-first/expanding color picker, exclusive spaced mode checkboxes, Copy button, wide cycle slider and Random Speedrun spacing. All earlier sand/Sticky/Aim, square-putting and Spacey fixes remain included. The catalog has 261 competitive holes plus three tutorial lessons; Sketchy Strokes has Normal and Hard. Source label: `ab72fea-oct27-random-camera-trails-ui-working-tree`. Prepared on branch `brian` for the owner's commit and push; no cloud deployment was performed.

The repository archive is `games/bogey-brian/builds/bogey-brian-web-ff80bf084fe98aa2d930.zip` (**92,093,597 bytes**, 87.83 MiB), SHA-256 `0e5399c1108764b46daba35a9bf966fbc9f687af96bdccff220cbc237efe2a88`. It fits GitHub's 100 MiB ordinary-file limit. Include the new ZIP, matching manifest and hosting notes, retaining the already-pending deletion of the superseded tracked 2080 ZIP. The previous untracked aa2f delivery is preserved under ignored `test-results/superseded-delivery-web-aa2f400e5d0e1e7dc056.zip`; earlier 2080 evidence is also preserved there.

Profiles use schema eight/checkpoint two. Continue restores the saved settled lie, strokes, PP, pickups, equipment, powerup state and Random plan. An interrupted in-flight shot returns to its saved lie with one normal OB penalty. Old checkpoints lacking current-hole state use a one-time tee/OB fallback. Abrupt interruption can lose up to five seconds of Speedrun timer progress. Tutorial activity earns no rewards or lifetime statistics. Keep the stable player URL and Godot user-data identity unchanged.

Use normal Git push for the archive; GitHub's website uploader has a separate 25 MiB limit. No manual S3 archive upload, GitHub Release, Git LFS or new archive-read IAM policy is required. Expanded `play/` and `releases/` remain ignored.

## Verification - 2026-10-27

All ten runtime files pass staging checksums; 13 hosting-helper tests and the real gzip compression/upload-plan dry-run pass without contacting AWS. Actual muted Edge against this final gzip release passes all 36 hosting/navigation checks, including nine original Normal starts, Hard/Impossible plans, tutorial, real keyboard/audio/fullscreen, and saved settings/rounds through browser restart, Continue and a simulated asset-version switch. No JavaScript errors. The pinned loader is restored and staged checksums rechecked. See test-results/bogey-brian-oct27-browser.log.

Game qualification before release: 422 feature checks in actual Web, final native headless 404 checks at 30/120 FPS, and affected camera/round/continuity/shop/trail/effect/frontend regressions. The final visual refinements pass 28 rendered layout checks and the 64-check rendered trail suite. This is focused qualification, not a new full 620-check packaged persistence or all-course tee-route claim.

Local evidence: `test-results/bogey-brian-gzip/results.json`, Gflog `artifacts/oct27-final-verification.json` and `artifacts/trail-editor-final-verification.json`. All automation is silent and profiles isolated. No commit, push, cloud upload or deployment was performed.

## Deployment

The existing workflow tests its helpers and verifies/extracts the checked-out ZIP using `games/bogey-brian/build.json` before AWS authentication. It then uses the existing `AWS_ROLE_ARN`, OIDC, `env` environment and `esteemed-playground-bucket` in `us-east-2` to publish correctly typed/gzipped immutable assets, switch the stable loader and sync arcade pages.

The source ZIP is excluded from the website upload. Expanded `play/` and `releases/` are ignored by Git. The workflow protects releases, loader files and legacy `_builds/` objects from `--delete`. No automated commit, push or cloud changes were performed.

## Remaining AWS checks, only if needed

1. **HTTPS:** keep existing HTTPS hosting. If the arcade only has an HTTP S3 website endpoint, put CloudFront in front of that existing endpoint, use default root object `index.html`, and redirect HTTP viewers to HTTPS. A CloudFront hostname is sufficient; a custom domain is optional. The website origin preserves existing games' directory-index links.
2. **CloudFront caching:** if present, use managed `CachingDisabled` for `games/bogey-brian/play/*` and `games/bogey-brian/index.html`, with higher precedence than the default behavior. Keep normal caching on immutable `games/bogey-brian/releases/*`. Once, invalidate `/`, `/index.html` and `/games/bogey-brian/*`. The prepared workflow handles gzip, MIME types and cache metadata. No new CORS or cross-origin isolation headers are needed for the same-origin, single-threaded game.
3. **After the owner's push to main:** confirm the existing deployment Action succeeds and open `https://YOUR-ARCADE-HOST/games/bogey-brian/index.html`. Check a course starts, audio works after clicking, and settings survive reopening.

Keep the existing GitHub/AWS role and site-upload permissions. The archive-read policy from the previous S3 ZIP design is obsolete. If existing HTTPS/cache settings already match, there is no new AWS setup.

## Local review

From the arcade checkout:

```powershell
python scripts/stage-bogey-brian.py
python -m unittest discover -s tests -p test_bogey_brian.py -v
python -m http.server 8090 --bind 127.0.0.1
```

Open `http://127.0.0.1:8090/games/bogey-brian/index.html`. The game needs an HTTP server; localhost and public-host profiles are separate.

## Future game updates

From Gflog:

```powershell
python tools/build_smoke.py --target web --release
python tools/package_arcade.py --arcade C:/git/EP/EsteemedPlayground
```

The packager copies the ZIP and matching manifest into the arcade without Git/cloud operations, rejecting archives that reach 100 MiB. Review locally, then include the ZIP, manifest and other intended files in the owner's normal push. Deployment handles extraction and upload. A rollback selects the previous ZIP and matching manifest. Keep the public origin, stable game URL and Godot application/user-data name to preserve saves.

Optional real-browser check: install `playwright` and `pillow` with pip and run `python scripts/check-bogey-brian-browser.py --gzip`. It uses installed Windows Edge, or install Chromium using `python -m playwright install chromium`, or set `BROWSER_PATH`. Tests isolate browser data and restore the loader after simulating an update.

## References

- [GitHub's 100 MiB Git limit and separate 25 MiB browser-upload limit](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).
- [S3 sync excludes protect remote objects from deletion](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html).
- [CloudFront cache TTLs can override origin no-cache headers](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html).
