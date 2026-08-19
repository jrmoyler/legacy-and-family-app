# The Compassion Hub — App

The home for **Pamella Grear’s** A Cup of Compassion series, free reading,
legacy tools, and a moderated public wall of compassionate messages.
**Build it. Document it. Pass it on.**

Published by Pam Grear Publishing LLC, Columbus, Ohio.

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

## Routing

Hash-based, so every screen is linkable and the browser Back button works:

```
#/            welcome
#/home        #/series     #/read      #/legacy    #/shop     #/messages
#/cart        #/checkout   #/checkout-success
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

## Production status

`#/status` is a working page, not decoration. It carries the release safeguards,
the fixed-in-text legal positioning, and the library-integrity contract. It is
linked from the sidebar and from the series page.

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
- `@acupofcompassion` links to the confirmed Instagram profile:
  `https://www.instagram.com/acupofcompassion`.
- Reading progress, inventory ticks, cart, and library persist in
  `localStorage` on the device only; there is no account or cross-device sync.
- Compassion messages are the exception: approved messages and moderated
  submissions use the dedicated Supabase project so visitors share one public
  wall across devices.
- The six-book set, both workbooks, and The Compassion Legacy Journal are
  represented by their corrected cover art and complete release files.
