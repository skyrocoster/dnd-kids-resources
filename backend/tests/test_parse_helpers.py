"""Unit tests for the router ``_parse_*_row`` None-guard branches and JSON parsing.

Each router helper must return ``None`` when given ``None``.  This is the
simplest branch in the file but is missed by integration tests because no
endpoint naturally passes ``None`` to the helper.
"""

import pytest
from fastapi import HTTPException

from backend.app.routers.dungeons import _parse_dungeon_row
from backend.app.routers.encounters import _parse_encounter_row
from backend.app.routers.monsters import (
    _cr_sort,
    _parse_monster_row,
    _select_monster,
)
from backend.app.routers.npcs import _parse_npc_row
from backend.app.routers.players import _parse_player_row
from backend.app.routers.loot import _parse_loot_bundle_row
from backend.app.routers.weapons import _parse_weapon_row


class _FakeRow(dict):
    """Minimal stand-in for sqlite3.Row (dict() over it yields the same mapping)."""


def test_parse_dungeon_row_none():
    assert _parse_dungeon_row(None) is None


def test_parse_encounter_row_none():
    assert _parse_encounter_row(None) is None


def test_parse_monster_row_none():
    assert _parse_monster_row(None) is None


def test_parse_npc_row_none():
    assert _parse_npc_row(None) is None


def test_parse_player_row_none():
    assert _parse_player_row(None) is None


def test_parse_weapon_row_none():
    assert _parse_weapon_row(None) is None


def test_parse_loot_bundle_row_none():
    assert _parse_loot_bundle_row(None) is None


def test_parse_player_row_decodes_stats_and_skills():
    row = _FakeRow(
        id=1,
        name="Test",
        stats='{"str": 15, "dex": 14}',
        skills='{"acrobatics": 5, "perception": 3}',
    )
    parsed = _parse_player_row(row)
    assert parsed["stats"] == {"str": 15, "dex": 14}
    assert parsed["skills"] == {"acrobatics": 5, "perception": 3}


def test_parse_player_row_decodes_stats_only():
    row = _FakeRow(id=2, name="Only Stats", stats='{"str": 10}')
    parsed = _parse_player_row(row)
    assert parsed["stats"] == {"str": 10}
    assert parsed.get("skills") is None


def test_parse_player_row_decodes_skills_only():
    row = _FakeRow(id=3, name="Only Skills", skills='{"stealth": 8}')
    parsed = _parse_player_row(row)
    assert parsed["skills"] == {"stealth": 8}
    assert parsed.get("stats") is None


def test_cr_sort_none():
    assert _cr_sort(None) is None


def test_cr_sort_unknown():
    assert _cr_sort("Unknown") is None


def test_cr_sort_garbage():
    assert _cr_sort("garbage") is None


def test_cr_sort_division_by_zero():
    assert _cr_sort("1/0") is None


def test_select_monster_404(seeded_db):
    cursor = seeded_db.cursor()
    with pytest.raises(HTTPException) as exc:
        _select_monster(cursor, 999999)
    assert exc.value.status_code == 404
