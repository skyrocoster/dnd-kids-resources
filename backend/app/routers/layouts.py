from fastapi import APIRouter, HTTPException
from typing import List
import json

from ..db import get_db, parse_json_value
from ..schemas import MapLayoutBlob, IncomingGateway
from .session_state import _normalize_session_state

router = APIRouter(prefix="/api", tags=["layouts"])

_FIXTURE_ID_KEYS = {
    "doors": "door_id",
    "stairs": "stair_id",
    "props": "prop_id",
    "portals": "portal_id",
}

# Geometry identity per fixture kind: a change in any of these invalidates the
# complete session override for that fixture (settled deletion/geometry rules).
_GEOMETRY_KEYS = {
    "doors": ("cell", "side", "z"),
    "stairs": ("from", "to"),
    "props": ("cell", "z"),
    "portals": ("cell", "z", "to"),
}


def _fixtures_by_id(layout_data: dict, kind: str) -> dict:
    """Map stringified fixture id -> fixture dict for a layout kind."""
    fixtures = layout_data.get(kind) if isinstance(layout_data, dict) else None
    if not isinstance(fixtures, list):
        return {}
    id_key = _FIXTURE_ID_KEYS[kind]
    return {
        str(fixture[id_key]): fixture
        for fixture in fixtures
        if isinstance(fixture, dict) and fixture.get(id_key) is not None
    }


def _geometry(fixture: dict, kind: str) -> tuple:
    """Geometry identity tuple for a fixture, used to detect a moved fixture."""
    return tuple(fixture.get(key) for key in _GEOMETRY_KEYS[kind])


def _authored_leaves(fixture: dict) -> dict:
    """Flat authored open / obstacle armed / obstacle shown leaves of a fixture.

    Prefers the `state` sub-object authored by the editor (FixtureState), then the
    top-level `open`/`obstacles` written by the obstacle migration, and finally
    derives from the PassageFlags (hidden/locked/trapped) as the frontend does.
    """
    leaves: dict = {}
    if not isinstance(fixture, dict):
        return leaves
    state = fixture.get("state")
    if isinstance(state, dict) and ("open" in state or "obstacles" in state):
        if isinstance(state.get("open"), bool):
            leaves["open"] = state["open"]
        obstacles = state.get("obstacles")
        if isinstance(obstacles, dict):
            _collect_obstacle_leaves(leaves, obstacles)
    elif isinstance(fixture.get("obstacles"), dict) or "open" in fixture:
        if isinstance(fixture.get("open"), bool):
            leaves["open"] = fixture["open"]
        if isinstance(fixture.get("obstacles"), dict):
            _collect_obstacle_leaves(leaves, fixture["obstacles"])
    else:
        # PassageFlags derivation (frontend fixtureStateFromFlags): locked means the lock
        # obstacle is armed (and shown), trapped means the trap obstacle is armed (and shown),
        # hidden means concealment is armed. Doors open authored false.
        leaves["open"] = False
        _collect_obstacle_leaves(
            leaves,
            {
                "concealment": {"armed": bool(fixture.get("hidden"))},
                "lock": {
                    "armed": bool(fixture.get("locked")),
                    "shown": bool(fixture.get("locked")),
                },
                "trap": {
                    "armed": bool(fixture.get("trapped")),
                    "shown": bool(fixture.get("trapped")),
                },
            },
        )
    return leaves


def _collect_obstacle_leaves(leaves: dict, obstacles: dict) -> None:
    """Add `kind.armed` / `kind.shown` leaves for bool obstacle values."""
    for obstacle_kind, obstacle in obstacles.items():
        if not isinstance(obstacle, dict):
            continue
        for leaf in ("armed", "shown"):
            if isinstance(obstacle.get(leaf), bool):
                leaves[f"{obstacle_kind}.{leaf}"] = obstacle[leaf]


def _drop_session_leaf(entry: dict, leaf: str) -> None:
    """Remove one session override leaf (e.g. `open` or `lock.armed`) from a fixture entry."""
    if leaf == "open":
        entry.pop("open", None)
        return
    obstacle_kind, _, obstacle_leaf = leaf.partition(".")
    obstacles = entry.get("obstacles")
    if not isinstance(obstacles, dict):
        return
    obstacle = obstacles.get(obstacle_kind)
    if isinstance(obstacle, dict):
        obstacle.pop(obstacle_leaf, None)
        if not obstacle:
            del obstacles[obstacle_kind]
    if not obstacles:
        del entry["obstacles"]


