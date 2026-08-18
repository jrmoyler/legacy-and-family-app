#!/usr/bin/env python3
"""Correct the canonical author name throughout release EPUB and PDF files."""

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
from pypdf.generic import (
    ArrayObject,
    DecodedStreamObject,
    DictionaryObject,
    IndirectObject,
    TextStringObject,
    create_string_object,
)


INCORRECT_AUTHOR = "Pamela Foster-Grear"
EXPECTED_AUTHOR = "Pamella Foster-Grear"
INCORRECT_GIVEN_NAME = "Pamela"
EXPECTED_GIVEN_NAME = "Pamella"
EPUB_MODIFIED = "2026-08-17T00:00:00Z"
EPUB_ENTRY_TIMESTAMP = 1_786_924_800
PDF_MODIFIED = "D:20260817000000+00'00'"
ACCESSIBILITY_KEYS = {"/ActualText", "/Alt", "/Title"}
EPUB_TEXT_SUFFIXES = (".css", ".htm", ".html", ".ncx", ".opf", ".svg", ".txt", ".xhtml", ".xml")
INCORRECT_NAME_PATTERN = re.compile(r"(?<![A-Za-z])Pamela(?![A-Za-z])", re.IGNORECASE)

# The first three PDFs use a Canva Type 3 font and draw one hexadecimal glyph
# at a time. This pattern identifies the glyph sequence for "Pamela". The
# replacement duplicates the existing lowercase-l glyph and its own advance,
# so the correction keeps the exact embedded font rather than overlaying a
# visually mismatched system font.
_NUMBER = rb"[-+]?(?:\d+(?:\.\d*)?|\.\d+)"
TYPE3_PAMELA_PATTERN = re.compile(
    rb"(<31>\s*Tj\s+"
    + _NUMBER
    + rb"\s+0\s+Td\s*<42>\s*Tj\s+"
    + _NUMBER
    + rb"\s+0\s+Td\s*<4E>\s*Tj\s+"
    + _NUMBER
    + rb"\s+0\s+Td\s*<46>\s*Tj\s+"
    + _NUMBER
    + rb"\s+0\s+Td\s*<4D>\s*Tj)(\s+("
    + _NUMBER
    + rb")\s+0\s+Td\s*<42>\s*Tj)",
    re.IGNORECASE,
)


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
                    and INCORRECT_GIVEN_NAME in str(child)
                ):
                    value[key] = create_string_object(
                        str(child).replace(INCORRECT_GIVEN_NAME, EXPECTED_GIVEN_NAME)
                    )
                    replacements += 1
                else:
                    walk(child)
        elif isinstance(value, ArrayObject):
            for child in value:
                walk(child)

    walk(writer.root_object)
    return replacements


def _replace_page_text(data: bytes) -> tuple[bytes, int]:
    """Correct reader-visible text while preserving each PDF's embedded font."""

    replacements = 0

    def insert_type3_l(match: re.Match[bytes]) -> bytes:
        nonlocal replacements
        replacements += 1
        return (
            match.group(1)
            + b"\n"
            + match.group(3)
            + b" 0 Td <4D> Tj"
            + match.group(2)
        )

    data = TYPE3_PAMELA_PATTERN.sub(insert_type3_l, data)
    for incorrect, expected in ((b"Pamela", b"Pamella"), (b"PAMELA", b"PAMELLA")):
        count = data.count(incorrect)
        if count:
            data = data.replace(incorrect, expected)
            replacements += count
    return data, replacements


def _replace_pdf_page_text(writer: PdfWriter) -> int:
    replacements = 0
    for page in writer.pages:
        contents = page.get_contents()
        if contents is None:
            continue
        original = contents.get_data()
        corrected, page_replacements = _replace_page_text(original)
        if not page_replacements:
            continue
        stream = DecodedStreamObject()
        stream.set_data(corrected)
        page.replace_contents(stream)
        replacements += page_replacements
    return replacements


def _pdf_text(path: Path) -> str:
    if not shutil.which("pdftotext"):
        raise CorrectionError("pdftotext is required to verify reader-visible PDF text")
    result = subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise CorrectionError(f"{path.name}: pdftotext failed: {result.stderr.strip()}")
    return result.stdout


