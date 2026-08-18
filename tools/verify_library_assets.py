#!/usr/bin/env python3
"""Verify the complete A Cup of Compassion publishing library.

The library is intentionally kept as normal Git blobs (not text previews or
LFS pointers). This verifier checks the release contract end to end: catalog
order, sizes, SHA-256 hashes, EPUB packaging, PDF parseability, app wiring,
and, when a base URL is supplied, full HTTP downloads of every edition.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

from PIL import Image


EXPECTED_IDS = [
    "book-1",
    "book-2",
    "book-3",
    "book-4",
    "book-5",
    "book-6",
    "companion-workbook",
    "legacy-inventory-workbook",
    "compassion-legacy-journal",
]
EXPECTED_AUTHOR = "Pamella Grear"
LEGACY_SURNAME = "Foster-" + "Grear"
INCORRECT_AUTHOR = f"{'Pam' + 'ela'} {LEGACY_SURNAME}"
INCORRECT_NAME_PATTERN = re.compile(r"(?<![A-Za-z])Pam" + r"ela(?![A-Za-z])", re.IGNORECASE)
RETIRED_BYLINE_PATTERN = re.compile(r"\bPamell?a\s+Foster" + r"-Grear\b", re.IGNORECASE)
EXPECTED_AUTHOR_PATTERN = re.compile(r"\bPamella Grear\b", re.IGNORECASE)
EPUB_TEXT_SUFFIXES = (".css", ".htm", ".html", ".ncx", ".opf", ".svg", ".txt", ".xhtml", ".xml")
PDF_MAGIC = b"%PDF-"


class VerificationError(Exception):
    """A publication failed its release contract."""


def digest_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def fail(message: str) -> None:
    raise VerificationError(message)


def parse_manifest(path: Path) -> dict[str, str]:
    entries: dict[str, str] = {}
    for line_no, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw_line.strip():
            continue
        try:
            sha, relative_path = raw_line.split(maxsplit=1)
        except ValueError:
            fail(f"Checksum manifest line {line_no} is malformed.")
        if len(sha) != 64 or any(char not in "0123456789abcdef" for char in sha):
            fail(f"Checksum manifest line {line_no} has an invalid SHA-256 value.")
        if relative_path in entries:
            fail(f"Checksum manifest lists {relative_path} more than once.")
        entries[relative_path] = sha
    return entries


def epub_details(path: Path) -> dict[str, Any]:
    try:
        with zipfile.ZipFile(path) as archive:
            members = archive.infolist()
            if not members:
                fail(f"{path.name}: EPUB archive is empty.")
            bad_member = archive.testzip()
            if bad_member:
                fail(f"{path.name}: EPUB CRC validation failed for {bad_member}.")
            mimetype = members[0]
            if (
                mimetype.filename != "mimetype"
                or mimetype.compress_type != zipfile.ZIP_STORED
                or archive.read("mimetype") != b"application/epub+zip"
            ):
                fail(f"{path.name}: EPUB mimetype must be first and uncompressed.")
            container = ET.fromstring(archive.read("META-INF/container.xml"))
            rootfile = next((node.attrib.get("full-path") for node in container.iter() if node.tag.endswith("rootfile")), None)
            if not rootfile:
                fail(f"{path.name}: EPUB container has no package rootfile.")
            package = ET.fromstring(archive.read(rootfile))
            creators = [
                (node.text or "").strip()
                for node in package.iter()
                if node.tag.endswith("creator")
            ]
            if creators != [EXPECTED_AUTHOR]:
                fail(f"{path.name}: EPUB creator metadata must be {EXPECTED_AUTHOR!r}; found {creators!r}.")
            metadata_values = [
                (node.text or "").strip()
                for node in package.iter()
                if node.tag.endswith(("creator", "rights"))
            ]
            if any(INCORRECT_AUTHOR in value for value in metadata_values):
                fail(f"{path.name}: EPUB package metadata still contains {INCORRECT_AUTHOR!r}.")
            text_name_occurrences = 0
            for member in members:
                if not member.filename.lower().endswith(EPUB_TEXT_SUFFIXES):
                    continue
                text = archive.read(member).decode("utf-8")
                if INCORRECT_NAME_PATTERN.search(text):
                    fail(f"{path.name}: {member.filename} still contains the misspelled author name.")
                if RETIRED_BYLINE_PATTERN.search(text):
                    fail(f"{path.name}: {member.filename} still contains the retired author byline.")
                text_name_occurrences += len(EXPECTED_AUTHOR_PATTERN.findall(text))
            if text_name_occurrences < 1:
                fail(f"{path.name}: EPUB text contains no corrected author name.")
            manifest = [node for node in package.iter() if node.tag.endswith("item")]
            spine = [node for node in package.iter() if node.tag.endswith("itemref")]
            if not manifest or not spine:
                fail(f"{path.name}: EPUB package must contain a manifest and reading spine.")
            cover_href = next(
                (
                    node.attrib.get("href")
                    for node in manifest
                    if ("cover-image" in node.attrib.get("properties", "") or "cover" in node.attrib.get("id", "").lower())
                    and node.attrib.get("media-type", "").startswith("image/")
                ),
                None,
            )
            if not cover_href:
                fail(f"{path.name}: EPUB package has no cover image.")
            cover_member = (PurePosixPath(rootfile).parent / cover_href).as_posix()
            cover_sha = hashlib.sha256(archive.read(cover_member)).hexdigest()
            return {
                "author": creators[0],
                "zipMembers": len(members),
                "manifestItems": len(manifest),
                "spineItems": len(spine),
                "textNameOccurrences": text_name_occurrences,
                "coverSha256": cover_sha,
            }
    except (KeyError, ET.ParseError, zipfile.BadZipFile) as error:
        fail(f"{path.name}: invalid EPUB package ({error}).")


def pdf_details(path: Path) -> dict[str, Any]:
    with path.open("rb") as stream:
        if stream.read(len(PDF_MAGIC)) != PDF_MAGIC:
            fail(f"{path.name}: missing PDF header.")
        stream.seek(max(0, path.stat().st_size - 8192))
        if b"%%EOF" not in stream.read():
            fail(f"{path.name}: missing PDF EOF marker.")

    if not shutil.which("pdfinfo"):
        fail("pdfinfo is required to validate PDF parseability.")
    result = subprocess.run(["pdfinfo", str(path)], check=False, capture_output=True, text=True)
    if result.returncode:
        fail(f"{path.name}: pdfinfo failed: {result.stderr.strip()}")
    fields: dict[str, str] = {}
    for line in result.stdout.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            fields[key.strip()] = value.strip()
    try:
        pages = int(fields["Pages"])
    except (KeyError, ValueError):
        fail(f"{path.name}: pdfinfo did not report a page count.")
    if pages < 1 or not fields.get("Page size"):
        fail(f"{path.name}: invalid PDF page metadata.")
    if fields.get("Author") != EXPECTED_AUTHOR:
        fail(f"{path.name}: PDF author metadata must be {EXPECTED_AUTHOR!r}; found {fields.get('Author')!r}.")
    if not shutil.which("pdftotext"):
        fail("pdftotext is required to validate reader-visible PDF text.")
    text_result = subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        check=False,
        capture_output=True,
        text=True,
    )
    if text_result.returncode:
        fail(f"{path.name}: pdftotext failed: {text_result.stderr.strip()}")
    if INCORRECT_NAME_PATTERN.search(text_result.stdout):
        fail(f"{path.name}: reader-visible PDF text still contains the misspelled author name.")
    if RETIRED_BYLINE_PATTERN.search(text_result.stdout):
        fail(f"{path.name}: reader-visible PDF text still contains the retired author byline.")
    text_name_occurrences = len(EXPECTED_AUTHOR_PATTERN.findall(text_result.stdout))
    if text_name_occurrences < 1:
        fail(f"{path.name}: reader-visible PDF text contains no corrected author name.")
    return {
        "author": fields["Author"],
        "pages": pages,
        "pageSize": fields["Page size"],
        "textNameOccurrences": text_name_occurrences,
    }


def downloaded_digest(base_url: str, asset_path: str, expected_size: int) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}{asset_path}"
    request = urllib.request.Request(url, headers={"Accept": "application/pdf, application/epub+zip, */*"})
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            hasher = hashlib.sha256()
            size = 0
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                hasher.update(chunk)
                size += len(chunk)
    except (OSError, urllib.error.URLError, urllib.error.HTTPError) as error:
        fail(f"{asset_path}: HTTP download failed ({error}).")
    if size != expected_size:
        fail(f"{asset_path}: HTTP download was {size} bytes; expected {expected_size}.")
    return {"status": response.status, "bytes": size, "sha256": hasher.hexdigest(), "contentType": response.headers.get("Content-Type", "")}


def verify(root: Path, base_url: str | None) -> dict[str, Any]:
    library = root / "assets" / "library"
    catalog = json.loads((library / "catalog.json").read_text(encoding="utf-8"))
    titles = catalog.get("titles")
    if not isinstance(titles, list) or [entry.get("id") for entry in titles] != EXPECTED_IDS:
        fail("catalog.json titles must be Book 1 through Book 6, both workbooks, then the journal.")

    manifest = parse_manifest(library / "SHA256SUMS.txt")
    expected_manifest_paths: set[str] = set()
    report: dict[str, Any] = {"editionCount": 0, "catalogOrder": EXPECTED_IDS, "editions": []}
    data_source = (root / "src" / "data.js").read_text(encoding="utf-8")
    screen_source = (root / "src" / "screens.js").read_text(encoding="utf-8")
    if 'href="${esc(assets.pdf)}" download' not in screen_source or 'href="${esc(assets.epub)}" download' not in screen_source:
        fail("The book screen no longer exposes both download links.")
    if "product.free || owned" not in screen_source:
        fail("Paid download links are not gated behind ownership.")

    for title in titles:
        title_report: dict[str, Any] = {"id": title["id"], "title": title["title"], "formats": {}}
        expected_formats = ("pdf",) if title["id"] == "compassion-legacy-journal" else ("pdf", "epub")
        present_formats = tuple(name for name in ("pdf", "epub") if isinstance(title.get(name), dict))
        if present_formats != expected_formats:
            fail(f"{title['id']}: expected formats {expected_formats}; found {present_formats}.")
        for format_name in expected_formats:
            edition = title.get(format_name)
            if not isinstance(edition, dict):
                fail(f"{title['id']}: missing {format_name} edition in catalog.")
            public_path = edition.get("path")
            if not isinstance(public_path, str) or not public_path.startswith("/assets/library/"):
                fail(f"{title['id']}: invalid {format_name} public path.")
            relative_path = public_path.removeprefix("/assets/library/")
            expected_manifest_paths.add(relative_path)
            path = library / relative_path
            if not path.is_file():
                fail(f"{title['id']}: {format_name} file is missing: {relative_path}")
            actual_size = path.stat().st_size
            if actual_size != edition.get("bytes"):
                fail(f"{path.name}: {actual_size} bytes; catalog requires {edition.get('bytes')}.")
            actual_sha = digest_file(path)
            if actual_sha != edition.get("sha256") or manifest.get(relative_path) != actual_sha:
                fail(f"{path.name}: checksum does not match catalog and manifest.")
            stem = path.stem
            if f"bookAssets('{stem}')" not in data_source and public_path not in data_source:
                fail(f"{path.name}: app data does not reference this edition stem.")
            cover = library / "covers" / f"{stem}.jpg"
            if not cover.is_file():
                fail(f"{path.name}: marketplace cover is missing.")
            try:
                with Image.open(cover) as cover_image:
                    cover_image.verify()
            except OSError as error:
                fail(f"{cover.name}: invalid marketplace cover ({error}).")
            details = pdf_details(path) if format_name == "pdf" else epub_details(path)
            if format_name == "epub" and details["coverSha256"] != digest_file(cover):
                fail(f"{path.name}: embedded EPUB cover does not match the corrected marketplace cover.")
            item: dict[str, Any] = {"path": public_path, "bytes": actual_size, "sha256": actual_sha, **details}
            if base_url:
                download = downloaded_digest(base_url, public_path, actual_size)
                if download["sha256"] != actual_sha:
                    fail(f"{path.name}: HTTP download checksum differs from committed edition.")
                item["download"] = download
            title_report["formats"][format_name] = item
            report["editionCount"] += 1
        report["editions"].append(title_report)

    if report["editionCount"] != 17 or set(manifest) != expected_manifest_paths:
        fail("The catalog and checksum manifest must describe exactly 17 editions.")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Repository root (default: current directory)")
    parser.add_argument("--base-url", help="Optional deployment URL; downloads every edition and checks its full hash")
    parser.add_argument("--report", help="Optional JSON report destination")
    args = parser.parse_args()
    try:
        report = verify(Path(args.root).resolve(), args.base_url)
    except (OSError, ValueError, VerificationError) as error:
        print(f"LIBRARY VERIFICATION FAILED: {error}", file=sys.stderr)
        return 1
    rendered = json.dumps(report, indent=2) + "\n"
    if args.report:
        Path(args.report).write_text(rendered, encoding="utf-8")
    print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
