# Bogey Brian: repository build and hosting

Current local delivery: Sketchy Strokes (90 Normal holes total), owner-selected Beyond the Forest music, and Trails/customization with maximum density 10. Source label: `ab72fea-c11-trails-working-tree`. The local ZIP and pinned manifest are ready for the owner's commit, push and pull request; no push or cloud deployment was performed.

The game ZIP is included in this repository at `games/bogey-brian/builds/bogey-brian-web-94d1759ce6a5bd34036e.zip` (**84,226,226 bytes**, about 80.3 MiB). It fits GitHub's 100 MiB ordinary-file limit. Include it in the owner's normal commit/push along with the page, scripts, workflow and manifest. No manual S3 archive upload, GitHub Release publishing, Git LFS or additional build-read IAM permission is required.

The GitHub website file uploader has a separate 25 MiB limit, so use the normal Git push workflow for this archive. Each new build increases repository history size. Old ZIPs can be removed from the current checkout as builds accumulate; Git history retains them.

## Deployment

The existing workflow tests its helpers and verifies/extracts the checked-out ZIP using `games/bogey-brian/build.json` before AWS authentication. It then uses the existing `AWS_ROLE_ARN`, OIDC, `env` environment and `esteemed-playground-bucket` in `us-east-2` to publish correctly typed/gzipped immutable assets, switch the stable loader and sync arcade pages.

The source ZIP is excluded from the website upload. Expanded `play/` and `releases/` are ignored by Git. The workflow protects releases, loader files and legacy `_builds/` objects from `--delete`. No cloud changes or Git operations were performed locally.

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
