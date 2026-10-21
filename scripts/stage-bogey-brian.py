"""Validate a pinned Brian ZIP and stage immutable assets plus a stable loader."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {"index.html", "index.js", "index.wasm", "index.side.wasm", "index.pck", "godot_rapier.wasm", "index.png",
            "index.audio.worklet.js", "index.audio.position.worklet.js", "build-info.json"}

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def read_manifest(path):
    value = json.loads(path.read_text(encoding="utf-8"))
    if value.get("format") != 1 or not re.fullmatch(r"web-[0-9a-f]{20}", value.get("version", "")):
        raise ValueError("Unsupported Brian manifest")
    archive = value["archive"]
    expected = f"games/bogey-brian/builds/bogey-brian-{value['version']}.zip"
    if archive.get("path") != expected or not re.fullmatch(r"[0-9a-f]{64}", archive["sha256"]):
        raise ValueError("Invalid pinned archive identity")
    if not isinstance(archive["bytes"], int) or not 0 < archive["bytes"] < 100 * 1024 * 1024:
        raise ValueError("Repository archive must be smaller than GitHub's 100 MiB limit")
    entries = value["files"]
    if len(entries) != len(REQUIRED) or {entry["name"] for entry in entries} != REQUIRED:
        raise ValueError("Manifest does not contain the complete supported Web runtime")
    for entry in entries:
        if not isinstance(entry["bytes"], int) or not 0 < entry["bytes"] < 500_000_000 or not re.fullmatch(r"[0-9a-f]{64}", entry["sha256"]):
            raise ValueError("Invalid runtime file metadata")
    return value

def stable_loader(html, version):
    prefix = f"/games/bogey-brian/releases/{version}/"
    match = re.search(r"const GODOT_CONFIG = (\{[^\n]+\});", html)
    if not match or "const GODOT_THREADS_ENABLED = false;" not in html:
        raise ValueError("Unexpected Godot HTML shell or threaded build")
    config = json.loads(match.group(1))
    if config["executable"] != "index" or config["gdextensionLibs"] != ["godot_rapier.wasm"]:
        raise ValueError("Unexpected export executable/extensions")
    # Resolve network URLs via the document base while preserving the basename
    # aliases used by Godot's GDExtension dynamic-library cache. Rewriting
    # gdextensionLibs to absolute paths loads bytes but breaks Rapier lookup.
    if '<base ' in html or html.count('<head>') != 1:
        raise ValueError("Unexpected HTML base/head")
    html = html.replace('<head>', f'<head>\n\t\t<base href="{prefix}">\n\t\t<link rel="icon" href="index.png">', 1)
    for old in ['src="index.js"', 'src="index.png"']:
        if html.count(old) != 1:
            raise ValueError(f"Unexpected shell reference: {old}")
    html = re.sub(r"<title>[^<]*</title>", "<title>Bogey Brian</title>", html, count=1)
    return html

def stage(archive, manifest_path, output):
    manifest = read_manifest(manifest_path)
    if archive.stat().st_size != manifest["archive"]["bytes"] or sha256(archive.read_bytes()) != manifest["archive"]["sha256"]:
        raise ValueError("Brian archive size/checksum mismatch; no files staged")
    with zipfile.ZipFile(archive) as packed:
        if len(packed.namelist()) != len(REQUIRED) or set(packed.namelist()) != REQUIRED:
            raise ValueError("Archive contains missing, duplicate or unexpected paths")
        files = {}
        for entry in manifest["files"]:
            if packed.getinfo(entry["name"]).file_size != entry["bytes"]:
                raise ValueError(f"Incorrect file size: {entry['name']}")
            data = packed.read(entry["name"])
            if sha256(data) != entry["sha256"]:
                raise ValueError(f"Incorrect file checksum: {entry['name']}")
            files[entry["name"]] = data
    loader = stable_loader(files["index.html"].decode("utf-8"), manifest["version"])
    # Validate everything before writes. Older immutable releases are retained.
    release = output / "releases" / manifest["version"]
    release.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        (release / name).write_bytes(data)
    play = output / "play"
    play.mkdir(parents=True, exist_ok=True)
    (play / "index.html").write_text(loader, encoding="utf-8")
    return manifest

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=ROOT / "games/bogey-brian/build.json")
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "games/bogey-brian")
    args = parser.parse_args()
    archive = args.archive if args.archive else ROOT / read_manifest(args.manifest)["archive"]["path"]
    manifest = stage(archive, args.manifest, args.output)
    print(f"Staged {manifest['version']}: {len(manifest['files'])} verified files; stable play/index.html")

if __name__ == "__main__":
    main()
