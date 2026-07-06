# CapitalOS Full Scope Mock

Full-scope PE/VC investment operations mock implementation based on the generated 41-screen PRD/design package.

## What is included

- React + TypeScript + Vite single-page app.
- 41 routable screens matching the PRD screen matrix.
- Mock business data for projects, funds, investors, workflows, documents, risks, research, reports, users, roles, fields, import/export, audit and recycle bin.
- GSAP page-entry motion and responsive desktop/mobile layout.
- MySQL schema and seed scripts for `capitalos` with 61 `cap_` tables and 41 navigation entries.
- Playwright desktop/mobile tests.

## Run locally

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5178
```

Open `http://127.0.0.1:5178/#/login`.

## Database initialization

The database script reads credentials from environment variables. Do not commit real credentials.

```bash
set DB_HOST=10.28.238.190
set DB_PORT=3306
set DB_USER=root
set DB_PASSWORD=replace-with-local-secret
npm run db:init
```

The script creates and seeds database `capitalos`.

## Verification

```bash
npm run build
npm run lint
npm run test:e2e
```

Current verified status:

- Build passed.
- Lint passed.
- Playwright passed: 12 tests across desktop Chrome and mobile Chrome.
- Remote MySQL initialization passed: 61 `cap_` tables, 41 screen navigation rows, 8 demo users.
