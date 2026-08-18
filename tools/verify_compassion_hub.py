#!/usr/bin/env python3
"""Verify The Compassion Hub branding, author spelling, pricing, and message API."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import urllib.request
from html.parser import HTMLParser
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
MODULE_PATHS = [ROOT / "app.js", *sorted((ROOT / "src").glob("*.js"))]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def verify_module_syntax() -> None:
    """Parse browser JavaScript as ES modules so duplicate imports fail CI."""
    for path in MODULE_PATHS:
        result = subprocess.run(
            ["node", "--check", "--input-type=module"],
            input=path.read_text(encoding="utf-8"),
            capture_output=True,
            text=True,
            check=False,
        )
        require(
            result.returncode == 0,
            f"Invalid ES module syntax in {path.relative_to(ROOT)}:\n{result.stderr.strip()}",
        )

    graph = subprocess.run(
        ["node", "--input-type=module", "--eval", "await import('./src/screens.js')"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    require(graph.returncode == 0, f"Browser module graph is invalid:\n{graph.stderr.strip()}")


def reject_duplicate_json_keys(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        require(key not in result, f"Duplicate JSON key: {key}")
        result[key] = value
    return result


class HeadMetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title_count = 0
        self.metadata: dict[tuple[str, str], int] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "title":
            self.title_count += 1
        if tag != "meta":
            return
        values = dict(attrs)
        key = next(((kind, values[kind]) for kind in ("name", "property") if values.get(kind)), None)
        if key:
            self.metadata[key] = self.metadata.get(key, 0) + 1


def verify_metadata() -> None:
    parser = HeadMetadataParser()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    require(parser.title_count == 1, f"Expected one document title, found {parser.title_count}")
    duplicates = sorted(f"{kind}={name}" for (kind, name), count in parser.metadata.items() if count > 1)
    require(not duplicates, f"Duplicate HTML metadata: {', '.join(duplicates)}")

    for path in (ROOT / "manifest.webmanifest", ROOT / "vercel.json"):
        json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=reject_duplicate_json_keys)


def verify_brand_contract() -> None:
    script = """
      const { BRAND } = await import('./src/data.js');
      console.log(JSON.stringify({
        app: BRAND.app,
        appFull: BRAND.appFull,
        series: BRAND.series,
        author: BRAND.author,
      }));
    """
    result = subprocess.run(
        ["node", "--input-type=module", "--eval", script],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    require(result.returncode == 0, f"Could not read the brand contract:\n{result.stderr.strip()}")
    require(
        json.loads(result.stdout) == {
            "app": "The Compassion Hub",
            "appFull": "The Compassion Hub",
            "series": "A Cup of Compassion",
            "author": "Pamella Foster-Grear",
        },
        "The exported app, series, or author brand contract is incorrect",
    )


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

    require("app: 'The Compassion Hub'" in data, "Canonical app name is missing")
    require("author: 'Pamella Foster-Grear'" in data, "Canonical author is missing")
    require("series: 'A Cup of Compassion'" in data, "Canonical series name is missing")
    require("INDIVIDUAL_EBOOK_PRICE = 7.99" in data, "Individual ebook price is not $7.99")
    require("price: 4.99" not in data, "A stale $4.99 price remains")
    require(data.count("price: INDIVIDUAL_EBOOK_PRICE") == 12, "Expected 12 canonical individual-price uses")
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

    verify_module_syntax()
    verify_metadata()
    verify_brand_contract()
    verify_sources()
    if args.live:
        verify_live_api()
    print("Compassion Hub verification passed" + (" (including live API)" if args.live else ""))


if __name__ == "__main__":
    main()
