# Bogey Brian: repository build and hosting

Current local delivery (2026-10-29): includes the Web/Depression rendering optimizations, compact course selector with direct Equipment, revised Sketchy Hard course, saved-Random course-menu correction, and all earlier gameplay/UI updates. Depression keeps its rain and appearance with cheaper fixed color grading; redundant HUD, background, scorecard and trail work is reduced. Source label: `ab72fea-oct29-web-performance-working-tree`. Prepared on branch `brian` for the owner's commit and push; no cloud deployment was performed.

The repository archive is `games/bogey-brian/builds/bogey-brian-web-ef319e7c2e150446f9b9.zip` (**92,186,858 bytes**), SHA-256 `bad0140395d7fc8d9bfa26daf8f002435efd1ebe8375d399049df2595a7d24ba`. It fits GitHub's 100 MiB ordinary-file limit. Include the new ZIP, matching manifest and hosting notes, plus deletion of the superseded tracked ff80 ZIP. That archive is preserved locally under ignored `test-results/superseded-delivery-web-ff80bf084fe98aa2d930.zip`.

Profiles use schema eight/checkpoint two. Continue restores the saved settled lie, strokes, PP, pickups, equipment, powerup state and Random plan. An interrupted in-flight shot returns to its saved lie with one normal OB penalty. Old checkpoints lacking current-hole state use a one-time tee/OB fallback. Abrupt interruption can lose up to five seconds of Speedrun timer progress. Tutorial activity earns no rewards or lifetime statistics. Keep the stable player URL and Godot user-data identity unchanged.

Use normal Git push for the archive; GitHub's website uploader has a separate 25 MiB limit. No manual S3 archive upload, GitHub Release, Git LFS or new archive-read IAM policy is required. Expanded `play/` and `releases/` remain ignored.

## Verification - 2026-10-29

All ten runtime files pass staging checksums; 13 hosting-helper tests and the real gzip compression/upload-plan dry run pass without contacting AWS. Actual muted Edge against the final gzip release passes all 37 hosting/navigation checks, including all ten Normal courses, Hard/Impossible plans, tutorial, keyboard/audio/fullscreen, and saved settings/rounds through browser restart, Continue and a simulated asset-version switch. No JavaScript errors. The browser harness now uses the five-column course grid and verifies saved course IDs; the pinned loader is restored and staging checksums rechecked.

Game qualification before packaging: actual Web rendering 24/0 and gameplay/UI 422/0; native Presentation 1698/0, camera 2416/0 and saved-Random menu regression 64/0. See Gflog docs/WEB_PERFORMANCE_2026_10_29.md for performance measurements and Intel-device limitations. Revised Sketchy Hard previously passed complete Basic rounds at 30/60/120 FPS and exported Web.

Local evidence: test-results/bogey-brian-gzip/results.json, test-results/bogey-brian-oct29-*.log and Gflog artifacts/ep-oct29-final-verification.json. All automation is silent and profiles isolated. No staging in Git, commit, push, cloud upload or deployment was performed.

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
