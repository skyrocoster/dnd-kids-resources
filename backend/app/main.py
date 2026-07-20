from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routers import (
    encounters,
    dungeons,
    items,
    layouts,
    loom,
    loot,
    monsters,
    npcs,
    players,
    reference,
    spells,
    weapons,
)

app = FastAPI(
    title="D&D Kids Resources API",
    description="API for D&D 5e resource management",
    version="2.0.0",
)

# CORS for Vite dev server (localhost and LAN)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.1.175:5173",  # LAN IP
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(reference.router)
app.include_router(spells.router)
app.include_router(monsters.router)
app.include_router(weapons.router)
app.include_router(items.router)
app.include_router(loot.router)
app.include_router(players.router)
app.include_router(npcs.router)
app.include_router(encounters.router)
app.include_router(dungeons.router)
app.include_router(layouts.router)
app.include_router(loom.router)


# Any /api/* path not matched by a router above is a genuine 404, not an SPA
# route. Registered before the SPA catch-all so it takes priority for /api/*
# and isn't swallowed into a 405 (wrong-method match on the GET-only SPA route).
@app.api_route(
    "/api/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    include_in_schema=False,
)
def api_not_found(full_path: str):
    raise HTTPException(status_code=404, detail="Not Found")


# Serve the built frontend (frontend/dist), if present, with an SPA fallback
# for client-side routes. All API routes are under /api, so anything else
# that isn't a known static asset falls back to index.html.
FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        """Serve the SPA's index.html for any non-API route (client-side routing)."""
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
else:

    @app.get("/")
    def root():
        """API root endpoint (frontend not built)."""
        return {
            "message": "D&D Kids Resources API v2",
            "docs": "/docs",
            "openapi": "/openapi.json",
        }
