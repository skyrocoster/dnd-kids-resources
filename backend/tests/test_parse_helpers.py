"""Unit tests for the router ``_parse_*_row`` None-guard branches and JSON parsing.

Each router helper must return ``None`` when given ``None``.  This is the
simplest branch in the file but is missed by integration tests because no
endpoint naturally passes ``None`` to the helper.
"""

import pytest

from backend.app.routers.dungeons import _parse_dungeon_row
from backend.app.routers.encounters import _parse_encounter_row
from backend.app.routers.monsters import (
    _cr_sort,
    _parse_monster_row,
)
from backend.app.routers.npcs import _parse_npc_row
from backend.app.routers.players import _parse_player_row
from backend.app.routers.loot import _parse_loot_bundle_row
from backend.app.routers.weapons import _parse_weapon_row


class _FakeRow(dict):
    """Minimal stand-in for sqlite3.Row (dict() over it yields the same mapping)."""


def test_parse_row_none_guards():
    assert _parse_dungeon_row(None) is None
    assert _parse_encounter_row(None) is None
    assert _parse_monster_row(None) is None
    assert _parse_npc_row(None) is None
    assert _parse_player_row(None) is None
    assert _parse_weapon_row(None) is None
    assert _parse_loot_bundle_row(None) is None


def test_parse_npc_row_decodes_structured_statblock():
    row = _FakeRow(
        id=1,
        name="Parsed NPC",
        race="Elf",
        gender="Female",
        background="Sage",
        sizes='["medium"]',
        alignment="neutral good",
        creature_type='{"category": "humanoid", "tags": ["elf"]}',
        ac='{"value": 14}',
        hp='{"average": 12, "formula": "3d8"}',
        speed='[{"mode": "walk", "feet": 30}]',
        abilities='{"str": 8, "dex": 16}',
        saving_throws='{"dex": 5}',
        skills='{"arcana": 4}',
        passive_perception=11,
        damage_resistances='[{"damage_type": "necrotic"}]',
        damage_immunities='[]',
        damage_vulnerabilities='[]',
        condition_immunities='["charmed"]',
        senses='[{"type": "darkvision", "range": 60}]',
        languages='["Common", "Elvish"]',
        features='{"traits": [{"name": "Old Lore"}]}',
        cr="1/4",
        cr_note="support NPC",
        experience_points=50,
        appearance='{"hair_colour": "silver"}',
        notes="Keeper of old secrets.",
    )
    parsed = _parse_npc_row(row)
    assert parsed["sizes"] == ["medium"]
    assert parsed["creature_type"]["tags"] == ["elf"]
    assert parsed["ac"] == {"value": 14}
    assert parsed["hp"] == {"average": 12, "formula": "3d8"}
    assert parsed["speed"] == [{"mode": "walk", "feet": 30}]
    assert parsed["abilities"] == {"str": 8, "dex": 16}
    assert parsed["saving_throws"] == {"dex": 5}
    assert parsed["damage_resistances"] == [{"damage_type": "necrotic"}]
    assert parsed["condition_immunities"] == ["charmed"]
    assert parsed["senses"] == [{"type": "darkvision", "range": 60}]
    assert parsed["languages"] == ["Common", "Elvish"]
    assert parsed["features"] == {"traits": [{"name": "Old Lore"}]}
    assert parsed["appearance"] == {"hair_colour": "silver"}


def test_parse_player_row_decodes_stats_skills_and_partials():
    row = _FakeRow(
        id=1,
        name="Test",
        abilities='{"str": 15, "dex": 14}',
        skills='{"acrobatics": 5, "perception": 3}',
    )
    parsed = _parse_player_row(row)
    assert parsed["abilities"] == {"str": 15, "dex": 14}
    assert parsed["skills"] == {"acrobatics": 5, "perception": 3}

    stats_only = _parse_player_row(_FakeRow(id=2, name="Only Stats", abilities='{"str": 10}'))
    assert stats_only["abilities"] == {"str": 10}
    assert stats_only.get("skills") is None

    skills_only = _parse_player_row(_FakeRow(id=3, name="Only Skills", skills='{"stealth": 8}'))
    assert skills_only["skills"] == {"stealth": 8}
    assert skills_only.get("stats") is None


@pytest.mark.parametrize("bad_cr", [None, "Unknown", "garbage", "1/0"])
def test_cr_sort_rejects_missing_and_garbage(bad_cr):
    assert _cr_sort(bad_cr) is None
