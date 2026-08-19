#!/usr/bin/env python3
"""Verify The Compassion Hub branding, author spelling, pricing, and message API."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import urllib.request
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
API_URL = "https://zfpjgedcjdhxvdbthikt.supabase.co/functions/v1/compassion-messages"
COVER_ASSET_REVISION = "20260818-pamella-grear-2"
PORTRAIT_PATH = ROOT / "assets" / "network" / "pamella-grear.jpg"
EXPECTED_PORTRAIT_SHA256 = "526d04756015463727fc43fdb8adc8b858d41ac1412ba8c222b7a442d9cc1df5"
LOGO_PATH = ROOT / "assets" / "library" / "brand" / "a-cup-of-compassion-logo.png"
EXPECTED_LOGO_SHA256 = "3118bff9b6db2c89ec3d56f03a71dde649c71c796b84911cb58a152849e2cd9b"
APP_PATHS = [
    ROOT / "index.html",
    ROOT / "manifest.webmanifest",
    ROOT / "README.md",
    ROOT / "app.js",
    ROOT / "app.css",
    ROOT / "vercel.json",
    ROOT / "package.json",
    *sorted((ROOT / "src").glob("*.js")),
    *sorted((ROOT / "api").glob("*.js")),
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
            "author": "Pamella Grear",
        },
        "The exported app, series, or author brand contract is incorrect",
    )


def verify_sources() -> None:
    incorrect = re.compile(r"(?<![A-Za-z])Pam" + r"ela(?![A-Za-z])", re.IGNORECASE)
    retired = re.compile(r"\bPamell?a\s+Foster" + r"-Grear\b", re.IGNORECASE)
    for path in APP_PATHS:
        text = path.read_text(encoding="utf-8")
        require(not incorrect.search(text), f"Incorrect author spelling in {path.relative_to(ROOT)}")
        require(not retired.search(text), f"Retired author byline in {path.relative_to(ROOT)}")

    data = (ROOT / "src" / "data.js").read_text(encoding="utf-8")
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    screens = (ROOT / "src" / "screens.js").read_text(encoding="utf-8")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    edge = (ROOT / "supabase" / "functions" / "compassion-messages" / "index.ts").read_text(encoding="utf-8")
    migration = (ROOT / "supabase" / "migrations" / "20260818022152_create_compassion_messages.sql").read_text(encoding="utf-8")

    require("app: 'The Compassion Hub'" in data, "Canonical app name is missing")
    require("author: 'Pamella Grear'" in data, "Canonical author is missing")
    require(
        f"COVER_ASSET_REVISION = '{COVER_ASSET_REVISION}'" in data,
        "Corrected cover revision is missing",
    )
    require(
        index.count(f"?v={COVER_ASSET_REVISION}") == 2,
        "Open Graph and Twitter preview images do not use the corrected revision",
    )
    require(PORTRAIT_PATH.is_file(), "Pamella's Network headshot is missing")
    require(
        hashlib.sha256(PORTRAIT_PATH.read_bytes()).hexdigest() == EXPECTED_PORTRAIT_SHA256,
        "Pamella's Network headshot does not match the approved photo",
    )
    require(LOGO_PATH.is_file(), "Official A Cup of Compassion logo is missing")
    require(
        hashlib.sha256(LOGO_PATH.read_bytes()).hexdigest() == EXPECTED_LOGO_SHA256,
        "Official logo does not match the approved attachment",
    )
    require("logo: '/assets/library/brand/a-cup-of-compassion-logo.png?v=official-brand-20260819'" in data, "Official logo is not wired")
    components = (ROOT / "src" / "components.js").read_text(encoding="utf-8")
    require("cupMark" not in components, "A substitute logo mark remains in the app's shared chrome")
    require(components.count("brandLogo(") >= 3, "The official logo is not used across the app's shared chrome")
    require(index.count("assets/icon-192.png") == 2, "Official logo icon set is not used for browser install branding")
    manifest = (ROOT / "manifest.webmanifest").read_text(encoding="utf-8")
    require("icon-192.png" in manifest and "icon.svg" not in manifest, "Manifest does not use the official logo icon set")
    require("series: 'A Cup of Compassion'" in data, "Canonical series name is missing")
    require("https://www.instagram.com/acupofcompassion" in data, "Correct Instagram profile is missing")
    require("INDIVIDUAL_EBOOK_PRICE = 7.99" in data, "Individual ebook price is not $7.99")
    require("price: 4.99" not in data, "A stale $4.99 price remains")
    require(data.count("price: INDIVIDUAL_EBOOK_PRICE") == 12, "Expected 12 canonical individual-price uses")
    require("id: 'compassion-legacy-journal'" in data, "Compassion Legacy Journal is missing")
    require("originalPrice: 37" in data and "price: 25" in data, "Journal sale pricing is incorrect")
    require("The-Compassion-Legacy-Journal.pdf" in data, "Journal PDF is not wired to the marketplace")
    require("product.free || owned" in screens, "Paid downloads are not gated behind ownership")
    require("autocomplete=\"cc-number\"" not in screens, "A fake card-entry form remains")
    require("data-purchase" not in screens and "data-purchase" not in app, "A simulated purchase action remains")
    require("data-stripe-checkout" in screens, "Stripe checkout action is missing")
    require("/api/create-checkout-session" in app, "Stripe Checkout Session endpoint is not wired")
    require("/api/checkout-session?session_id=" in app, "Paid Checkout Session verification is missing")
    require("unlockPurchasedProducts(payload.productIds)" in app, "Paid products do not unlock after server verification")
    stripe_create = (ROOT / "api" / "create-checkout-session.js").read_text(encoding="utf-8")
    stripe_verify = (ROOT / "api" / "checkout-session.js").read_text(encoding="utf-8")
    stripe_catalog = (ROOT / "api" / "stripe-catalog.js").read_text(encoding="utf-8")
    require("checkout.sessions.create" in stripe_create, "Hosted Stripe Checkout Sessions are not used")
    require("price_data" in stripe_create and "unit_amount: product.unitAmount" in stripe_create, "Server-authoritative Stripe pricing is missing")
    require("payment_method_types" not in stripe_create, "Stripe payment methods should be managed dynamically in Dashboard")
    require("process.env.STRIPE_SECRET_KEY" in stripe_create and "process.env.STRIPE_SECRET_KEY" in stripe_verify, "Stripe secret key env wiring is missing")
    require("payment_status !== 'paid'" in stripe_verify, "Checkout success is not verified as paid")
    require(stripe_catalog.count("unitAmount: 799") == 6, "Stripe catalogue is missing the six $7.99 eBooks")
    require("unitAmount: 2500" in stripe_catalog and "unitAmount: 14900" in stripe_catalog, "Stripe catalogue prices are incomplete")
    require('class="cart-btn"' not in screens, "A duplicate screen-level cart button remains")
    require("data-cart-toggle" not in screens and "data-cart-toggle" not in app, "Duplicate purchase controls remain")
    require("screens.messages" in screens, "Messages page is missing")
    require("data-compassion-form" in screens, "Compassion form is missing")
    require("message-requirements" in screens, "Required-field guidance is missing")
    require("Nothing stored about you" not in screens, "Welcome privacy promise conflicts with public messages")
    require("No account or analytics" in screens, "Qualified welcome privacy text is missing")
    require("loadCompassionMessages" in app, "Message loading behavior is missing")
    require("COMPASSION_API_URL" in app, "Message API wiring is missing")
    require(app.count("signal: timeoutSignal(") == 4, "Browser network requests need timeouts")
    require("rpc/submit_compassion_message" in edge, "Atomic submission RPC is not wired")
    require("countQuery" not in edge, "Non-atomic count-then-insert flow remains")
    require("serviceFetch" in edge and "AbortSignal.timeout" in edge, "Edge requests need timeouts")
    require("pg_advisory_xact_lock" in migration, "Atomic rate-limit lock is missing")
    require("'The Compassion Hub', 'A note from us'" in migration, "Seed messages are not marked as examples")

    json.loads(manifest)
    vercel = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
    cover_headers = next(
        (entry["headers"] for entry in vercel["headers"] if entry.get("source") == "/assets/library/covers/(.*).jpg"),
        [],
    )
    cache_control = next(
        (header.get("value") for header in cover_headers if header.get("key") == "Cache-Control"),
        None,
    )
    require(cache_control == "public, max-age=0, must-revalidate", "Cover previews are still cached as immutable")
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    require(package.get("dependencies", {}).get("stripe") == "22.5.0", "Stripe SDK is not pinned to the verified release")


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
