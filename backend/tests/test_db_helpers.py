"""Unit tests for the shared JSON-parsing helpers in backend/app/db.py.

These are the functions every router leans on, including the canonical
``parse_spell_row`` whose earlier duplicate caused the players-spells 500. They're
pure functions, so they're tested directly rather than through an endpoint.
"""

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


def test_parse_json_list_from_legacy_comma_string():
    # Legacy rows stored list columns as a plain comma-separated string.
    assert parse_json_list("V, S, M") == ["V", "S", "M"]


def test_parse_json_list_none_and_scalar():
    assert parse_json_list(None) is None
    assert parse_json_list("42") == [42]  # a lone non-list JSON scalar is decoded then wrapped


def test_dict_from_row_none():
    assert dict_from_row(None) is None


def test_parse_spell_row_none():
    assert parse_spell_row(None) is None


def test_parse_spell_row_decodes_every_json_column():
    """The regression this guards: object columns AND list columns both get decoded."""
    row = _FakeRow(
        id=1,
        spell_name="Test",
        attack_type='[{"name": "initial", "type": "melee", "save": []}]',
        heal='{"amount": "1d4", "temp_hp": true}',
        damage='[{"amount": "2d6", "type": "fire"}]',
        area_of_effect='{"shape": "sphere", "size": 20}',
        components='["V", "S"]',
        classes='["Wizard"]',
        subclasses=None,
    )
    parsed = parse_spell_row(row)
    assert parsed["attack_type"] == [{"name": "initial", "type": "melee", "save": []}]
    assert parsed["heal"] == {"amount": "1d4", "temp_hp": True}
    assert parsed["damage"] == [{"amount": "2d6", "type": "fire"}]
    assert parsed["area_of_effect"] == {"shape": "sphere", "size": 20}
    assert parsed["components"] == ["V", "S"]
    assert parsed["classes"] == ["Wizard"]
    assert parsed["subclasses"] is None


def test_parse_spell_row_handles_legacy_comma_components():
    row = _FakeRow(id=2, spell_name="Legacy", components="V, S", classes="Wizard, Cleric")
    parsed = parse_spell_row(row)
    assert parsed["components"] == ["V", "S"]
    assert parsed["classes"] == ["Wizard", "Cleric"]
