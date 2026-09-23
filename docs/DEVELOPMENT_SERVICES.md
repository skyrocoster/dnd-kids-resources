# Persistent development services

The D&D backend, frontend, Storybook, and Datasette run as Docker Compose services.
They remain available after the PowerShell window closes. Backend Python changes
reload Uvicorn; frontend and Storybook source changes reload in Vite.

## First start and everyday commands

Run these from the repository root with Docker Desktop running:

```powershell
powershell -ExecutionPolicy Bypass -File ./dev.ps1 start
powershell -ExecutionPolicy Bypass -File ./dev.ps1 status
powershell -ExecutionPolicy Bypass -File ./dev.ps1 logs
powershell -ExecutionPolicy Bypass -File ./dev.ps1 stop
powershell -ExecutionPolicy Bypass -File ./dev.ps1 restart
```

`start` requires the database already stored in the
`dnd-kids-resources_dnd-database` Docker volume. It never creates, copies, or
seeds a database. The old host-side database files are not used by the app; all
runtime tools use `DND_DATABASE_PATH` to point at the volume-mounted database.
Changes made in Docker are saved in that persistent volume.

Do not rerun `backend/database/init_database.py` on campaign data: it drops tables. Do
not run `backend/database/seed_database.py --force` on campaign data: it deletes rows.
Never use `docker compose down -v` or delete the database volume; that would
erase the live database. For normal shutdown use `dev.ps1 stop`. Back up the
volume before experimenting with database migrations or destructive scripts.

Use `backend`, `frontend`, `storybook`, or `datasette` after an action to target
one service, for example:

```powershell
powershell -ExecutionPolicy Bypass -File ./dev.ps1 logs backend
powershell -ExecutionPolicy Bypass -File ./dev.ps1 restart frontend
powershell -ExecutionPolicy Bypass -File ./dev.ps1 rebuild backend
```

Use `rebuild` after changing Dockerfiles, Compose service configuration, Python
requirements, or npm dependencies/lockfile. Normal application source edits do
not require a rebuild. No database setup step runs automatically on start,
restart, or rebuild. If the volume is absent, restore the database into it before
starting services.

## Addresses and data

| Service | Local address | Purpose |
| --- | --- | --- |
| Backend | <http://localhost:8000> | FastAPI; `/openapi.json` for API schema |
| Frontend | <http://localhost:5173> | Vite React app, proxies `/api` to backend |
| Storybook | <http://localhost:6007> | Component stories |
| Datasette | <http://localhost:8667> | Browse the live SQLite database |

These ports bind to `127.0.0.1` only, so other devices cannot connect directly.
The volume is mounted at `/workspace/data/database` in the backend and at
`/data` in Datasette. Compose sets `DND_DATABASE_PATH` to the database in the
volume. Datasette mounts the live volume read-write to allow SQLite locking
and WAL sidecars; the browser UI is for reading, not editing. Frontend and
Storybook each have a separate, replaceable `node_modules` cache volume.

## Agent behavior

Before lifecycle actions or browser checks, run `dev.ps1 status` and reuse a
healthy stack. For ordinary source changes do not stop or restart services;
hot reload handles them. If a service is unhealthy, inspect `dev.ps1 logs
<service>` before restarting that service. Do not launch a competing Uvicorn,
Vite, or Storybook process on the same ports. Leave shared services running
after checks, and never erase or replace the live database as cleanup.
