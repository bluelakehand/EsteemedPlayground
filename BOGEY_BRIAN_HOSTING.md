# Bogey Brian: repository build and hosting

Current delivery (2026-11-05): adds Magnet and Laser at 5 PP each, fixes spin during the fall after Laser stops, and keeps Aim Assist dots visible above world effects and below UI across zoom/camera changes. Magnet applies a held additive pull toward a real nearest cup; Laser maintains launch velocity until a solid hit, manual stop or distant laser-only boundary, then restores gravity and unused spin. Eleven current powers fit the original desktop menu footprint with Brian-style icons. Includes previous terrain-collider, rendering, UI and gameplay fixes. Source label: `ab72fea-nov05-magnet-laser-aim-spin-working-tree`. The owner authorized the same release procedure: commit on `brian`, create/merge its PR into `main`, then confirm the existing deployment workflow.

The repository archive is `games/bogey-brian/builds/bogey-brian-web-74ba05fe66c8dacb4f2c.zip` (**94,906,556 bytes**, about 90.5 MiB), SHA-256 `39d050c1c8c7070f4d5473ba98edf049adda94dbbb281ccb3a6943c2097e0a55`. It fits GitHub's 100 MiB ordinary-file limit. The superseded 078484 archive is preserved locally under ignored `test-results/superseded-delivery-web-0784846e791f2436bfc9-nov05.zip`; its tracked copy is replaced by this delivery.

Profiles use schema eight/checkpoint two. Continue restores the saved settled lie, strokes, PP, pickups, equipment, powerup state and Random plan. An interrupted in-flight shot returns to its saved lie with one normal OB penalty. Old checkpoints lacking current-hole state use a one-time tee/OB fallback. Abrupt interruption can lose up to five seconds of Speedrun timer progress. Tutorial activity earns no rewards or lifetime statistics. Keep the stable player URL and Godot user-data identity unchanged.

Use normal Git push for the archive; GitHub's website uploader has a separate 25 MiB limit. No manual S3 archive upload, GitHub Release, Git LFS or new archive-read IAM policy is required. Expanded `play/` and `releases/` remain ignored.

## Verification - 2026-11-05

The latest Laser falling-spin fix passes 9,891 native assertions and 716 actual muted Web assertions, including manual/impact/boundary exits, circle/square Brian, spin HUD restoration, next-contact consumption and rejection of reuse. Prior feature qualification passes 8,376 native/564 Web assertions for Magnet/Laser and 979 native/227 Web assertions for Aim Assist visibility. See Gflog docs/MAGNET_LASER_2026_11_05.md, docs/AIM_VISIBILITY_2026_11_05.md and artifacts/laser-spin-final-verification.json. Counts describe their respective verification runs rather than disjoint totals.

Production hosting validation: all ten runtime checksums, 13 hosting-helper tests, local gzip/upload-plan dry run and all 37 final isolated muted browser navigation/save-persistence checks, with no JavaScript/runtime errors. Evidence: test-results/bogey-brian-nov05-*.log, test-results/bogey-brian-gzip/results.json and Gflog artifacts/ep-nov05-final-verification.json. The stable loader is restored after the version-switch test.

## Deployment

The existing workflow tests its helpers and verifies/extracts the checked-out ZIP using `games/bogey-brian/build.json` before AWS authentication. It then uses the existing `AWS_ROLE_ARN`, OIDC, `env` environment and `esteemed-playground-bucket` in `us-east-2` to publish correctly typed/gzipped immutable assets, switch the stable loader and sync arcade pages.

The source ZIP is excluded from the website upload. Expanded `play/` and `releases/` are ignored by Git. The workflow protects releases, loader files and legacy `_builds/` objects from `--delete`. Merging the release PR to main triggers this existing deployment workflow.

## Remaining AWS checks, only if needed

1. **HTTPS:** keep existing HTTPS hosting. If the arcade only has an HTTP S3 website endpoint, put CloudFront in front of that existing endpoint, use default root object `index.html`, and redirect HTTP viewers to HTTPS. A CloudFront hostname is sufficient; a custom domain is optional. The website origin preserves existing games' directory-index links.
2. **CloudFront caching:** if present, use managed `CachingDisabled` for `games/bogey-brian/play/*` and `games/bogey-brian/index.html`, with higher precedence than the default behavior. Keep normal caching on immutable `games/bogey-brian/releases/*`. Once, invalidate `/`, `/index.html` and `/games/bogey-brian/*`. The prepared workflow handles gzip, MIME types and cache metadata. No new CORS or cross-origin isolation headers are needed for the same-origin, single-threaded game.
3. **After a release merges to main:** confirm the existing deployment Action succeeds and open `https://YOUR-ARCADE-HOST/games/bogey-brian/index.html`. Check a course starts, audio works after clicking, and settings survive reopening.

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
