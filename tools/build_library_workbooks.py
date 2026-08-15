"""Build the two companion workbook editions shipped with the app library.

The PDF editions are intentionally letter-size and print friendly. The EPUB
editions preserve the same prompts as a reflowable reading-and-reflection
experience. Run from the repository root with:

    python3 tools/build_library_workbooks.py
"""

from __future__ import annotations

import html
import shutil
import textwrap
import uuid
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / "assets" / "library"
EPUB_DIR = LIBRARY / "epub"
PDF_DIR = LIBRARY / "pdf"
BRAND_LOGO = LIBRARY / "brand" / "a-cup-of-compassion-logo.png"
BUILD = ROOT / ".library-build"

PAGE_W, PAGE_H = letter
IVORY = colors.HexColor("#FBF9F3")
INK = colors.HexColor("#26272A")
CHARCOAL = colors.HexColor("#57585C")
PLUM = colors.HexColor("#4A2A63")
GOLD = colors.HexColor("#D89B1F")
DEEP_GOLD = colors.HexColor("#9A6200")
MUTED = colors.HexColor("#756F68")


def register_fonts() -> tuple[str, str, str, str]:
    fonts = {
        "CompassionSerif": "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "CompassionSerifBold": "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "CompassionSans": "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "CompassionSansBold": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    }
    try:
        for name, path in fonts.items():
            if name not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(name, path))
        return "CompassionSerif", "CompassionSerifBold", "CompassionSans", "CompassionSansBold"
    except Exception:
        return "Times-Roman", "Times-Bold", "Helvetica", "Helvetica-Bold"


SERIF, SERIF_BOLD, SANS, SANS_BOLD = register_fonts()


BOOKS = [
    {
        "number": "01",
        "title": "The Benefit of Having Compassion",
        "theme": "Compassion is a practice that can be learned, noticed, and made visible.",
        "concepts": ["Learned care", "Self-compassion", "Presence", "Service"],
        "reflect": [
            "Who first showed you what compassion looked like?",
            "Where does compassion come naturally to you?",
            "Where do you find it harder to offer?",
            "What would it look like to offer yourself the same patience?",
        ],
        "exercise": "Try the forty-second practice: choose one person today, put distractions aside, and give them your full attention before you offer advice.",
        "discuss": [
            "What makes care feel real rather than performative?",
            "How can a family turn compassion into a repeatable habit?",
            "What one act of service can this group make visible this week?",
        ],
    },
    {
        "number": "02",
        "title": "Are You Born in Compassion or Nurtured in It?",
        "theme": "Compassion may begin as a capacity, but it becomes character through choice and practice.",
        "concepts": ["Nature and nurture", "Choice", "Modeling", "Daily practice"],
        "reflect": [
            "What messages about caring did you receive as a child?",
            "Whose example has shaped your idea of kindness?",
            "What compassionate response do you want to make more automatic?",
            "How can you model that response for someone younger?",
        ],
        "exercise": "Notice one moment this week when a quick judgment arrives. Pause, ask what you do not yet know, and choose curiosity before conclusion.",
        "discuss": [
            "Can compassion be taught without being forced?",
            "Which environments help compassion grow?",
            "What does a compassionate correction sound like?",
        ],
    },
    {
        "number": "03",
        "title": "Compassion and Legacy",
        "theme": "Legacy is not only what is left behind. It is the care taken to prepare people, stories, and plans.",
        "concepts": ["Intentional planning", "Family stories", "Preparation", "Generational care"],
        "reflect": [
            "What do you want your family to know that no document can say?",
            "What responsibility are you ready to make easier for someone else?",
            "Which item, story, or tradition needs a written explanation?",
            "Who should know where your important papers are kept?",
        ],
        "exercise": "Choose one legacy task: label a photograph, write the story behind an heirloom, or make a list of the people who should be called first.",
        "discuss": [
            "Why do families postpone preparation?",
            "How can planning be an expression of love rather than fear?",
            "What conversation needs a gentler beginning?",
        ],
    },
    {
        "number": "04",
        "title": "Compassion or Confusion?",
        "theme": "Compassion and clear boundaries belong together. Love that lifts does not require self-abandonment.",
        "concepts": ["Clarity", "Boundaries", "Patterns", "Self-respect"],
        "reflect": [
            "Where are you carrying a responsibility that is not yours?",
            "What pattern deserves more attention than a promise?",
            "What do you need to stay present without losing yourself?",
            "What boundary would be both kind and clear?",
        ],
        "exercise": "Write one sentence you can use this week: 'I care about you, and I need this conversation to be respectful.' Practice saying it calmly.",
        "discuss": [
            "How can a boundary be compassionate?",
            "What is the difference between helping and rescuing?",
            "Who can offer wise support when a situation feels unclear?",
        ],
    },
    {
        "number": "05",
        "title": "Compassion and Commitment",
        "theme": "Strong relationships are built through small promises, honest communication, and daily repair.",
        "concepts": ["Reliability", "Repair", "Listening", "Shared practice"],
        "reflect": [
            "What makes you feel seen in a relationship?",
            "Which small promise can you keep more consistently?",
            "How do you want conflict to sound in your home?",
            "What appreciation have you not said out loud?",
        ],
        "exercise": "Make one specific commitment for the next seven days. Keep it small enough to honor and meaningful enough to be felt.",
        "discuss": [
            "What does repair look like after someone is hurt?",
            "How can partners protect one another's reputation?",
            "Which daily rhythm helps connection survive a busy week?",
        ],
    },
    {
        "number": "06",
        "title": "Compassion and Companionship",
        "theme": "Companionship is compassion that stays: showing up, remembering, and making room for one another over time.",
        "concepts": ["Presence", "Friendship", "Belonging", "Showing up"],
        "reflect": [
            "Who has stayed present through an important season of your life?",
            "How do you know when someone needs a check-in?",
            "What ordinary gesture says 'you are not alone' to you?",
            "Who could use that gesture from you this week?",
        ],
        "exercise": "Choose one person and make a specific plan to show up: a call, a meal, a walk, a card, or a visit that is not rushed.",
        "discuss": [
            "What makes companionship different from casual contact?",
            "How can communities make belonging easier?",
            "What kind of friend do you want to become?",
        ],
    },
]

