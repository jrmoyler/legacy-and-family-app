#!/usr/bin/env python3
"""Correct the canonical author name in release EPUB and PDF metadata."""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Any

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject, TextStringObject, create_string_object


INCORRECT_AUTHOR = "Pamela Foster-Grear"
EXPECTED_AUTHOR = "Pamella Foster-Grear"
EPUB_MODIFIED = "2026-08-17T00:00:00Z"
EPUB_ENTRY_TIMESTAMP = 1_786_924_800
PDF_MODIFIED = "D:20260817000000+00'00'"
ACCESSIBILITY_KEYS = {"/ActualText", "/Alt", "/Title"}


class CorrectionError(Exception):
    """A publication could not be corrected safely."""


def _replace_accessibility_metadata(writer: PdfWriter) -> int:
    """Replace the name in effective outline and accessibility strings only."""
    seen: set[int] = set()
    replacements = 0

    def walk(value: Any) -> None:
        nonlocal replacements
        if isinstance(value, IndirectObject):
            try:
                value = value.get_object()
            except Exception:
                return
        marker = id(value)
        if marker in seen:
            return
        if isinstance(value, (DictionaryObject, ArrayObject)):
            seen.add(marker)
        if isinstance(value, DictionaryObject):
            for key, child in list(value.items()):
                if (
                    str(key) in ACCESSIBILITY_KEYS
                    and isinstance(child, TextStringObject)
                    and INCORRECT_AUTHOR in str(child)
                ):
                    value[key] = create_string_object(str(child).replace(INCORRECT_AUTHOR, EXPECTED_AUTHOR))
                    replacements += 1
                else:
                    walk(child)
        elif isinstance(value, ArrayObject):
            for child in value:
                walk(child)

    walk(writer.root_object)
    return replacements


def correct_pdf(path: Path) -> dict[str, Any]:
    reader = PdfReader(path)
    metadata = dict(reader.metadata or {})
    current_author = metadata.get("/Author")
    if current_author not in {INCORRECT_AUTHOR, EXPECTED_AUTHOR}:
        raise CorrectionError(f"{path.name}: unexpected PDF author metadata: {current_author!r}")

    writer = PdfWriter(path, incremental=True)
    navigation_replacements = _replace_accessibility_metadata(writer)
    if (
        current_author == EXPECTED_AUTHOR
        and metadata.get("/ModDate") == PDF_MODIFIED
        and navigation_replacements == 0
    ):
        return {
            "path": str(path),
            "author": EXPECTED_AUTHOR,
            "accessibilityOrOutlineReplacements": 0,
            "changed": False,
        }
    metadata["/Author"] = EXPECTED_AUTHOR
    metadata["/ModDate"] = PDF_MODIFIED
    writer.add_metadata(metadata)

    with tempfile.NamedTemporaryFile(dir=path.parent, suffix=".pdf", delete=False) as stream:
        temp_path = Path(stream.name)
    try:
        writer.write(temp_path)
        corrected = PdfReader(temp_path)
        if (corrected.metadata or {}).get("/Author") != EXPECTED_AUTHOR:
            raise CorrectionError(f"{path.name}: corrected PDF author did not persist")
        os.replace(temp_path, path)
    finally:
        temp_path.unlink(missing_ok=True)

    return {
        "path": str(path),
        "author": EXPECTED_AUTHOR,
        "accessibilityOrOutlineReplacements": navigation_replacements,
        "changed": True,
    }


def _package_path(archive: zipfile.ZipFile) -> str:
    try:
        container = ET.fromstring(archive.read("META-INF/container.xml"))
    except (KeyError, ET.ParseError) as error:
        raise CorrectionError(f"invalid EPUB container: {error}") from error
    for node in container.iter():
        if node.tag.endswith("rootfile") and node.attrib.get("full-path"):
            return node.attrib["full-path"]
    raise CorrectionError("EPUB container has no package rootfile")


def correct_epub(path: Path) -> dict[str, Any]:
    with zipfile.ZipFile(path) as archive:
        package_path = _package_path(archive)
        package = archive.read(package_path).decode("utf-8")
        replacements = package.count(INCORRECT_AUTHOR)
        if not replacements and EXPECTED_AUTHOR not in package:
            raise CorrectionError(f"{path.name}: package metadata has no recognized author")
        corrected_package = package.replace(INCORRECT_AUTHOR, EXPECTED_AUTHOR)
        corrected_package, modified_count = re.subn(
            r'(<meta\s+property=["\']dcterms:modified["\']>)[^<]+(</meta>)',
            rf"\g<1>{EPUB_MODIFIED}\g<2>",
            corrected_package,
            count=1,
        )
        if modified_count != 1:
            raise CorrectionError(f"{path.name}: package metadata has no unique dcterms:modified value")
        if corrected_package == package:
            return {
                "path": str(path),
                "author": EXPECTED_AUTHOR,
                "metadataReplacements": 0,
                "changed": False,
            }
    if not shutil.which("zip"):
        raise CorrectionError("the zip command is required to preserve unchanged EPUB members")
    with tempfile.TemporaryDirectory(dir=path.parent) as temp_directory:
        temp_root = Path(temp_directory)
        temp_path = temp_root / path.name
        update_root = temp_root / "update"
        package_file = update_root / package_path
        package_file.parent.mkdir(parents=True)
        package_file.write_text(corrected_package, encoding="utf-8")
        os.utime(package_file, (EPUB_ENTRY_TIMESTAMP, EPUB_ENTRY_TIMESTAMP))
        shutil.copy2(path, temp_path)
        result = subprocess.run(
            ["zip", "-q", "-X", "-u", str(temp_path), package_path],
            cwd=update_root,
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode:
            raise CorrectionError(f"{path.name}: zip update failed: {result.stderr.strip()}")
        with zipfile.ZipFile(temp_path) as corrected:
            first = corrected.infolist()[0]
            if first.filename != "mimetype" or first.compress_type != zipfile.ZIP_STORED:
                raise CorrectionError(f"{path.name}: EPUB mimetype is no longer first and uncompressed")
            if corrected.testzip() is not None:
                raise CorrectionError(f"{path.name}: EPUB CRC validation failed after correction")
            effective_package = corrected.read(package_path).decode("utf-8")
            if INCORRECT_AUTHOR in effective_package or EXPECTED_AUTHOR not in effective_package:
                raise CorrectionError(f"{path.name}: corrected EPUB author did not persist")
        os.replace(temp_path, path)

    return {
        "path": str(path),
        "author": EXPECTED_AUTHOR,
        "metadataReplacements": replacements,
        "changed": True,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Repository root (default: current directory)")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    results = []
    try:
        for path in sorted((root / "assets" / "library" / "epub").glob("*.epub")):
            results.append(correct_epub(path))
        for path in sorted((root / "assets" / "library" / "pdf").glob("*.pdf")):
            results.append(correct_pdf(path))
    except (CorrectionError, OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"AUTHOR METADATA CORRECTION FAILED: {error}")
        return 1
    for result in results:
        print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
