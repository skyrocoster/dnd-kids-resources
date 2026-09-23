# D&D Kids Resources

Online D&D 5th Edition tools and reference cards for kids, built for running games at the table.

## Quick start

Install Docker Desktop and keep it running. The application uses the SQLite
database stored in the persistent Docker volume. From the repository root, start
the services with:

```powershell
powershell -ExecutionPolicy Bypass -File ./dev.ps1 start
```

`start` checks that the database is already present in the Docker volume; it
does not create, copy, or seed a database. Do not run `backend/database/init_database.py`
against an existing campaign: it drops the tables. Do not remove the database
volume; see [development services](docs/DEVELOPMENT_SERVICES.md) for data safety
and recovery notes.

Check the running services or their recent logs with:

```powershell
powershell -ExecutionPolicy Bypass -File ./dev.ps1 status
powershell -ExecutionPolicy Bypass -File ./dev.ps1 logs
```

The API is at <http://localhost:8000>, frontend at <http://localhost:5173>,
Storybook at <http://localhost:6007>, and Datasette at <http://localhost:8667>.
See [development services](docs/DEVELOPMENT_SERVICES.md) for lifecycle commands,
data safety, and rebuild instructions.

## Python dependency audit

Install the Python requirements, including the local audit tool, then run
`pip-audit` against the backend requirements from the repository root:

```powershell
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m pip_audit --requirement backend/requirements.txt
```

The audit checks the declared backend dependencies against the vulnerability
database used by `pip-audit`. It is a local maintenance check and does not run
automatically in CI.

## Documentation

See [development services](docs/DEVELOPMENT_SERVICES.md) and the
[focused Plan template](docs/PLAN_TEMPLATE.md).

## Repository map

- [Backend](backend/README.md) — API, database setup, and migrations
- [Frontend](frontend/README.md) — React/Vite app and theme-token tools
- [Python source and repository tools](src/README.md)
- [Development services](docs/DEVELOPMENT_SERVICES.md)

## License

Non-commercial fan project based on D&D 5th Edition rules.