INVENTORY_SECTIONS = [
    ("What you own", "Home, land, vehicles, business interests", [
        "Every property, the county it sits in, and where the deed is kept.",
        "Whose name is actually on each deed and title.",
        "Vehicles, trailers, equipment, and where the titles live.",
        "Any business interest and the operating agreement.",
    ]),
    ("Accounts", "Banking, retirement, investments", [
        "Each institution and the type of account. Do not write account numbers here.",
        "Who is named as beneficiary on each one.",
        "Anything held jointly, and with whom.",
        "Debts as well as assets: mortgages, loans, cards, and liens.",
    ]),
    ("Insurance", "Life, final expense, long-term care", [
        "Each carrier, what it covers, and who holds the paperwork.",
        "The named beneficiary on every policy, confirmed this year.",
        "Any employer policy that ends when the job does.",
        "Who to phone to make a claim and what they will ask for.",
    ]),
    ("Documents, and where they live", "Will, trust, directives, certificates", [
        "Which documents exist and which still need an attorney's attention.",
        "The attorney who prepared them and how to reach that office.",
        "Birth, marriage, military, and citizenship records.",
        "Safe deposit box, home safe, or filing cabinet location and access.",
    ]),
    ("Heirlooms and belongings", "The things with meaning and no price", [
        "The ring, quilt, tools, Bible, photographs, and other meaningful items.",
        "For each one: the item, the person, and why it matters.",
        "Anything two people both expect to receive.",
        "Photographs, and who has the originals, negatives, or files.",
    ]),
    ("Memories and wishes", "The part no document holds", [
        "Recipes, stories, faith, traditions, and lessons worth carrying forward.",
        "A letter to each person who will need one.",
        "The occasions and rituals you want your family to remember.",
        "The values that should guide choices when you are not in the room.",
    ]),
    ("The people", "Who carries this out", [
        "Executor, trustee, and guardian - named, asked, and willing.",
        "The attorney, accountant, and financial adviser.",
        "Who gets called first, and who calls everybody else.",
        "One person who knows this worksheet exists and where to find it.",
    ]),
]


def draw_wrapped(c: canvas.Canvas, text: str, x: float, y: float, width: float, *, font: str, size: float, leading: float, color=INK, max_lines: int | None = None) -> float:
    c.setFont(font, size)
    c.setFillColor(color)
    words = text.split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if c.stringWidth(candidate, font, size) <= width or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    if max_lines is not None:
        lines = lines[:max_lines]
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_lines(c: canvas.Canvas, x: float, y: float, width: float, count: int, gap: float = 21) -> float:
    c.setStrokeColor(colors.HexColor("#D8D1C7"))
    c.setLineWidth(0.6)
    for _ in range(count):
        c.line(x, y, x + width, y)
        y -= gap
    return y


def draw_footer(c: canvas.Canvas, page: int, title: str) -> None:
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.55)
    c.line(0.62 * inch, 0.48 * inch, PAGE_W - 0.62 * inch, 0.48 * inch)
    c.setFont(SANS_BOLD, 7.5)
    c.setFillColor(CHARCOAL)
    c.drawString(0.62 * inch, 0.29 * inch, "A CUP OF COMPASSION")
    c.setFont(SANS, 7.2)
    c.drawCentredString(PAGE_W / 2, 0.29 * inch, title.upper())
    c.drawRightString(PAGE_W - 0.62 * inch, 0.29 * inch, str(page))


def draw_header(c: canvas.Canvas, number: str, title: str, subtitle: str) -> float:
    c.setFillColor(PLUM)
    c.rect(0, PAGE_H - 1.05 * inch, PAGE_W, 1.05 * inch, stroke=0, fill=1)
    c.setFillColor(GOLD)
    c.circle(0.78 * inch, PAGE_H - 0.52 * inch, 0.24 * inch, stroke=0, fill=1)
    c.setFillColor(PLUM)
    c.setFont(SANS_BOLD, 10)
    c.drawCentredString(0.78 * inch, PAGE_H - 0.56 * inch, number)
    c.setFillColor(colors.white)
    c.setFont(SANS_BOLD, 10.5)
    c.drawString(1.18 * inch, PAGE_H - 0.40 * inch, title.upper())
    c.setFont(SANS, 8.2)
    c.drawString(1.18 * inch, PAGE_H - 0.62 * inch, subtitle)
    return PAGE_H - 1.42 * inch


