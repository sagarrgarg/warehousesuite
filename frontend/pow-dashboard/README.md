# POW Dashboard (React)

Frappe Desk today loads `pow_dashboard.js` (~legacy jQuery UI). This package is the **React + [frappe-react-sdk](https://github.com/frappe/frappe-react-sdk) replacement**, structured similarly to [Raven](https://github.com/The-Commit-Company/raven): Vite app beside the Frappe app, build drops static files into the app `public/` tree.

## Dev

1. `cd frontend/pow-dashboard && npm install`
2. Run bench on `http://127.0.0.1:8000` (or adjust `vite.config.ts` proxy).
3. `npm run dev` — open Vite’s URL; `/api` is proxied to Frappe so cookies/CSRF match a normal desk session if you paste the session cookie, or log in via desk on :8000 and use browser tools to point the dev page at the site (simplest: test built assets on the real site first).

## Production-ish build

```bash
npm run build
```

Outputs to `warehousesuite/public/pow_dashboard_react/` with a **stable** entry: `assets/pow-dashboard.js` and `assets/pow-dashboard.css`.

## Website route `/pow`

The Frappe app registers **`https://<site>/pow`** (see `hooks.website_route_rules` and `www/pow.html`). Guests are redirected to login. Use the same build assets as Desk once the thin loader is wired.

Desk can load it by replacing `on_page_load` in `pow_dashboard.js` with a mount:

- Clear `wrapper` (or a child div), ensure `<div id="pow-dashboard-root"></div>`.
- Inject: `/assets/warehousesuite/pow_dashboard_react/assets/pow-dashboard.js` as `type="module"` and a stylesheet link to `assets/pow-dashboard.css` (stable names from `vite.config.ts`).

**Do not delete** the legacy file until feature parity slices land; use a feature flag in `WMSuite Settings` if you need side-by-side.

## Security

- Rely on **same-origin** session cookies; keep `FrappeProvider` without `url` when bundled under the Frappe site.
- For headless/token use later, use `tokenParams` — never ship API secrets to the client.
