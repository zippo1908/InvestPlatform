# InvestPlatform / CapitalOS

CapitalOS is a PE/VC investment operations platform clone package. This repository contains the current full-scope implementation artifacts for continued cloud development:

- `frontend/`: React + TypeScript + Vite application source.
- `deploy/`: production-style deployment package with built `frontend/dist`, FastAPI backend, MySQL schema/seed SQL, and `deploy.sh`.
- `docs/`: PRD, page matrix, design system, data model, workflow-engine analysis, and verification notes.

## Local Frontend Development

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5178
```

Open `http://127.0.0.1:5178/#/login`.

Common verification commands:

```bash
npm run build
npm run lint
npm run test:e2e
```

## Backend And Deploy Package

The deployment package is self-contained under `deploy/`.

```bash
cd deploy
cp .env.example .env
vi .env
chmod +x deploy.sh
./deploy.sh start
```

Default ports:

- Frontend: `89`
- Backend API: `7997`

The backend is a FastAPI service that reads MySQL settings from environment variables:

```bash
DB_HOST=10.28.238.190
DB_PORT=3306
DB_NAME=capitalos
DB_USER=root
DB_PASSWORD=replace-with-deployment-secret
```

Do not commit real credentials. Use `.env` or service-level environment variables on the target host.

## Database

Schema and seed files are in `deploy/db/`.

- `schema.sql`: creates the `capitalos` schema and application tables.
- `seed.sql`: inserts demo navigation, users, projects, funds, workflows, risks, documents, reports, audit data, and mock operational records.

The frontend source also contains `frontend/scripts/init-db.ts` for local MySQL initialization.

## Demo Login

The frontend form defaults to:

- Account: `demo.user`
- Password: `demo-login`

The deploy backend is intentionally demo-friendly: any non-empty account with a password length of at least 4 can enter the app. If the account matches a seeded user such as `alex.gp`, `nina.invest`, or `sam.admin`, the backend maps it to that user; otherwise it falls back to a Demo User session.

## Notes For Cloud Agents

- `frontend/node_modules`, Python virtualenvs, logs, PID files, local `.env`, and test reports are intentionally ignored.
- `deploy/frontend/dist` is committed because the deployment package is expected to run without rebuilding the frontend on the server.
- Start with `docs/full-scope-00-full-prd.md` and `docs/full-scope-01-page-matrix.md` when deepening feature coverage.
