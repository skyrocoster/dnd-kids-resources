"""Weapon CRUD round-trip and quick_rules validation tests."""

_VALID_PAYLOAD = {
    "name": "Test Blade",
    "rarity": "rare",
    "base_weapon": "Longsword",
    "weapon_category": "martial",
    "weight": 3.0,
    "property": ["V"],
    "attack": [{"type": "melee", "damage": "1d8", "damage_type": "slashing", "hands": 1}],
    "quick_rules": "Attack +{weapon_attack_bonus}, damage +{weapon_damage_bonus}",
    "weapon_attack_bonus": 2,
    "weapon_damage_bonus": 2,
}


class TestWeaponCreate:
    def test_create_with_valid_quick_rules(self, test_client):
        resp = test_client.post("/api/weapons", json=_VALID_PAYLOAD)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Test Blade"
        assert data["quick_rules"] == _VALID_PAYLOAD["quick_rules"]
        assert data["weapon_attack_bonus"] == 2
        assert data["weapon_damage_bonus"] == 2
        assert data["rarity"] == "rare"
        assert data["weapon_category"] == "martial"

    def test_create_preserves_intrinsic_attack_mod_damage_mod(self, test_client):
        payload = {
            **_VALID_PAYLOAD,
            "name": "Mod Blade",
            "attack": [{"type": "melee", "damage": "1d8", "damage_type": "slashing", "hands": 1, "attack_mod": 3, "damage_mod": 2}],
        }
        resp = test_client.post("/api/weapons", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["attack"][0]["attack_mod"] == 3
        assert data["attack"][0]["damage_mod"] == 2

    def test_create_then_get(self, test_client):
        created = test_client.post("/api/weapons", json=_VALID_PAYLOAD).json()
        wid = created["id"]
        resp = test_client.get(f"/api/weapons/{wid}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Blade"
        assert data["quick_rules"] == _VALID_PAYLOAD["quick_rules"]
        assert data["weapon_attack_bonus"] == 2

    def test_create_rejects_blank_quick_rules(self, test_client):
        resp = test_client.post("/api/weapons", json={**_VALID_PAYLOAD, "quick_rules": "   "})
        assert resp.status_code == 422

    def test_create_rejects_missing_quick_rules(self, test_client):
        payload = {k: v for k, v in _VALID_PAYLOAD.items() if k != "quick_rules"}
        resp = test_client.post("/api/weapons", json=payload)
        assert resp.status_code == 422

    def test_create_rejects_unknown_token(self, test_client):
        resp = test_client.post("/api/weapons", json={**_VALID_PAYLOAD, "quick_rules": "Use {bogus_token}"})
        assert resp.status_code == 422

    def test_create_rejects_malformed_reference(self, test_client):
        resp = test_client.post("/api/weapons", json={**_VALID_PAYLOAD, "quick_rules": "Use {weapon_attack_bonus"})
        assert resp.status_code == 422


class TestWeaponUpdate:
    def test_update_round_trip(self, test_client):
        created = test_client.post("/api/weapons", json=_VALID_PAYLOAD).json()
        wid = created["id"]
        resp = test_client.put(
            f"/api/weapons/{wid}",
            json={**_VALID_PAYLOAD, "name": "Updated Blade", "weapon_attack_bonus": 5},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Updated Blade"
        assert data["quick_rules"] == _VALID_PAYLOAD["quick_rules"]
        assert data["weapon_attack_bonus"] == 5
        assert data["weapon_damage_bonus"] == 2

    def test_update_rejects_blank_quick_rules(self, test_client):
        created = test_client.post("/api/weapons", json=_VALID_PAYLOAD).json()
        wid = created["id"]
        resp = test_client.put(f"/api/weapons/{wid}", json={**_VALID_PAYLOAD, "quick_rules": "   "})
        assert resp.status_code == 422

    def test_update_preserves_intrinsic_attack_mod_damage_mod(self, test_client):
        payload = {
            **_VALID_PAYLOAD,
            "name": "Upd Mod Blade",
            "attack": [{"type": "melee", "damage": "1d6", "damage_type": "piercing", "hands": 1, "attack_mod": 4, "damage_mod": 1}],
        }
        created = test_client.post("/api/weapons", json=payload).json()
        wid = created["id"]
        resp = test_client.put(
            f"/api/weapons/{wid}",
            json={**payload, "name": "Upd Mod Blade+1", "weapon_attack_bonus": 5},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["attack"][0]["attack_mod"] == 4
        assert data["attack"][0]["damage_mod"] == 1

    def test_update_rejects_unknown_token(self, test_client):
        created = test_client.post("/api/weapons", json=_VALID_PAYLOAD).json()
        wid = created["id"]
        resp = test_client.put(
            f"/api/weapons/{wid}",
            json={**_VALID_PAYLOAD, "quick_rules": "Use {bogus_token}"},
        )
        assert resp.status_code == 422

    def test_update_rejects_malformed_reference(self, test_client):
        created = test_client.post("/api/weapons", json=_VALID_PAYLOAD).json()
        wid = created["id"]
        resp = test_client.put(
            f"/api/weapons/{wid}",
            json={**_VALID_PAYLOAD, "quick_rules": "Use {weapon_attack_bonus"},
        )
        assert resp.status_code == 422


class TestWeaponSheetReadyTotals:
    def test_optional_totals_default_to_null(self, test_client):
        payload = {k: v for k, v in _VALID_PAYLOAD.items() if k not in ("weapon_attack_bonus", "weapon_damage_bonus")}
        resp = test_client.post("/api/weapons", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["weapon_attack_bonus"] is None
        assert data["weapon_damage_bonus"] is None

    def test_totals_round_trip(self, test_client):
        payload = {**_VALID_PAYLOAD, "weapon_attack_bonus": 8, "weapon_damage_bonus": 4, "name": "Killer Blade"}
        resp = test_client.post("/api/weapons", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["weapon_attack_bonus"] == 8
        assert data["weapon_damage_bonus"] == 4

        wid = data["id"]
        get_resp = test_client.get(f"/api/weapons/{wid}")
        assert get_resp.status_code == 200
        assert get_resp.json()["weapon_attack_bonus"] == 8
        assert get_resp.json()["weapon_damage_bonus"] == 4
