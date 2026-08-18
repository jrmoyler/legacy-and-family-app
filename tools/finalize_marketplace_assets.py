#!/usr/bin/env python3
"""Finalize canonical author metadata, covers, EPUBs, and the journal release."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path, PurePosixPath

import fitz
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DecodedStreamObject, DictionaryObject, IndirectObject, TextStringObject, create_string_object


CANONICAL_AUTHOR = "Pamella Grear"
CANONICAL_AUTHOR_UPPER = CANONICAL_AUTHOR.upper()
LEGACY_SURNAME = "Foster-" + "Grear"
LEGACY_AUTHORS = (
    f"Pamella {LEGACY_SURNAME}",
    f"{'Pam' + 'ela'} {LEGACY_SURNAME}",
)
TEXT_SUFFIXES = (".css", ".htm", ".html", ".ncx", ".opf", ".svg", ".txt", ".xhtml", ".xml")
MODIFIED = "2026-08-18T00:00:00Z"
NUMBER = rb"[-+]?(?:\d+(?:\.\d*)?|\.\d+)"


def _advance_and_glyph(code: bytes) -> bytes:
    return rb"\s+" + NUMBER + rb"\s+0\s+Td\s*<" + code + rb">\s*Tj"


# The first three Canva PDFs draw text one glyph at a time in a Type 3 font.
# Keep the advance that follows the space, discard the seven-glyph legacy
# surname prefix, and draw G at the correct start position.
TYPE3_PREFIX = re.compile(
    rb"(<01>\s*Tj)\s+(" + NUMBER + rb")\s+0\s+Td\s*<27>\s*Tj"
    + b"".join(_advance_and_glyph(code) for code in (b"50", b"54", b"55", b"46", b"53", b"0E"))
    + _advance_and_glyph(b"28"),
    re.IGNORECASE,
)

CLASSIC_COVERS = {
    "A-Cup-of-Compassion-01-The-Benefit-of-Having-Compassion",
    "A-Cup-of-Compassion-02-Born-or-Nurtured-in-Compassion",
    "A-Cup-of-Compassion-03-Compassion-and-Legacy",
}
STRIP_COVERS = {
    "A-Cup-of-Compassion-04-Compassion-or-Confusion": "BOOK 4 | PAMELLA GREAR",
    "A-Cup-of-Compassion-05-Compassion-and-Commitment": "BOOK 5 | PAMELLA GREAR",
    "A-Cup-of-Compassion-06-Compassion-and-Companionship": "BOOK 6 | PAMELLA GREAR",
}


class FinalizeError(RuntimeError):
    pass


def replace_author_text(text: str) -> str:
    for old in LEGACY_AUTHORS:
        text = text.replace(old, CANONICAL_AUTHOR).replace(old.upper(), CANONICAL_AUTHOR_UPPER)
    old_slug = f"pamella-{LEGACY_SURNAME.lower()}"
    return text.replace(old_slug, "pamella-grear").replace(old_slug.title(), "Pamella-Grear")


def replace_author_bytes(data: bytes) -> tuple[bytes, int]:
    replacements = 0
    corrected, type3_count = TYPE3_PREFIX.subn(rb"\1\n\2 0 Td <28> Tj", data)
    replacements += type3_count
    for old in LEGACY_AUTHORS:
        for source, target in ((old.encode(), CANONICAL_AUTHOR.encode()), (old.upper().encode(), CANONICAL_AUTHOR_UPPER.encode())):
            count = corrected.count(source)
            corrected = corrected.replace(source, target)
            replacements += count
    return corrected, replacements


def replace_pdf_strings(writer: PdfWriter) -> int:
    replacements = 0
    seen: set[int] = set()

    def walk(value: object) -> None:
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
                if isinstance(child, TextStringObject):
                    corrected = replace_author_text(str(child))
                    if corrected != str(child):
                        value[key] = create_string_object(corrected)
                        replacements += 1
                else:
                    walk(child)
        elif isinstance(value, ArrayObject):
            for child in value:
                walk(child)

    walk(writer.root_object)
    return replacements


def rewrite_pdf_streams(path: Path) -> Path:
    reader = PdfReader(path)
    writer = PdfWriter(clone_from=reader)
    replace_pdf_strings(writer)
    for page in writer.pages:
        contents = page.get_contents()
        if contents is None:
            continue
        corrected, count = replace_author_bytes(contents.get_data())
        if count:
            stream = DecodedStreamObject()
            stream.set_data(corrected)
            page.replace_contents(stream)
    metadata = dict(reader.metadata or {})
    metadata["/Author"] = CANONICAL_AUTHOR
    metadata["/ModDate"] = "D:20260818000000+00'00'"
    writer.add_metadata(metadata)
    handle = tempfile.NamedTemporaryFile(dir=path.parent, suffix=".pdf", delete=False)
    handle.close()
    staged = Path(handle.name)
    writer.write(staged)
    return staged


def interpolate_patch(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    pixels = image.load()
    top = max(0, y0 - 2)
    bottom = min(image.height - 1, y1 + 2)
    span = max(1, y1 - y0)
    for x in range(x0, x1):
        top_color = pixels[x, top]
        bottom_color = pixels[x, bottom]
        for y in range(y0, y1):
            ratio = (y - y0) / span
            pixels[x, y] = tuple(round(top_color[channel] * (1 - ratio) + bottom_color[channel] * ratio) for channel in range(3))


def corrected_cover(page: fitz.Page, stem: str) -> Image.Image | None:
    if stem not in CLASSIC_COVERS and stem not in STRIP_COVERS:
        return None
    scale = 4
    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    draw = ImageDraw.Draw(image)
    if stem in CLASSIC_COVERS:
        interpolate_patch(image, tuple(value * scale for value in (112, 603, 338, 630)))
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 7 * scale)
        draw.text((page.rect.width * scale / 2, 618 * scale), CANONICAL_AUTHOR_UPPER, font=font, fill="#F8F3E8", anchor="mm")
    else:
        sample = image.getpixel((365 * scale, 665 * scale))
        draw.rectangle(tuple(value * scale for value in (43, 655, 407, 679)), fill=sample)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 5.2 * scale)
        draw.text((51 * scale, 667 * scale), STRIP_COVERS[stem], font=font, fill="#302716", anchor="lm")
    return image


def save_image_page(image: Image.Image, page_rect: fitz.Rect, remainder: fitz.Document, output: Path, metadata: dict[str, str]) -> None:
    payload = io.BytesIO()
    image.save(payload, format="JPEG", quality=94, optimize=True, progressive=True)
    document = fitz.open()
    page = document.new_page(width=page_rect.width, height=page_rect.height)
    page.insert_image(page.rect, stream=payload.getvalue())
    page.insert_text((6, page.rect.height - 6), CANONICAL_AUTHOR, fontsize=1, render_mode=3)
    if remainder.page_count > 1:
        document.insert_pdf(remainder, from_page=1)
    metadata = {key: value for key, value in metadata.items() if value}
    metadata["author"] = CANONICAL_AUTHOR
    document.set_metadata(metadata)
    document.save(output, garbage=4, deflate=True, clean=True)
    document.close()


def finalize_pdf(path: Path) -> None:
    staged = rewrite_pdf_streams(path)
    try:
        document = fitz.open(staged)
        cover = corrected_cover(document[0], path.stem)
        handle = tempfile.NamedTemporaryFile(dir=path.parent, suffix=".pdf", delete=False)
        handle.close()
        final = Path(handle.name)
        if cover is None:
            document.set_metadata({**document.metadata, "author": CANONICAL_AUTHOR})
            document.save(final, garbage=4, deflate=True, clean=True)
        else:
            save_image_page(cover, document[0].rect, document, final, document.metadata)
        document.close()
        os.replace(final, path)
    finally:
        staged.unlink(missing_ok=True)


def finalize_epub(path: Path) -> None:
    with zipfile.ZipFile(path) as source:
        members = [(info, source.read(info.filename)) for info in source.infolist()]
    handle = tempfile.NamedTemporaryFile(dir=path.parent, suffix=".epub", delete=False)
    handle.close()
    output = Path(handle.name)
    with zipfile.ZipFile(output, "w") as target:
        for index, (info, data) in enumerate(members):
            if info.filename.lower().endswith(TEXT_SUFFIXES):
                data = replace_author_text(data.decode("utf-8")).encode("utf-8")
                if info.filename.lower().endswith(".opf"):
                    data = re.sub(
                        rb'(<meta\s+property=["\']dcterms:modified["\']>)[^<]+(</meta>)',
                        rb"\g<1>" + MODIFIED.encode() + rb"\g<2>",
                        data,
                    )
            compression = zipfile.ZIP_STORED if index == 0 and info.filename == "mimetype" else zipfile.ZIP_DEFLATED
            target.writestr(info, data, compress_type=compression, compresslevel=9)
    with zipfile.ZipFile(output) as checked:
        first = checked.infolist()[0]
        if first.filename != "mimetype" or first.compress_type != zipfile.ZIP_STORED or checked.testzip() is not None:
            raise FinalizeError(f"{path.name}: invalid EPUB after update")
    os.replace(output, path)


def make_journal_cover(art_path: Path, output: Path) -> Image.Image:
    art = Image.open(art_path).convert("RGB")
    image = ImageOps.fit(art, (1440, 810), method=Image.Resampling.LANCZOS)
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((66, 62, 790, 424), radius=24, fill=(248, 243, 229, 238), outline=(176, 141, 46, 220), width=3)
    image = Image.alpha_composite(image.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 64)
    small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    author_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 25)
    draw.text((112, 104), "THE COMPASSION\nLEGACY JOURNAL", font=title_font, fill="#30263A", spacing=2)
    draw.line((112, 292, 430, 292), fill="#B08D2E", width=3)
    draw.text((112, 316), "TWELVE LETTERS", font=small_font, fill="#7A6114")
    draw.text((112, 364), CANONICAL_AUTHOR_UPPER, font=author_font, fill="#4A4453")
    output.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(output, format="JPEG", quality=94, optimize=True, progressive=True)
    return image.convert("RGB")


def make_journal_pdf(source: Path, cover: Image.Image, output: Path) -> None:
    original = fitz.open(source)
    metadata = {**original.metadata, "title": "The Compassion Legacy Journal", "author": CANONICAL_AUTHOR}
    document = fitz.open()
    cover_payload = io.BytesIO()
    cover.save(cover_payload, format="JPEG", quality=94, optimize=True, progressive=True)
    first_page = document.new_page(width=original[0].rect.width, height=original[0].rect.height)
    first_page.insert_image(first_page.rect, stream=cover_payload.getvalue())
    first_page.insert_text((6, first_page.rect.height - 6), CANONICAL_AUTHOR, fontsize=1, render_mode=3)

    scale = 2
    intro_pixmap = original[1].get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    intro = Image.frombytes("RGB", (intro_pixmap.width, intro_pixmap.height), intro_pixmap.samples)
    for box in ((30, 493, 1385, 548), (30, 657, 1385, 686)):
        interpolate_patch(intro, tuple(value * scale for value in box))
    intro_draw = ImageDraw.Draw(intro)
    intro_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13 * scale)
    intro_draw.text(
        (35 * scale, 501 * scale),
        "The paperwork does the legal part. This journal does the part the paperwork cannot do. Many people think only about the generations they can see. Major private",
        font=intro_font,
        fill="#2D2D2D",
    )
    intro_draw.text(
        (35 * scale, 528 * scale),
        "corporations pass trust funds through generations, and you can too.",
        font=intro_font,
        fill="#2D2D2D",
    )
    intro_draw.text(
        (35 * scale, 665 * scale),
        "You do not have to write them in order or all at once. You only have to start with the desire to be responsible and leave the same care behind.",
        font=intro_font,
        fill="#2D2D2D",
    )
    intro_payload = io.BytesIO()
    intro.save(intro_payload, format="JPEG", quality=94, optimize=True, progressive=True)
    intro_page = document.new_page(width=original[1].rect.width, height=original[1].rect.height)
    intro_page.insert_image(intro_page.rect, stream=intro_payload.getvalue())
    if original.page_count > 2:
        document.insert_pdf(original, from_page=2)
    document.set_metadata({key: value for key, value in metadata.items() if value})
    document.save(output, garbage=4, deflate=True, clean=True)
    document.close()
    original.close()


def export_web_covers(pdf_directory: Path, cover_directory: Path) -> None:
    cover_directory.mkdir(parents=True, exist_ok=True)
    for path in sorted(pdf_directory.glob("*.pdf")):
        if path.name.startswith("tmp"):
            continue
        document = fitz.open(path)
        pixmap = document[0].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
        image.thumbnail((1200, 1600), Image.Resampling.LANCZOS)
        handle = tempfile.NamedTemporaryFile(dir=cover_directory, suffix=".jpg", delete=False)
        handle.close()
        staged = Path(handle.name)
        image.save(staged, format="JPEG", quality=90, optimize=True, progressive=True)
        os.replace(staged, cover_directory / f"{path.stem}.jpg")
        document.close()


def sync_epub_cover(path: Path, cover: Path) -> None:
    with zipfile.ZipFile(path) as source:
        members = [(info, source.read(info.filename)) for info in source.infolist()]
        member_map = {info.filename: data for info, data in members}
        container = ET.fromstring(member_map["META-INF/container.xml"])
        rootfile = next(node.attrib["full-path"] for node in container.iter() if node.tag.endswith("rootfile"))
        package = ET.fromstring(member_map[rootfile])
        cover_href = next(
            node.attrib["href"]
            for node in package.iter()
            if node.tag.endswith("item")
            and ("cover-image" in node.attrib.get("properties", "") or "cover" in node.attrib.get("id", "").lower())
            and node.attrib.get("media-type", "").startswith("image/")
        )
        cover_member = (PurePosixPath(rootfile).parent / cover_href).as_posix()
        if cover_member not in member_map:
            raise FinalizeError(f"{path.name}: EPUB cover member is missing")
    handle = tempfile.NamedTemporaryFile(dir=path.parent, suffix=".epub", delete=False)
    handle.close()
    output = Path(handle.name)
    with zipfile.ZipFile(output, "w") as target:
        for index, (info, data) in enumerate(members):
            if info.filename == cover_member:
                data = cover.read_bytes()
            compression = zipfile.ZIP_STORED if index == 0 and info.filename == "mimetype" else zipfile.ZIP_DEFLATED
            target.writestr(info, data, compress_type=compression, compresslevel=9)
    os.replace(output, path)


def sync_epub_covers(epub_directory: Path, cover_directory: Path) -> None:
    for path in sorted(epub_directory.glob("*.epub")):
        cover = cover_directory / f"{path.stem}.jpg"
        if not cover.is_file():
            raise FinalizeError(f"{path.name}: corrected cover is missing")
        sync_epub_cover(path, cover)


def refresh_release_manifests(root: Path) -> None:
    library = root / "assets" / "library"
    catalog_path = library / "catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    checksum_rows: list[str] = []
    for title in catalog["titles"]:
        for format_name in ("pdf", "epub"):
            edition = title.get(format_name)
            if not isinstance(edition, dict):
                continue
            relative = edition["path"].removeprefix("/assets/library/")
            path = library / relative
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            edition["bytes"] = path.stat().st_size
            edition["sha256"] = digest
            checksum_rows.append(f"{digest}  {relative}")
    catalog_path.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    (library / "SHA256SUMS.txt").write_text("\n".join(sorted(checksum_rows)) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".")
    parser.add_argument("--journal-source", required=True)
    parser.add_argument("--journal-art", required=True)
    args = parser.parse_args()
    root = Path(args.root).resolve()
    pdf_directory = root / "assets" / "library" / "pdf"
    epub_directory = root / "assets" / "library" / "epub"
    cover_directory = root / "assets" / "library" / "covers"
    try:
        for path in sorted(epub_directory.glob("*.epub")):
            finalize_epub(path)
        for path in sorted(pdf_directory.glob("*.pdf")):
            finalize_pdf(path)
        journal_cover_path = cover_directory / "The-Compassion-Legacy-Journal.jpg"
        journal_cover = make_journal_cover(Path(args.journal_art), journal_cover_path)
        make_journal_pdf(Path(args.journal_source), journal_cover, pdf_directory / "The-Compassion-Legacy-Journal.pdf")
        export_web_covers(pdf_directory, cover_directory)
        sync_epub_covers(epub_directory, cover_directory)
        refresh_release_manifests(root)
    except (FinalizeError, OSError, ValueError, zipfile.BadZipFile) as error:
        print(f"MARKETPLACE ASSET FINALIZATION FAILED: {error}")
        return 1
    print(f"Finalized {len(list(pdf_directory.glob('*.pdf')))} PDFs, {len(list(epub_directory.glob('*.epub')))} EPUBs, and {len(list(cover_directory.glob('*.jpg')))} covers.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
