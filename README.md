# AHSOM

**Alabang Hills Seafood Online Market** — a simple customer-facing storefront for Marik. Shoppers browse seafood, build a cart, and submit an order request. Totals on the site are estimates; fulfillment, final pricing, and payment happen offline after you review each order.

## What’s in this repo

| Path | Purpose |
|------|--------|
| [`index.html`](index.html) | Single-page site: catalog, cart, checkout form, and client script that posts orders to your backend URL. |
| [`google-apps-script/Code.gs`](google-apps-script/Code.gs) | Google Apps Script web app: receives JSON orders and appends rows to an **Orders** sheet with IDs like `AHSOM-0001`. |
| [`ORDER_SETUP.md`](ORDER_SETUP.md) | Step-by-step setup: Sheet, deploy web app, paste URL into the site, suggested column workflow and status colors. |

## Features

- Responsive layout, sticky header, cart indicator  
- Product sections with add-to-cart and quantity controls  
- Checkout collects name, phone, fulfillment type, address or meetup notes, and optional notes  
- Orders stored in Google Sheets for manual confirmation (availability, weight, delivery fee, payment method)

## Tech stack

- **Front end:** static HTML, CSS, and vanilla JavaScript (no build step)  
- **Back end:** Google Apps Script + Google Sheets  

## Quick start (local preview)

1. Clone the repository.  
2. Open `index.html` in a browser, or serve the folder with any static file server.  
3. For live submissions, complete the Google Apps Script deployment and set `ORDER_ENDPOINT` in `index.html` as described in [`ORDER_SETUP.md`](ORDER_SETUP.md).

## Hosting on GitHub Pages

If this repo is published with GitHub Pages from the default branch and root (or the folder that contains `index.html`), the storefront URL will be your `*.github.io` address. After changing `ORDER_ENDPOINT`, commit and push so the live site can reach your web app.

## Important

This project **does not** process card or online wallet payments. It only captures order requests and sends them to your sheet for follow-up.

---

For sheet columns, status suggestions, and upgrading an existing **Orders** tab, see **[ORDER_SETUP.md](ORDER_SETUP.md)**.
