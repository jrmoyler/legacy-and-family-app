#!/usr/bin/env python3
"""Build the illustrated resource covers used by Compassion Hub.

The ebook cover extractor remains the source of truth for the six books and
their embedded workbook covers. This companion builder turns the commissioned
illustration layers in ``assets/library/covers/product-art`` into the branded
1600 x 2560 covers used by products and the home page, plus 640 x 1024 grid
thumbnails. It also records exact sizes and SHA-256 hashes in catalog.json.

Run from the repository root:

    python3 tools/build_product_covers.py --root .
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps


WIDTH = 1600
HEIGHT = 2560
THUMB_WIDTH = 640
THUMB_HEIGHT = 1024
IVORY = (248, 242, 230)
PLUM = (42, 23, 57)
GOLD = (216, 155, 20)
CHARCOAL = (41, 37, 34)
SERIF_BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf")
SERIF = Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf")
SANS_BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
SANS = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")


COVERS = [
    {
        "id": "workbook",
        "slug": "A-Cup-of-Compassion-Companion-Workbook-Illustrated",
        "title": ["The Companion", "Workbook"],
        "kind": "A CUP OF COMPASSION WORKBOOK",
        "subtitle": "Reflect, practice, discuss, and make compassion visible.",
    },
    {
        "id": "inventory-worksheet",
        "slug": "A-Cup-of-Compassion-Legacy-Inventory-Workbook-Illustrated",
        "title": ["The Legacy Inventory", "Workbook"],
        "kind": "A CUP OF COMPASSION WORKBOOK",
        "subtitle": "A practical guide to gathering what your family will need to know.",
    },
    {
        "id": "compassion-card",
        "slug": "A-Cup-of-Compassion-40-Second-Compassion-Card",
        "title": ["The 40-Second", "Compassion Card"],
        "kind": "FREE COMPASSION RESOURCE",
        "subtitle": "Four simple ways to make attention feel like care.",
    },
    {
        "id": "church-license",
        "slug": "A-Cup-of-Compassion-Church-Small-Group-Licence",
        "title": ["Church & Small-Group", "Licence"],
        "kind": "GROUP STUDY COLLECTION",
        "subtitle": "One study. One language. Everybody on the same page.",
    },
    {
        "id": "conversation-kit",
        "slug": "A-Cup-of-Compassion-Family-Legacy-Conversation-Kit",
        "title": ["The Family Legacy", "Conversation Kit"],
        "kind": "FAMILY LEGACY TOOLKIT",
        "subtitle": "Scripts and checklists for the conversations that matter.",
    },
    {
        "id": "devotional",
        "slug": "A-Cup-of-Compassion-30-Day-Devotional",
        "title": ["The 30-Day", "Compassion Devotional"],
        "kind": "DAILY COMPASSION PRACTICE",
        "subtitle": "Thirty days of scripture, reflection, and action.",
    },
    {
        "id": "caregiving",
        "slug": "A-Cup-of-Compassion-Caregiving-Burnout-Boundaries",
        "title": ["Compassion in Caregiving:", "Burnout & Boundaries"],
        "kind": "CAREGIVER COMPANION GUIDE",
        "subtitle": "Care for the caregiver. Protect the love.",
    },
    {
        "id": "leaders-kit",
        "slug": "A-Cup-of-Compassion-Church-Small-Group-Leaders-Kit",
        "title": ["Church & Small-Group", "Leader's Kit"],
        "kind": "SIX-SESSION LEADER RESOURCE",
        "subtitle": "Everything needed to guide compassionate community.",
        "focus_y": 0.36,
    },
    {
        "id": "youth",
        "slug": "A-Cup-of-Compassion-Youth-School-Edition",
        "title": ["Youth & School", "Edition"],
        "kind": "CLASSROOM-READY EDITION",
        "subtitle": "Compassion for the next generation, at school and at home.",
    },
    {
        "id": "training-deck",
        "slug": "A-Cup-of-Compassion-Caregiver-Team-Training-Deck",
        "title": ["Caregiver Team", "Training Deck"],
        "kind": "PROFESSIONAL TRAINING RESOURCE",
        "subtitle": "Compassion as a measurable clinical practice.",
    },
    {
        "id": "home",
        "slug": "A-Cup-of-Compassion-Home",
        "title": ["A Cup of Compassion"],
        "kind": "THE SERIES & LEGACY HUB",
        "subtitle": "Build it. Document it. Pass it on.",
        "home": True,
    },
]


def digest_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    if not path.is_file():
        raise SystemExit(f"Required font is missing: {path}")
    return ImageFont.truetype(str(path), size)


def crop_logo(logo: Image.Image) -> Image.Image:
    rgb = logo.convert("RGB")
    white = Image.new("RGB", rgb.size, "white")
    difference = ImageChops.difference(rgb, white).convert("L")
    difference = difference.point(lambda value: 255 if value > 10 else 0)
    bounds = difference.getbbox()
    return rgb.crop(bounds) if bounds else rgb


def tracked_width(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, spacing: int) -> int:
    widths = [draw.textlength(char, font=face) for char in text]
    return round(sum(widths) + spacing * max(0, len(text) - 1))


def draw_tracked(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    face: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    spacing: int = 5,
) -> int:
    text = text.upper()
    x = (WIDTH - tracked_width(draw, text, face, spacing)) / 2
    for char in text:
        draw.text((x, y), char, font=face, fill=fill, anchor="la")
        x += draw.textlength(char, font=face) + spacing
    return y + round(face.size * 1.35)


def title_font(draw: ImageDraw.ImageDraw, lines: list[str]) -> ImageFont.FreeTypeFont:
    for size in range(106, 59, -2):
        face = font(SERIF_BOLD, size)
        if max(draw.textlength(line, font=face) for line in lines) <= 1320:
            return face
    return font(SERIF_BOLD, 60)


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current: list[str] = []
    for word in text.split():
        candidate = " ".join([*current, word])
        if current and draw.textlength(candidate, font=face) > max_width:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return lines


def gradient_overlay(
    image: Image.Image,
    start_y: int,
    end_y: int,
    color: tuple[int, int, int],
    start_alpha: int,
    end_alpha: int,
) -> None:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    span = max(1, end_y - start_y)
    for y in range(start_y, end_y):
        ratio = (y - start_y) / span
        alpha = round(start_alpha + (end_alpha - start_alpha) * ratio)
        draw.line((0, y, WIDTH, y), fill=(*color, alpha))
    image.alpha_composite(overlay)


def render_cover(source: Path, logo: Image.Image, spec: dict[str, object]) -> Image.Image:
    with Image.open(source) as raw:
        base = ImageOps.fit(
            raw.convert("RGB"),
            (WIDTH, HEIGHT),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, float(spec.get("focus_y", 0.5))),
        ).convert("RGBA")

    gradient_overlay(base, 0, 1150, IVORY, 242, 12)
    gradient_overlay(base, 1640, HEIGHT, PLUM, 0, 246)
    draw = ImageDraw.Draw(base)

    draw.rectangle((0, 0, WIDTH - 1, HEIGHT - 1), outline=GOLD, width=22)
    draw.rounded_rectangle((62, 62, WIDTH - 63, HEIGHT - 63), radius=18, outline=(255, 252, 244, 222), width=3)

    panel = (352, 42, 1248, 342)
    draw.rounded_rectangle(panel, radius=22, fill=(255, 253, 248, 234), outline=GOLD, width=3)
    fitted_logo = ImageOps.contain(logo, (620, 252), method=Image.Resampling.LANCZOS)
    logo_x = (WIDTH - fitted_logo.width) // 2
    logo_y = panel[1] + (panel[3] - panel[1] - fitted_logo.height) // 2
    base.paste(fitted_logo, (logo_x, logo_y))

    y = draw_tracked(draw, str(spec["kind"]), 385, font(SANS_BOLD, 28), (126, 88, 13), 4)
    title_face = title_font(draw, list(spec["title"]))
    title_gap = round(title_face.size * 0.98)
    y += 12
    for line in spec["title"]:
        draw.text((WIDTH / 2, y), str(line), font=title_face, fill=CHARCOAL, anchor="ma", stroke_width=1, stroke_fill=(250, 244, 232))
        y += title_gap

    rule_y = y + 18
    draw.rounded_rectangle((390, rule_y, WIDTH - 390, rule_y + 8), radius=4, fill=GOLD)
    y = rule_y + 34
    subtitle_face = font(SERIF, 34)
    subtitle_lines = wrap(draw, str(spec["subtitle"]), subtitle_face, 1120)
    for line in subtitle_lines[:3]:
        draw.text((WIDTH / 2, y), line, font=subtitle_face, fill=(77, 66, 55), anchor="ma")
        y += 46

    draw_tracked(draw, "PAMELA FOSTER-GREAR", 2102, font(SANS_BOLD, 34), IVORY, 5)
    draw.rounded_rectangle((410, 2205, WIDTH - 410, 2212), radius=4, fill=GOLD)
    draw_tracked(draw, "BUILD IT. DOCUMENT IT. PASS IT ON.", 2252, font(SANS_BOLD, 23), IVORY, 4)
    draw_tracked(draw, "A CUP OF COMPASSION", 2388, font(SANS, 19), (226, 204, 154), 6)

    return base.convert("RGB")


def write_jpeg(image: Image.Image, destination: Path, quality: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "JPEG", quality=quality, optimize=True, progressive=True, subsampling=1)


def build(root: Path) -> list[dict[str, object]]:
    library = root / "assets" / "library"
    art_dir = library / "covers" / "product-art"
    cover_dir = library / "covers" / "products"
    thumb_dir = cover_dir / "thumbs"
    logo_path = library / "brand" / "a-cup-of-compassion-logo.png"
    logo = crop_logo(Image.open(logo_path))
    entries: list[dict[str, object]] = []

    for spec in COVERS:
        slug = str(spec["slug"])
        source = art_dir / f"{slug}.jpg"
        if not source.is_file():
            raise SystemExit(f"Missing illustration source: {source}")
        full = cover_dir / f"{slug}.jpg"
        thumb = thumb_dir / f"{slug}.jpg"
        rendered = render_cover(source, logo, spec)
        write_jpeg(rendered, full, 88)
        write_jpeg(rendered.resize((THUMB_WIDTH, THUMB_HEIGHT), Image.Resampling.LANCZOS), thumb, 82)

        entries.append({
            "id": spec["id"],
            "title": " ".join(spec["title"]),
            "width": WIDTH,
            "height": HEIGHT,
            "source": {
                "path": f"/assets/library/covers/product-art/{source.name}",
                "bytes": source.stat().st_size,
                "sha256": digest_file(source),
            },
            "image": {
                "path": f"/assets/library/covers/products/{full.name}",
                "bytes": full.stat().st_size,
                "sha256": digest_file(full),
            },
            "thumb": {
                "path": f"/assets/library/covers/products/thumbs/{thumb.name}",
                "bytes": thumb.stat().st_size,
                "sha256": digest_file(thumb),
            },
        })
        print(f"{spec['id']}: {WIDTH}x{HEIGHT} ({full.stat().st_size:,} B / {thumb.stat().st_size:,} B)")

    catalog_path = library / "catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    catalog["schemaVersion"] = 2
    catalog["productCovers"] = entries
    catalog_path.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    return entries


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Repository root (default: current directory)")
    args = parser.parse_args()
    entries = build(Path(args.root).resolve())
    print(f"\n{len(entries)} illustrated product covers written and recorded in catalog.json.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
