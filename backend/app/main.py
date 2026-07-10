from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import reference, spells, monsters, weapons, players, npcs, quests, encounters, dungeons

app = FastAPI(
    title="D&D Kids Resources API",
    description="API for D&D 5e resource management",
    version="2.0.0",
)

# CORS for Vite dev server (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(reference.router)
app.include_router(spells.router)
app.include_router(monsters.router)
app.include_router(weapons.router)
app.include_router(players.router)
app.include_router(npcs.router)
app.include_router(quests.router)
app.include_router(encounters.router)
app.include_router(dungeons.router)


@app.get("/")
def root():
    """API root endpoint."""
    return {
        "message": "D&D Kids Resources API v2",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }
