# CapitalOS Deploy Package

## Structure

- `frontend/dist`: built static frontend.
- `backend`: FastAPI backend, Python 3.12 only, runs inside `backend/.venv`.
- `db`: MySQL schema and seed SQL.
- `deploy.sh`: start/stop/restart/status script.

## Ports

- Frontend: `89`
- Backend API: `7997`

## Start

```bash
cd deploy
export DB_HOST=10.28.238.190
export DB_PORT=3306
export DB_NAME=capitalos
export DB_USER=root
export DB_PASSWORD='your-secret'
./deploy.sh start
```

Open:

```text
http://SERVER_IP:89/#/login
```

The frontend resolves API calls to:

```text
http://SERVER_IP:7997
```

## Stop / Status

```bash
./deploy.sh status
./deploy.sh stop
./deploy.sh restart
```

## Real Backend Interactions

The frontend write actions call backend APIs. The backend writes MySQL business records or audit logs:

- Login: `cap_login_events`, `cap_audit_logs`
- Project create: `cap_projects`, `cap_project_stage_events`, `cap_audit_logs`
- Project stage advance: `cap_projects`, `cap_project_stage_events`, `cap_audit_logs`
- Risk update: `cap_risk_updates`, `cap_risk_incidents`, `cap_audit_logs`
- Document download: `cap_audit_logs`
- Import/export: `cap_import_export_tasks`, `cap_audit_logs`
- Preferences: `cap_user_preferences`, `cap_audit_logs`
- Recycle restore: `cap_recycle_items`, `cap_audit_logs`

Do not put real database passwords into committed files. Use environment variables.
