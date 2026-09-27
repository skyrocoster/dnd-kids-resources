import json
import tempfile
import unittest
from pathlib import Path

from extract import build_inventory, canonical_action, run_inventory


class MonsterActionInventoryTests(unittest.TestCase):
    def test_identity_ignores_only_object_key_order(self):
        first = {
            "name": "Claw",
            "description": None,
            "attack": {
                "kind": "melee_weapon",
                "damage": [{"formula": "1d4", "bonus": 2}],
            },
        }
        reordered = {
            "attack": {
                "damage": [{"bonus": 2, "formula": "1d4"}],
                "kind": "melee_weapon",
            },
            "description": None,
            "name": "Claw",
        }
        array_reordered = {
            "name": "Claw",
            "description": None,
            "attack": {
                "kind": "melee_weapon",
                "damage": [{"formula": "1d4", "bonus": 2}],
            },
            "modes": ["left", "right"],
        }
        other_array_order = {**array_reordered, "modes": ["right", "left"]}

        self.assertEqual(canonical_action(first), canonical_action(reordered))
        self.assertNotEqual(
            canonical_action(array_reordered), canonical_action(other_array_order)
        )
        self.assertNotEqual(
            canonical_action({"name": "Claw", "description": None}),
            canonical_action({"name": "Claw"}),
        )
        self.assertNotEqual(
            canonical_action({"name": "Claw", "attack_bonus": 4}),
            canonical_action({"name": "Claw", "attack_bonus": 5}),
        )
        self.assertNotEqual(
            canonical_action({"name": "Claw", "description": "A swipe."}),
            canonical_action({"name": "Bite", "description": "A swipe."}),
        )
        self.assertNotEqual(
            canonical_action({"name": "Claw", "description": "A swipe."}),
            canonical_action({"name": "Claw", "description": "A stronger swipe."}),
        )
        self.assertNotEqual(canonical_action({"value": True}), canonical_action({"value": 1}))

    def test_counts_and_provenance_are_preserved(self):
        monsters = [
            {
                "id": 10,
                "name": "Test Beast",
                "features": {
                    "actions": [
                        {"name": "Claw", "description": None, "attack": {"bonus": 2}},
                        {"name": "Roar", "description": "A loud sound.", "attack": None},
                    ]
                },
            },
            {
                "id": 11,
                "name": "Test Beast Variant",
                "features": {
                    "actions": [
                        {"attack": {"bonus": 2}, "description": None, "name": "Claw"},
                        {"name": "Claw", "description": None, "attack": {"bonus": 3}},
                    ]
                },
            },
        ]

        occurrences, variants = build_inventory(monsters)

        self.assertEqual(len(occurrences), 4)
        self.assertEqual(len(variants), 3)
        self.assertEqual([item["action_index"] for item in occurrences], [0, 1, 0, 1])
        self.assertEqual(
            variants[0]["occurrences"],
            [
                {"monster_id": 10, "monster_name": "Test Beast", "action_index": 0},
                {
                    "monster_id": 11,
                    "monster_name": "Test Beast Variant",
                    "action_index": 0,
                },
            ],
        )
        self.assertEqual(variants[0]["occurrence_count"], 2)
        self.assertEqual(variants[1]["action"]["name"], "Roar")
        self.assertEqual(variants[2]["action"]["attack"]["bonus"], 3)

    def test_reruns_are_deterministic_and_leave_input_untouched(self):
        fixture = [
            {
                "id": 1,
                "name": "Aarakocra",
                "features": {
                    "actions": [
                        {"name": "Javelin", "description": "piercing damage.", "attack": None},
                        {"name": "Summon Air Elemental", "description": "A summon.", "attack": None},
                    ]
                },
            },
            {
                "id": 2,
                "name": "Copy",
                "features": {
                    "actions": [
                        {"attack": None, "description": "piercing damage.", "name": "Javelin"}
                    ]
                },
            },
        ]

        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "fixture.json"
            output = root / "output"
            source.write_text(json.dumps(fixture, ensure_ascii=False), encoding="utf-8")
            original_source = source.read_bytes()

            run_inventory(source, output, "fixture.json")
            first_outputs = {
                filename: (output / filename).read_bytes()
                for filename in ("full.json", "deduped.json", "stats.md")
            }
            run_inventory(source, output, "fixture.json")
            second_outputs = {
                filename: (output / filename).read_bytes()
                for filename in ("full.json", "deduped.json", "stats.md")
            }

            self.assertEqual(first_outputs, second_outputs)
            self.assertEqual(source.read_bytes(), original_source)
            full = json.loads(first_outputs["full.json"])
            deduped = json.loads(first_outputs["deduped.json"])
            self.assertEqual(full["occurrence_count"], 3)
            self.assertEqual(deduped["variant_count"], 2)
            self.assertEqual(deduped["variants"][0]["occurrence_count"], 2)
            self.assertIn("not a live database", first_outputs["stats.md"].decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
