import copy
import json
import unittest

import build_candidate as b


class CandidateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = b.outputs()
        cls.parts = cls.out["parts.json"]
        cls.monsters = cls.out["monsters.json"]
        cls.features = cls.out["monster_features.json"]
        cls.pm = {p["id"]: p for p in cls.parts}

    def attack(self, mid, part="javelin", mode="thrown", state=()):
        return b.resolve_attack(mid, part, mode, state, catalogue=self.parts,
                                monsters=self.monsters, features=self.features)

    def owned(self, mid):
        return {f["part_id"] for f in self.features if f["monster_id"] == mid}

    def test_exact_coverage_and_no_unexplained_drops(self):
        coverage = self.out["coverage.json"]
        self.assertEqual(len(self.monsters), 44)
        self.assertEqual(len(coverage["complete_feature_profile_ids"]), 8)
        self.assertEqual(len(coverage["partial_javelin_profile_ids"]), 36)
        self.assertEqual(coverage["deduplicated_overlap_count"], 4)
        self.assertEqual(coverage["input_feature_occurrences"], 90)
        self.assertEqual(len(self.features), 90)
        missing = [a for a in coverage["assignments"] if not a["feature_ids"]]
        self.assertEqual(len(missing), 2)
        self.assertTrue(all(a["name"] == "Legendary Resistances" and a["decision"] for a in missing))
        emitted = [fid for a in coverage["assignments"] for fid in a["feature_ids"]]
        self.assertEqual(sorted(emitted), sorted(f["id"] for f in self.features))
        self.assertEqual(set(coverage["category_counts"]), set(b.CATEGORIES.values()))

    def test_source_counts_not_normalised_counts(self):
        c = self.out["coverage.json"]
        self.assertEqual(c["javelin_source_base_dice_counts"], {"1d6": 34, "2d6": 6})
        self.assertEqual(c["fire_source_dice_counts"], {"1d4": 1, "2d6": 1, "8d8": 1})

    def test_all_javelins_share_normal_part(self):
        bindings = [f for f in self.features if f["part_id"] == "javelin"]
        self.assertEqual(len(bindings), 40)
        self.assertEqual(self.attack(1757)["damage"], [{"dice": "1d6", "type": "piercing", "bonus": 4}])
        self.assertEqual(self.attack(2333)["long_range_ft"], 120)
        with self.assertRaises(ValueError):
            self.attack(1372, mode="thrown")

    def test_brute_changes_melee_once_not_thrown(self):
        self.assertEqual(self.attack(402, "morningstar", "melee")["damage"][0], {"dice": "2d8", "type": "piercing", "bonus": 2})
        self.assertEqual(self.attack(402, mode="melee")["damage"][0]["dice"], "2d6")
        self.assertEqual(self.attack(402)["damage"][0]["dice"], "1d6")
        self.assertEqual(self.attack(402)["applied_modifier_ids"], [])
        # Duplicate attachment of the same reusable rule still applies just once.
        features = copy.deepcopy(self.features)
        next(f for f in features if f["monster_id"] == 402 and f["part_id"] == "morningstar")["modifier_ids"] = ["brute"]
        result = b.resolve_attack(402, "morningstar", "melee", catalogue=self.parts, monsters=self.monsters, features=features)
        self.assertEqual(result["damage"][0]["dice"], "2d8")

    def test_enlarge_both_source_phrasings(self):
        for mid, bonus in [(765, 2), (783, 4)]:
            with self.subTest(mid=mid):
                self.assertEqual(self.attack(mid)["damage"][0]["dice"], "1d6")
                self.assertEqual(self.attack(mid, state={"enlarged"})["damage"][0], {"dice": "2d6", "type": "piercing", "bonus": bonus})
                self.assertEqual(self.attack(mid)["applied_modifier_ids"], [])

    def test_additional_components_survive_and_standardise(self):
        fire_examples = [
            (699, "javelin", "thrown", "1d4", "fire-damage-1d4"),
            (39, "bite", "melee", "2d6", "fire-damage-2d6"),
            (2717, "javelin", "thrown", "8d8", "fire-damage-8d8"),
        ]
        for mid, part, mode, dice, modifier in fire_examples:
            with self.subTest(mid=mid):
                result = self.attack(mid, part, mode)
                self.assertEqual(result["damage"][1], {"dice": dice, "type": "fire", "bonus": 0})
                binding = next(f for f in self.features if f["monster_id"] == mid and f["part_id"] == part)
                self.assertIn(modifier, binding["modifier_ids"])
        self.assertEqual(self.attack(2220)["damage"][1]["type"], "poison")
        self.assertEqual(self.attack(106, "bite", "melee")["damage"][1], {"dice": "2d12", "type": "lightning", "bonus": 0})
        self.assertIn("DC 24", self.attack(106, "tail", "melee")["on_hit_rules"][0])

    def test_multiattack_recipes_preserve_sampled_choices(self):
        mapping = json.loads(b.NAME_MAPPING.read_text(encoding="utf8"))
        by_occurrence = {item["occurrence"]: item for item in mapping["multiattacks"]}
        source_to_part = {
            "m4-action-0": "multiattack-branch-pellet-pair",
            "m12-action-0": "multiattack-three-arcane-bursts",
            "m39-action-0": "multiattack-bite-two-claws",
            "m106-action-0": "multiattack-bite-or-tail-two-claws",
            "m403-action-0": "multiattack-two-melee-attacks",
        }
        self.assertEqual({key: entry["candidate_part_id"] for key, entry in by_occurrence.items()}, source_to_part)
        bindings = {f["id"]: f for f in self.features}
        for occurrence, part_id in source_to_part.items():
            self.assertEqual(by_occurrence[occurrence]["source_name"], "Multiattack")
            self.assertEqual(bindings[occurrence]["part_id"], part_id)
            self.assertNotIn("display_name", bindings[occurrence])

        aartuk = self.pm["multiattack-branch-pellet-pair"]["effect"]
        self.assertEqual((aartuk["operation"], aartuk["count"], aartuk["selection"]),
                         ("repeat_attacks", 2, "listed_attack_modes"))
        self.assertEqual({(c["part_id"], c["mode_id"]) for c in aartuk["choices"]},
                         {("branch", "melee"), ("radiant-pellet", "ranged")})

        abjurer = self.pm["multiattack-three-arcane-bursts"]["effect"]
        self.assertEqual((abjurer["count"], abjurer["choices"]),
                         (3, [{"part_id": "arcane-burst", "mode_id": "ranged"}]))

        red = self.pm["multiattack-bite-two-claws"]["effect"]
        self.assertEqual(red["steps"], [
            {"part_id": "bite", "mode_id": "melee", "count": 1},
            {"part_id": "claw", "mode_id": "melee", "count": 2},
        ])
        self.assertEqual(red["optional_prelude_part_id"], "frightful-presence")
        self.assertIn("frightful-presence", self.owned(39))

        turtle = self.pm["multiattack-bite-or-tail-two-claws"]["effect"]
        self.assertEqual(turtle["steps"], [
            {"count": 1, "choices": [
                {"part_id": "bite", "mode_id": "melee"},
                {"part_id": "tail", "mode_id": "melee"},
            ]},
            {"part_id": "claw", "mode_id": "melee", "count": 2},
        ])

        chief = self.pm["multiattack-two-melee-attacks"]["effect"]
        self.assertEqual((chief["count"], chief["selection"]),
                         (2, "available_action_melee_attack_modes"))
        self.assertNotIn("choices", chief)
        javelin = next(f for f in self.features if f["monster_id"] == 403 and f["part_id"] == "javelin")
        self.assertEqual(javelin["mode_ids"], ["melee", "thrown"])

        recipe_examples = self.out["examples.json"]["multiattack_recipes"]
        self.assertEqual({key: value["part_id"] for key, value in recipe_examples.items()}, source_to_part)

    def test_external_name_mapping_and_partial_rider_profiles(self):
        mapping = json.loads(b.NAME_MAPPING.read_text(encoding="utf8"))
        fire = {item["occurrence"]: item for item in mapping["fire_riders"]}
        self.assertEqual({key: (item["expected_component"]["formula"], item["candidate_modifier_id"])
                          for key, item in fire.items()}, {
            "m699-action-2": ("1d4", "fire-damage-1d4"),
            "m39-action-1": ("2d6", "fire-damage-2d6"),
            "m2717-action-2": ("8d8", "fire-damage-8d8"),
        })
        self.assertEqual(mapping["aliases"]["multiattack-bite-two-claws"], ["Multiattack"])
        self.assertEqual(mapping["aliases"]["fire-damage-8d8"], ["Additional Fire Damage"])
        for name in ("parts.json", "monsters.json", "monster_features.json"):
            playable = json.dumps(self.out[name]).lower()
            self.assertNotIn('"aliases"', playable)
            self.assertNotIn('"source_name"', playable)
            self.assertNotIn('"source_description"', playable)

        self.assertEqual(set(self.out["coverage.json"]["input_sha256"]), {
            "catalogue-decisions.json", "source-name-mapping.json", "seed-sample.json", "javelin-name-review.json"
        })
        self.assertEqual(self.out["coverage.json"]["input_feature_occurrences"], 90)
        self.assertEqual(len(self.out["coverage.json"]["assignments"]), 90)
        self.assertIn(2717, self.out["coverage.json"]["partial_javelin_profile_ids"])
        self.assertNotIn(2717, self.out["coverage.json"]["complete_feature_profile_ids"])
        self.assertEqual(self.owned(2717), {"javelin"})
        self.assertEqual(self.out["examples.json"]["zariel_fire_javelin_partial"]["damage"], [
            {"dice": "1d6", "type": "piercing", "bonus": 8},
            {"dice": "8d8", "type": "fire", "bonus": 0},
        ])

    def test_actor_bonuses_and_fixed_damage_action(self):
        self.assertEqual(self.attack(1372, mode="melee")["damage"][0]["bonus"], -1)
        self.assertEqual(self.attack(1166)["damage"][0]["bonus"], 0)
        pellet = self.attack(4, "radiant-pellet", "ranged")
        self.assertEqual(pellet["attack_bonus"], 6)
        self.assertEqual(pellet["damage"][0]["bonus"], 0)

    def test_nonweapon_and_spellcasting_not_dropped(self):
        self.assertIn("summon-air-elemental", self.owned(1))
        self.assertIn("force-blast", self.owned(12))
        self.assertIn("tongue", self.owned(4))
        self.assertIn("arcane-ward", self.owned(12))
        self.assertEqual(len(self.pm["spellcasting"]["spellcasting"]["groups"]), 3)
        self.assertEqual(len(self.pm["spellcasting-psionics"]["spellcasting"]["groups"][0]["spells"]), 3)
        self.assertNotIn('"hidden": false', json.dumps(self.parts))

    def test_categories_and_display_names(self):
        tongue = next(f for f in self.features if f["part_id"] == "tongue")
        self.assertEqual(tongue["category"], "bonus_action")
        self.assertEqual(tongue["display_name"], "Tongue (Recharge 6)")
        mythic_bite = next(f for f in self.features if f["part_id"] == "bite-attack")
        self.assertEqual(mythic_bite["display_name"], "Bite")
        self.assertEqual(mythic_bite["category"], "mythic_action")

    def test_usage_limits_and_shared_resistance(self):
        self.assertEqual(self.pm["fire-breath"]["usage"], {"recharge_roll": [5, 6]})
        self.assertEqual(self.pm["arcane-ward"]["usage"], {"recharge_roll": [4, 5, 6]})
        self.assertEqual(self.pm["legendary-resistance"]["usage"], {"uses_per_day": 3})
        self.assertEqual(sum(f["part_id"] == "legendary-resistance" for f in self.features), 2)
        self.assertEqual(self.pm["wing-attack"]["usage"], {"action_cost": 2})
        self.assertEqual(self.pm["tail-attack"]["usage"], {"action_cost": 1})
        self.assertEqual(self.pm["blessing-of-the-sea"]["usage"]["recharge_after"], ["short_rest", "long_rest"])

    def test_unusual_nature_is_composed(self):
        self.assertTrue({"no-food-or-drink", "no-air", "no-sleep"} <= self.owned(1372))
        self.assertIn("no-food-or-drink", self.owned(106))
        self.assertNotIn("no-air", self.owned(106))
        self.assertNotIn("no-sleep", self.owned(106))

    def test_no_original_actors_or_instance_overrides(self):
        text = json.dumps(self.parts).lower()
        config = json.loads(b.CONFIG.read_text(encoding="utf8"))
        for phrase in config["actor_phrases"]:
            self.assertNotIn(phrase, text)
        for name in ("parts.json", "monsters.json", "monster_features.json"):
            value = json.dumps(self.out[name]).lower()
            for forbidden in ('"overrides"', '"source"', '"review"', '"provenance"'):
                self.assertNotIn(forbidden, value)

    def test_frankenstein_uses_existing_parts(self):
        demo = self.out["examples.json"]["frankenstein_demo"]
        self.assertEqual({f["part_id"] for f in demo["features"]}, {"javelin", "brute", "fire-breath", "undead-fortitude"})
        self.assertEqual(demo["melee"]["damage"][0]["dice"], "2d6")
        self.assertEqual(demo["thrown"]["damage"][0]["dice"], "1d6")
        self.assertNotIn("demo", {m["id"] for m in self.monsters})

    def test_dependency_checks(self):
        for mid, removed in [(106, "steam-breath"), (39, "tail"), (106, "claw")]:
            features = [f for f in self.features if not (f["monster_id"] == mid and f["part_id"] == removed)]
            with self.subTest(removed=removed), self.assertRaises(ValueError):
                b.validate(self.parts, self.monsters, features)

    def test_invalid_bindings_rejected(self):
        changes = [{"part_id": "missing"}, {"category": "unknown"}, {"mode_ids": []},
                   {"mode_ids": ["unavailable"]}, {"modifier_ids": ["multiattack"]},
                   {"overrides": {"dice": "8d8"}}]
        for change in changes:
            features = copy.deepcopy(self.features)
            next(f for f in features if f["part_id"] == "javelin").update(change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                b.validate(self.parts, self.monsters, features)
        with self.assertRaises(ValueError):
            b.validate(self.parts, self.monsters, self.features + [self.features[0]])

    def test_generated_files_and_reproducibility(self):
        again = b.outputs()
        for name, value in self.out.items():
            with self.subTest(name=name):
                self.assertEqual(b.encoded(value), b.encoded(again[name]))
                self.assertEqual(json.loads((b.HERE / name).read_text(encoding="utf8")), value)


if __name__ == "__main__":
    unittest.main()
