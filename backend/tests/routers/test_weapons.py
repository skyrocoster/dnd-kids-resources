"""Weapon CRUD round-trip and quick_rules validation tests."""

import pytest

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
            "attack": [
                {
                    "type": "melee",
                    "damage": "1d8",
                    "damage_type": "slashing",
                    "hands": 1,
                    "attack_mod": 3,
                    "damage_mod": 2,
                }
            ],
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

    @pytest.mark.parametrize(
        "quick_rules",
        ["   ", "Use {bogus_token}", "Use {weapon_attack_bonus"],
        ids=["blank", "unknown-token", "malformed"],
    )
    def test_create_rejects_bad_quick_rules(self, test_client, quick_rules):
        assert (
            test_client.post(
                "/api/weapons", json={**_VALID_PAYLOAD, "quick_rules": quick_rules}
            ).status_code
            == 422
        )

    def test_create_rejects_missing_quick_rules(self, test_client):
        payload = {k: v for k, v in _VALID_PAYLOAD.items() if k != "quick_rules"}
        assert test_client.post("/api/weapons", json=payload).status_code == 422


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

    def test_update_preserves_intrinsic_attack_mod_damage_mod(self, test_client):
        payload = {
            **_VALID_PAYLOAD,
            "name": "Upd Mod Blade",
            "attack": [
                {
                    "type": "melee",
                    "damage": "1d6",
                    "damage_type": "piercing",
                    "hands": 1,
                    "attack_mod": 4,
                    "damage_mod": 1,
                }
            ],
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


class TestWeaponSheetReadyTotals:
    def test_optional_totals_default_to_null(self, test_client):
        payload = {
            k: v
            for k, v in _VALID_PAYLOAD.items()
            if k not in ("weapon_attack_bonus", "weapon_damage_bonus")
        }
        resp = test_client.post("/api/weapons", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["weapon_attack_bonus"] is None
        assert data["weapon_damage_bonus"] is None

    def test_totals_round_trip(self, test_client):
        payload = {
            **_VALID_PAYLOAD,
            "weapon_attack_bonus": 8,
            "weapon_damage_bonus": 4,
            "name": "Killer Blade",
        }
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


class TestWeaponDeletionSafety:
    def test_get_players_lists_assignees(self, test_client):
        weapon_id = test_client.post("/api/weapons", json=_VALID_PAYLOAD).json()["id"]
        player_id = test_client.post(
            "/api/players", json={"name": "Aria", "class_": "Fighter", "level": 3}
        ).json()["id"]
        test_client.post(f"/api/players/{player_id}/weapons/{weapon_id}")

        resp = test_client.get(f"/api/weapons/{weapon_id}/players")
        assert resp.status_code == 200
        names = [p["name"] for p in resp.json()]
        assert names == ["Aria"]

    def test_get_players_empty_and_404(self, test_client):
        weapon_id = test_client.post("/api/weapons", json=_VALID_PAYLOAD).json()["id"]
        assert test_client.get(f"/api/weapons/{weapon_id}/players").json() == []
        assert test_client.get("/api/weapons/999999/players").status_code == 404

    def test_delete_cascades_player_assignment(self, test_client):
        weapon_id = test_client.post("/api/weapons", json=_VALID_PAYLOAD).json()["id"]
        player_id = test_client.post(
            "/api/players", json={"name": "Bram", "class_": "Rogue", "level": 2}
        ).json()["id"]
        test_client.post(f"/api/players/{player_id}/weapons/{weapon_id}")

        resp = test_client.delete(f"/api/weapons/{weapon_id}")
        assert resp.status_code == 204

        remaining = test_client.get(f"/api/players/{player_id}/weapons").json()
        assert remaining == []
