"""API regression tests for the canonical spell contract."""

# Canonical target fields that every API response must include.
_TARGET_FIELDS = {
    "id", "name", "level", "school", "description", "alternate_description",
    "damage", "healing", "range", "higher_levels", "casting_times", "duration",
    "concentration", "ritual", "components", "materials", "attacks",
    "area_of_effect",
}

# Legacy fields that must NOT appear in any target response.
_LEGACY_FIELDS = {
    "spell_name", "icon", "spell_text", "spell_alt_text", "casting_time",
    "heal", "attack_type", "damage_at_higher_levels", "heal_at_spell_slots",
    "action", "classes", "subclasses",
}

# Canonical create payload (all required fields present).
_CREATE_PAYLOAD = {
    "name": "B0 Test Spell",
    "level": 2,
    "school": "evocation",
    "description": "A bolt of test energy.",
    "range": "120 feet",
    "duration": "Instantaneous",
    "concentration": False,
    "ritual": False,
    "components": ["V", "S"],
}

# Minimal cantrip create payload.
_CREATE_CANTRIP = {
    "name": "B0 Test Cantrip",
    "level": 0,
    "description": "A tiny spark.",
    "range": "Self",
    "duration": "Instantaneous",
    "concentration": False,
    "ritual": False,
}


# ── Response shape tests ────────────────────────────────────────────────────


