# Bogey Brian: repository build and hosting

Current local delivery (2026-11-03): includes the global rolling-performance fix (reported on Feudal Hard 5 with Challenging Stanta), intersecting-slope rest fixes across gravity settings, Feudal rendering/audio improvements, outlined white Aim Assist dots, spin-consumption fixes, camera improvements, revised chest/reward reel, compact powerup menu and Brian-style icons, plus earlier course/UI updates. Source label: `ab72fea-nov03-rolling-performance-working-tree`. Prepared on branch `brian` for the owner's commit and push; no cloud deployment was performed.

The repository archive is `games/bogey-brian/builds/bogey-brian-web-48b2f997e2663a7779e8.zip` (**94,890,170 bytes**, about 90.5 MiB), SHA-256 `6f385934e2a736e4fc29219f47dc526bcc8a1820161e28be5eeb3da98e683794`. It fits GitHub's 100 MiB ordinary-file limit. Include the new ZIP, matching manifest and these hosting notes, plus deletion of the superseded tracked ef319e ZIP. The old archive is preserved locally under ignored `test-results/superseded-delivery-web-ef319e7c2e150446f9b9-nov03.zip`.

Profiles use schema eight/checkpoint two. Continue restores the saved settled lie, strokes, PP, pickups, equipment, powerup state and Random plan. An interrupted in-flight shot returns to its saved lie with one normal OB penalty. Old checkpoints lacking current-hole state use a one-time tee/OB fallback. Abrupt interruption can lose up to five seconds of Speedrun timer progress. Tutorial activity earns no rewards or lifetime statistics. Keep the stable player URL and Godot user-data identity unchanged.

Use normal Git push for the archive; GitHub's website uploader has a separate 25 MiB limit. No manual S3 archive upload, GitHub Release, Git LFS or new archive-read IAM policy is required. Expanded `play/` and `releases/` remain ignored.

## Verification - 2026-11-03

All ten runtime files pass archive/staging checksums; all 13 hosting-helper tests and the gzip compression/upload-plan dry run pass without contacting AWS. Actual muted Edge against the final gzip release passes all 37 hosting/navigation checks, including Normal/Hard/Impossible and tutorial flows, keyboard/audio/fullscreen, saved settings and rounds through browser restart, Continue and a simulated asset-version switch. No JavaScript errors. The pinned loader is restored and all staging checksums rechecked afterward.

Gameplay qualification before packaging: 29,185 native checks at 30/60/120 FPS and 781 actual Web checks, all passing. The rolling-performance regression audits every Green/Sand coating across all 264 catalog holes, with 244,656 reachable-surface paths per matrix; 36 physical roof variants cover both shapes, spin directions and gravity extremes. See Gflog docs/ROLLING_PERFORMANCE_2026_11_03.md for measured improvement and device-performance limits. Earlier valley/rest, putting, Sand/Sticky, spin, bounce, seam and moving-platform qualification is included.

Local evidence: test-results/bogey-brian-gzip/results.json, test-results/bogey-brian-nov03-*.log and Gflog artifacts/ep-nov03-final-verification.json. Automation is silent and profiles isolated. No staging in Git, commit, push, cloud upload or deployment was performed.

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
