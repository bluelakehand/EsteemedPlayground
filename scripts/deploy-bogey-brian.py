"""Upload precompressed immutable assets first, then switch the stable loader."""
import argparse
import gzip
import importlib.util
import mimetypes
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("stage_brian", Path(__file__).with_name("stage-bogey-brian.py"))
stage_brian = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stage_brian)

def upload_plan(manifest, root):
    version = manifest["version"]
    for entry in manifest["files"]:
        name = entry["name"]
        key = f"games/bogey-brian/releases/{version}/{name}"
        content_type = {".wasm": "application/wasm", ".pck": "application/octet-stream", ".js": "text/javascript; charset=utf-8",
                        ".html": "text/html; charset=utf-8", ".json": "application/json"}.get(Path(name).suffix,
                            mimetypes.guess_type(name)[0] or "application/octet-stream")
        yield root / "releases" / version / name, key, content_type, "public,max-age=31536000,immutable", Path(name).suffix in {".wasm", ".pck", ".js"}
    yield root / "play/index.html", "games/bogey-brian/play/index.html", "text/html; charset=utf-8", "no-cache,max-age=0,must-revalidate", False

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--root", type=Path, default=ROOT / "games/bogey-brian")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    manifest = stage_brian.read_manifest(args.root / "build.json")
    plan = list(upload_plan(manifest, args.root))
    for path, *_ in plan:
        if not path.is_file():
            raise ValueError(f"Missing staged file: {path}")
    # Prevent a changed/corrupt staged file from being published, even on reruns.
    for entry in manifest["files"]:
        path = args.root / "releases" / manifest["version"] / entry["name"]
        if path.stat().st_size != entry["bytes"] or stage_brian.sha256(path.read_bytes()) != entry["sha256"]:
            raise ValueError(f"Staged checksum mismatch: {path}")
    expected_loader = stage_brian.stable_loader((args.root / "releases" / manifest["version"] / "index.html").read_text(encoding="utf-8"), manifest["version"])
    if (args.root / "play/index.html").read_text(encoding="utf-8") != expected_loader:
        raise ValueError("Staged loader differs from pinned build")
    with tempfile.TemporaryDirectory(prefix="brian-upload-") as temporary:
        for i, (path, key, content_type, cache, compressed) in enumerate(plan):
            source = path
            if compressed:
                source = Path(temporary) / str(i)
                source.write_bytes(gzip.compress(path.read_bytes(), compresslevel=9, mtime=0))
            command = ["aws", "s3", "cp", str(source), f"s3://{args.bucket}/{key}", "--only-show-errors",
                       "--content-type", content_type, "--cache-control", cache]
            if compressed:
                command.extend(["--content-encoding", "gzip"])
            print(f"{'PLAN' if args.dry_run else 'UPLOAD'} {key} ({source.stat().st_size} bytes, {content_type}, gzip={compressed})", flush=True)
            if not args.dry_run:
                subprocess.run(command, check=True)

if __name__ == "__main__":
    main()
