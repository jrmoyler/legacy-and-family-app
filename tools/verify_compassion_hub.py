#!/usr/bin/env python3
"""Verify The Compassion Hub branding, author spelling, pricing, and message API."""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
API_URL = "https://zfpjgedcjdhxvdbthikt.supabase.co/functions/v1/compassion-messages"
APP_PATHS = [
    ROOT / "index.html",
    ROOT / "manifest.webmanifest",
    ROOT / "README.md",
    ROOT / "app.js",
    ROOT / "app.css",
    ROOT / "vercel.json",
    ROOT / "icon.svg",
    *sorted((ROOT / "src").glob("*.js")),
    ROOT / "supabase" / "config.toml",
    ROOT / "supabase" / "functions" / "compassion-messages" / "index.ts",
    ROOT / "supabase" / "migrations" / "20260818022152_create_compassion_messages.sql",
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def verify_sources() -> None:
    incorrect = re.compile(r"(?<![A-Za-z])Pam" + r"ela(?![A-Za-z])", re.IGNORECASE)
    retired_byline = re.compile(r"\bPamell?a\s+Foster" + r"-Grear\b", re.IGNORECASE)
    for path in APP_PATHS:
        text = path.read_text(encoding="utf-8")
        require(not incorrect.search(text), f"Incorrect author spelling in {path.relative_to(ROOT)}")
        require(not retired_byline.search(text), f"Retired author byline in {path.relative_to(ROOT)}")

    data = (ROOT / "src" / "data.js").read_text(encoding="utf-8")
    screens = (ROOT / "src" / "screens.js").read_text(encoding="utf-8")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    edge = (ROOT / "supabase" / "functions" / "compassion-messages" / "index.ts").read_text(encoding="utf-8")
    migration = (ROOT / "supabase" / "migrations" / "20260818022152_create_compassion_messages.sql").read_text(encoding="utf-8")

    require("name: 'The Compassion Hub'" in data, "Canonical app name is missing")
    require("author: 'Pamella Grear'" in data, "Canonical author is missing")
    require("socialUrl: 'https://www.instagram.com/acupofcompassion'" in data, "Instagram URL is incorrect")
    require("series: 'A Cup of Compassion'" in data, "Canonical series name is missing")
    require("INDIVIDUAL_EBOOK_PRICE = 7.99" in data, "Individual ebook price is not $7.99")
    require("price: 4.99" not in data, "A stale $4.99 price remains")
    require(data.count("price: INDIVIDUAL_EBOOK_PRICE") == 12, "Expected 12 canonical individual-price uses")
    require("id: 'compassion-legacy-journal'" in data, "Compassion Legacy Journal is missing")
    require("originalPrice: 37" in data and "price: 25" in data, "Journal sale pricing is incorrect")
    require("The-Compassion-Legacy-Journal.pdf" in data, "Journal PDF is not wired to the marketplace")
    require("product.free || owned" in screens, "Paid downloads are not gated behind ownership")
    require("autocomplete=\"cc-number\"" not in screens, "A fake card-entry form remains")
    require("data-purchase" not in screens and "data-purchase" not in app, "A simulated purchase action remains")
    require('class="cart-btn"' not in screens, "A duplicate screen-level cart button remains")
    require("screens.messages" in screens, "Messages page is missing")
    require("data-compassion-form" in screens, "Compassion form is missing")
    require("message-requirements" in screens, "Required-field guidance is missing")
    require("Nothing stored about you" not in screens, "Welcome privacy promise conflicts with public messages")
    require("No account or analytics" in screens, "Qualified welcome privacy text is missing")
    require("loadCompassionMessages" in app, "Message loading behavior is missing")
    require("COMPASSION_API_URL" in app, "Message API wiring is missing")
    require(app.count("signal: timeoutSignal(") == 2, "Browser message requests need timeouts")
    require("rpc/submit_compassion_message" in edge, "Atomic submission RPC is not wired")
    require("countQuery" not in edge, "Non-atomic count-then-insert flow remains")
    require("serviceFetch" in edge and "AbortSignal.timeout" in edge, "Edge requests need timeouts")
    require("pg_advisory_xact_lock" in migration, "Atomic rate-limit lock is missing")
    require("'The Compassion Hub', 'A note from us'" in migration, "Seed messages are not marked as examples")

    json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
    json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))


def verify_live_api() -> None:
    request = urllib.request.Request(API_URL, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=20) as response:
        require(response.status == 200, f"Message API returned HTTP {response.status}")
        payload = json.load(response)
    require(isinstance(payload, dict), "Message API returned a non-object payload")
    messages = payload.get("messages")
    require(isinstance(messages, list) and messages, "Message API returned no approved messages")
    required = {"id", "display_name", "community", "message", "created_at"}
    require(
        all(isinstance(item, dict) and required <= set(item) for item in messages),
        "Message API returned an incomplete record",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Also verify the deployed public message API")
    args = parser.parse_args()

    verify_sources()
    if args.live:
        verify_live_api()
    print("Compassion Hub verification passed" + (" (including live API)" if args.live else ""))


if __name__ == "__main__":
    main()
