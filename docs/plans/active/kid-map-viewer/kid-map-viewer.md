# Kid Map Viewer — the tablet gets the DM's map, and colour a child can say out loud

> **Status:** Complete and archived. All nine stages shipped, plus a 6R repair pass. This plan moved to
> [docs/plans/done/kid-map-viewer/](../../done/kid-map-viewer/kid-map-viewer.md).
> Supersedes [Kid Map Legibility](../../done/kid-map-legibility/kid-map-legibility.md)

- **Area guide:** [Players](../../../areas/players.md)
- **Read trigger:** How the kid map draws rooms, doors, stairs, markers and names; the shared map canvas; the curtain's per-field visibility; the kid colour families and their solver; the party marker; room label placement in either app

## Touches

- `frontend/src/player/**`
- `frontend/src/map/**`
- `frontend/src/model/maplabModel.ts`
- `frontend/src/features/dungeons/maplab/**`
- `frontend/src/theme.css`
- `scripts/derive-kid-palette.mjs`, `scripts/check_docs.py`
- `backend/app/routers/session_state.py`
- `docs/table-tests/**`
- `docs/areas/players.md`
