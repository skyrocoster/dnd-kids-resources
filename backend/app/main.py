from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .caching import invalidate_cache
from .db import bind_db_path, get_db_path
from .routers import (
    at_the_table,
    dungeons,
    encounters,
    fog,
    health,
    items,
    layouts,
    loom,
    loot,
    monsters,
    npcs,
    players,
    reference,
    session_state,
    spells,
    weapons,
)
from .schemas.errors import ApiErrorResponse

FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"


def create_app(database_path: Path | str | None = None) -> FastAPI:
    """Build the API application, optionally using an app-specific SQLite path."""
    app = FastAPI(
        title="D&D Kids Resources API",
        description="API for D&D 5e resource management",
        version="2.0.0",
        dependencies=[Depends(bind_db_path)],
    )
    app.state.database_path = Path(database_path) if database_path is not None else None

    @app.middleware("http")
    async def invalidate_reads_after_write(request, call_next):
        db_path = get_db_path(request)
        response = await call_next(request)
        if request.method in {"POST", "PUT", "PATCH", "DELETE"} and response.status_code < 400:
            invalidate_cache(db_path=db_path)
        return response

    # CORS for Vite dev server (localhost and LAN). Keep every configured origin,
    # including the in-use LAN address; all API route methods remain allowed.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://192.168.1.175:5173",  # LAN IP
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
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
    app.include_router(session_state.router)
    app.include_router(fog.router)
    app.include_router(health.router)
    app.include_router(at_the_table.router)
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
        error = ApiErrorResponse(code="api_not_found", message="Not Found")
        return JSONResponse(status_code=404, content=error.model_dump(mode="json"))

    # Serve the built frontend (frontend/dist), if present, with an SPA fallback
    # for client-side routes. All API routes are under /api, so anything else
    # that isn't a known static asset falls back to index.html.
    if FRONTEND_DIST.is_dir():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
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

    return app


app = create_app()
