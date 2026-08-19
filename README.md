# The Compassion Hub — App

The home for **Pamella Grear’s** A Cup of Compassion series, free reading,
legacy tools, and a moderated public wall of compassionate messages.

**Build it. Document it. Pass it on.**

Published by Pam Grear Publishing LLC, Columbus, Ohio.

> **Two names, on purpose.** *The Compassion Hub* is the app — what the reader
> opens, installs, and navigates. *A Cup of Compassion* is the series and the
> publishing imprint it carries, and it stays on every book footer, disclaimer,
> and copyright line, because that is what is printed inside the editions
> themselves. In code that split is `BRAND.app` / `BRAND.appFull` versus
> `BRAND.name`.

---

## What this is

A responsive web app with no frontend build step or runtime dependencies.
Static HTML/CSS/ES modules are paired with one Supabase Edge Function for the
moderated public message wall and two Vercel functions for Stripe Checkout.

It is a real web app at every width, not a phone mockup: the page scrolls
normally, layouts reflow, and desktop gets a persistent sidebar instead of a
simulated device frame.

Content is sourced from `DESIGN_AND_INFORMATION_BIBLE_Cup_of_Compassion.md`
and `HANDOFF_Cup_of_Compassion_Books_1-3.md`. Section markers (§) throughout
`src/data.js` point back into the Bible so any string can be traced to its
source.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell and document head |
| `app.css` | Design system + all screen styles |
| `app.js` | Router, rendering, event delegation |
| `src/screens.js` | One template per screen |
| `src/components.js` | Sidebar, app bar, tab bar, sheets, toast, brand footer |
| `src/state.js` | State + localStorage persistence |
| `src/data.js` | Brand, books, catalogue, reading, inventory, production status |
| `src/covers.js` | Accessible typographic fallback for any future item without commissioned art |
| `src/icons.js` | Inline SVG icons, incl. the cup-and-heart fallback cover mark |
| `src/dom.js` | `esc()` and small DOM helpers |
| `supabase/functions/compassion-messages/` | Public read + moderated submit API |
| `supabase/migrations/` | Message table, constraints, RLS, and seed content |
| `assets/` | PWA icons and the link-preview image |
| `assets/library/brand/` | The official logo and Pamella's portrait used across the app's chrome |
| `manifest.webmanifest` | Installable-app metadata |
| `vercel.json` | Clean URLs, caching, security headers |
| `assets/library/` | The 17 publication files, the cover art, and `catalog.json` |
| `assets/books/` | Older EPUB masters, superseded by `assets/library/` — see its own README |
| `assets/network/` | Headshots for the Network page (see its README) |
| `tools/extract_library_covers.py` | Lifts cover art out of the EPUB masters |
| `tools/build_product_covers.py` | Builds illustrated workbook, resource, and home covers from commissioned source art |
| `tools/verify_library_assets.py` | Release check: editions, covers, checksums, app wiring |
| `api/create-checkout-session.js` | Server-priced Stripe Checkout Session creation |
| `api/checkout-session.js` | Paid-session verification before download unlock |
| `api/stripe-catalog.js` | Server-authoritative product names and prices |
| `package.json` | Stripe server SDK and verification command |

## Screens

**Onboarding** — Welcome, Home
**The series** — Series index, Book detail (×6)
**Reading** — Read index, Lesson (×6, free, full text)
**Legacy** — The Legacy Inventory worksheet (printable)
**Shop** — Shop, Product detail, Cart, Stripe Checkout, verified download unlock
**Messages** — Approved public notes + moderated visitor submission form
**Standing pages** — About Pamella, Disclaimers, Production status
**Tools** — Tools index, My Library, Network
**Standing pages** — About Pamella, Disclaimers, Production status

## Routing

Hash-based, so every screen is linkable and the browser Back button works:

```
#/            welcome
#/home        #/series     #/read      #/legacy    #/shop     #/messages
#/cart        #/checkout   #/checkout-success
#/tools       #/library    #/network
#/about       #/disclaimer #/status
#/book/<book-id>       #/lesson/<lesson-id>       #/product/<product-id>
```

Scroll position is remembered per route and restored on Back and Forward only,
so returning to the series lands on the book you clicked while a fresh
navigation always starts at the top. Route changes scroll instantly —
`scroll-behavior: smooth` is right for an in-page anchor and wrong for a page
that should already be at the top when it appears.

Unknown routes fall back to the welcome screen; an unknown detail id falls
back to that section's index.

## Three rules the code enforces

These are not stylistic. Each one exists because the source documents flag a
concrete legal or editorial hazard.

### 1. Nothing offers to prepare legal documents

