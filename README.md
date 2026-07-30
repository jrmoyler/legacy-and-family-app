# Family Legacy — App

Wills, trusts & legacy planning in plain language, with trusted help from a community network.
**Plant. Protect. Pass on.**

Built by Collective AI Inc.

---

## What this is

A responsive web app — 13 screens, no build step, no dependencies. Static
HTML/CSS/ES modules. Drop it on any host and it runs.

It is a real web app at every width, not a phone mockup: the page scrolls
normally, layouts reflow, and desktop gets a persistent sidebar instead of a
simulated device frame.

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell and document head |
| `app.css` | Design system + all screen styles |
| `app.js` | Router, rendering, event delegation |
| `src/screens.js` | One template per screen |
| `src/components.js` | Sidebar, app bar, tab bar, sheets, toast |
| `src/state.js` | State + localStorage persistence |
| `src/data.js` | Copy and catalogue content |
| `src/icons.js` | Inline SVG icons |
| `src/dom.js` | `esc()` and small DOM helpers |
| `manifest.webmanifest` | Installable-app metadata |
| `vercel.json` | Clean URLs, caching, security headers |

## Screens

**Onboarding** — Welcome, Home
**Guides** — Will step-by-step, Trust step-by-step
**Content** — Video (Protecting Our Legacy), Learn
**Services** — Network, Plans
**Purchase** — Checkout, Checkout confirmation
**Marketplace** — Storefront, Product, Cart

Sheets (villa giveaway, added-to-library) are overlays available from any
screen rather than screens of their own.

## Routing

Hash-based, so every screen is linkable and the browser Back button works:

```
#/            welcome
#/home        #/learn      #/shop     #/network   #/plans
#/guide-will  #/guide-trust
#/video       #/cart       #/checkout #/checkout-done
#/product/<product-id>
```

Unknown routes fall back to the welcome screen; an unknown product id falls
back to the marketplace.

## Responsive behaviour

| Width | Navigation | Layout |
|---|---|---|
| `< 900px` | Sticky app bar + bottom tab bar | Single column, full-bleed cards |
| `≥ 900px` | Persistent left sidebar | Two- and three-column layouts, sticky order/cart summaries, centred `1140px` content column |

## Design tokens

| Token | Value |
|---|---|
| Forest (primary) | `#1F3D2E` |
| Forest deep | `#173024` |
| Cream | `#F6F1E4` |
| Gold | `#C99B47` |
| Sage | `#9DB3A2` |
| Ink | `#26352B` |

Type: Spectral (serif, headings) + DM Sans (sans, UI), with Georgia and
system-sans fallbacks if the font CDN is unreachable.

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

- Payment forms are UI only. No processor is connected; nothing charges.
- The video player is a visual placeholder — no media file is attached yet.
  Play/pause drives a timed progress bar against the 12:24 runtime.
- Progress, cart, and library persist in `localStorage` on the device only;
  there is no account or cross-device sync.
