#!/usr/bin/env python3
"""Extract the published cover art out of every EPUB in the library.

Each EPUB already carries its production cover at 1600 x 2560. This tool lifts
that image out of the archive and writes two web editions of it:

  assets/library/covers/<stem>.jpg         full resolution preview
  assets/library/covers/thumbs/<stem>.jpg  grid thumbnail

`<stem>` is the same publication stem the PDF and EPUB use, so the app can
derive all four asset paths from one slug.

The catalog gains a `covers` array with the same shape of integrity data the
editions carry (bytes + SHA-256), which `verify_library_assets.py` checks.

Re-running is idempotent: the same EPUB produces byte-identical output, so a
clean tree stays clean.

    python3 tools/extract_library_covers.py --root .
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - dependency guidance
    print("This tool needs Pillow: pip install pillow", file=sys.stderr)
    raise

FULL_WIDTH = 1600
THUMB_WIDTH = 640
FULL_QUALITY = 84
THUMB_QUALITY = 80


def cover_member(archive: zipfile.ZipFile) -> str:
    """Return the archive path of the cover image.

    Preferred order: the OPF `meta name="cover"` pointer, then the manifest
    item carrying the `cover-image` property, then a filename fallback.
    """
    container = ET.fromstring(archive.read("META-INF/container.xml"))
    rootfile = next(
        (node.attrib["full-path"] for node in container.iter()
         if node.tag.endswith("rootfile") and "full-path" in node.attrib),
        None,
    )
    if not rootfile:
        raise SystemExit("EPUB container has no package rootfile.")

    package = ET.fromstring(archive.read(rootfile))
    base = Path(rootfile).parent
    items = {
        node.attrib["id"]: node
        for node in package.iter()
        if node.tag.endswith("item") and "id" in node.attrib
    }

    candidates: list[str] = []
    for node in package.iter():
        if node.tag.endswith("meta") and node.attrib.get("name") == "cover":
            item = items.get(node.attrib.get("content", ""))
            if item is not None:
                candidates.append(item.attrib["href"])
    for node in items.values():
        if "cover-image" in node.attrib.get("properties", ""):
            candidates.append(node.attrib["href"])

    names = set(archive.namelist())
    for href in candidates:
        member = str(base / href) if str(base) != "." else href
        if member in names:
            return member

    fallback = sorted(
        name for name in names
        if "cover" in name.lower() and name.lower().endswith((".jpg", ".jpeg", ".png"))
    )
    if not fallback:
        raise SystemExit("EPUB has no identifiable cover image.")
    return fallback[0]


def write_jpeg(image: Image.Image, width: int, quality: int, destination: Path) -> None:
    height = round(image.height * width / image.width)
    resized = image.resize((width, height), Image.LANCZOS) if image.width != width else image
    buffer = BytesIO()
    resized.convert("RGB").save(
        buffer, format="JPEG", quality=quality, optimize=True, progressive=True
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(buffer.getvalue())


def digest_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def extract(root: Path) -> list[dict]:
    library = root / "assets" / "library"
    catalog_path = library / "catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    covers: list[dict] = []

    for title in catalog["titles"]:
        epub_path = library / title["epub"]["path"].removeprefix("/assets/library/")
        stem = epub_path.stem
        with zipfile.ZipFile(epub_path) as archive:
            source = Image.open(BytesIO(archive.read(cover_member(archive))))
            source.load()

        full = library / "covers" / f"{stem}.jpg"
        thumb = library / "covers" / "thumbs" / f"{stem}.jpg"
        write_jpeg(source, FULL_WIDTH, FULL_QUALITY, full)
        write_jpeg(source, THUMB_WIDTH, THUMB_QUALITY, thumb)

        with Image.open(full) as rendered:
            width, height = rendered.size

        covers.append({
            "id": title["id"],
            "title": title["title"],
            "width": width,
            "height": height,
            "image": {
                "path": f"/assets/library/covers/{full.name}",
                "bytes": full.stat().st_size,
                "sha256": digest_file(full),
            },
            "thumb": {
                "path": f"/assets/library/covers/thumbs/{thumb.name}",
                "bytes": thumb.stat().st_size,
                "sha256": digest_file(thumb),
            },
        })
        print(f"{stem}: {width}x{height} ({full.stat().st_size:,} B / {thumb.stat().st_size:,} B)")

    catalog["covers"] = covers
    catalog_path.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    return covers


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Repository root (default: current directory)")
    args = parser.parse_args()
    covers = extract(Path(args.root).resolve())
    print(f"\n{len(covers)} covers written and recorded in catalog.json.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
