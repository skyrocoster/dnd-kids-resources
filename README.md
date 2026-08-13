# D&D Kids Resources

Online D&D 5th Edition tools and reference cards for kids, built for running games at the table.

## Quick start

From the repository root:

```bash
python scripts/init_database.py
python scripts/seed_database.py
pip install -r requirements.txt
```

Run the backend from the repository root:

```bash
uvicorn backend.app.main:app --reload
```

Run the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

The API is at `http://localhost:8000`; the frontend is at `http://localhost:5173`.

## Documentation

Start with the [documentation router](docs/README.md).

## License

Non-commercial fan project based on D&D 5th Edition rules.
