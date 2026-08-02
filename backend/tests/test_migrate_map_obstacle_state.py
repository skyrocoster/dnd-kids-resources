"""Tests for map obstacle state migration."""

import json
import sqlite3
import tempfile
from pathlib import Path
from typing import Any, Dict

import pytest

# Import the migration module
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))
from migrate_map_obstacle_state import (
    reset_fixture_obstacles,
    reset_layout_obstacles,
    migrate_database,
    migrate_seed_files,
    DEFAULT_FIXTURE_STATE,
)


@pytest.fixture
def temp_db():
    """Create a temporary SQLite database with map tables."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Create the necessary tables
        cursor.execute(
            """
            CREATE TABLE dungeons (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT
            )
        """
        )

        cursor.execute(
            """
            CREATE TABLE map_layout (
                dungeon_id INTEGER PRIMARY KEY,
                data TEXT NOT NULL,
                FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE
            )
        """
        )

        cursor.execute(
            """
            CREATE TABLE map_session_state (
                dungeon_id INTEGER PRIMARY KEY,
                data TEXT NOT NULL,
                FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE
            )
        """
        )

        conn.commit()
        conn.close()

        yield db_path

        # Cleanup happens automatically with tempfile


@pytest.fixture
def temp_seeds_dir():
    """Create a temporary seeds directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


class TestResetFixtureObstacles:
    """Test single fixture obstacle reset."""

    def test_door_reset(self):
        """Test door fixture reset with DC removal and open=false."""
        door = {
            "door_id": 1,
            "cell": [0, 0],
            "side": "north",
            "hidden": False,
            "locked": True,
            "trapped": False,
            "breakDc": 18,
            "pickDc": 15,
            "title": "Heavy Oak Door",
            "note": "Stuck",
        }

        reset_fixture_obstacles(door)

        # Check DCs removed
        assert "breakDc" not in door
        assert "pickDc" not in door

        # Check door open is false
        assert door["open"] is False

        # Check obstacles present with defaults
        assert "obstacles" in door
        assert door["obstacles"]["lock"]["armed"] is False
        assert door["obstacles"]["lock"]["shown"] is False
        assert door["obstacles"]["concealment"]["armed"] is False
        assert door["obstacles"]["trap"]["armed"] is False

        # Check non-obstacle content preserved
        assert door["door_id"] == 1
        assert door["title"] == "Heavy Oak Door"
        assert door["note"] == "Stuck"
        assert door["hidden"] is False
        assert door["locked"] is True

    def test_stair_reset(self):
        """Test stair fixture reset with DC removal."""
        stair = {
            "stair_id": 2,
            "cell_start": [1, 1],
            "cell_end": [1, 2],
            "z_start": 0,
            "z_end": 1,
            "hidden": False,
            "locked": False,
            "trapped": True,
            "searchDc": 12,
            "hiddenDc": 14,
            "note": "Spiral stairs",
        }

        reset_fixture_obstacles(stair)

        # Check DCs removed
        assert "searchDc" not in stair
        assert "hiddenDc" not in stair

        # Check obstacles present
        assert "obstacles" in stair
        assert stair["obstacles"]["trap"]["armed"] is False

        # Check non-obstacle content preserved
        assert stair["stair_id"] == 2
        assert stair["note"] == "Spiral stairs"
        assert stair["hidden"] is False
        assert stair["locked"] is False

    def test_prop_reset(self):
        """Test prop fixture reset."""
        prop = {
            "prop_id": 3,
            "cell": [2, 2],
            "title": "Bookshelf",
            "hidden": False,
            "locked": False,
            "trapped": False,
            "breakDc": 16,
            "loot": [{"name": "Gold coin", "quantity": 50}],
        }

        reset_fixture_obstacles(prop)

        # Check DCs removed
        assert "breakDc" not in prop

        # Check obstacles present
        assert "obstacles" in prop

        # Check non-obstacle content preserved
        assert prop["prop_id"] == 3
        assert prop["title"] == "Bookshelf"
        assert prop["loot"] == [{"name": "Gold coin", "quantity": 50}]

    def test_portal_reset(self):
        """Test portal fixture reset."""
        portal = {
            "portal_id": 4,
            "cell": [3, 3],
            "destination": "portal_5",
            "hidden": False,
            "locked": True,
            "trapped": False,
            "pickDc": 14,
            "destination_dungeon": 2,
            "destination_cell": [5, 5],
        }

        reset_fixture_obstacles(portal)

        # Check DCs removed
        assert "pickDc" not in portal

        # Check obstacles present
        assert "obstacles" in portal

        # Check non-obstacle content preserved
        assert portal["portal_id"] == 4
        assert portal["destination"] == "portal_5"
        assert portal["destination_dungeon"] == 2

    def test_fixture_without_door_id_no_open(self):
        """Test that non-door fixtures don't get open field."""
        prop = {"prop_id": 1, "cell": [0, 0]}
        reset_fixture_obstacles(prop)
        assert "open" not in prop


