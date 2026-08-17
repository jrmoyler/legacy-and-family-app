# A Cup of Compassion — App

A series by **Pamella Foster-Grear** on compassion, legacy, and what gets passed on.
**Build it. Document it. Pass it on.**

Published by Pam Grear Publishing LLC, Columbus, Ohio.

---

## What this is

A responsive web app — 15 screens, no build step, no dependencies. Static
HTML/CSS/ES modules. Drop it on any host and it runs.

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
| `src/icons.js` | Inline SVG icons and the cup-and-heart brand mark |
| `src/dom.js` | `esc()` and small DOM helpers |
| `manifest.webmanifest` | Installable-app metadata |
| `vercel.json` | Clean URLs, caching, security headers |

## Screens

**Onboarding** — Welcome, Home
**The series** — Series index, Book detail (×6)
**Reading** — Read index, Lesson (×6, free, full text)
**Legacy** — The Legacy Inventory worksheet (printable)
**Shop** — Shop, Product detail, Cart, Checkout, Confirmation
**Standing pages** — About Pamella, Disclaimers, Production status

## Routing

Hash-based, so every screen is linkable and the browser Back button works:

```
#/            welcome
#/home        #/series     #/read      #/legacy    #/shop
#/cart        #/checkout   #/checkout-done
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

## Production status

`#/status` is a working page, not decoration. It carries the open blockers,
the numbering collisions, the fixed-in-text legal defects, the outstanding
written releases, and the items that need a human to confirm (F4, the social
handle). It is linked from the sidebar and from the series page.

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
needed — Vercel serves these as static files automatically.

## Known limitations

- Payment forms are UI only. No processor is connected; nothing charges. The
  sales stack is Gumroad, and product links need wiring in `src/data.js`
  before launch.
- Scripture is quoted KJV throughout, per series canon. It should still get a
  word-for-word proof against a printed KJV before launch.
- `@acupofcompassion` is printed in the canonical footer but deliberately
  linked nowhere — it is not yet confirmed claimed on Instagram or Facebook
  (Bible §11).
- Reading progress, inventory ticks, cart, and library persist in
  `localStorage` on the device only; there is no account or cross-device sync.
- Six-book set and set-plus-workbook are priced but not purchasable. They
  cannot ship until the numbering is locked and the Confusion content exists.
