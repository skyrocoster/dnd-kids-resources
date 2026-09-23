# Backend

FastAPI service and database operations.

- `app/` — API application and feature modules
- `database/` — schema creation and JSON seed import
- `migrations/` — one-time database migrations
- `tests/` — backend and API tests

In the Compose backend container, run database modules from the repository root:

```powershell
docker compose exec backend python -m backend.database.init_database
docker compose exec backend python -m backend.database.seed_database
```

**Initialization drops existing tables; force-seeding deletes data. Do not use
either command on campaign data without a verified backup.**

Development service lifecycle commands are in the root `dev.ps1` and
[`docs/DEVELOPMENT_SERVICES.md`](../docs/DEVELOPMENT_SERVICES.md).
