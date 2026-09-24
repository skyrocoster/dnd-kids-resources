from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", operation_id="getHealth")
def get_health():
    """Readiness endpoint for tooling (e2e servers, healthchecks); no database access."""
    return {"status": "ok"}