def _pdfinfo_author(path: Path) -> str | None:
    if not shutil.which("pdfinfo"):
        raise CorrectionError("pdfinfo is required to verify cross-reader PDF metadata")
    result = subprocess.run(
        ["pdfinfo", str(path)],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise CorrectionError(f"{path.name}: pdfinfo failed: {result.stderr.strip()}")
    for line in result.stdout.splitlines():
        if line.startswith("Author:"):
            return line.split(":", 1)[1].strip()
    return None


def correct_pdf(path: Path) -> dict[str, Any]:
    reader = PdfReader(path)
    metadata = dict(reader.metadata or {})
    current_author = metadata.get("/Author")
    if current_author not in {INCORRECT_AUTHOR, EXPECTED_AUTHOR}:
        raise CorrectionError(f"{path.name}: unexpected PDF author metadata: {current_author!r}")

    # A full clone keeps the Info dictionary readable by both pypdf and
    # Poppler. Incremental content rewrites can leave a valid field that some
    # readers omit, which is not acceptable for release metadata.
    writer = PdfWriter(clone_from=reader)
    navigation_replacements = _replace_accessibility_metadata(writer)
    page_text_replacements = _replace_pdf_page_text(writer)
    cross_reader_metadata_ok = _pdfinfo_author(path) == EXPECTED_AUTHOR
    if (
        current_author == EXPECTED_AUTHOR
        and metadata.get("/ModDate") == PDF_MODIFIED
        and navigation_replacements == 0
        and page_text_replacements == 0
        and cross_reader_metadata_ok
    ):
        return {
            "path": str(path),
            "author": EXPECTED_AUTHOR,
            "accessibilityOrOutlineReplacements": 0,
            "pageTextReplacements": 0,
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
        if _pdfinfo_author(temp_path) != EXPECTED_AUTHOR:
            raise CorrectionError(f"{path.name}: pdfinfo cannot read the corrected PDF author")
        extracted_text = _pdf_text(temp_path)
        if INCORRECT_NAME_PATTERN.search(extracted_text):
            raise CorrectionError(f"{path.name}: reader-visible PDF text still contains {INCORRECT_GIVEN_NAME!r}")
        if EXPECTED_AUTHOR.lower() not in extracted_text.lower():
            raise CorrectionError(f"{path.name}: reader-visible PDF text has no corrected author name")
        os.replace(temp_path, path)
    finally:
        temp_path.unlink(missing_ok=True)

    return {
        "path": str(path),
        "author": EXPECTED_AUTHOR,
        "accessibilityOrOutlineReplacements": navigation_replacements,
        "pageTextReplacements": page_text_replacements,
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
        if INCORRECT_AUTHOR not in package and EXPECTED_AUTHOR not in package:
            raise CorrectionError(f"{path.name}: package metadata has no recognized author")
        corrected_members: dict[str, str] = {}
        replacements = 0
        for member in archive.infolist():
            if not member.filename.lower().endswith(EPUB_TEXT_SUFFIXES):
                continue
            text = archive.read(member).decode("utf-8")
            corrected_text, member_replacements = re.subn(
                INCORRECT_NAME_PATTERN,
                EXPECTED_GIVEN_NAME,
                text,
            )
            replacements += member_replacements
            if corrected_text != text:
                corrected_members[member.filename] = corrected_text

        corrected_package = corrected_members.get(package_path, package)
        corrected_package, modified_count = re.subn(
            r'(<meta\s+property=["\']dcterms:modified["\']>)[^<]+(</meta>)',
            rf"\g<1>{EPUB_MODIFIED}\g<2>",
            corrected_package,
            count=1,
        )
        if modified_count != 1:
            raise CorrectionError(f"{path.name}: package metadata has no unique dcterms:modified value")
        if corrected_package != package:
            corrected_members[package_path] = corrected_package
        if not corrected_members:
            return {
                "path": str(path),
                "author": EXPECTED_AUTHOR,
                "textReplacements": 0,
                "changed": False,
            }
    if not shutil.which("zip"):
        raise CorrectionError("the zip command is required to preserve unchanged EPUB members")
    with tempfile.TemporaryDirectory(dir=path.parent) as temp_directory:
        temp_root = Path(temp_directory)
        temp_path = temp_root / path.name
        update_root = temp_root / "update"
        for member_name, corrected_text in corrected_members.items():
            member_file = update_root / member_name
            member_file.parent.mkdir(parents=True, exist_ok=True)
            member_file.write_text(corrected_text, encoding="utf-8")
            os.utime(member_file, (EPUB_ENTRY_TIMESTAMP, EPUB_ENTRY_TIMESTAMP))
        shutil.copy2(path, temp_path)
        result = subprocess.run(
            ["zip", "-q", "-X", "-u", str(temp_path), *sorted(corrected_members)],
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
            for member in corrected.infolist():
                if not member.filename.lower().endswith(EPUB_TEXT_SUFFIXES):
                    continue
                text = corrected.read(member).decode("utf-8")
                if INCORRECT_NAME_PATTERN.search(text):
                    raise CorrectionError(
                        f"{path.name}: {member.filename} still contains {INCORRECT_GIVEN_NAME!r}"
                    )
        os.replace(temp_path, path)

    return {
        "path": str(path),
        "author": EXPECTED_AUTHOR,
        "textReplacements": replacements,
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