class TestResetLayoutObstacles:
    """Test full layout obstacle reset."""

    def test_layout_with_all_fixture_types(self):
        """Test layout reset with doors, stairs, props, and portals."""
        layout = {
            "meta": {"cellSizeFt": 5, "padding": {"top": 2, "right": 2, "bottom": 2, "left": 2}},
            "doors": [
                {
                    "door_id": 1,
                    "cell": [0, 0],
                    "side": "north",
                    "title": "Main Door",
                    "breakDc": 18,
                }
            ],
            "stairs": [
                {
                    "stair_id": 1,
                    "cell_start": [1, 1],
                    "cell_end": [1, 2],
                    "z_start": 0,
                    "z_end": 1,
                    "pickDc": 15,
                }
            ],
            "props": [
                {
                    "prop_id": 1,
                    "cell": [2, 2],
                    "title": "Treasure chest",
                    "searchDc": 12,
                }
            ],
            "portals": [
                {
                    "portal_id": 1,
                    "cell": [3, 3],
                    "destination": "portal_2",
                    "hiddenDc": 10,
                }
            ],
        }

        reset_layout_obstacles(layout)

        # Check all fixtures have obstacles
        for door in layout["doors"]:
            assert "obstacles" in door
            assert "breakDc" not in door
            assert door["open"] is False

        for stair in layout["stairs"]:
            assert "obstacles" in stair
            assert "pickDc" not in stair

        for prop in layout["props"]:
            assert "obstacles" in prop
            assert "searchDc" not in prop

        for portal in layout["portals"]:
            assert "obstacles" in portal
            assert "hiddenDc" not in portal

    def test_layout_preserves_non_obstacle_content(self):
        """Test that layout reset preserves rooms, floors, and features."""
        layout = {
            "meta": {"cellSizeFt": 5, "padding": {"top": 2, "right": 2, "bottom": 2, "left": 2}},
            "rooms": [
                {"room_id": 1, "title": "Throne Room", "origin": [0, 0], "cells": [[0, 0]]}
            ],
            "floors": [{"z": 0, "title": "Ground Floor"}],
            "features": [{"feature_id": 1, "type": "statue"}],
            "doors": [{"door_id": 1, "cell": [0, 0], "side": "north", "breakDc": 20}],
            "stairs": [],
            "props": [],
            "portals": [],
        }

        reset_layout_obstacles(layout)

        # Check non-obstacle content preserved
        assert len(layout["rooms"]) == 1
        assert layout["rooms"][0]["title"] == "Throne Room"
        assert len(layout["floors"]) == 1
        assert layout["floors"][0]["title"] == "Ground Floor"
        assert len(layout["features"]) == 1