def draw_cover(c: canvas.Canvas, title: str, subtitle: str, label: str) -> None:
    c.setFillColor(PLUM)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(GOLD)
    c.circle(PAGE_W - 0.4 * inch, PAGE_H - 0.5 * inch, 1.45 * inch, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#F7E7B6"))
    c.circle(0.4 * inch, 1.0 * inch, 1.1 * inch, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.roundRect(0.67 * inch, 4.25 * inch, PAGE_W - 1.34 * inch, 1.42 * inch, 9, stroke=0, fill=1)
    if BRAND_LOGO.exists():
        c.drawImage(str(BRAND_LOGO), 1.63 * inch, 4.48 * inch, width=5.24 * inch, height=0.95 * inch, preserveAspectRatio=True, mask="auto")
    c.setFillColor(GOLD)
    c.setFont(SANS_BOLD, 9)
    c.drawCentredString(PAGE_W / 2, 6.55 * inch, label.upper())
    c.setFillColor(colors.white)
    c.setFont(SERIF_BOLD, 28)
    y = 6.06 * inch
    for line in textwrap.wrap(title, width=20):
        c.drawCentredString(PAGE_W / 2, y, line)
        y -= 0.39 * inch
    c.setFillColor(colors.HexColor("#F7E7B6"))
    c.setFont(SERIF, 13)
    draw_wrapped(c, subtitle, 1.0 * inch, 3.65 * inch, PAGE_W - 2 * inch, font=SERIF, size=13, leading=17, color=colors.HexColor("#F7E7B6"), max_lines=3)
    c.setFont(SANS_BOLD, 10)
    c.setFillColor(colors.white)
    c.drawCentredString(PAGE_W / 2, 1.14 * inch, "PAMELA FOSTER-GREAR")
    c.setFont(SANS, 8)
    c.drawCentredString(PAGE_W / 2, 0.88 * inch, "AUTHOR | LEGACY ADVOCATE | COMPASSION EDUCATOR")


def companion_pdf(output: Path) -> None:
    c = canvas.Canvas(str(output), pagesize=letter, pageCompression=1)
    c.setTitle("A Cup of Compassion Companion Workbook")
    c.setAuthor("Pamela Foster-Grear")
    c.setSubject("28-page companion workbook for the A Cup of Compassion series")
    draw_cover(c, "The Companion Workbook", "Six books. One place to reflect, practice, discuss, and make compassion visible.", "A Cup of Compassion Series")
    c.showPage()

    c.setFillColor(IVORY)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    y = draw_header(c, "01", "Welcome", "How to use this workbook")
    c.setFont(SERIF_BOLD, 23)
    c.setFillColor(INK)
    c.drawString(0.72 * inch, y, "Make room for the work that lasts.")
    y -= 0.42 * inch
    y = draw_wrapped(c, "This workbook is a companion for the six books in A Cup of Compassion. It is designed for a quiet morning, a kitchen-table conversation, a small group, or any moment when you are ready to turn a good insight into a faithful next step.", 0.72 * inch, y, PAGE_W - 1.44 * inch, font=SERIF, size=12.2, leading=18, color=INK)
    y -= 0.16 * inch
    for idx, line in enumerate([
        "Read one book or chapter before you begin.",
        "Answer honestly. This is a place for clarity, not performance.",
        "Choose one action you can carry into the week.",
        "Return to the notes that still feel unfinished.",
    ], 1):
        c.setFillColor(GOLD)
        c.circle(0.91 * inch, y + 3, 10, stroke=0, fill=1)
        c.setFillColor(PLUM)
        c.setFont(SANS_BOLD, 8)
        c.drawCentredString(0.91 * inch, y, str(idx))
        y = draw_wrapped(c, line, 1.17 * inch, y + 4, PAGE_W - 1.92 * inch, font=SANS, size=11, leading=15, color=INK) - 0.12 * inch
    c.setFillColor(colors.HexColor("#F2E9D9"))
    c.roundRect(0.72 * inch, 1.2 * inch, PAGE_W - 1.44 * inch, 1.2 * inch, 8, stroke=0, fill=1)
    c.setFillColor(DEEP_GOLD)
    c.setFont(SANS_BOLD, 9)
    c.drawString(0.94 * inch, 2.14 * inch, "A WORD ABOUT PRIVACY")
    draw_wrapped(c, "Write only what you are comfortable keeping in this workbook. The Legacy Inventory is a planning guide, not a place for account numbers, passwords, or private legal documents.", 0.94 * inch, 1.82 * inch, PAGE_W - 1.88 * inch, font=SERIF, size=10.4, leading=14.5, color=INK)
    draw_footer(c, 2, "Companion Workbook")
    c.showPage()

    page = 3
    for book in BOOKS:
        c.setFillColor(colors.white)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        y = draw_header(c, book["number"], book["title"], "Overview and key concepts")
        c.setFillColor(INK)
        c.setFont(SERIF_BOLD, 20)
        c.drawString(0.72 * inch, y, "The central idea")
        y -= 0.34 * inch
        y = draw_wrapped(c, book["theme"], 0.72 * inch, y, PAGE_W - 1.44 * inch, font=SERIF, size=13, leading=18, color=INK) - 0.15 * inch
        c.setFillColor(DEEP_GOLD)
        c.setFont(SANS_BOLD, 9)
        c.drawString(0.72 * inch, y, "KEY CONCEPTS")
        y -= 0.27 * inch
        for concept in book["concepts"]:
            c.setFillColor(GOLD)
            c.circle(0.86 * inch, y + 3, 3, stroke=0, fill=1)
            y = draw_wrapped(c, concept, 1.02 * inch, y + 6, PAGE_W - 1.8 * inch, font=SANS, size=10.8, leading=14.5, color=INK) - 0.03 * inch
        y -= 0.18 * inch
        c.setFillColor(colors.HexColor("#F5F0E6"))
        c.roundRect(0.72 * inch, y - 1.25 * inch, PAGE_W - 1.44 * inch, 1.1 * inch, 8, stroke=0, fill=1)
        c.setFillColor(DEEP_GOLD)
        c.setFont(SANS_BOLD, 8.5)
        c.drawString(0.91 * inch, y - 0.42 * inch, "OPENING THOUGHT")
        draw_wrapped(c, "What is one sentence from this book that you want to remember when the week gets busy?", 0.91 * inch, y - 0.70 * inch, PAGE_W - 1.84 * inch, font=SERIF, size=10.8, leading=14, color=INK)
        draw_footer(c, page, "Companion Workbook")
        c.showPage()
        page += 1

        c.setFillColor(IVORY)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        y = draw_header(c, book["number"], book["title"], "Reflection")
        c.setFillColor(INK)
        c.setFont(SERIF_BOLD, 20)
        c.drawString(0.72 * inch, y, "Reflect honestly")
        y -= 0.37 * inch
        for idx, prompt in enumerate(book["reflect"], 1):
            c.setFillColor(PLUM)
            c.setFont(SANS_BOLD, 8.5)
            c.drawString(0.72 * inch, y, f"{idx:02d}")
            y = draw_wrapped(c, prompt, 1.12 * inch, y, PAGE_W - 1.84 * inch, font=SERIF_BOLD, size=10.7, leading=14, color=INK)
            y -= 0.07 * inch
            y = draw_lines(c, 1.12 * inch, y, PAGE_W - 1.84 * inch, 2, 15) - 0.12 * inch
        draw_footer(c, page, "Companion Workbook")
        c.showPage()
        page += 1

        c.setFillColor(colors.white)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        y = draw_header(c, book["number"], book["title"], "Guided exercise")
        c.setFillColor(INK)
        c.setFont(SERIF_BOLD, 20)
        c.drawString(0.72 * inch, y, "Put it into practice")
        y -= 0.34 * inch
        c.setFillColor(colors.HexColor("#F5F0E6"))
        c.roundRect(0.72 * inch, y - 1.3 * inch, PAGE_W - 1.44 * inch, 1.13 * inch, 8, stroke=0, fill=1)
        c.setFillColor(DEEP_GOLD)
        c.setFont(SANS_BOLD, 8.5)
        c.drawString(0.94 * inch, y - 0.43 * inch, "THIS WEEK'S PRACTICE")
        draw_wrapped(c, book["exercise"], 0.94 * inch, y - 0.70 * inch, PAGE_W - 1.88 * inch, font=SERIF, size=10.6, leading=14.2, color=INK)
        y -= 1.75 * inch
        c.setFillColor(DEEP_GOLD)
        c.setFont(SANS_BOLD, 9)
        c.drawString(0.72 * inch, y, "MAKE A SIMPLE PLAN")
        y -= 0.32 * inch
        for label in ["The action I will take:", "The person or place it concerns:", "The day and time I will begin:"]:
            c.setFillColor(INK)
            c.setFont(SANS_BOLD, 9.2)
            c.drawString(0.72 * inch, y, label)
            y = draw_lines(c, 0.72 * inch, y - 0.17 * inch, PAGE_W - 1.44 * inch, 2, 17) - 0.14 * inch
        c.setFillColor(DEEP_GOLD)
        c.setFont(SANS_BOLD, 9)
        c.drawString(0.72 * inch, y, "NOTES FROM THE WEEK")
        draw_lines(c, 0.72 * inch, y - 0.24 * inch, PAGE_W - 1.44 * inch, 4, 17)
        draw_footer(c, page, "Companion Workbook")
        c.showPage()
        page += 1

        c.setFillColor(IVORY)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        y = draw_header(c, book["number"], book["title"], "Discussion and action")
        c.setFillColor(INK)
        c.setFont(SERIF_BOLD, 20)
        c.drawString(0.72 * inch, y, "Talk it through")
        y -= 0.35 * inch
        for idx, question in enumerate(book["discuss"], 1):
            c.setFillColor(PLUM)
            c.setFont(SANS_BOLD, 8.5)
            c.drawString(0.72 * inch, y, f"{idx:02d}")
            y = draw_wrapped(c, question, 1.12 * inch, y, PAGE_W - 1.84 * inch, font=SERIF_BOLD, size=10.7, leading=14, color=INK)
            y -= 0.06 * inch
            y = draw_lines(c, 1.12 * inch, y, PAGE_W - 1.84 * inch, 2, 15) - 0.12 * inch
        c.setFillColor(colors.HexColor("#F5F0E6"))
        c.roundRect(0.72 * inch, 1.14 * inch, PAGE_W - 1.44 * inch, 1.18 * inch, 8, stroke=0, fill=1)
        c.setFillColor(DEEP_GOLD)
        c.setFont(SANS_BOLD, 8.5)
        c.drawString(0.94 * inch, 2.02 * inch, "MY COMMITMENT")
        draw_wrapped(c, "Before our next conversation, I will make compassion visible by...", 0.94 * inch, 1.76 * inch, PAGE_W - 1.88 * inch, font=SERIF, size=10.5, leading=14, color=INK)
        draw_lines(c, 0.94 * inch, 1.41 * inch, PAGE_W - 1.88 * inch, 1, 17)
        draw_footer(c, page, "Companion Workbook")
        c.showPage()
        page += 1

    c.setFillColor(colors.white)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    y = draw_header(c, "07", "Carry it forward", "A family legacy action plan")
    c.setFillColor(INK)
    c.setFont(SERIF_BOLD, 20)
    c.drawString(0.72 * inch, y, "One step that makes the next step easier")
    y -= 0.38 * inch
    y = draw_wrapped(c, "A compassionate legacy is built in ordinary actions: a conversation started, a story recorded, a document located, a person asked for help. Choose one meaningful next step and make it visible.", 0.72 * inch, y, PAGE_W - 1.44 * inch, font=SERIF, size=11.5, leading=16.5, color=INK) - 0.18 * inch
    for label in ["The conversation I will start:", "The item or story I will document:", "The person I will invite into the plan:", "The date I will revisit this work:"]:
        c.setFont(SANS_BOLD, 9.2)
        c.setFillColor(DEEP_GOLD)
        c.drawString(0.72 * inch, y, label)
        y = draw_lines(c, 0.72 * inch, y - 0.2 * inch, PAGE_W - 1.44 * inch, 3, 18) - 0.17 * inch
    draw_footer(c, page, "Companion Workbook")
    c.showPage()
    page += 1

    c.setFillColor(PLUM)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont(SERIF_BOLD, 27)
    c.drawCentredString(PAGE_W / 2, 6.4 * inch, "Keep on giving.")
    c.drawCentredString(PAGE_W / 2, 5.93 * inch, "Keep on being.")
    c.setFillColor(colors.HexColor("#F7E7B6"))
    c.setFont(SERIF, 13)
    draw_wrapped(c, "Return to these pages whenever compassion needs a clearer shape: in your home, your relationships, your community, and the legacy you are building.", 1.1 * inch, 5.15 * inch, PAGE_W - 2.2 * inch, font=SERIF, size=13, leading=18, color=colors.HexColor("#F7E7B6"), max_lines=4)
    if BRAND_LOGO.exists():
        c.setFillColor(colors.white)
        c.roundRect(1.7 * inch, 2.37 * inch, 5.1 * inch, 1.37 * inch, 9, stroke=0, fill=1)
        c.drawImage(str(BRAND_LOGO), 2.0 * inch, 2.59 * inch, width=4.5 * inch, height=0.93 * inch, preserveAspectRatio=True, mask="auto")
    c.setFillColor(colors.white)
    c.setFont(SANS, 8.5)
    c.drawCentredString(PAGE_W / 2, 1.35 * inch, "www.acupofcompassion.com")
    c.setFont(SANS_BOLD, 8.5)
    c.drawCentredString(PAGE_W / 2, 1.06 * inch, "PAM GREAR PUBLISHING LLC")
    c.save()


def inventory_pdf(output: Path) -> None:
    c = canvas.Canvas(str(output), pagesize=letter, pageCompression=1)
    c.setTitle("The Legacy Inventory Workbook")
    c.setAuthor("Pamela Foster-Grear")
    c.setSubject("A private family preparation workbook")
    draw_cover(c, "The Legacy Inventory", "A private, practical guide to gathering what your family will need to know.", "A Cup of Compassion")
    c.showPage()
    c.setFillColor(IVORY)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    y = draw_header(c, "01", "Start here", "Private preparation, on your own paper")
    c.setFillColor(INK)
    c.setFont(SERIF_BOLD, 21)
    c.drawString(0.72 * inch, y, "A plan is an act of care.")
    y -= 0.4 * inch
    y = draw_wrapped(c, "This workbook helps you gather the information, stories, and people that will make a difficult time less confusing for those you love. It does not replace advice from a licensed attorney, accountant, or financial professional.", 0.72 * inch, y, PAGE_W - 1.44 * inch, font=SERIF, size=12, leading=17, color=INK)
    y -= 0.22 * inch
    c.setFillColor(colors.HexColor("#F2E9D9"))
    c.roundRect(0.72 * inch, y - 1.37 * inch, PAGE_W - 1.44 * inch, 1.2 * inch, 8, stroke=0, fill=1)
    c.setFillColor(DEEP_GOLD)
    c.setFont(SANS_BOLD, 9)
    c.drawString(0.95 * inch, y - 0.43 * inch, "PROTECT YOUR PRIVACY")
    draw_wrapped(c, "Use this as a map, not a vault. Do not put account numbers, passwords, Social Security numbers, or copies of legal documents on these pages. Record where to find them, and keep sensitive material secure.", 0.95 * inch, y - 0.70 * inch, PAGE_W - 1.9 * inch, font=SERIF, size=10.4, leading=14.3, color=INK)
    y -= 1.85 * inch
    for idx, (title, subtitle, _) in enumerate(INVENTORY_SECTIONS, 1):
        c.setFillColor(GOLD)
        c.circle(0.87 * inch, y + 2, 9, stroke=0, fill=1)
        c.setFillColor(PLUM)
        c.setFont(SANS_BOLD, 7.6)
        c.drawCentredString(0.87 * inch, y - 1, str(idx))
        c.setFillColor(INK)
        c.setFont(SANS_BOLD, 10)
        c.drawString(1.10 * inch, y, title)
        c.setFont(SANS, 8.5)
        c.setFillColor(MUTED)
        c.drawString(1.10 * inch, y - 0.16 * inch, subtitle)
        y -= 0.46 * inch
    draw_footer(c, 2, "Legacy Inventory")
    c.showPage()

    for page, (title, subtitle, prompts) in enumerate(INVENTORY_SECTIONS, 3):
        c.setFillColor(colors.white)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        y = draw_header(c, f"{page - 2:02d}", title, subtitle)
        c.setFillColor(INK)
        c.setFont(SERIF_BOLD, 19)
        c.drawString(0.72 * inch, y, "Gather what matters")
        y -= 0.35 * inch
        for idx, prompt in enumerate(prompts, 1):
            c.setFillColor(PLUM)
            c.setFont(SANS_BOLD, 8.5)
            c.drawString(0.72 * inch, y, f"{idx:02d}")
            y = draw_wrapped(c, prompt, 1.12 * inch, y, PAGE_W - 1.84 * inch, font=SERIF_BOLD, size=10.6, leading=14, color=INK)
            y -= 0.07 * inch
            y = draw_lines(c, 1.12 * inch, y, PAGE_W - 1.84 * inch, 3, 16) - 0.12 * inch
        c.setFillColor(colors.HexColor("#F5F0E6"))
        c.roundRect(0.72 * inch, 1.1 * inch, PAGE_W - 1.44 * inch, 1.12 * inch, 8, stroke=0, fill=1)
        c.setFillColor(DEEP_GOLD)
        c.setFont(SANS_BOLD, 8.5)
        c.drawString(0.94 * inch, 1.92 * inch, "NEXT SMALL STEP")
        draw_wrapped(c, "The one thing I will gather, ask, label, or share before I turn this page:", 0.94 * inch, 1.65 * inch, PAGE_W - 1.88 * inch, font=SERIF, size=10.4, leading=14, color=INK)
        draw_lines(c, 0.94 * inch, 1.32 * inch, PAGE_W - 1.88 * inch, 1, 16)
        draw_footer(c, page, "Legacy Inventory")
        c.showPage()

    c.setFillColor(PLUM)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont(SERIF_BOLD, 25)
    c.drawCentredString(PAGE_W / 2, 6.25 * inch, "You do not have to finish today.")
    c.setFillColor(colors.HexColor("#F7E7B6"))
    c.setFont(SERIF, 13)
    draw_wrapped(c, "Start with one list, one conversation, one location, or one story. Preparation does not have to be perfect to be generous.", 1.0 * inch, 5.45 * inch, PAGE_W - 2 * inch, font=SERIF, size=13, leading=18, color=colors.HexColor("#F7E7B6"), max_lines=3)
    if BRAND_LOGO.exists():
        c.setFillColor(colors.white)
        c.roundRect(1.7 * inch, 2.4 * inch, 5.1 * inch, 1.37 * inch, 9, stroke=0, fill=1)
        c.drawImage(str(BRAND_LOGO), 2.0 * inch, 2.62 * inch, width=4.5 * inch, height=0.93 * inch, preserveAspectRatio=True, mask="auto")
    c.setFillColor(colors.white)
    c.setFont(SANS, 8.5)
    c.drawCentredString(PAGE_W / 2, 1.3 * inch, "Education and preparation only - not legal, tax, or financial advice.")
    c.save()


def cover_image(path: Path, title: str, subtitle: str, label: str) -> None:
    width, height = 1600, 2560
    image = Image.new("RGB", (width, height), "#4A2A63")
    draw = ImageDraw.Draw(image)
    draw.ellipse((width - 440, -160, width + 380, 660), fill="#D89B1F")
    draw.ellipse((-300, height - 560, 370, height + 110), fill="#F7E7B6")
    sans_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42)
    serif_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 86)
    serif = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 42)
    draw.text((100, 280), label.upper(), fill="#D89B1F", font=sans_bold)
    y = 430
    for line in textwrap.wrap(title, width=18):
        box = draw.textbbox((0, 0), line, font=serif_bold)
        draw.text(((width - (box[2] - box[0])) / 2, y), line, fill="#FFFFFF", font=serif_bold)
        y += 112
    y += 45
    for line in textwrap.wrap(subtitle, width=38):
        box = draw.textbbox((0, 0), line, font=serif)
        draw.text(((width - (box[2] - box[0])) / 2, y), line, fill="#F7E7B6", font=serif)
        y += 61
    if BRAND_LOGO.exists():
        logo = Image.open(BRAND_LOGO).convert("RGBA")
        logo.thumbnail((900, 330))
        panel = Image.new("RGBA", (1020, 390), "#FFFFFF")
        panel.alpha_composite(logo, ((1020 - logo.width) // 2, (390 - logo.height) // 2))
        image.paste(panel.convert("RGB"), ((width - 1020) // 2, 1700))
    author_box = draw.textbbox((0, 0), "PAMELA FOSTER-GREAR", font=sans_bold)
    draw.text(((width - (author_box[2] - author_box[0])) / 2, 2240), "PAMELA FOSTER-GREAR", fill="#FFFFFF", font=sans_bold)
    image.save(path, quality=92)


def xhtml_document(title: str, body: str) -> str:
    return f'''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><title>{html.escape(title)}</title><link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body>{body}</body></html>'''


def write_epub(output: Path, title: str, subtitle: str, chapters: list[tuple[str, str]], cover: Path) -> None:
    workspace = BUILD / output.stem
    if workspace.exists():
        shutil.rmtree(workspace)
    epub = workspace / "EPUB"
    (workspace / "META-INF").mkdir(parents=True)
    (epub / "text").mkdir(parents=True)
    (epub / "images").mkdir(parents=True)
    (epub / "styles").mkdir(parents=True)
    (workspace / "mimetype").write_text("application/epub+zip", encoding="utf-8")
    (workspace / "META-INF" / "container.xml").write_text('''<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>''', encoding="utf-8")
    shutil.copy2(cover, epub / "images" / "cover.jpg")
    if BRAND_LOGO.exists():
        shutil.copy2(BRAND_LOGO, epub / "images" / "logo.png")
    styles = '''body { font-family: serif; color: #26272A; line-height: 1.55; margin: 6%; }
h1 { color: #4A2A63; font-size: 1.7em; line-height: 1.15; margin-top: 1.2em; }
h2 { color: #9A6200; font-family: sans-serif; font-size: 1.05em; letter-spacing: .06em; text-transform: uppercase; margin-top: 1.7em; }
h3 { color: #4A2A63; font-family: sans-serif; font-size: 1em; margin-top: 1.35em; }
.cover { margin: 0; text-align: center; } .cover img { max-width: 100%; height: auto; }
.brand { text-align: center; } .brand img { width: 68%; height: auto; }
.kicker { color: #9A6200; font-family: sans-serif; font-size: .8em; letter-spacing: .08em; text-transform: uppercase; }
.callout { background: #FBF9F3; border-left: .3em solid #D89B1F; padding: 1em; margin: 1.2em 0; }
.prompt { border-bottom: 1px solid #D8D1C7; min-height: 4em; margin: .55em 0 1em; }
li { margin-bottom: .5em; } hr { border: 0; border-top: 1px solid #D89B1F; margin: 2em 0; }'''
    (epub / "styles" / "styles.css").write_text(styles, encoding="utf-8")
    cover_xhtml = xhtml_document(title, '<section class="cover" epub:type="cover" xmlns:epub="http://www.idpf.org/2007/ops"><img src="images/cover.jpg" alt="Cover"/></section>')
    (epub / "cover.xhtml").write_text(cover_xhtml, encoding="utf-8")
    chapter_ids: list[str] = []
    nav_rows: list[str] = []
    for index, (heading, body) in enumerate(chapters, 1):
        filename = f"chapter-{index:02d}.xhtml"
        chapter_ids.append(f"<item id=\"chapter-{index}\" href=\"text/{filename}\" media-type=\"application/xhtml+xml\"/>")
        nav_rows.append(f"<li><a href=\"text/{filename}\">{html.escape(heading)}</a></li>")
        (epub / "text" / filename).write_text(xhtml_document(heading, body), encoding="utf-8")
    nav = f'''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Contents</title></head>
<body><nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc" id="toc"><h1>Contents</h1><ol>{''.join(nav_rows)}</ol></nav></body></html>'''
    (epub / "nav.xhtml").write_text(nav, encoding="utf-8")
    identifier = f"urn:uuid:{uuid.uuid5(uuid.NAMESPACE_URL, title)}"
    logo_item = '<item id="logo" href="images/logo.png" media-type="image/png"/>' if BRAND_LOGO.exists() else ""
    metadata = f'''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0" xml:lang="en">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:identifier id="bookid">{identifier}</dc:identifier><dc:title>{html.escape(title)}</dc:title>
  <dc:creator>Pamela Foster-Grear</dc:creator><dc:language>en</dc:language><dc:publisher>Pam Grear Publishing LLC</dc:publisher>
  <dc:description>{html.escape(subtitle)}</dc:description><meta property="dcterms:modified">2026-08-14T00:00:00Z</meta>
</metadata><manifest>
  <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml" properties="svg"/>
  <item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>
  {logo_item}<item id="styles" href="styles/styles.css" media-type="text/css"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  {''.join(chapter_ids)}
</manifest><spine><itemref idref="cover"/>{''.join(f'<itemref idref="chapter-{n}"/>' for n in range(1, len(chapters) + 1))}</spine></package>'''
    (epub / "content.opf").write_text(metadata, encoding="utf-8")
    with zipfile.ZipFile(output, "w") as archive:
        archive.write(workspace / "mimetype", "mimetype", compress_type=zipfile.ZIP_STORED)
        for path in sorted(workspace.rglob("*")):
            if path.is_file() and path.name != "mimetype":
                archive.write(path, path.relative_to(workspace).as_posix(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


def companion_chapters() -> list[tuple[str, str]]:
    intro = '''<p class="brand"><img src="../images/logo.png" alt="A Cup of Compassion"/></p>
<p class="kicker">Welcome</p><h1>Make room for the work that lasts.</h1>
<p>This workbook accompanies the six books in A Cup of Compassion. Use it for a quiet morning, a kitchen-table conversation, or a small group. Read a book or chapter first, answer honestly, choose one small action, and return to the pages that still feel unfinished.</p>
<div class="callout"><strong>A word about privacy.</strong><br/>Write only what you are comfortable keeping here. The Legacy Inventory is a planning guide, not a place for account numbers, passwords, or private legal documents.</div>'''
    chapters = [("Welcome", intro)]
    for book in BOOKS:
        concepts = ''.join(f'<li>{html.escape(item)}</li>' for item in book["concepts"])
        reflection = ''.join(f'<h3>{index:02d}. {html.escape(prompt)}</h3><div class="prompt"></div>' for index, prompt in enumerate(book["reflect"], 1))
        questions = ''.join(f'<li>{html.escape(item)}</li>' for item in book["discuss"])
        body = f'''<p class="kicker">Book {book["number"]}</p><h1>{html.escape(book["title"])}</h1>
<h2>The central idea</h2><p>{html.escape(book["theme"])}</p><h2>Key concepts</h2><ul>{concepts}</ul>
<h2>Reflect honestly</h2>{reflection}
<h2>This week's practice</h2><div class="callout">{html.escape(book["exercise"])}</div>
<h2>Discussion</h2><ol>{questions}</ol><h2>My commitment</h2><p>Before our next conversation, I will make compassion visible by...</p><div class="prompt"></div>'''
        chapters.append((book["title"], body))
    chapters.append(("Carry it forward", '''<p class="kicker">A family legacy action plan</p><h1>One step that makes the next step easier.</h1>
<p>A compassionate legacy is built in ordinary actions: a conversation started, a story recorded, a document located, and a person asked for help. Choose one meaningful next step and make it visible.</p>
<h2>The conversation I will start</h2><div class="prompt"></div><h2>The item or story I will document</h2><div class="prompt"></div><h2>The person I will invite into the plan</h2><div class="prompt"></div><h2>The date I will revisit this work</h2><div class="prompt"></div>
<hr/><p><strong>Keep on giving. Keep on being.</strong></p>'''))
    return chapters


def inventory_chapters() -> list[tuple[str, str]]:
    intro = '''<p class="brand"><img src="../images/logo.png" alt="A Cup of Compassion"/></p>
<p class="kicker">Start here</p><h1>A plan is an act of care.</h1>
<p>This workbook helps you gather the information, stories, and people that will make a difficult time less confusing for those you love. It does not replace advice from a licensed attorney, accountant, or financial professional.</p>
<div class="callout"><strong>Protect your privacy.</strong><br/>Use this as a map, not a vault. Do not put account numbers, passwords, Social Security numbers, or copies of legal documents on these pages. Record where to find them, and keep sensitive material secure.</div>'''
    chapters = [("Start here", intro)]
    for title, subtitle, prompts in INVENTORY_SECTIONS:
        prompt_html = ''.join(f'<li>{html.escape(prompt)}</li>' for prompt in prompts)
        body = f'''<p class="kicker">Legacy Inventory</p><h1>{html.escape(title)}</h1><p>{html.escape(subtitle)}</p>
<h2>Gather what matters</h2><ol>{prompt_html}</ol><h2>Notes</h2><div class="prompt"></div><div class="prompt"></div><h2>Next small step</h2><p>The one thing I will gather, ask, label, or share next:</p><div class="prompt"></div>'''
        chapters.append((title, body))
    chapters.append(("Finish gently", '''<h1>You do not have to finish today.</h1><p>Start with one list, one conversation, one location, or one story. Preparation does not have to be perfect to be generous.</p><hr/><p>Education and preparation only - not legal, tax, or financial advice.</p>'''))
    return chapters


def main() -> None:
    EPUB_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    BUILD.mkdir(parents=True, exist_ok=True)
    companion_pdf(PDF_DIR / "A-Cup-of-Compassion-Companion-Workbook.pdf")
    inventory_pdf(PDF_DIR / "A-Cup-of-Compassion-Legacy-Inventory-Workbook.pdf")
    companion_cover = BUILD / "companion-cover.jpg"
    inventory_cover = BUILD / "inventory-cover.jpg"
    cover_image(companion_cover, "The Companion Workbook", "Reflect, practice, discuss, and make compassion visible.", "A Cup of Compassion Series")
    cover_image(inventory_cover, "The Legacy Inventory", "A private, practical guide to gathering what your family will need to know.", "A Cup of Compassion")
    write_epub(EPUB_DIR / "A-Cup-of-Compassion-Companion-Workbook.epub", "The Companion Workbook", "A reflection and action companion for the A Cup of Compassion series.", companion_chapters(), companion_cover)
    write_epub(EPUB_DIR / "A-Cup-of-Compassion-Legacy-Inventory-Workbook.epub", "The Legacy Inventory Workbook", "A private, practical guide to gathering what your family will need to know.", inventory_chapters(), inventory_cover)


if __name__ == "__main__":
    main()