def _prune_session_state(prior_layout: dict, incoming_layout: dict, session_data: dict) -> dict:
    """Drop session overrides invalidated by a layout save.

    Deleted fixtures and geometry changes remove the complete fixture override;
    authored open/obstacle armed/shown changes remove only the matching leaves;
    descriptive changes (title, note, loot, NPC, encounter, kind, ...) preserve.
    """
    pruned = dict(session_data) if isinstance(session_data, dict) else {}
    for kind in _FIXTURE_ID_KEYS:
        prior = _fixtures_by_id(prior_layout, kind)
        incoming = _fixtures_by_id(incoming_layout, kind)
        overrides = pruned.get(kind)
        if not isinstance(overrides, dict):
            continue
        for fixture_id in list(overrides):
            if fixture_id not in prior:
                # No prior fixture to compare against (e.g. first save); leave the override.
                continue
            if fixture_id not in incoming:
                # Deleted fixture: remove the complete override.
                del overrides[fixture_id]
                continue
            if _geometry(prior[fixture_id], kind) != _geometry(incoming[fixture_id], kind):
                # Geometry changed: remove the complete override.
                del overrides[fixture_id]
                continue
            # Same fixture, same geometry: authored leaf changes remove only matching leaves.
            prior_leaves = _authored_leaves(prior[fixture_id])
            incoming_leaves = _authored_leaves(incoming[fixture_id])
            for leaf in set(prior_leaves) | set(incoming_leaves):
                if prior_leaves.get(leaf) != incoming_leaves.get(leaf):
                    _drop_session_leaf(overrides[fixture_id], leaf)
        if not overrides:
            del pruned[kind]
    return pruned


@router.get("/dungeons/{dungeon_id}/layout", response_model=MapLayoutBlob)
def get_dungeon_layout(dungeon_id: int) -> dict:
    """Get the layout for a dungeon (Map Lab editor stage)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM map_layout WHERE dungeon_id = ?", (dungeon_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Layout not found")
        return {"data": parse_json_value(row["data"])}


@router.get("/dungeons/{dungeon_id}/incoming-gateways", response_model=List[IncomingGateway])
def get_incoming_gateways(dungeon_id: int) -> list:
    """List every portal in every other dungeon's layout that links into this dungeon"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM dungeons WHERE id = ?", (dungeon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Dungeon not found")

        cursor.execute(
            """SELECT map_layout.dungeon_id AS dungeon_id, dungeons.title AS dungeon_title,
                      map_layout.data AS data
               FROM map_layout JOIN dungeons ON dungeons.id = map_layout.dungeon_id
               WHERE map_layout.dungeon_id != ?""",
            (dungeon_id,),
        )
        rows = cursor.fetchall()

    gateways = []
    for row in rows:
        layout = parse_json_value(row["data"])
        for portal in layout.get("portals", []):
            to = portal.get("to") or {}
            if to.get("dungeon_id") != dungeon_id:
                continue
            gateways.append(
                {
                    "dungeon_id": row["dungeon_id"],
                    "dungeon_title": row["dungeon_title"],
                    "portal_id": portal.get("portal_id"),
                    "title": portal.get("title"),
                    "z": portal.get("z"),
                    "cell": portal.get("cell"),
                }
            )
    return gateways


@router.put("/dungeons/{dungeon_id}/layout", response_model=MapLayoutBlob)
def save_dungeon_layout(dungeon_id: int, blob: MapLayoutBlob) -> dict:
    """Save/upsert the layout for a dungeon (Map Lab editor stage)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM dungeons WHERE id = ?", (dungeon_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Dungeon not found")
        try:
            # Load the prior layout and session row inside the save transaction so a
            # layout save prunes only the session overrides it invalidates (deletion,
            # geometry, or authored-leaf changes) and keeps descriptive/content edits.
            cursor.execute("SELECT data FROM map_layout WHERE dungeon_id = ?", (dungeon_id,))
            prior_row = cursor.fetchone()
            cursor.execute("SELECT data FROM map_session_state WHERE dungeon_id = ?", (dungeon_id,))
            session_row = cursor.fetchone()

            pruned_session = None
            if prior_row is not None and session_row is not None:
                pruned_session = _normalize_session_state(
                    _prune_session_state(
                        parse_json_value(prior_row["data"]) or {},
                        blob.data,
                        parse_json_value(session_row["data"]) or {},
                    )
                )

            cursor.execute(
                """INSERT INTO map_layout (dungeon_id, data) VALUES (?, ?)
                   ON CONFLICT(dungeon_id) DO UPDATE SET data = excluded.data""",
                (dungeon_id, json.dumps(blob.data)),
            )
            if pruned_session is not None:
                if pruned_session:
                    cursor.execute(
                        """INSERT INTO map_session_state (dungeon_id, data) VALUES (?, ?)
                           ON CONFLICT(dungeon_id) DO UPDATE SET data = excluded.data""",
                        (dungeon_id, json.dumps(pruned_session)),
                    )
                else:
                    cursor.execute(
                        "DELETE FROM map_session_state WHERE dungeon_id = ?", (dungeon_id,)
                    )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Failed to save layout: {str(e)}")

        cursor.execute("SELECT data FROM map_layout WHERE dungeon_id = ?", (dungeon_id,))
        row = cursor.fetchone()
        return {"data": parse_json_value(row["data"])}