class TestMigrateDatabase:
    """Test database migration."""

    def test_migrate_single_layout(self, temp_db):
        """Test migration of a single map_layout record."""
        # Setup
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        cursor.execute("INSERT INTO dungeons (id, title) VALUES (1, 'Test Dungeon')")

        layout_data = {
            "meta": {"cellSizeFt": 5, "padding": {"top": 2, "right": 2, "bottom": 2, "left": 2}},
            "doors": [{"door_id": 1, "cell": [0, 0], "side": "north", "breakDc": 18}],
            "stairs": [],
            "props": [],
            "portals": [],
        }

        cursor.execute(
            "INSERT INTO map_layout (dungeon_id, data) VALUES (1, ?)",
            (json.dumps(layout_data, ensure_ascii=False),),
        )
        conn.commit()
        conn.close()

        # Migrate
        migrate_database(str(temp_db))

        # Verify
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        cursor.execute("SELECT data FROM map_layout WHERE dungeon_id = 1")
        result = cursor.fetchone()
        assert result is not None

        migrated_layout = json.loads(result[0])
        assert "obstacles" in migrated_layout["doors"][0]
        assert "breakDc" not in migrated_layout["doors"][0]
        assert migrated_layout["doors"][0]["open"] is False

        conn.close()

    def test_migrate_deletes_session_state(self, temp_db):
        """Test that migration deletes map_session_state records."""
        # Setup
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        cursor.execute("INSERT INTO dungeons (id, title) VALUES (1, 'Test Dungeon')")

        layout_data = {
            "meta": {"cellSizeFt": 5},
            "doors": [],
            "stairs": [],
            "props": [],
            "portals": [],
        }

        cursor.execute(
            "INSERT INTO map_layout (dungeon_id, data) VALUES (1, ?)",
            (json.dumps(layout_data),),
        )

        cursor.execute(
            "INSERT INTO map_session_state (dungeon_id, data) VALUES (1, ?)",
            (json.dumps({"some": "session_state"}),),
        )

        conn.commit()
        conn.close()

        # Verify before migration
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM map_session_state")
        count_before = cursor.fetchone()[0]
        assert count_before == 1
        conn.close()

        # Migrate
        migrate_database(str(temp_db))

        # Verify after migration
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM map_session_state")
        count_after = cursor.fetchone()[0]
        assert count_after == 0
        conn.close()

    def test_migrate_idempotent(self, temp_db):
        """Test that migration is idempotent."""
        # Setup
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        cursor.execute("INSERT INTO dungeons (id, title) VALUES (1, 'Test Dungeon')")

        layout_data = {
            "meta": {"cellSizeFt": 5},
            "doors": [{"door_id": 1, "cell": [0, 0], "side": "north", "breakDc": 18}],
            "stairs": [],
            "props": [],
            "portals": [],
        }

        cursor.execute(
            "INSERT INTO map_layout (dungeon_id, data) VALUES (1, ?)",
            (json.dumps(layout_data),),
        )
        conn.commit()
        conn.close()

        # Migrate twice
        migrate_database(str(temp_db))
        migrate_database(str(temp_db))

        # Verify result is same
        conn = sqlite3.connect(str(temp_db))
        cursor = conn.cursor()

        cursor.execute("SELECT data FROM map_layout WHERE dungeon_id = 1")
        result = cursor.fetchone()

        migrated_layout = json.loads(result[0])
        assert "obstacles" in migrated_layout["doors"][0]
        assert "breakDc" not in migrated_layout["doors"][0]
        assert migrated_layout["doors"][0]["open"] is False

        conn.close()


