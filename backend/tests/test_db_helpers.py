"""Unit tests for the shared JSON-parsing helpers in backend/app/db.py.

These are the functions every router leans on, including the canonical
``parse_spell_row`` whose earlier duplicate caused the players-spells 500. They're
pure functions, so they're tested directly rather than through an endpoint.
"""

import pytest

from backend.app.db import (
    dict_from_row,
    parse_json_value,
    parse_json_list,
    parse_spell_row,
)


class _FakeRow(dict):
    """Minimal stand-in for sqlite3.Row (dict() over it yields the same mapping)."""


def test_parse_json_value_decodes_json():
    assert parse_json_value('{"a": 1}') == {"a": 1}
    assert parse_json_value("[1, 2, 3]") == [1, 2, 3]


def test_parse_json_value_passes_through_non_json_and_none():
    assert parse_json_value("just a string") == "just a string"
    assert parse_json_value(None) is None
    assert parse_json_value(42) == 42


def test_parse_json_list_from_json_array():
    assert parse_json_list('["V", "S"]') == ["V", "S"]


def test_parse_json_list_none_and_non_list_values():
    assert parse_json_list(None) is None
    with pytest.raises(TypeError):
        parse_json_list("V, S, M")
    with pytest.raises(TypeError):
        parse_json_list("42")


def test_dict_from_row_none():
    assert dict_from_row(None) is None


def test_parse_spell_row_none():
    assert parse_spell_row(None) is None


def test_parse_spell_row_decodes_every_json_column():
    """The regression this guards: target object and list columns both get decoded."""
    row = _FakeRow(
        id=1,
        name="Test",
        level=3,
        school="evocation",
        description="Test spell",
        damage='[{"name": "primary", "formula": "2d6", "damage_types": ["fire"]}]',
        healing='{"amount": "1d4", "temp_hp": true, "max_hp": false}',
        range="120 feet",
        higher_levels='{"text": "At higher levels", "damage_by_slot": {"3": "3d6"}}',
        casting_times='["1 action"]',
        duration="Instantaneous",
        concentration=False,
        ritual=False,
        components='["V", "S"]',
        materials=None,
        attacks='[{"kind": "ranged", "saving_throws": ["dex"]}]',
        area_of_effect='{"shape": "sphere", "size": 20}',
    )
    parsed = parse_spell_row(row)
    assert parsed["damage"] == [{"name": "primary", "formula": "2d6", "damage_types": ["fire"]}]
    assert parsed["healing"] == {"amount": "1d4", "temp_hp": True, "max_hp": False}
    assert parsed["area_of_effect"] == {"shape": "sphere", "size": 20}
    assert parsed["higher_levels"] == {"text": "At higher levels", "damage_by_slot": {"3": "3d6"}}
    assert parsed["casting_times"] == ["1 action"]
    assert parsed["components"] == ["V", "S"]
    assert parsed["attacks"] == [{"kind": "ranged", "saving_throws": ["dex"]}]


def test_parse_spell_row_empty_collections_survive():
    row = _FakeRow(
        id=2,
        name="Empty",
        level=0,
        description="Empty spell",
        range="Self",
        duration="Instantaneous",
        concentration=False,
        ritual=False,
        damage="[]",
        healing='{"amount": null, "temp_hp": false, "max_hp": false}',
        higher_levels='{"text": null, "damage_by_slot": {}}',
        casting_times="[]",
        components="[]",
        attacks="[]",
        area_of_effect='{"shape": null, "size": null}',
    )
    parsed = parse_spell_row(row)
    assert parsed["damage"] == []
    assert parsed["healing"] == {"amount": None, "temp_hp": False, "max_hp": False}
    assert parsed["higher_levels"] == {"text": None, "damage_by_slot": {}}
    assert parsed["casting_times"] == []
    assert parsed["components"] == []
    assert parsed["attacks"] == []
    assert parsed["area_of_effect"] == {"shape": None, "size": None}