Defect **L1** in the Bible's defect register is unauthorized practice of law in
Ohio. The predecessor app sold "Will Essentials — $149", "Will + Living Trust —
$249", and a membership whose headline benefit was a free legal will. All of it
is gone. The positioning is fixed and appears verbatim in `data.js`:

> We do not prepare legal documents. We help families arrive prepared.

The app now sells books. `#/disclaimer` is the visible disclaimer page the
handoff calls for, and every screen that touches estate content links to it.

### 2. No series numbering is asserted as settled

Two numbering schemes are in conflict and at least three covers claim a "3"
(Bible §0.1, §2). The Bible is explicit that an agent must surface the
disagreement rather than pick a side.

So books carry a `seriesLabel` **only** where the current covers and the
current scheme agree — Series 1 and Series 2. Everywhere else it is `null` and
the book renders by title alone. The 54-page collection is listed by its three
titles rather than as "Books 1–3". Every conflict is enumerated on `#/status`.

### 3. The Legacy Inventory has nothing to type into

Bible §9 and Handoff §6 both warn that storing other families' bank, policy,
and safe-deposit details would make this a data-privacy obligation and a
target. So the worksheet asks for nothing. It lists what to gather and what to
ask; the reader writes the answers on paper or on a document that never leaves
their device.

`src/state.js` persists **which sections are ticked** and nothing else. There is
no field anywhere in this app that accepts an account number. Print styles turn
the screen worksheet into a fill-in sheet with ruled space under every prompt.

## Buying a title, and in which format

Every one of the six books is sold on its own as well as inside the sets, and
the reader picks the file format before buying: **both** (the default), **PDF
only**, or **EPUB only**. The choice is per product, kept in `state.formats`,
and it follows the title through the cart, the checkout summary, the download
panel, and My Library. It is a preference rather than a lock — both editions
exist for every title, so a reader can switch at any time and the other format
is still there.

`Save for later` puts anything — a book, a set, or a free download — into My
Library without buying it. Saved items live in `localStorage`, on the device
only; a secure payment link and purchased files are delivered directly.

## Cover art

The EPUB production covers are extracted into full and thumbnail web
renditions. The PDF-only Compassion Legacy Journal uses its committed
illustrated marketplace cover. The tool records every rendition in
`catalog.json` with byte counts and SHA-256 hashes:

```
assets/library/covers/<stem>.jpg          1600 x 2560, the full-size preview
assets/library/covers/thumbs/<stem>.jpg     640 x 1024, what grids load
```

`<stem>` is the same publication stem the PDF and EPUB use, so one slug in
`bookAssets()` addresses all four files. Re-running the tool on an unchanged
EPUB produces byte-identical output, and `verify_library_assets.py` fails the
release if a cover is missing, resized, or does not match its checksum.

Regenerate after replacing any EPUB:

```bash
pip install pillow
python3 tools/extract_library_covers.py --root .
```

The two workbooks, eight standalone resources, and the flagship home cover use
commissioned painterly illustration layers. Their exact titles, brand panel,
border, author line, and thumbnail renditions are rendered deterministically so
the art stays expressive without trusting generated typography:

```
assets/library/covers/product-art/<stem>.jpg        commissioned source art
assets/library/covers/products/<stem>.jpg           1600 x 2560 final cover
assets/library/covers/products/thumbs/<stem>.jpg      640 x 1024 grid cover
```

Rebuild those covers after changing source art or cover copy:

```bash
python3 tools/build_product_covers.py --root .
```

## The Network page

`#/network` lists the people around the series with the one contact detail each
of them supplied — an email or a website — plus a `.vcf` export built in the
page (nothing is uploaded). All four entries now carry their own headshot. The
`headshot` field may still be `null` for anyone added later, in which case the
card renders a lettered placeholder of exactly the same size, so adding a photo
never moves the grid. See `assets/network/README.md` for the file naming and
sizes.

Pamella's headshot is also the portrait in the `#/about` header — the About page
reads it straight off her Network entry (`AUTHOR_PORTRAIT` in `src/data.js`), so
one file serves both screens.

Long addresses in the contact rows are run through `escBreakable()` from
`src/dom.js`, which marks the seams — after a dot, a slash, a hyphen, an
underscore, or an interior `@` — where a line may wrap. Without it a four-column
grid split `www.manninsurancegroup.com` as "manninsurancegro / up.com".

## Production status

`#/status` is a working page, not decoration. It carries the open blockers,
the numbering collisions, the fixed-in-text legal defects, the outstanding
written releases, and the items that need a human to confirm (F4, the social
handle). It is linked from the sidebar and from the series page.

## Public compassion messages

`#/messages` reads approved notes and accepts new submissions through the
`compassion-messages` Supabase Edge Function in project
`zfpjgedcjdhxvdbthikt`. New messages are rate-limited, validated, stripped of
contact details, and stored as pending. They appear publicly only after an
editor sets `approved = true` in Supabase. The browser never receives a secret
or service-role key.

