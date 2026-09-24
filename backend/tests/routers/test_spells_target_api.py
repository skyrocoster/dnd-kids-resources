"""API regression tests for the canonical spell contract."""

# Canonical target fields that every API response must include.
_TARGET_FIELDS = {
    "id",
    "name",
    "level",
    "school",
    "description",
    "alternate_description",
    "damage",
    "healing",
    "range",
    "higher_levels",
    "casting_times",
    "duration",
    "concentration",
    "ritual",
    "components",
    "materials",
    "attacks",
    "area_of_effect",
    "categories",
    "quick_rules",
}

# Legacy fields that must NOT appear in any target response.
_LEGACY_FIELDS = {
    "spell_name",
    "icon",
    "spell_text",
    "spell_alt_text",
    "casting_time",
    "heal",
    "attack_type",
    "damage_at_higher_levels",
    "heal_at_spell_slots",
    "action",
    "classes",
    "subclasses",
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
    "quick_rules": "Cast it, deal 2d6 fire damage.",
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
    "quick_rules": "Cast it, deal 2d6 fire damage.",
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
            assert not _LEGACY_FIELDS.intersection(spell.keys())

    def test_list_field_types(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["level"], int)
            assert isinstance(spell["concentration"], bool)
            assert isinstance(spell["ritual"], bool)
            assert isinstance(spell["damage"], list)
            assert isinstance(spell["components"], list)
            assert isinstance(spell["casting_times"], list)
            assert isinstance(spell["attacks"], list)
            assert isinstance(spell["healing"], dict)
            assert "amount" in spell["healing"]
            assert "temp_hp" in spell["healing"]
            assert "max_hp" in spell["healing"]
            assert isinstance(spell["higher_levels"], dict)
            assert "text" in spell["higher_levels"]
            assert "damage_by_slot" in spell["higher_levels"]
            assert isinstance(spell["area_of_effect"], dict)
            assert "shape" in spell["area_of_effect"]
            assert "size" in spell["area_of_effect"]

    def test_list_categories_are_normalized_lists(self, test_client):
        resp = test_client.get("/api/spells")
        for spell in resp.json():
            assert isinstance(spell["categories"], list)
            assert all(
                category
                in {
                    "Damage",
                    "Heal",
                    "Protect",
                    "Control",
                    "Move",
                    "Detect",
                    "Influence",
                    "Create",
                    "Summon",
                    "Other",
                }
                for category in spell["categories"]
            )


class TestSpellDetailTargetShape:
    """GET /api/spells/{id} returns only target fields."""

    def test_detail_by_id_has_target_fields(self, test_client):
        resp = test_client.get("/api/spells")
        spell_id = resp.json()[0]["id"]
        resp = test_client.get(f"/api/spells/{spell_id}")
        assert resp.status_code == 200
        assert set(resp.json().keys()) == _TARGET_FIELDS
        assert not _LEGACY_FIELDS.intersection(resp.json().keys())


class TestSpellByTitleTargetShape:
    """GET /api/spells/by-title/{name} returns only target fields."""

    def test_by_title_has_target_fields(self, test_client):
        resp = test_client.get("/api/spells")
        name = resp.json()[0]["name"]
        resp = test_client.get(f"/api/spells/by-title/{name}")
        assert resp.status_code == 200
        assert set(resp.json().keys()) == _TARGET_FIELDS
        assert not _LEGACY_FIELDS.intersection(resp.json().keys())


# ── Integer level filtering ─────────────────────────────────────────────────


class TestIntegerLevelFilter:
    """Level filtering must use integer equality, not string."""

    def test_filter_by_integer_level(self, test_client):
        for level in (0, 3):
            resp = test_client.get(f"/api/spells?level={level}")
            assert resp.status_code == 200
            for spell in resp.json():
                assert spell["level"] == level


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

    def test_create_defaults_and_empty_collections(self, test_client):
        resp = test_client.post("/api/spells", json=_CREATE_PAYLOAD)
        assert resp.status_code == 201
        spell = resp.json()
        assert spell["damage"] == []
        assert spell["attacks"] == []
        assert spell["components"] == ["V", "S"]
        assert spell["casting_times"] == []
        assert isinstance(spell["healing"], dict)
        assert isinstance(spell["higher_levels"], dict)
        assert isinstance(spell["area_of_effect"], dict)

    def test_create_categories_default_and_explicit(self, test_client):
        defaulted = test_client.post("/api/spells", json=_CREATE_PAYLOAD)
        assert defaulted.status_code == 201
        assert defaulted.json()["categories"] == ["Other"]
        payload = {
            **_CREATE_PAYLOAD,
            "name": "B0 Categorized Spell",
            "categories": ["Damage", "Protect"],
        }
        explicit = test_client.post("/api/spells", json=payload)
        assert explicit.status_code == 201
        assert explicit.json()["categories"] == ["Damage", "Protect"]

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

    def test_update_categories_round_trip(self, test_client):
        spell_id = test_client.get("/api/spells").json()[0]["id"]
        update = {
            **_CREATE_PAYLOAD,
            "name": "B0 Updated Categories",
            "categories": ["Control", "Heal"],
        }
        resp = test_client.put(f"/api/spells/{spell_id}", json=update)
        assert resp.status_code == 200
        assert resp.json()["categories"] == ["Heal", "Control"]
        detail = test_client.get(f"/api/spells/{spell_id}")
        assert detail.json()["categories"] == ["Heal", "Control"]


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

    def test_duplicate_name_rejected_with_message(self, test_client):
        assert test_client.post("/api/spells", json=_CREATE_PAYLOAD).status_code == 201
        resp = test_client.post("/api/spells", json=_CREATE_PAYLOAD)
        assert resp.status_code == 400
        assert resp.json()["message"] == "A spell with this name already exists"


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

    def test_not_found(self, test_client):
        assert test_client.get("/api/spells/99999").status_code == 404
        assert test_client.get("/api/spells/by-title/Nonexistent").status_code == 404