class TestSpellListTargetShape:
    """GET /api/spells returns only target fields."""

    def test_list_response_has_target_fields(self, test_client):
        resp = test_client.get("/api/spells")
        assert resp.status_code == 200
        spells = resp.json()
        assert len(spells) >= 2
        for spell in spells:
            assert set(spell.keys()) == _TARGET_FIELDS, (
                f"Unexpected keys: {set(spell.keys()) - _TARGET_FIELDS}"
            )

    def test_list_response_excludes_legacy_fields(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert not _LEGACY_FIELDS.intersection(spell.keys()), (
                f"Legacy fields present: {_LEGACY_FIELDS.intersection(spell.keys())}"
            )

    def test_list_level_is_integer(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["level"], int)

    def test_list_concentration_is_bool(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["concentration"], bool)

    def test_list_ritual_is_bool(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["ritual"], bool)

    def test_list_damage_is_list(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["damage"], list)

    def test_list_components_is_list(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["components"], list)

    def test_list_casting_times_is_list(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["casting_times"], list)

    def test_list_attacks_is_list(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["attacks"], list)

    def test_list_healing_is_object(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["healing"], dict)
            assert "amount" in spell["healing"]
            assert "temp_hp" in spell["healing"]
            assert "max_hp" in spell["healing"]

    def test_list_higher_levels_is_object(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["higher_levels"], dict)
            assert "text" in spell["higher_levels"]
            assert "damage_by_slot" in spell["higher_levels"]

    def test_list_area_of_effect_is_object(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["area_of_effect"], dict)
            assert "shape" in spell["area_of_effect"]
            assert "size" in spell["area_of_effect"]


class TestSpellDetailTargetShape:
    """GET /api/spells/{id} returns only target fields."""

    def test_detail_by_id_has_target_fields(self, test_client):
        resp = test_client.get("/api/spells")
        spell_id = resp.json()[0]["id"]
        resp = test_client.get(f"/api/spells/{spell_id}")
        assert resp.status_code == 200
        assert set(resp.json().keys()) == _TARGET_FIELDS

    def test_detail_by_id_excludes_legacy(self, test_client):
        resp = test_client.get("/api/spells")
        spell_id = resp.json()[0]["id"]
        resp = test_client.get(f"/api/spells/{spell_id}")
        assert not _LEGACY_FIELDS.intersection(resp.json().keys())


class TestSpellByTitleTargetShape:
    """GET /api/spells/by-title/{name} returns only target fields."""

    def test_by_title_has_target_fields(self, test_client):
        resp = test_client.get("/api/spells")
        name = resp.json()[0]["name"]
        resp = test_client.get(f"/api/spells/by-title/{name}")
        assert resp.status_code == 200
        assert set(resp.json().keys()) == _TARGET_FIELDS

    def test_by_title_excludes_legacy(self, test_client):
        resp = test_client.get("/api/spells")
        name = resp.json()[0]["name"]
        resp = test_client.get(f"/api/spells/by-title/{name}")
        assert not _LEGACY_FIELDS.intersection(resp.json().keys())


# ── Integer level filtering ─────────────────────────────────────────────────


class TestIntegerLevelFilter:
    """Level filtering must use integer equality, not string."""

    def test_filter_by_integer_level(self, test_client):
        resp = test_client.get("/api/spells?level=0")
        assert resp.status_code == 200
        for spell in resp.json():
            assert spell["level"] == 0

    def test_filter_by_level_excludes_others(self, test_client):
        resp = test_client.get("/api/spells?level=3")
        assert resp.status_code == 200
        for spell in resp.json():
            assert spell["level"] == 3


# ── Create / Update / Delete lifecycle ──────────────────────────────────────


class TestCreateSpellContract:
    """POST /api/spells accepts and returns the target contract."""

    def test_create_returns_target_fields(self, test_client):
        resp = test_client.post("/api/spells", json=_CREATE_PAYLOAD)
        assert resp.status_code == 201
        spell = resp.json()
        assert set(spell.keys()) == _TARGET_FIELDS
        assert spell["name"] == "B0 Test Spell"
        assert spell["level"] == 2

    def test_create_empty_collections_preserved(self, test_client):
        resp = test_client.post("/api/spells", json=_CREATE_PAYLOAD)
        spell = resp.json()
        assert spell["damage"] == []
        assert spell["attacks"] == []
        assert spell["components"] == ["V", "S"]
        assert spell["casting_times"] == []

    def test_create_nested_objects_always_present(self, test_client):
        resp = test_client.post("/api/spells", json=_CREATE_PAYLOAD)
        spell = resp.json()
        assert isinstance(spell["healing"], dict)
        assert isinstance(spell["higher_levels"], dict)
        assert isinstance(spell["area_of_effect"], dict)

    def test_create_cantrip_level_zero(self, test_client):
        resp = test_client.post("/api/spells", json=_CREATE_CANTRIP)
        assert resp.status_code == 201
        assert resp.json()["level"] == 0

    def test_create_rejects_extra_fields(self, test_client):
        bad = {**_CREATE_PAYLOAD, "icon": "fire"}
        resp = test_client.post("/api/spells", json=bad)
        assert resp.status_code in (400, 422)


class TestUpdateSpellContract:
    """PUT /api/spells/{id} accepts and returns the target contract."""

    def test_update_returns_target_fields(self, test_client):
        resp = test_client.get("/api/spells")
        spell_id = resp.json()[0]["id"]
        update = {**_CREATE_PAYLOAD, "name": "Updated Spell"}
        resp = test_client.put(f"/api/spells/{spell_id}", json=update)
        assert resp.status_code == 200
        spell = resp.json()
        assert set(spell.keys()) == _TARGET_FIELDS
        assert spell["name"] == "Updated Spell"


class TestDeleteSpell:
    """DELETE /api/spells/{id} — unchanged by contract cutover."""

    def test_delete_204(self, test_client):
        resp = test_client.post("/api/spells", json=_CREATE_PAYLOAD)
        spell_id = resp.json()["id"]
        resp = test_client.delete(f"/api/spells/{spell_id}")
        assert resp.status_code == 204

    def test_delete_nonexistent_404(self, test_client):
        resp = test_client.delete("/api/spells/99999")
        assert resp.status_code == 404


# ── Duplicate name handling ─────────────────────────────────────────────────


class TestDuplicateNameContract:
    """POST /api/spells rejects duplicate names with a 400."""

    def test_duplicate_name_rejected(self, test_client):
        resp = test_client.post("/api/spells", json=_CREATE_PAYLOAD)
        assert resp.status_code == 201
        resp = test_client.post("/api/spells", json=_CREATE_PAYLOAD)
        assert resp.status_code == 400

    def test_duplicate_name_error_is_human_readable(self, test_client):
        assert test_client.post("/api/spells", json=_CREATE_PAYLOAD).status_code == 201
        resp = test_client.post("/api/spells", json=_CREATE_PAYLOAD)
        assert resp.status_code == 400
        assert resp.json()["detail"] == "A spell with this name already exists"


class TestSchoolFilterNormalization:
    def test_school_filter_is_case_insensitive(self, test_client):
        capitalized = test_client.get("/api/spells?school=Evocation")
        lowercase = test_client.get("/api/spells?school=evocation")
        assert capitalized.status_code == lowercase.status_code == 200
        assert capitalized.json()
        assert capitalized.json() == lowercase.json()


# ── 404 handling ────────────────────────────────────────────────────────────


class TestNotFoundTargetShape:
    """404 responses remain unchanged."""

    def test_by_id_404(self, test_client):
        resp = test_client.get("/api/spells/99999")
        assert resp.status_code == 404

    def test_by_title_404(self, test_client):
        resp = test_client.get("/api/spells/by-title/Nonexistent")
        assert resp.status_code == 404
