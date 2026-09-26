# The Compassion Hub

**Live:** <https://family-legacy-sigma.vercel.app>

The home for **Pamella Grear’s** A Cup of Compassion series, free reading,
legacy tools, and a moderated public wall of compassionate messages.
**Build it. Document it. Pass it on.**

Published by Pam Grear Publishing LLC, Columbus, Ohio. Proprietary — see
[`LICENSE`](LICENSE).

**The three rules** (full detail [below](#three-rules-the-code-enforces)):

1. **Nothing offers to prepare legal documents.** *We do not prepare legal
   documents. We help families arrive prepared.*
2. **Publication order is canonical.** Book 1–6, verified by checksum.
3. **The Legacy Inventory has nothing to type into.** Answers go on paper.
   The app stores ticks, never answers.

**No accounts.** Purchases live in the buying browser. A **restore code**,
shown after checkout, reopens them in another browser. It holds only product
ids and an expiry date. It cannot open the Legacy Inventory, because that
never leaves the paper.

---

## What this is

A responsive web app with no frontend build step or runtime dependencies.
Static HTML/CSS/ES modules are paired with one Supabase Edge Function for the
moderated public message wall, and Vercel functions for Stripe Checkout,
restore codes, and signed downloads.

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
| `src/components.js` | Sidebar, app bar, tab bar, toast, brand footer |
| `src/state.js` | State + localStorage persistence |
| `src/data.js` | Brand, books, catalogue, reading, inventory, production status |
| `src/icons.js` | Accessible navigation, status, and action icons |
| `src/dom.js` | `esc()` and small DOM helpers |
| `supabase/functions/compassion-messages/` | Public read + moderated submit API |
| `supabase/migrations/` | Message table, constraints, RLS, and seed content |
| `manifest.webmanifest` | Installable-app metadata |
| `vercel.json` | Clean URLs, caching, security headers |
| `api/create-checkout-session.js` | Server-priced Stripe Checkout Session creation |
| `api/checkout-session.js` | Paid-session verification, then a restore code |
| `api/restore.js` | Restore code or Stripe session id → product ids |
| `api/download.js` | Proof of purchase → short-lived signed download URL |
| `api/stripe-catalog.js` | Server-authoritative product names and prices |
| `api/_library.js` | Which private file each paid product delivers |
| `api/_restore-token.js` | Stateless HMAC restore codes (ids + expiry only) |
| `api/_stripe-session.js` | Shared paid-session lookup |
| `sw.js` | Offline app shell. Never caches `/api/`, PDFs or EPUBs |
| `assets/icons/` | Square 192/512 home-screen icons + Apple touch icon |
| `.vercelignore` | Makes sure no paid edition can deploy as a static file |
| `tools/upload_private_library.mjs` | Uploads paid editions to the private bucket |
| `tools/mint_restore_code.js` | Issues a restore code by hand for support |
| `package.json` | Stripe server SDK and verification command |

## Screens

**Onboarding** — Welcome, Home (with *Continue reading* once a lesson is part-read)
**The series** — Series index, Book detail (×6)
**Reading** — Read index, Lesson (×6, free, full text)
**Legacy** — The Legacy Inventory worksheet + *Sit with your people* (printable)
**Library** — Free reading, free downloads, owned books, restore form
**Shop** — Shop, Product detail, Cart, Stripe Checkout, verified download unlock
**Messages** — Approved public notes + moderated visitor submission form
**Standing pages** — About Pamella, Disclaimers, Production status

## Routing

Hash-based, so every screen is linkable and the browser Back button works:

```
#/            welcome
#/home        #/series     #/read      #/legacy    #/shop     #/messages
#/library     #/cart       #/checkout   #/checkout-success
#/about       #/disclaimer #/status
#/book/<book-id>       #/lesson/<lesson-id>       #/product/<product-id>
```

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

### 2. Publication order is canonical

The six finished books use one settled Book 1-6 order across filenames,
catalog metadata, marketplace cards, and downloadable editions. The release
verifier rejects missing, reordered, duplicated, or checksum-mismatched files.

### 3. The Legacy Inventory has nothing to type into

Bible §9 and Handoff §6 both warn that storing other families' bank, policy,
and safe-deposit details would make this a data-privacy obligation and a
target. So the worksheet asks for nothing. It lists what to gather and what to
ask; the reader writes the answers on paper or on a document that never leaves
their device.

`src/state.js` persists **which sections are ticked** and nothing else. There is
no field anywhere in this app that accepts an account number. Print styles turn
the screen worksheet into a fill-in sheet with ruled space under every prompt.

*Sit with your people*, under the worksheet, adds five conversation prompts
drawn from the books' own themes (with ruled lines when printed) and links to
the six free lessons. It says, plainly: *Write names, accounts, and wishes on
paper. This app will not store them.*

Reading progress is stored the same way: a read flag and a scroll fraction
per lesson. No text.

## Production status

`#/status` is a working page, not decoration. It carries the release safeguards,
the fixed-in-text legal positioning, and the library-integrity contract. It is
linked from the sidebar and from the series page.

## Paid downloads, restore codes, and the library

Free editions (the Legacy Inventory Workbook) are ordinary files under
`assets/library/`. **Paid editions are not in this repository or on the public
site.** They live in the private Supabase Storage bucket `library-private`
(project `zfpjgedcjdhxvdbthikt`), under the `storageKey` listed for each one
in `assets/library/catalog.json`.

1. Stripe confirms payment → `api/checkout-session.js` returns the product ids
   and a **restore code**: `ch1.<payload>.<signature>`, an HMAC-SHA256 over
   `{ p: [product ids], e: expiry }`, valid for 90 days. Nothing is stored on
   the server.
2. The browser keeps the product ids and the code in `localStorage`.
3. A download link is `/api/download?product=…&item=…&format=pdf|epub&token=…`.
   The function checks the code's signature and expiry (or re-checks a Stripe
   session id), then redirects to a signed storage URL that expires in 90
   seconds and downloads as an attachment.
4. On another browser, `#/library` → *Restore your purchases* takes the code
   (or the Stripe session id) and reopens the books.

A buyer from before restore codes existed, or one whose code expired, can be
issued a new one after you check their Stripe receipt:

```bash
RESTORE_TOKEN_SECRET=... node tools/mint_restore_code.js six-set workbook
```

### Moving the paid files into private storage (one time)

The paid files were removed from the public tree in this change. Upload them
to the private bucket before deploying it, or paid downloads will answer
`503`:

```bash
# from a checkout of the last commit that still had them
SUPABASE_SERVICE_ROLE_KEY=... node tools/upload_private_library.mjs --from-git 218df4a
# or from a folder with pdf/ and epub/ subfolders
SUPABASE_SERVICE_ROLE_KEY=... node tools/upload_private_library.mjs --dir ./release
```

The script checks every file against `SHA256SUMS.txt`, creates the bucket as
private if needed, and refuses to upload into a public bucket.

## Public compassion messages

`#/messages` reads approved notes and accepts new submissions through the
`compassion-messages` Supabase Edge Function in project
`zfpjgedcjdhxvdbthikt`. New messages are rate-limited, validated, stripped of
contact details, and stored as pending. They appear publicly only after an
editor sets `approved = true` in Supabase. The browser never receives a secret
or service-role key.

The wall pins the Hub's own welcome notes at the top, then shows community
notes newest first. A submitted note is never echoed back as if it were live.
The form only says it is under review.

## Installing the app

`manifest.webmanifest` has square 192 and 512 pixel icons (the logo's cup mark
on cream) and opens installed copies at `#/home`, so the welcome splash stays
at `#/`. There is no orientation lock. `sw.js` registers only over HTTPS. It
keeps the app shell and the free lessons (they live in `src/data.js`)
available offline, network-first so a refresh always updates, and never caches
`/api/` or any PDF or EPUB.

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

Scripture styling matches the print spec: italic serif with a gold small-caps
reference line. Callouts are centred bold-italic purple on cream with a gold
left border.

## Local preview

The app uses ES modules, so it needs to be served over HTTP — opening
`index.html` from the filesystem will not work.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deployment

Pushing to the production branch triggers the connected Vercel project. No
build command is needed for the frontend; Vercel installs the pinned Stripe SDK
for the API functions automatically.

Set these secrets in every Vercel environment that should accept payment:

```text
STRIPE_SECRET_KEY=sk_test_...          # Preview/testing (sk_live_... in Production)
RESTORE_TOKEN_SECRET=<32+ random chars> # Signs restore codes. Rotating it voids every issued code.
SUPABASE_SERVICE_ROLE_KEY=...           # Server-only. Signs private download URLs.
SUPABASE_URL=https://zfpjgedcjdhxvdbthikt.supabase.co   # optional, this is the default
LIBRARY_BUCKET=library-private          # optional, this is the default
```

None of these reach the browser.

Hosted Checkout does not expose or require a Stripe publishable key in the
browser. `PUBLIC_SITE_URL=https://your-production-domain.example` is optional;
when absent, the API safely derives the current deployment origin for success
and cancellation redirects. Stripe payment methods stay dynamic and are
managed in the Stripe Dashboard.

## Verification

```bash
npm run check
```

This checks branding, prices, the Stripe catalogue, restore codes (forged,
altered, and expired codes are refused), the download endpoint (no proof, the
wrong product, or missing storage all fail closed), every rendered screen,
and the library contract. The library verifier **fails if any paid PDF or
EPUB is present under `assets/library`** or linked as a static file. To audit
the paid files themselves (checksums, PDF/EPUB structure), point it at a
private copy:

```bash
python3 tools/verify_library_assets.py --private-root ./release
python3 tools/verify_library_assets.py --base-url https://family-legacy-sigma.vercel.app  # paid paths must not answer 200
```

## Known limitations

- **Paid files are still in git history.** This repository is public, and
  commits up to `218df4a` contain every paid PDF and EPUB. Removing them from
  the tree stops them deploying, but anyone can still fetch them from history.
  Purging them needs a history rewrite (`git filter-repo`) and a force-push to
  every branch, which only the owner should decide to do. Until then, treat
  the paid editions as recoverable by a determined visitor.
- **Production branch.** The GitHub default branch is currently
  `claude/legacy-app-migration-mobile-0sk4cg`, and `main` is behind it. The
  production branch should be `main`. Changing the default branch and the
  Vercel production branch is a settings change for the owner, so it is only
  noted here.
- Restore codes last 90 days. After that, a buyer writes in with their Stripe
  receipt and gets a new code from `tools/mint_restore_code.js`. Anyone who
  has a buyer's code can download that buyer's books until it expires. That
  is the trade-off for having no accounts.
- Buyers from before restore codes existed still see their books as owned,
  but need a minted code to download them again.

- Stripe-hosted Checkout handles payment details. Product IDs are submitted by
  the browser, while names and prices are resolved on the server. Downloads
  unlock only after the server retrieves the Checkout Session and confirms a
  paid status. Because the app has no account system, that unlock is stored in
  the purchasing browser, and a restore code carries it to another one.
- Scripture is quoted KJV throughout, per series canon. It should still get a
  word-for-word proof against a printed KJV before launch.
- `@acupofcompassion` links to the confirmed Instagram profile:
  `https://www.instagram.com/acupofcompassion`.
- Reading progress, inventory ticks, cart, library, and restore codes persist
  in `localStorage` on the device only. There is no account or cross-device
  sync beyond the restore code.
- Compassion messages are the exception: approved messages and moderated
  submissions use the dedicated Supabase project so visitors share one public
  wall across devices.
- The six-book set, both workbooks, and The Compassion Legacy Journal are
  represented by their corrected cover art. Their release files are
  checksummed in `SHA256SUMS.txt`. Only the free workbook ships publicly.