## Responsive behaviour

| Width | Navigation | Layout |
|---|---|---|
| `< 900px` | Sticky app bar + bottom tab bar | Single column, full-bleed cards |
| `≥ 900px` | Persistent left sidebar | Two- and three-column layouts, sticky summaries, centred `1140px` content column |

## Design tokens

Palette and type follow Bible §6.

| Token | Value | Role |
|---|---|---|
| Purple | `#4A2A63` | Primary, titles |
| Purple deep | `#3A2150` | Dark bands, sidebar |
| Gold | `#B08D2E` | Rules, kickers, scripture refs |
| Gold ink | `#7A6114` | Small gold text on cream (5.4:1) |
| Gold soft | `#D0AC4C` | Gold on deep purple (6.4:1) |
| Teal | `#2E7D82` | Subheads |
| Teal light | `#7FC3C7` | Teal on deep purple (5.9:1) |
| Cream | `#F6F1E7` | Page |
| Ink | `#22201F` | Body |
| Rule | `#DCD3C4` | Hairlines |

The Bible specifies Times + Helvetica; those govern the **print interiors**.
The app uses their screen-optimised counterparts — Spectral (serif) and DM Sans
(sans) — with Georgia and system-sans fallbacks if the font CDN is unreachable.
Those fallbacks are declared as `@font-face` rules carrying `size-adjust` and
ascent/descent overrides, so the first paint sits on the same metrics as the
webfont and nothing reflows when it arrives.

Scripture styling matches the print spec: italic serif with a gold small-caps
reference line. Callouts are centred bold-italic purple on cream with a gold
left border.

## Cover fallbacks

Every current book, workbook, shop resource, and the home page now carries
production raster cover art. `src/covers.js` remains as the accessible fallback
for a future catalogue record added before its commissioned art arrives. Six
brand fields and five motifs are assigned deterministically by id, so even a
temporary item stays identifiable and never collapses the 5:8 cover rhythm.

## Accessibility

Audited with axe-core across all 14 routes at 390px and 1440px: no violations.
Specifically:

- **Focus** is a 3px deep-plum ring, which holds up on cream, gold, and teal;
  anything sitting on a dark plum field inverts it to gold.
- **Checkout collects no card information.** It prepares an itemized email so
  Pamella can reply with the appropriate secure payment link.
- **Filtering the shop is announced** through a live region, since it silently
  redraws a grid.
- **Touch targets**: buttons are at least 52px tall, the inventory ticks reach
  48px through a transparent extension, and "Remove" in the cart is padded out
  from a bare 12px word.
- **Motion** is removed wholesale under `prefers-reduced-motion`, and nothing
  that fades or rises in is left invisible when it is.
- **Hover lifts are gated behind `@media (hover: hover)`** so a tap on a phone
  does not leave a card latched in its hover state.

## Local preview

The app uses ES modules, so it needs to be served over HTTP — opening
`index.html` from the filesystem will not work.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deployment

Pushing to `main` triggers the connected Vercel project. No build command
is needed for the frontend; Vercel installs the pinned Stripe SDK for the API
functions automatically.

Set this secret in every Vercel environment that should accept payment:

```text
STRIPE_SECRET_KEY=sk_test_...   # Preview/testing
STRIPE_SECRET_KEY=sk_live_...   # Production
```

Hosted Checkout does not expose or require a Stripe publishable key in the
browser. `PUBLIC_SITE_URL=https://your-production-domain.example` is optional;
when absent, the API safely derives the current deployment origin for success
and cancellation redirects. Stripe payment methods stay dynamic and are
managed in the Stripe Dashboard.

## Known limitations

- Stripe-hosted Checkout handles payment details. Product IDs are submitted by
  the browser, while names and prices are resolved on the server. Downloads
  unlock only after the server retrieves the Checkout Session and confirms a
  paid status. Because the app has no account system, that unlock is stored in
  the purchasing browser.
- Scripture is quoted KJV throughout, per series canon. It should still get a
  word-for-word proof against a printed KJV before launch.
- Instagram links to `https://www.instagram.com/acupofcompassion`.
- Reading progress, inventory ticks, cart, and library persist in
  `localStorage` on the device only; there is no account or cross-device sync.
- Compassion messages are the exception: approved messages and moderated
  submissions use the dedicated Supabase project so visitors share one public
  wall across devices.
- The six-book set, both workbooks, and The Compassion Legacy Journal are
  represented by their release files and corrected cover art.
- Reading progress, inventory ticks, cart, saves, format choices, and library
  persist in `localStorage` on the device only; there is no account or
  cross-device sync.
- Everyone on the Network page is listed with the contact detail they supplied,
  and every entry now carries the headshot that person provided.
