# IT Asset Management — Web app

Next.js 16 frontend for the IT Asset Management system: admins manage assets, people, requests, returns, maintenance, support tickets, reports and the audit log; employees see their equipment, ask for new items, return devices and open support tickets. It talks to the [`my-api`](https://github.com/Rocky17x10/my-api) backend.

## Requirements

- Node.js 24
- The API running (default `http://localhost:3001`)
- npm 12 for changing dependencies (`npx -y npm@latest install …`)

## Set up

```bash
npm ci
cp .env.example .env           # NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
npm run dev                    # http://localhost:3000 (use -p 3002 if 3000 is taken)
```

Add the frontend's origin to the API's `FRONTEND_URL` so the browser may call it with cookies.

`NEXT_PUBLIC_*` values are visible in the browser: never put secrets there.

## Scripts

| Script | Purpose |
|---|---|
| `dev` | Development server with hot reload |
| `build` / `start` | Production build / serve it |
| `lint` | ESLint |
| `test:e2e` | Browser smoke tests (Playwright) |

## Browser tests

`npm run test:e2e` signs in once as an admin and once as an employee, then opens every page: each must render its heading without errors and must not scroll sideways at phone width; role redirects are checked too. The tests only read data. They need the app and the API running and these variables, set in the shell or in `.env` (use existing accounts that have already changed their first password; never commit the values):

```bash
E2E_BASE_URL=http://localhost:3000        # optional, this is the default
E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=…
E2E_EMPLOYEE_EMAIL=… E2E_EMPLOYEE_PASSWORD=…
E2E_BROWSER_CHANNEL=msedge                # default; 'chrome', or '' after `npx playwright install chromium`
```

## Structure

- `app/(auth)` login and password change · `app/(admin)` admin pages · `app/(employee)` employee pages · `app/(shared)` pages for both roles. Route groups do not change URLs.
- `components/ui` design-system components · `components/shell` sidebar, top bar, notifications, profile menu
- `lib/api` the only way to call the backend (cookies, silent token refresh, typed errors) · `lib/hooks` data hooks · `types` one type per API entity
- `proxy.ts` redirects signed-out users to `/login` and keeps each role in its area (a convenience; the API enforces access)

How to add a page and the visual rules: [`docs/FRONTEND_GUIDE.md`](docs/FRONTEND_GUIDE.md).
