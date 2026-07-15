"""Integration tests against the full, frozen production seed data.

These run through the ``real_client`` fixture (real schema + real data/seeds/*.json)
and exist to catch the one class of bug the unit suite structurally cannot: a
response-model / JSON-parsing mismatch that only triggers on real data shapes.

Every prior 500 in this project was exactly that — the drifted hand-written test
schema and thin seed rows let it pass unit tests while failing live:
  * GET /api/monsters (router selected non-existent `challenge` column)
  * GET /api/encounters (aliased `units AS creatures` never parsed)
  * GET /api/players/{id}/spells (stale duplicate spell-row parser)

The rule these tests encode: **no configured GET endpoint may 500 against the real
seed data, and every row of every browsable collection must serialize.**
"""

import json
import sqlite3

import pytest

# Whole module runs against the full frozen production seeds (slower, read-only).
pytestmark = pytest.mark.integration

LIST_ENDPOINTS = [
    "/api/abilities",
    "/api/conditions",
    "/api/damage_types",
    "/api/skills",
    "/api/spell-components",
    "/api/spells",
    "/api/monsters",
    "/api/weapons",
    "/api/items",
    "/api/loot-bundles",
    "/api/players",
    "/api/npcs",
    "/api/quests",
    "/api/encounters",
    "/api/dungeons",
]

# Collections that support ?limit=&offset= pagination and back a browser page.
PAGINATED_COLLECTIONS = ["/api/spells", "/api/monsters", "/api/weapons", "/api/items", "/api/loot-bundles"]

# Collections with GET /{id} detail routes.
DETAIL_COLLECTIONS = [
    "/api/spells",
    "/api/monsters",
    "/api/weapons",
    "/api/items",
    "/api/loot-bundles",
    "/api/players",
    "/api/npcs",
    "/api/quests",
    "/api/encounters",
    "/api/dungeons",
]


@pytest.mark.parametrize("path", LIST_ENDPOINTS)
def test_list_endpoint_returns_200(real_client, path):
    """Every list endpoint serializes real data without a 500."""
    resp = real_client.get(path)
    assert resp.status_code == 200, f"{path} -> {resp.status_code}: {resp.text[:300]}"
    assert isinstance(resp.json(), list)


@pytest.mark.parametrize("base", PAGINATED_COLLECTIONS)
def test_every_row_serializes(real_client, base):
    """Page through the entire collection — a single unserializable row 500s a page.

    Regression guard: list endpoints default to limit=100, so a bad row deeper in
    the table would be invisible to a single unpaged GET.
    """
    offset = 0
    total = 0
    while True:
        resp = real_client.get(f"{base}?limit=500&offset={offset}")
        assert resp.status_code == 200, (
            f"{base} offset={offset} -> {resp.status_code}: {resp.text[:300]}"
        )
        batch = resp.json()
        total += len(batch)
        if len(batch) < 500:
            break
        offset += 500
    assert total > 0, f"{base} returned no rows — seed data missing?"


def test_every_monster_detail_serializes_with_target_contract(real_client):
    """Every migrated monster detail response validates the target API contract."""
    offset = 0
    total = 0
    expected_fields = {
        "id",
        "name",
        "aliases",
        "sizes",
        "family",
        "alignment",
        "creature_type",
        "ac",
        "hp",
        "speed",
        "abilities",
        "saving_throws",
        "skills",
        "passive_perception",
        "damage_resistances",
        "damage_immunities",
        "damage_vulnerabilities",
        "condition_immunities",
        "senses",
        "languages",
        "audio_path",
        "features",
        "cr",
        "cr_sort",
        "cr_note",
        "experience_points",
    }
    legacy_fields = {
        "alias",
        "size",
        "group",
        "type",
        "stats",
        "save",
        "skill",
        "resist",
        "vulnerable",
        "action",
        "reaction",
        "traits",
        "spellcasting",
        "bonus",
        "legendary",
        "soundClip",
        "cr_details",
    }

    while True:
        listing = real_client.get(f"/api/monsters?limit=500&offset={offset}")
        assert listing.status_code == 200, listing.text[:300]
        batch = listing.json()
        for listed_monster in batch:
            detail = real_client.get(f"/api/monsters/{listed_monster['id']}")
            assert detail.status_code == 200, (
                f"/api/monsters/{listed_monster['id']} -> {detail.status_code}: {detail.text[:300]}"
            )
            monster = detail.json()
            assert set(monster) == expected_fields
            assert not (set(monster) & legacy_fields)
            assert "{@" not in json.dumps(monster, ensure_ascii=False)
            assert isinstance(monster["aliases"], list)
            assert isinstance(monster["saving_throws"], dict)
            assert isinstance(monster["skills"], dict)
            assert isinstance(monster["features"], dict)
            assert isinstance(monster["features"]["actions"], list)
        total += len(batch)
        if len(batch) < 500:
            break
        offset += 500
    assert total == 2276