class TestMigrateSeedFiles:
    """Test seed file migration."""

    def test_migrate_seed_layouts(self, temp_seeds_dir):
        """Test migration of seed_map_layouts.json."""
        # Setup
        layouts_file = temp_seeds_dir / "seed_map_layouts.json"
        layouts = [
            {
                "dungeon_id": 1,
                "data": {
                    "meta": {"cellSizeFt": 5},
                    "doors": [{"door_id": 1, "cell": [0, 0], "side": "north", "breakDc": 18}],
                    "stairs": [],
                    "props": [],
                    "portals": [],
                },
            }
        ]

        with open(layouts_file, "w", encoding="utf-8") as f:
            json.dump(layouts, f, ensure_ascii=False)

        # Migrate
        migrate_seed_files(str(temp_seeds_dir))

        # Verify
        with open(layouts_file, "r", encoding="utf-8") as f:
            migrated_layouts = json.load(f)

        assert "obstacles" in migrated_layouts[0]["data"]["doors"][0]
        assert "breakDc" not in migrated_layouts[0]["data"]["doors"][0]

    def test_migrate_clears_session_file(self, temp_seeds_dir):
        """Test that migration clears seed_map_session_state.json."""
        # Setup
        session_file = temp_seeds_dir / "seed_map_session_state.json"

        with open(session_file, "w", encoding="utf-8") as f:
            json.dump([{"dungeon_id": 1, "data": {"some": "state"}}], f)

        # Migrate
        migrate_seed_files(str(temp_seeds_dir))

        # Verify
        with open(session_file, "r", encoding="utf-8") as f:
            result = json.load(f)

        assert result == []

    def test_migrate_skips_missing_files(self, temp_seeds_dir):
        """Test that migration skips missing optional seed files."""
        # With no seed files present, migration should not fail
        migrate_seed_files(str(temp_seeds_dir))

        # Verify directory still exists and is empty
        assert temp_seeds_dir.exists()

    def test_migrate_preserves_all_fixture_types(self, temp_seeds_dir):
        """Test migration preserves all fixture types and content."""
        # Setup
        layouts_file = temp_seeds_dir / "seed_map_layouts.json"
        layouts = [
            {
                "dungeon_id": 1,
                "data": {
                    "meta": {"cellSizeFt": 5},
                    "rooms": [{"room_id": 1, "title": "Main Hall"}],
                    "doors": [
                        {
                            "door_id": 1,
                            "cell": [0, 0],
                            "side": "north",
                            "title": "Oak Door",
                            "breakDc": 20,
                        }
                    ],
                    "stairs": [
                        {
                            "stair_id": 1,
                            "cell_start": [1, 1],
                            "cell_end": [1, 2],
                            "z_start": 0,
                            "z_end": 1,
                            "pickDc": 15,
                        }
                    ],
                    "props": [
                        {
                            "prop_id": 1,
                            "cell": [2, 2],
                            "title": "Chest",
                            "loot": [{"name": "Gold", "quantity": 100}],
                            "searchDc": 12,
                        }
                    ],
                    "portals": [
                        {
                            "portal_id": 1,
                            "cell": [3, 3],
                            "destination": "portal_2",
                            "destination_dungeon": 2,
                            "hiddenDc": 10,
                        }
                    ],
                    "floors": [{"z": 0, "title": "Ground"}],
                    "features": [{"feature_id": 1, "type": "statue"}],
                },
            }
        ]

        with open(layouts_file, "w", encoding="utf-8") as f:
            json.dump(layouts, f, ensure_ascii=False)

        # Migrate
        migrate_seed_files(str(temp_seeds_dir))

        # Verify
        with open(layouts_file, "r", encoding="utf-8") as f:
            migrated_layouts = json.load(f)

        data = migrated_layouts[0]["data"]

        # Check all fixtures have obstacles
        assert "obstacles" in data["doors"][0]
        assert "obstacles" in data["stairs"][0]
        assert "obstacles" in data["props"][0]
        assert "obstacles" in data["portals"][0]

        # Check DCs removed
        assert "breakDc" not in data["doors"][0]
        assert "pickDc" not in data["stairs"][0]
        assert "searchDc" not in data["props"][0]
        assert "hiddenDc" not in data["portals"][0]

        # Check non-obstacle content preserved
        assert data["doors"][0]["title"] == "Oak Door"
        assert data["stairs"][0]["z_start"] == 0
        assert data["props"][0]["loot"][0]["name"] == "Gold"
        assert data["portals"][0]["destination_dungeon"] == 2
        assert data["rooms"][0]["title"] == "Main Hall"
        assert len(data["floors"]) == 1
