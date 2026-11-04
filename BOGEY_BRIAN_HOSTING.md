# Bogey Brian: repository build and hosting

Current delivery (2026-11-04): fixes the shared physics collider leak behind recurring Feudal Fairways slowdowns and fractional-view platform seams. Compound terrain colliders are destroyed before their anchor shape is removed, preventing stale invisible geometry from accumulating during equipment/terrain rebuilds. Adjacent opaque tile edges receive a tiny internal overlap to avoid raster gaps. Includes all previous UI, gameplay and performance updates. Source label: `ab72fea-nov04-compound-lifecycle-seams-working-tree`. The owner authorized committing on `brian` and creating/merging its PR into `main`; the existing main-branch workflow handles deployment.

The repository archive is `games/bogey-brian/builds/bogey-brian-web-0784846e791f2436bfc9.zip` (**94,900,063 bytes**, about 90.5 MiB), SHA-256 `5921dd8b1ab516fcc360682c887765fdf513d611a47e5c5b55c391ec915b92a9`. It fits GitHub's 100 MiB ordinary-file limit. The superseded d4fc archive is preserved locally under ignored `test-results/superseded-delivery-web-d4fc3a30ffd9fe4c301e-nov04.zip`; its tracked copy is replaced by this delivery.

Profiles use schema eight/checkpoint two. Continue restores the saved settled lie, strokes, PP, pickups, equipment, powerup state and Random plan. An interrupted in-flight shot returns to its saved lie with one normal OB penalty. Old checkpoints lacking current-hole state use a one-time tee/OB fallback. Abrupt interruption can lose up to five seconds of Speedrun timer progress. Tutorial activity earns no rewards or lifetime statistics. Keep the stable player URL and Godot user-data identity unchanged.

Use normal Git push for the archive; GitHub's website uploader has a separate 25 MiB limit. No manual S3 archive upload, GitHub Release, Git LFS or new archive-read IAM policy is required. Expanded `play/` and `releases/` remain ignored.

## Verification - 2026-11-04

Before packaging, all 29,185 gameplay checks passed at 30/60/120 FPS. Fixed native and actual muted Web engines each passed 229 collider-lifecycle assertions, including repeated removal/rebuild and negative queries at old footprints. The complete 264-hole round/square catalog comparison found zero ray-result differences across 528 rows. Each platform passed 4,200 fractional-view terrain seam checks with unchanged outer silhouette coverage.

The exact Feudal Hard 5 trough reproduction with Challenging Stanta improved browser rolling p95 from 466-1105 ms to 20.4-26 ms across nine speed/spin cases. All 18 rolling/incoming scenarios passed without engine/JavaScript errors. These timings describe controlled tests rather than a device-wide frame-rate guarantee. See Gflog docs/FEUDAL_RAYS_AND_TILE_SEAMS_2026_11_03.md and artifacts/feudal-lifecycle-final-verification.json.

The final production archive passes all ten runtime checksums, 13 hosting-helper tests, and the local gzip/upload-plan dry run. Final isolated, muted browser navigation and persistence results are recorded under test-results/bogey-brian-gzip/results.json and test-results/bogey-brian-nov04-*.log.

## Deployment

The existing workflow tests its helpers and verifies/extracts the checked-out ZIP using `games/bogey-brian/build.json` before AWS authentication. It then uses the existing `AWS_ROLE_ARN`, OIDC, `env` environment and `esteemed-playground-bucket` in `us-east-2` to publish correctly typed/gzipped immutable assets, switch the stable loader and sync arcade pages.

The source ZIP is excluded from the website upload. Expanded `play/` and `releases/` are ignored by Git. The workflow protects releases, loader files and legacy `_builds/` objects from `--delete`. Merging the release PR to main triggers this existing deployment workflow.

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
