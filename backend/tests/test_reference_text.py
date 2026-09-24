import pytest

from backend.app.reference_text import (
    ReferenceDefinition,
    SpellValueReferenceContext,
    create_reference_registry,
    parse_reference_text,
    resolve_reference_text,
    spell_value_reference_registry,
    validate_reference_text,
)


def test_parse_text_and_references():
    assert parse_reference_text("Deal 1d6 damage.") == {
        "valid": True,
        "document": {
            "source": "Deal 1d6 damage.",
            "nodes": [
                {
                    "type": "text",
                    "text": "Deal 1d6 damage.",
                    "start": 0,
                    "end": 16,
                },
            ],
        },
    }
    result = parse_reference_text("Roll {spell_attack_bonus} now")
    assert result["valid"] is True
    assert result["document"]["nodes"] == [
        {"type": "text", "text": "Roll ", "start": 0, "end": 5},
        {
            "type": "reference",
            "token": "spell_attack_bonus",
            "source": "{spell_attack_bonus}",
            "start": 5,
            "end": 25,
        },
        {"type": "text", "text": " now", "start": 25, "end": 29},
    ]


def test_validate_accepts_registered_spell_tokens():
    assert validate_reference_text(
        "Attack +{spell_attack_bonus}; save DC {spell_save_dc}.",
        spell_value_reference_registry,
    ) == {"valid": True, "document": {"source": "Attack +{spell_attack_bonus}; save DC {spell_save_dc}.", "nodes": [
        {"type": "text", "text": "Attack +", "start": 0, "end": 8},
        {"type": "reference", "token": "spell_attack_bonus", "source": "{spell_attack_bonus}", "start": 8, "end": 28},
        {"type": "text", "text": "; save DC ", "start": 28, "end": 38},
        {"type": "reference", "token": "spell_save_dc", "source": "{spell_save_dc}", "start": 38, "end": 53},
        {"type": "text", "text": ".", "start": 53, "end": 54},
    ]}}


def test_validate_rejects_malformed_braces():
    cases = [
        ("open {spell_attack_bonus", 5, 24),
        ("close }", 6, 7),
        ("nested {spell_{attack_bonus}}", 7, 28),
        ("empty {}", 6, 8),
        ("blank {   }", 6, 11),
    ]

    for source, start, end in cases:
        result = validate_reference_text(source, spell_value_reference_registry)
        assert result["valid"] is False
        assert result["errors"][0]["kind"] == "malformed"
        assert result["errors"][0]["start"] == start
        assert result["errors"][0]["end"] == end


def test_validate_rejects_unknown_tokens_in_source_order():
    single = validate_reference_text(
        "Use {weapon_bonus}.",
        spell_value_reference_registry,
    )
    assert single == {
        "valid": False,
        "errors": [
            {
                "kind": "unknown",
                "message": "Unknown reference token: weapon_bonus",
                "token": "weapon_bonus",
                "start": 4,
                "end": 18,
            },
        ],
    }
    result = validate_reference_text(
        "{first_unknown} then {second_unknown}",
        spell_value_reference_registry,
    )
    assert result["valid"] is False
    assert [(error["token"], error["start"]) for error in result["errors"]] == [
        ("first_unknown", 0),
        ("second_unknown", 21),
    ]


def test_resolve_tokens_uses_value_empty_and_fallback():
    doc = parse_reference_text("Roll {spell_attack_bonus}")
    result = resolve_reference_text(doc["document"], spell_value_reference_registry, SpellValueReferenceContext(spell_attack_bonus=5))
    assert result == "Roll 5"
    unknown = parse_reference_text("Use {unknown}")
    assert resolve_reference_text(unknown["document"], spell_value_reference_registry, SpellValueReferenceContext()) == "Use "
    none_doc = parse_reference_text("DC {spell_save_dc}")
    assert resolve_reference_text(none_doc["document"], spell_value_reference_registry, SpellValueReferenceContext(spell_save_dc=None)) == "DC your spell save DC"


def test_create_registry_rejects_duplicate_token():
    definitions = [
        ReferenceDefinition[str](token="test", kind="value", domain="spell", fallback="fallback", resolve=lambda _: None),
        ReferenceDefinition[str](token="test", kind="value", domain="spell", fallback="fallback", resolve=lambda _: None),
    ]
    with pytest.raises(ValueError, match="Duplicate"):
        create_reference_registry(definitions)
