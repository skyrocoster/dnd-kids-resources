from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path

import pytest

from backend.app.schemas import Monster

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "scripts" / "migrate_monsters.py"
SEED_PATH = ROOT / "data" / "seeds" / "seed_monsters.json"
LEGACY_TOP_LEVEL_FIELDS = {
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
    "legendaryHeader",
    "mythic",
    "mythicHeader",
    "reactionRules",
    "soundClip",
    "cr_details",
}
FEATURE_LIST_KEYS = (
    "traits",
    "actions",
    "bonus_actions",
    "reactions",
    "legendary_actions",
    "mythic_actions",
)

spec = importlib.util.spec_from_file_location("migrate_monsters", SCRIPT_PATH)
migrate_monsters = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(migrate_monsters)


def base_monster(**overrides):
    monster = {
        "id": 1,
        "name": "Fixture Monster",
        "alias": [],
        "size": ["medium"],
        "group": [],
        "alignment": ["U"],
        "type": "beast",
        "ac": {"12": None},
        "hp": {"average": 7, "formula": "2d6", "minimum": 2, "maximum": 12},
        "speed": {"walk": 30},
        "stats": {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
        "save": {"str": None, "dex": None, "con": None, "int": None, "wis": None, "cha": None},
        "skill": {"perception": None, "stealth": None, "passive perception": 10},
        "resist": [],
        "vulnerable": [],
        "senses": [],
        "languages": [],
        "action": [],
        "reaction": [],
        "traits": [],
        "spellcasting": [],
        "bonus": [],
        "legendary": [],
        "legendaryHeader": None,
        "mythic": [],
        "mythicHeader": None,
        "reactionRules": [],
        "soundClip": {},
        "cr": "0",
        "cr_details": {},
    }
    monster.update(overrides)
    return monster


def migrate_one(monster):
    return migrate_monsters.migrate([copy.deepcopy(monster)])[0]


def load_canonical_monsters():
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def all_feature_entries(monster):
    for key in FEATURE_LIST_KEYS:
        yield from monster["features"][key]


def test_canonical_migrated_seed_matches_m1_corpus_contract():
    monsters = load_canonical_monsters()
    all_fields = set().union(*(monster.keys() for monster in monsters))

    assert len(monsters) == 2276
    assert len({monster["id"] for monster in monsters}) == 2276
    assert min(monster["id"] for monster in monsters) == 1
    assert max(monster["id"] for monster in monsters) == 2734
    assert len({monster["name"] for monster in monsters}) == 2276
    assert len({monster["name"].lower() for monster in monsters}) == 2276
    assert not all_fields & LEGACY_TOP_LEVEL_FIELDS
    assert "{@" not in json.dumps(monsters, ensure_ascii=False)
    assert migrate_monsters.migrate(copy.deepcopy(monsters)) == monsters

    for monster in monsters:
        Monster.model_validate(monster)


def test_canonical_migrated_seed_preserves_aggregate_rich_data():
    monsters = load_canonical_monsters()

    assert sum(1 for monster in monsters if monster["ac"] and monster["ac"]["alternatives"]) == 91
    assert sum(1 for monster in monsters if monster["ac"] is None) == 0
    assert sum(1 for monster in monsters if monster["saving_throws"]) == 1065
    assert sum(1 for monster in monsters if monster["skills"]) == 1599
    assert sum(1 for monster in monsters if monster["passive_perception"] is not None) == 2243

    assert sum(len(monster["damage_resistances"]) for monster in monsters) == 2406
    assert sum(len(monster["damage_immunities"]) for monster in monsters) == 1583
    assert sum(len(monster["damage_vulnerabilities"]) for monster in monsters) == 94
    assert sum(len(monster["condition_immunities"]) for monster in monsters) == 3620
    assert sum(len(monster["senses"]) for monster in monsters) == 1861
    assert sum(1 for monster in monsters if monster["languages"]) == 1781

    assert sum(len(monster["features"]["traits"]) for monster in monsters) == 4735
    assert sum(len(monster["features"]["actions"]) for monster in monsters) == 6338
    assert sum(len(monster["features"]["bonus_actions"]) for monster in monsters) == 380
    assert sum(len(monster["features"]["reactions"]) for monster in monsters) == 309
    assert sum(len(monster["features"]["legendary_actions"]) for monster in monsters) == 736
    assert sum(len(monster["features"]["mythic_actions"]) for monster in monsters) == 35
    assert sum(len(monster["features"]["spellcasting"]) for monster in monsters) == 712
    assert sum(1 for monster in monsters if monster["features"]["reaction_intro"]) == 15
    assert sum(1 for monster in monsters if monster["features"]["legendary_intro"]) == 3
    assert sum(1 for monster in monsters if monster["features"]["legendary_actions_per_round"] is not None) == 255

    action_attacks = sum(1 for monster in monsters for feature in monster["features"]["actions"] if feature["attack"])
    attack_damage = sum(
        len(feature["attack"]["damage"])
        for monster in monsters
        for feature in all_feature_entries(monster)
        if feature["attack"]
    )
    assert action_attacks == 3586
    assert attack_damage == 4363

    assert sum(1 for monster in monsters if monster["audio_path"]) == 963
    assert sum(1 for monster in monsters if monster["cr"] is not None) == 2276
    assert sum(1 for monster in monsters if monster["cr_sort"] is not None) == 2275
    assert sum(1 for monster in monsters if monster["cr_note"]) == 43
    assert sum(1 for monster in monsters if monster["experience_points"] is not None) == 5


def test_migrates_wolf_fixture_with_sparse_maps_text_cleanup_and_audio():
    wolf = base_monster(
        id=2600,
        name="Wolf",
        ac={"13": "natural armour"},
        hp={"average": 11, "formula": "2d8 + 2", "minimum": 4, "maximum": 18},
        speed={"walk": 40},
        stats={"str": 12, "dex": 15, "con": 12, "int": 3, "wis": 12, "cha": 6},
        skill={"perception": 3, "stealth": 4, "passive perception": 13},
        traits=[
            {"name": "Keen Senses"},
            {
                "name": "Keen Hearing and Smell",
                "notes": ["The wolf has advantage on Wisdom ({@skill Perception}) checks that rely on hearing or smell."],
            },
        ],
        action=[
            {
                "name": "Bite",
                "notes": ["If the target is a creature, it must succeed on a DC11 Strength saving throw or be knocked prone."],
                "attack": {
                    "type": "melee",
                    "mod": 4,
                    "range": 5,
                    "targets": 1,
                    "damage": "2d4",
                    "damage_mod": 2,
                    "damage_type": "piercing",
                },
            }
        ],
        soundClip={"path": "bestiary/audio/wolf.mp3"},
        cr="1/4",
    )

    migrated = migrate_one(wolf)

    assert migrated["id"] == 2600
    assert migrated["alignment"] == "unaligned"
    assert migrated["creature_type"] == {"category": "beast", "tags": [], "swarm_size": None}
    assert migrated["ac"] == {"value": 13, "note": "natural armour", "alternatives": []}
    assert migrated["hp"] == {"average": 11, "formula": "2d8 + 2"}
    assert migrated["speed"] == [{"mode": "walk", "feet": 40, "note": None, "hover": False}]
    assert migrated["saving_throws"] == {}
    assert migrated["skills"] == {"perception": 3, "stealth": 4}
    assert migrated["passive_perception"] == 13
    assert migrated["audio_path"] == "wolf.mp3"
    assert migrated["features"]["traits"][0] == {"name": "Keen Senses", "description": None, "attack": None}
    assert migrated["features"]["traits"][1]["description"] == (
        "The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell."
    )
    assert migrated["features"]["actions"][0]["description"] == (
        "If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone."
    )
    assert migrated["features"]["actions"][0]["attack"] == {
        "kind": "melee_weapon",
        "attack_bonus": 4,
        "automatic_hit": False,
        "range_ft": 5,
        "long_range_ft": None,
        "targets": 1,
        "damage": [{"formula": "2d4", "bonus": 2, "damage_types": ["piercing"]}],
    }
    assert migrated["cr"] == "1/4"
    assert migrated["cr_sort"] == 0.25


def test_migrates_mage_fixture_with_alternative_ac_and_spell_labels():
    mage = base_monster(
        id=1557,
        name="Mage",
        type={"type": "humanoid", "tags": ["any race"]},
        ac={"12": None, "15": "with Mage armour"},
        save={"str": None, "dex": None, "con": None, "int": 6, "wis": 4, "cha": None},
        skill={"arcana": 6, "history": 6, "passive perception": 11},
        action=[
            {
                "name": "Dagger",
                "notes": ["piercing damage."],
                "attack": {
                    "type": "ranged",
                    "mod": 5,
                    "range": 20,
                    "max_range": 60,
                    "targets": 1,
                    "damage": "1d4",
                    "damage_mod": 2,
                    "damage_type": "piercing",
                },
            }
        ],
        spellcasting=[
            {
                "name": "Spellcasting",
                "type": "spellcasting",
                "headerEntries": [
                    "The mage is a 9th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC14, {@hit 6} to hit with spell attacks)."
                ],
                "spells": {
                    "0": {"spells": ["Fire Bolt", {"entry": "Light", "hidden": True}]},
                    "1": {"slots": 4, "spells": ["Detect Magic", "Mage Armor"]},
                },
                "ability": "int",
                "hidden": ["spells"],
            }
        ],
        cr=6,
    )

    migrated = migrate_one(mage)

    assert migrated["ac"] == {"value": 12, "note": None, "alternatives": [{"value": 15, "note": "with Mage armour"}]}
    assert migrated["saving_throws"] == {"int": 6, "wis": 4}
    assert migrated["skills"] == {"arcana": 6, "history": 6}
    assert migrated["features"]["actions"][0]["attack"]["kind"] == "ranged_weapon"
    assert migrated["features"]["actions"][0]["attack"]["long_range_ft"] == 60
    spellcasting = migrated["features"]["spellcasting"][0]
    assert spellcasting["description"] == (
        "The mage is a 9th-level spellcaster. Its spellcasting ability is Intelligence "
        "(spell save DC 14, +6 to hit with spell attacks)."
    )
    assert [group["label"] for group in spellcasting["groups"]] == ["Cantrips (at will)", "1st level (4 slots)"]
    assert spellcasting["groups"][0]["hidden"] is True
    assert spellcasting["groups"][0]["spells"][1] == {"name": "Light", "hidden": True}
    assert migrated["cr"] == "6"
    assert migrated["cr_sort"] == 6.0


def test_migrates_adult_red_dragon_fixture_with_defenses_and_legendary_actions():
    dragon = base_monster(
        id=39,
        name="Adult Red Dragon",
        group=["Chromatic Dragon"],
        alignment=["C", "E"],
        type="dragon",
        speed={"walk": 40, "climb": 40, "fly": 80},
        resist=[{"type": "damageImmune", "damage_type": "fire"}],
        action=[
            {
                "name": "Bite",
                "attack": {
                    "type": "melee",
                    "mod": 14,
                    "range": 10,
                    "targets": 1,
                    "damage": "2d10",
                    "damage_mod": 8,
                    "damage_type": "piercing",
                    "secondary_damage": "2d6",
                    "secondary_damage_type": "fire",
                },
            },
            {
                "name": "Fire Breath {@recharge 5}",
                "notes": [
                    "The dragon exhales fire in a 60-foot cone. Each creature in that area must make a DC21 Dexterity saving throw, taking 18d6 fire damage on a failed save."
                ],
            },
        ],
        legendary=[{"name": "Detect", "entries": ["The dragon makes a Wisdom ({@skill Perception}) check."]}],
        cr=17,
    )

    migrated = migrate_one(dragon)

    assert migrated["family"] == "Chromatic Dragon"
    assert migrated["alignment"] == "chaotic evil"
    assert migrated["speed"] == [
        {"mode": "walk", "feet": 40, "note": None, "hover": False},
        {"mode": "climb", "feet": 40, "note": None, "hover": False},
        {"mode": "fly", "feet": 80, "note": None, "hover": False},
    ]
    assert migrated["damage_immunities"] == [{"damage_type": "fire", "note": None, "conditional": False}]
    bite_damage = migrated["features"]["actions"][0]["attack"]["damage"]
    assert bite_damage == [
        {"formula": "2d10", "bonus": 8, "damage_types": ["piercing"]},
        {"formula": "2d6", "bonus": 0, "damage_types": ["fire"]},
    ]
    assert migrated["features"]["actions"][1]["name"] == "Fire Breath (Recharge 5-6)"
    assert migrated["features"]["actions"][1]["description"].startswith("The dragon exhales fire")
    assert migrated["features"]["legendary_actions"] == [
        {"name": "Detect", "description": "The dragon makes a Wisdom (Perception) check.", "attack": None}
    ]
    assert migrated["features"]["legendary_actions_per_round"] == 3


def test_migrates_alternate_form_movement_and_conditional_defenses():
    euryale = base_monster(
        id=867,
        name="Euryale",
        speed={
            "walk": 30,
            "alternate": {
                "walk": [{"number": 50, "condition": "in serpent form"}],
                "climb": [{"number": 50, "condition": "in serpent form"}],
            },
        },
        resist=[
            {"damage_type": "bludgeoning", "type": "resist", "note": "from non-magical attacks", "condition": True},
            {"type": "conditionImmune", "immune_type": "petrified"},
            {"type": "damageImmune", "damage_type": "poison"},
        ],
        vulnerable=[{"vulnerable": ["radiant", "fire"], "note": "while cursed", "cond": True}],
    )

    migrated = migrate_one(euryale)

    assert migrated["speed"] == [
        {"mode": "walk", "feet": 30, "note": None, "hover": False},
        {"mode": "walk", "feet": 50, "note": "in serpent form", "hover": False},
        {"mode": "climb", "feet": 50, "note": "in serpent form", "hover": False},
    ]
    assert migrated["damage_resistances"] == [
        {"damage_type": "bludgeoning", "note": "from non-magical attacks", "conditional": True}
    ]
    assert migrated["damage_immunities"] == [{"damage_type": "poison", "note": None, "conditional": False}]
    assert migrated["condition_immunities"] == ["petrified"]
    assert migrated["damage_vulnerabilities"] == [
        {"damage_type": "radiant", "note": "while cursed", "conditional": True},
        {"damage_type": "fire", "note": "while cursed", "conditional": True},
    ]


def test_migrates_cr_context_explicit_xp_unknown_cr_and_determinism():
    lair = base_monster(id=10, name="Lair", cr={"cr": "11", "lair": "12", "xp": 7200}, cr_details={"xp": 7200})
    unknown = base_monster(id=11, name="Unknown CR", cr="Unknown")

    first = migrate_monsters.migrate([copy.deepcopy(lair), copy.deepcopy(unknown)])
    second = migrate_monsters.migrate([copy.deepcopy(lair), copy.deepcopy(unknown)])

    assert first == second
    assert first[0]["cr"] == "11"
    assert first[0]["cr_sort"] == 11.0
    assert first[0]["cr_note"] == "12 in lair"
    assert first[0]["experience_points"] == 7200
    assert first[1]["cr"] == "Unknown"
    assert first[1]["cr_sort"] is None


def test_invalid_tag_audio_and_conflicting_xp_fail_with_monster_context():
    bad_tag = base_monster(id=20, name="Bad Tag", action=[{"name": "Zap", "notes": ["{@unknown nope}"]}])
    bad_audio = base_monster(id=21, name="Bad Audio", soundClip={"path": "../bad.mp3"})
    bad_xp = base_monster(id=22, name="Bad XP", cr={"cr": "1", "xp": 200}, cr_details={"xp": 100})

    with pytest.raises(migrate_monsters.MigrationError, match=r"monster 20 'Bad Tag'.*action\[0\].notes\[0\].*unknown markup"):
        migrate_one(bad_tag)
    with pytest.raises(migrate_monsters.MigrationError, match="monster 21 'Bad Audio'.*soundClip.path.*unsafe audio path"):
        migrate_one(bad_audio)
    with pytest.raises(migrate_monsters.MigrationError, match="monster 22 'Bad XP'.*cr_details.xp.*conflicts"):
        migrate_one(bad_xp)


def test_invalid_cr_fraction_denominator_fails():
    monster = base_monster(id=23, name="Bad CR", cr="1/0")

    with pytest.raises(migrate_monsters.MigrationError, match="monster 23 'Bad CR'.*cr.*invalid CR fraction"):
        migrate_one(monster)
