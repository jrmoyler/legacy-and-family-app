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
    incorrect = re.compile(r"(?<![A-Za-z])Pamela(?![A-Za-z])", re.IGNORECASE)
    for path in APP_PATHS:
        text = path.read_text(encoding="utf-8")
        require(not incorrect.search(text), f"Incorrect author spelling in {path.relative_to(ROOT)}")

    data = (ROOT / "src" / "data.js").read_text(encoding="utf-8")
    screens = (ROOT / "src" / "screens.js").read_text(encoding="utf-8")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    edge = (ROOT / "supabase" / "functions" / "compassion-messages" / "index.ts").read_text(encoding="utf-8")
    migration = (ROOT / "supabase" / "migrations" / "20260818022152_create_compassion_messages.sql").read_text(encoding="utf-8")

    require("name: 'The Compassion Hub'" in data, "Canonical app name is missing")
    require("author: 'Pamella Foster-Grear'" in data, "Canonical author is missing")
    require("INDIVIDUAL_EBOOK_PRICE = 7.99" in data, "Individual ebook price is not $7.99")
    require("price: 4.99" not in data, "A stale $4.99 price remains")
    require(data.count("price: INDIVIDUAL_EBOOK_PRICE") == 12, "Expected 12 canonical individual-price uses")
    require("screens.messages" in screens, "Messages page is missing")
    require("data-compassion-form" in screens, "Compassion form is missing")
    require("Nothing stored about you" not in screens, "Welcome privacy promise conflicts with public messages")
    require("No account or analytics" in screens, "Qualified welcome privacy text is missing")
    require("loadCompassionMessages" in app, "Message loading behavior is missing")
    require("COMPASSION_API_URL" in app, "Message API wiring is missing")
    require("rpc/submit_compassion_message" in edge, "Atomic submission RPC is not wired")
    require("countQuery" not in edge, "Non-atomic count-then-insert flow remains")
    require("pg_advisory_xact_lock" in migration, "Atomic rate-limit lock is missing")

    json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
    json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))


def verify_live_api() -> None:
    request = urllib.request.Request(API_URL, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=20) as response:
        require(response.status == 200, f"Message API returned HTTP {response.status}")
        payload = json.load(response)
    messages = payload.get("messages")
    require(isinstance(messages, list) and messages, "Message API returned no approved messages")
    required = {"id", "display_name", "community", "message", "created_at"}
    require(all(required <= set(item) for item in messages), "Message API returned an incomplete record")


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