def test_real_monster_sqlite_projection_preserves_ids_indexes_and_json(real_db_path):
    """The rebuilt SQLite projection keeps explicit IDs, JSON text columns, and both CR indexes."""
    conn = sqlite3.connect(real_db_path)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """
            SELECT COUNT(*) AS total, COUNT(DISTINCT id) AS ids, MIN(id) AS min_id, MAX(id) AS max_id,
                   SUM(CASE WHEN cr_sort IS NOT NULL THEN 1 ELSE 0 END) AS sortable_crs
            FROM monsters
            """
        ).fetchone()
        assert dict(row) == {
            "total": 2276,
            "ids": 2276,
            "min_id": 1,
            "max_id": 2734,
            "sortable_crs": 2275,
        }

        indexes = {row["name"] for row in conn.execute("PRAGMA index_list('monsters')")}
        assert "idx_monsters_cr" in indexes
        assert "idx_monsters_cr_sort" in indexes

        wolf = conn.execute("SELECT id, ac, features, cr, cr_sort FROM monsters WHERE name = 'Wolf'").fetchone()
        assert wolf["id"] == 2600
        assert json.loads(wolf["ac"]) == {"value": 13, "note": "natural armour", "alternatives": []}
        features = json.loads(wolf["features"])
        assert features["actions"][0]["attack"]["damage"] == [
            {"formula": "2d4", "bonus": 2, "damage_types": ["piercing"]}
        ]
        assert wolf["cr"] == "1/4"
        assert wolf["cr_sort"] == 0.25
    finally:
        conn.close()


@pytest.mark.parametrize("base", DETAIL_COLLECTIONS)
def test_detail_endpoints_serialize(real_client, base):
    """The first few detail rows of each collection serialize without a 500."""
    listing = real_client.get(f"{base}?limit=5") if "?" not in base else real_client.get(base)
    assert listing.status_code == 200
    items = listing.json()
    if not items:
        pytest.skip(f"{base} has no seeded rows to detail")
    for item in items[:5]:
        resp = real_client.get(f"{base}/{item['id']}")
        assert resp.status_code == 200, (
            f"{base}/{item['id']} -> {resp.status_code}: {resp.text[:300]}"
        )
        assert resp.json()["id"] == item["id"]


def test_every_player_nested_endpoints_serialize(real_client):
    """Every seeded player's /spells and /weapons must serialize.

    This is the exact regression that shipped: /api/players/{id}/spells 500'd for
    every real player because a spell assigned to them had a populated attack_type
    that the players router's stale parser never decoded.
    """
    players = real_client.get("/api/players")
    assert players.status_code == 200
    player_list = players.json()
    assert player_list, "No seeded players — cannot exercise nested endpoints"

    for player in player_list:
        pid = player["id"]
        spells = real_client.get(f"/api/players/{pid}/spells")
        assert spells.status_code == 200, (
            f"/api/players/{pid}/spells -> {spells.status_code}: {spells.text[:300]}"
        )
        assert isinstance(spells.json(), list)

        weapons = real_client.get(f"/api/players/{pid}/weapons")
        assert weapons.status_code == 200, (
            f"/api/players/{pid}/weapons -> {weapons.status_code}: {weapons.text[:300]}"
        )
        assert isinstance(weapons.json(), list)


def test_players_expose_class(real_client):
    """Real players must surface their class (regression: was silently dropped)."""
    resp = real_client.get("/api/players")
    assert resp.status_code == 200
    players = resp.json()
    assert players
    # At least one seeded player has a class set.
    assert any(p.get("class_") for p in players), "class column dropped for all players"


def test_assigned_spell_json_columns_are_parsed(real_client):
    """A spell fetched via a player must have canonical fields decoded from JSON."""
    players = real_client.get("/api/players").json()
    for player in players:
        spells = real_client.get(f"/api/players/{player['id']}/spells").json()
        for spell in spells:
            assert isinstance(spell["name"], str)
            assert isinstance(spell["attacks"], list)
            assert isinstance(spell["components"], list)
