"""Fixture-based tests for scripts/check_orders.py.

Each rule in the linter is one fault recorded in docs/plans/telemetry-log.md that cost a
dispatch, so each gets a test that fails the way the original order failed — plus a
matching well-formed order, because a linter that also rejects good orders is worse than
none at all.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _import_check_orders():
    spec = importlib.util.spec_from_file_location(
        "check_orders_under_test", REPO_ROOT / "scripts" / "check_orders.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


co = _import_check_orders()


GOOD_ORDER = """WORK ORDER 01 — Show the label
GOAL: the tile shows its label.
DEPENDS ON: none
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- The API already returns `label` on each tile (src/api.ts line 4).
- The tile renders the title only.

START IN:
- src/Tile.tsx — the header block at lines 3-6, nothing else in this file
- src/__tests__/Tile.test.tsx

DO:
- Render `label` after the title in src/Tile.tsx.
- Add one test to src/__tests__/Tile.test.tsx.

STOP WHEN: `cd frontend && npm run test:check -- src/__tests__/Tile.test.tsx` passes.

STATUS: DONE
"""


@pytest.fixture()
def repo(tmp_path: Path, monkeypatch) -> Path:
    """A miniature repo whose paths the linter resolves against."""
    monkeypatch.setattr(co, "REPO_ROOT", tmp_path)
    src = tmp_path / "src"
    (src / "__tests__").mkdir(parents=True)
    (src / "Tile.tsx").write_text("export function Tile() {\n  return null\n}\n", encoding="utf-8")
    (src / "api.ts").write_text("export const api = 1\n", encoding="utf-8")
    (src / "__tests__" / "Tile.test.tsx").write_text("test('x', () => {})\n", encoding="utf-8")
    return tmp_path


def write(repo: Path, text: str) -> Path:
    path = repo / "order.md"
    path.write_text(text, encoding="utf-8")
    return path


def messages(repo: Path, text: str) -> list[str]:
    return [error.message for error in co.lint_order(write(repo, text))]


def test_well_formed_order_passes(repo: Path):
    assert messages(repo, GOOD_ORDER) == []


def test_missing_required_fields(repo: Path):
    found = messages(repo, "WORK ORDER 02 — y\nGOAL: do a thing\n")
    assert any("missing required fields" in m for m in found)


def test_failure_status_needs_a_failure_report(repo: Path):
    order = GOOD_ORDER.replace("STATUS: DONE", "STATUS: FAILED - could not make it pass")
    assert any("no FAILURE REPORT" in m for m in messages(repo, order))

    with_report = order + "\nFAILURE REPORT:\n- TRIED: things\n"
    assert not any("no FAILURE REPORT" in m for m in messages(repo, with_report))


def test_start_in_path_must_resolve(repo: Path):
    """Order 03's `maplabModel.test.ts` with no directory sent its executor searching."""
    order = GOOD_ORDER.replace("- src/__tests__/Tile.test.tsx\n", "- Tile.test.tsx\n", 1)
    assert any("does not exist" in m for m in messages(repo, order))


def test_do_may_not_name_a_file_start_in_omits(repo: Path):
    """Order 01 told its executor to edit two test files START IN never listed."""
    order = GOOD_ORDER.replace(
        "- Add one test to src/__tests__/Tile.test.tsx.",
        "- Add one test to src/__tests__/Tile.test.tsx and src/api.ts.",
    ).replace("- src/__tests__/Tile.test.tsx\n", "- src/__tests__/Tile.test.tsx\n", 1)
    order = order.replace(
        "START IN:\n- src/Tile.tsx — the header block at lines 3-6, nothing else in this file\n"
        "- src/__tests__/Tile.test.tsx\n",
        "START IN:\n- src/Tile.tsx — the header block at lines 3-6, nothing else in this file\n",
    )
    found = messages(repo, order)
    assert any("START IN, CREATES, and REMOVES do not list" in m for m in found)


def test_bare_filename_in_known_state(repo: Path):
    """Naming `UserIcon`'s file cost a 4.3k-token barrel read when it was left out."""
    order = GOOD_ORDER.replace(
        "- The tile renders the title only.",
        "- The tile renders the title only, per Tile.tsx.",
    )
    assert any("without its path" in m for m in messages(repo, order))


def test_dot_directory_start_in_path_resolves(repo: Path):
    """`lstrip("./")` strips a character set, so it ate the dot of every dot-directory."""
    skill = repo / ".opencode" / "skills" / "plan"
    skill.mkdir(parents=True)
    (skill / "SKILL.md").write_text("# plan\n", encoding="utf-8")
    order = GOOD_ORDER.replace(
        "- src/__tests__/Tile.test.tsx\n",
        "- .opencode/skills/plan/SKILL.md — the `Where it lives` path only\n",
        1,
    ).replace("- Add one test to src/__tests__/Tile.test.tsx.", "- Fix that one path.")
    assert not any("does not exist" in m for m in messages(repo, order))


def test_repo_root_file_is_not_a_bare_filename(repo: Path):
    """A root file's full repo-relative path *is* its bare name — nothing to add."""
    (repo / "AGENTS.md").write_text("# instructions\n", encoding="utf-8")
    order = GOOD_ORDER.replace(
        "- The tile renders the title only.",
        "- The archive lifecycle in AGENTS.md still names the old path.",
    )
    assert not any("without its path" in m for m in messages(repo, order))


def test_bare_filename_allowed_inside_a_command(repo: Path):
    order = GOOD_ORDER.replace(
        "- The tile renders the title only.",
        "- Seed it first: `python scripts/seed.py --tiles`.",
    )
    assert not any("without its path" in m for m in messages(repo, order))


def test_conditional_instruction_is_rejected(repo: Path):
    """The single most expensive fault in the log: a KNOWN STATE conditional."""
    order = GOOD_ORDER.replace(
        "- The tile renders the title only.",
        "- If order 03 left that union inline, lift it into a shared function.",
    )
    assert any("conditional instruction" in m for m in messages(repo, order))


def test_factual_sentence_containing_if_is_allowed(repo: Path):
    order = GOOD_ORDER.replace(
        "- The tile renders the title only.",
        "- The save button is disabled if the form is empty.",
    )
    assert not any("conditional instruction" in m for m in messages(repo, order))


def _with_big_file(repo: Path, scope: str = "") -> str:
    """GOOD_ORDER plus a 500-line START IN entry carrying `scope`."""
    big = repo / "src" / "BigPage.tsx"
    big.write_text(
        "\n".join(
            {120: "export function renderBigPage() {", 121: "}"}.get(n, f"const line{n} = {n}")
            for n in range(500)
        ),
        encoding="utf-8",
    )
    suffix = f" — {scope}" if scope else ""
    return GOOD_ORDER.replace(
        "- src/__tests__/Tile.test.tsx\n",
        f"- src/__tests__/Tile.test.tsx\n- src/BigPage.tsx{suffix}\n",
    )


def test_large_start_in_entry_needs_a_range(repo: Path):
    """An unscoped 500-line file is read whole: ~9.7k tokens for a one-line change."""
    found = messages(repo, _with_big_file(repo))
    assert any("bounded by nothing" in m for m in found)


def test_bare_line_number_is_rejected(repo: Path):
    """Point-anchored entries produced every re-read loop in the log."""
    found = messages(repo, _with_big_file(repo, "the render at line 121, nothing else"))
    assert any("bare line number" in m for m in found)


def test_symbol_only_scope_is_rejected(repo: Path):
    """Four consecutive orders paid one re-locating read per symbol-bounded file."""
    found = messages(repo, _with_big_file(repo, "the `renderBigPage` function only"))
    assert any("a symbol name" in m for m in found)


def test_range_without_an_anchor_is_rejected(repo: Path):
    found = messages(repo, _with_big_file(repo, "lines 121-130, nothing else"))
    assert any("with no anchor" in m for m in found)


def test_anchored_range_passes(repo: Path):
    order = _with_big_file(repo, 'lines 121-130 @"export function renderBigPage() {"')
    assert messages(repo, order) == []


def test_stale_range_is_reported_against_the_anchor(repo: Path):
    """The fault an upstream order creates every time it edits a shared file."""
    order = _with_big_file(repo, 'lines 40-49 @"export function renderBigPage() {"')
    found = messages(repo, order)
    assert any("is stale" in m and "line 121" in m for m in found)


def test_vanished_anchor_is_reported_separately(repo: Path):
    order = _with_big_file(repo, 'lines 121-130 @"export function goneForever() {"')
    found = messages(repo, order)
    assert any("no longer appears in the file" in m for m in found)


def test_fix_heals_a_stale_range(repo: Path):
    order = _with_big_file(repo, 'lines 40-49 @"export function renderBigPage() {"')
    path = write(repo, order)
    applied = co.autofix_start_in(path)
    assert applied and "anchor moved" in applied[0][1]
    assert "lines 121-130" in path.read_text(encoding="utf-8")
    assert co.lint_order(path) == []


def test_fix_resolves_a_symbol_to_a_range(repo: Path):
    order = _with_big_file(repo, "the `renderBigPage` function only")
    path = write(repo, order)
    applied = co.autofix_start_in(path)
    assert applied and "symbol-scoped" in applied[0][0]
    text = path.read_text(encoding="utf-8")
    assert "lines 121-" in text and '@"export function renderBigPage() {"' in text
    assert co.lint_order(path) == []


def test_fix_leaves_a_correct_range_alone(repo: Path):
    order = _with_big_file(repo, 'lines 121-130 @"export function renderBigPage() {"')
    path = write(repo, order)
    before = path.read_text(encoding="utf-8")
    assert co.autofix_start_in(path) == []
    assert path.read_text(encoding="utf-8") == before


def test_pytest_stop_check_needs_no_cov(repo: Path):
    order = GOOD_ORDER.replace(
        "STOP WHEN: `cd frontend && npm run test:check -- src/__tests__/Tile.test.tsx` passes.",
        "STOP WHEN: `pytest backend/tests/test_tiles.py` passes.",
    )
    assert any("--no-cov" in m for m in messages(repo, order))


def test_full_suite_stop_check_is_rejected(repo: Path):
    order = GOOD_ORDER.replace(
        "STOP WHEN: `cd frontend && npm run test:check -- src/__tests__/Tile.test.tsx` passes.",
        "STOP WHEN: `npm test`",
    )
    assert any("full-suite command" in m for m in messages(repo, order))


def test_required_strength_must_be_explicit(repo: Path):
    order = GOOD_ORDER.replace("REQUIRED STRENGTH: Light", "REQUIRED STRENGTH: Huge")
    assert any("REQUIRED STRENGTH must be one of" in m for m in messages(repo, order))


def test_escalating_above_light_without_a_reason_is_rejected(repo: Path):
    """Light is the default for every order; asking for more has to say what it buys."""
    order = GOOD_ORDER.replace("REQUIRED STRENGTH: Light", "REQUIRED STRENGTH: Standard")
    assert any("Standard with no stated reason" in m for m in messages(repo, order))


def test_escalating_above_light_with_a_reason_is_accepted(repo: Path):
    order = GOOD_ORDER.replace(
        "REQUIRED STRENGTH: Light",
        "REQUIRED STRENGTH: Standard — the canonical fixture shape has to be derived "
        "from three call sites that disagree",
    )
    assert not any("REQUIRED STRENGTH" in m for m in messages(repo, order))


def test_light_needs_no_reason(repo: Path):
    assert not any("REQUIRED STRENGTH" in m for m in messages(repo, GOOD_ORDER))


@pytest.mark.parametrize(
    "field, expected",
    [
        ("Light", ("Light", "")),
        ("Standard — because the shape is unknown", ("Standard", "because the shape is unknown")),
        ("Standard - because the shape is unknown", ("Standard", "because the shape is unknown")),
        ("High (broad synthesis)", ("High", "broad synthesis")),
        ("", ("", "")),
    ],
)
def test_split_strength(field, expected):
    assert co.split_strength(field) == expected


def test_lifecycle_artifact_is_authorized_and_asserted(repo: Path):
    order = GOOD_ORDER.replace(
        "CREATES: none",
        "CREATES:\n- docs/new-guide.md",
    ).replace(
        "- Add one test to src/__tests__/Tile.test.tsx.",
        "- Add one test to src/__tests__/Tile.test.tsx.\n- Create docs/new-guide.md.",
    )
    found = messages(repo, order)
    assert any("does not assert the lifecycle artifact" in m for m in found)
    assert any("does not run scripts/check_docs.py --check" in m for m in found)

    fixed = order.replace(
        "src/__tests__/Tile.test.tsx` passes.",
        "src/__tests__/Tile.test.tsx && python -c \"from pathlib import Path; assert Path('docs/new-guide.md').is_file()\" && .venv/Scripts/python.exe scripts/check_docs.py --check` passes.",
    ).replace("STATUS: DONE", "STATUS: <-- executor writes DONE")
    assert not any(
        "lifecycle artifact" in m or "does not run scripts/check_docs.py" in m
        for m in messages(repo, fixed)
    )


def test_done_order_validates_artifact_final_state(repo: Path):
    order = GOOD_ORDER.replace(
        "CREATES: none",
        "CREATES:\n- docs/new-guide.md",
    ).replace(
        "- Add one test to src/__tests__/Tile.test.tsx.",
        "- Add one test to src/__tests__/Tile.test.tsx.\n- Create docs/new-guide.md.",
    ).replace(
        "src/__tests__/Tile.test.tsx` passes.",
        "src/__tests__/Tile.test.tsx && python -c \"from pathlib import Path; assert Path('docs/new-guide.md').is_file()\" && .venv/Scripts/python.exe scripts/check_docs.py --check` passes.",
    )
    assert any("CREATES path is missing" in m for m in messages(repo, order))


def test_removed_start_file_is_validated_by_final_state(repo: Path):
    docs = repo / "docs"
    docs.mkdir()
    old = docs / "old-guide.md"
    old.write_text("# Old\n", encoding="utf-8")
    order = GOOD_ORDER.replace(
        "REMOVES: none",
        "REMOVES:\n- docs/old-guide.md",
    ).replace(
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
        "- docs/old-guide.md — the title before removal",
    ).replace(
        "- Render `label` after the title in src/Tile.tsx.",
        "- Remove docs/old-guide.md.",
    ).replace(
        "src/__tests__/Tile.test.tsx` passes.",
        "src/__tests__/Tile.test.tsx && python -c \"from pathlib import Path; assert not Path('docs/old-guide.md').exists()\" && .venv/Scripts/python.exe scripts/check_docs.py --check` passes.",
    )
    assert any("REMOVES path still exists" in m for m in messages(repo, order))

    old.unlink()
    assert not any("old-guide.md" in m for m in messages(repo, order))


def test_structural_docs_order_needs_real_checker(repo: Path):
    docs = repo / "docs"
    docs.mkdir()
    (docs / "guide.md").write_text("# Guide\n", encoding="utf-8")
    order = GOOD_ORDER.replace(
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
        "- docs/guide.md — the title",
    ).replace(
        "- Render `label` after the title in src/Tile.tsx.",
        "- Rename the title in docs/guide.md.",
    )
    assert any("does not run scripts/check_docs.py" in m for m in messages(repo, order))


def test_validator_change_needs_own_test_in_start_and_stop(repo: Path):
    scripts = repo / "scripts"
    backend_tests = repo / "backend" / "tests"
    scripts.mkdir()
    backend_tests.mkdir(parents=True)
    (scripts / "check_orders.py").write_text("# checker\n", encoding="utf-8")
    (backend_tests / "test_check_orders.py").write_text("def test_it(): pass\n", encoding="utf-8")
    order = GOOD_ORDER.replace(
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
        "- scripts/check_orders.py — lint_order",
    ).replace(
        "- Render `label` after the title in src/Tile.tsx.",
        "- Add a rule in scripts/check_orders.py.",
    )
    found = messages(repo, order)
    assert any("direct test module from START IN" in m for m in found)
    assert any("direct test module from STOP WHEN" in m for m in found)


def test_fixture_order_needs_cast_idiom_and_typecheck(repo: Path):
    """Vitest is a false green for types — this escaped two separate stages."""
    order = GOOD_ORDER.replace(
        "- Add one test to src/__tests__/Tile.test.tsx.",
        "- Add one test to src/__tests__/Tile.test.tsx that mocks the tile list.",
    )
    found = messages(repo, order)
    assert any("no cast idiom" in m for m in found)
    assert any("no typecheck" in m for m in found)

    fixed = order.replace(
        "- The tile renders the title only.",
        "- Mock minimally and cast: `mockResolvedValue([{ id: 9 }] as Tile[])`.",
    ).replace(
        "src/__tests__/Tile.test.tsx` passes.",
        "src/__tests__/Tile.test.tsx && npm run typecheck` passes.",
    )
    remaining = messages(repo, fixed)
    assert not any("cast idiom" in m or "typecheck" in m for m in remaining)


def test_fixture_rule_ignores_the_word_fixture_inside_a_path(repo: Path):
    """`fixtureTypes.ts` is a filename, not a mock — the hint must read prose only."""
    (repo / "src" / "fixtureTypes.ts").write_text("export const f = 1\n", encoding="utf-8")
    order = GOOD_ORDER.replace(
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
        "- src/fixtureTypes.ts — the field arrays",
    ).replace(
        "- Render `label` after the title in src/Tile.tsx.",
        "- Author the `searchDc` field in src/fixtureTypes.ts.",
    )
    remaining = messages(repo, order)
    assert not any("cast idiom" in m for m in remaining)


def test_big_suite_counts_only_bullets_aimed_at_that_suite(repo: Path):
    """Bullets editing a model or a field list are not behaviours against the suite."""
    big = repo / "src" / "__tests__" / "Tile.test.tsx"
    big.write_text("test('x', () => {})\n" * 900, encoding="utf-8")
    (repo / "src" / "fields.ts").write_text("export const fields = 1\n", encoding="utf-8")
    order = GOOD_ORDER.replace(
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file\n- src/fields.ts — the field list",
    ).replace(
        "- Add one test to src/__tests__/Tile.test.tsx.",
        "- Author the `searchDc` field in src/fields.ts.\n- Add one test to src/__tests__/Tile.test.tsx.",
    )
    assert not any("integrated suite" in m for m in messages(repo, order))

    several = order.replace(
        "- Add one test to src/__tests__/Tile.test.tsx.",
        "- Add a label test to src/__tests__/Tile.test.tsx.\n"
        "- Add an empty-state test to src/__tests__/Tile.test.tsx.\n"
        "- Add an error test to src/__tests__/Tile.test.tsx.",
    )
    assert any("integrated suite" in m for m in messages(repo, several))


def test_excluded_type_is_not_a_reshape(repo: Path):
    """Saying what an order leaves alone must not read as reshaping it."""
    # Names are deliberately unlike anything real: call-site detection greps the whole
    # repo, so a fixture borrowing a live symbol makes this file one of its own hits.
    (repo / "src" / "model.ts").write_text(
        "export interface FixtureFlagsXY {}\nexport interface FixtureRoomXY {}\n", encoding="utf-8"
    )
    order = GOOD_ORDER.replace(
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
        "- src/model.ts — FixtureFlagsXY",
    ).replace(
        "- Render `label` after the title in src/Tile.tsx.",
        "- In src/model.ts add optional `searchDc` to FixtureFlagsXY, leaving FixtureRoomXY outside it.",
    )
    found = messages(repo, order)
    assert not any("FixtureRoomXY" in m for m in found)
    assert any("FixtureFlagsXY" in m for m in found)


def test_type_name_inside_a_longer_identifier_is_not_a_reshape(repo: Path):
    """`FixtureDataXY` inside `parseFixtureDataXY` is the parser, not the type."""
    (repo / "src" / "model.ts").write_text(
        "export interface FixtureDataXY {}\nexport function parseFixtureDataXY() {}\n",
        encoding="utf-8",
    )
    order = GOOD_ORDER.replace(
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
        "- src/model.ts — parseFixtureDataXY",
    ).replace(
        "- Render `label` after the title in src/Tile.tsx.",
        "- Add one identity scenario inside describe('parseFixtureDataXY') in src/model.ts.",
    )
    assert not any("FixtureDataXY" in m for m in messages(repo, order))


def test_creating_an_exported_type_is_not_a_reshape(repo: Path):
    """A new type has no consumers to drag in; only reshaping an existing one does."""
    (repo / "src" / "model.ts").write_text(
        "export type FixtureFactXY = 'a' | 'b'\nexport interface FixtureFlagsXY {}\n",
        encoding="utf-8",
    )
    order = GOOD_ORDER.replace(
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
        "- src/model.ts — FixtureFlagsXY",
    ).replace(
        "- Render `label` after the title in src/Tile.tsx.",
        "- In src/model.ts export FixtureFactXY with exactly 'a' | 'b'.",
    )
    assert not any("FixtureFactXY" in m for m in messages(repo, order))

    reshape = order.replace(
        "- In src/model.ts export FixtureFactXY with exactly 'a' | 'b'.",
        "- In src/model.ts add a third member to FixtureFactXY.",
    )
    assert any("FixtureFactXY" in m for m in messages(repo, reshape))


def test_wrapper_pytest_flag_is_not_a_raw_pytest_run(repo: Path):
    """order_check.py passes --no-cov itself; the rule matched its own `--pytest` flag."""
    order = GOOD_ORDER.replace(
        "STOP WHEN: `cd frontend && npm run test:check -- src/__tests__/Tile.test.tsx` passes.",
        "STOP WHEN: `python scripts/order_check.py --pytest backend/tests/test_x.py` passes.",
    )
    assert not any("--no-cov" in m for m in messages(repo, order))

    raw = order.replace(
        "python scripts/order_check.py --pytest backend/tests/test_x.py",
        "pytest backend/tests/test_x.py",
    )
    assert any("--no-cov" in m for m in messages(repo, raw))


def test_running_a_generator_is_not_an_edit_site(repo: Path):
    """`regenerate X with scripts/generate_export_schema.py` invokes it, not edits it."""
    (repo / "scripts").mkdir()
    (repo / "scripts" / "generate_export_schema.py").write_text("# gen\n", encoding="utf-8")
    order = GOOD_ORDER.replace(
        "- Add one test to src/__tests__/Tile.test.tsx.",
        "- Regenerate src/api.ts with scripts/generate_export_schema.py; do not hand-edit it.",
    )
    found = messages(repo, order)
    assert not any("generate_export_schema.py" in m for m in found)

    edited = order.replace(
        "- Regenerate src/api.ts with scripts/generate_export_schema.py; do not hand-edit it.",
        "- Add a column list branch in scripts/generate_export_schema.py.",
    )
    assert any("generate_export_schema.py" in m for m in messages(repo, edited))


def test_one_frontend_test_file_per_order(repo: Path):
    (repo / "src" / "__tests__" / "Other.test.tsx").write_text("test('y', () => {})\n", encoding="utf-8")
    order = GOOD_ORDER.replace(
        "- src/__tests__/Tile.test.tsx\n",
        "- src/__tests__/Tile.test.tsx\n- src/__tests__/Other.test.tsx\n",
    )
    assert any("frontend test files" in m for m in messages(repo, order))


def test_big_integrated_suite_gets_one_behaviour(repo: Path):
    """The order that asked for seven behaviours in a 1,700-line suite was abandoned twice."""
    suite = repo / "src" / "__tests__" / "Tile.test.tsx"
    suite.write_text("\n".join(f"test('t{n}', () => {{}})" for n in range(900)), encoding="utf-8")
    order = GOOD_ORDER.replace(
        "DO:\n- Render `label` after the title in src/Tile.tsx.\n"
        "- Add one test to src/__tests__/Tile.test.tsx.\n",
        "DO:\n- Render `label` after the title in src/Tile.tsx.\n"
        "- Add one test to src/__tests__/Tile.test.tsx.\n"
        "- Persist the label across reloads.\n"
        "- Clear it on reset.\n",
    )
    assert any("behaviours" in m for m in messages(repo, order))


def test_too_many_start_in_entries(repo: Path):
    extra = "".join(
        f"- src/extra{n}.ts\n" for n in range(7)
    )
    for n in range(7):
        (repo / "src" / f"extra{n}.ts").write_text("export const x = 1\n", encoding="utf-8")
    order = GOOD_ORDER.replace("- src/__tests__/Tile.test.tsx\n", f"- src/__tests__/Tile.test.tsx\n{extra}")
    assert any("max" in m for m in messages(repo, order))


def test_fix_resolves_bare_start_in_path(repo: Path):
    """The `--fix` path for order 03's `maplabModel.test.ts` mistake: one honest match."""
    order_path = write(repo, GOOD_ORDER.replace("- src/__tests__/Tile.test.tsx\n", "- Tile.test.tsx\n", 1))
    applied = co.autofix_order(order_path)
    assert applied == [("Tile.test.tsx", "src/__tests__/Tile.test.tsx")]
    fixed_text = order_path.read_text(encoding="utf-8")
    assert "- src/__tests__/Tile.test.tsx\n" in fixed_text
    assert co.lint_order(order_path) == []


def test_fix_resolves_bare_filename_in_known_state(repo: Path):
    """The `--fix` path for the `UserIcon`-shaped fault: name it, don't just flag it."""
    order_path = write(
        repo,
        GOOD_ORDER.replace(
            "- The tile renders the title only.",
            "- The tile renders the title only, per Tile.tsx.",
        ),
    )
    applied = co.autofix_order(order_path)
    assert applied == [("Tile.tsx", "src/Tile.tsx")]
    assert "per src/Tile.tsx." in order_path.read_text(encoding="utf-8")
    assert co.lint_order(order_path) == []


def test_fix_leaves_ambiguous_bare_names_alone(repo: Path):
    """Two matches is a judgement call the compiler still has to make, not a guess."""
    other_tile_dir = repo / "other" / "__tests__"
    other_tile_dir.mkdir(parents=True)
    (other_tile_dir / "Tile.test.tsx").write_text("test('y', () => {})\n", encoding="utf-8")
    order_path = write(repo, GOOD_ORDER.replace("- src/__tests__/Tile.test.tsx\n", "- Tile.test.tsx\n", 1))
    assert co.autofix_order(order_path) == []
    assert "- Tile.test.tsx\n" in order_path.read_text(encoding="utf-8")
    assert any("does not exist" in m for m in messages(repo, order_path.read_text(encoding="utf-8")))


def test_fix_does_not_rewrite_bare_names_inside_commands(repo: Path):
    order_path = write(
        repo,
        GOOD_ORDER.replace(
            "- The tile renders the title only.",
            "- Seed it first: `python Tile.tsx --check`.",
        ),
    )
    assert co.autofix_order(order_path) == []
    assert "`python Tile.tsx --check`" in order_path.read_text(encoding="utf-8")


def test_fix_is_a_noop_on_a_well_formed_order(repo: Path):
    order_path = write(repo, GOOD_ORDER)
    assert co.autofix_order(order_path) == []
    assert order_path.read_text(encoding="utf-8") == GOOD_ORDER


def test_lint_orders_on_absent_directory(tmp_path: Path):
    assert co.lint_orders(tmp_path / "nope") == []


def test_lint_orders_walks_the_tree(repo: Path):
    orders = repo / "orders" / "feat"
    orders.mkdir(parents=True)
    (orders / "01-broken.md").write_text("WORK ORDER 01 — y\nGOAL: x\n", encoding="utf-8")
    found = co.lint_orders(repo / "orders")
    assert found and all(error.file.endswith("01-broken.md") for error in found)


def test_shared_mutable_path_requires_dependency(repo: Path):
    orders = repo / "orders" / "feat"
    orders.mkdir(parents=True)
    (orders / "01-first.md").write_text(GOOD_ORDER, encoding="utf-8")
    second = GOOD_ORDER.replace("WORK ORDER 01", "WORK ORDER 02")
    (orders / "02-second.md").write_text(second, encoding="utf-8")

    found = co.lint_orders(repo / "orders")
    assert any("share mutable paths without a dependency" in error.message for error in found)

    (orders / "02-second.md").write_text(
        second.replace("DEPENDS ON: none", "DEPENDS ON: 01"), encoding="utf-8"
    )
    found = co.lint_orders(repo / "orders")
    assert not any("share mutable paths without a dependency" in error.message for error in found)


# ---------------------------------------------------------------------------------------
# Signature changes, co-located suites, hook lint, and test insertion points.
#
# All four trace to one stage in the telemetry log: an order changed an exported hook
# signature, named only the caller's test file in STOP WHEN, and let two defects reach
# reconcile — a stale assertion and a missing useCallback dependency. Each is a grep or a
# path lookup, so none of them should ever cost a model a read again.
# ---------------------------------------------------------------------------------------


@pytest.fixture()
def sweepable(repo: Path, monkeypatch) -> Path:
    """The fixture repo, with its `src/` tree visible to the call-site sweep."""
    monkeypatch.setattr(co, "SOURCE_ROOTS", ("src",))
    return repo


def test_signature_change_must_enumerate_call_sites(sweepable: Path):
    (sweepable / "src" / "Caller.tsx").write_text(
        "import { fitToBounds } from './zoom'\nfitToBounds(1)\n", encoding="utf-8"
    )
    (sweepable / "src" / "zoom.ts").write_text(
        "export function fitToBounds(a) { return a }\n", encoding="utf-8"
    )
    order = GOOD_ORDER.replace(
        "CHANGES SIGNATURE: none", "CHANGES SIGNATURE: `fitToBounds` in src/zoom.ts"
    ).replace("- src/Tile.tsx —", "- src/zoom.ts — the whole file\n- src/Tile.tsx —")
    found = messages(sweepable, order)
    assert any("call sites outside START IN" in m and "src/Caller.tsx" in m for m in found)


def test_signature_change_with_every_call_site_named_passes(sweepable: Path):
    (sweepable / "src" / "zoom.ts").write_text(
        "export function fitToBounds(a) { return a }\n", encoding="utf-8"
    )
    order = GOOD_ORDER.replace(
        "CHANGES SIGNATURE: none", "CHANGES SIGNATURE: `fitToBounds` in src/zoom.ts"
    ).replace("- src/Tile.tsx —", "- src/zoom.ts — the whole file\n- src/Tile.tsx —")
    assert not any("call sites outside" in m for m in messages(sweepable, order))


def test_signature_change_must_run_the_modules_own_suite(sweepable: Path):
    (sweepable / "src" / "zoom.ts").write_text(
        "export function fitToBounds(a) { return a }\n", encoding="utf-8"
    )
    (sweepable / "src" / "__tests__" / "zoom.test.ts").write_text(
        "test('z', () => {})\n", encoding="utf-8"
    )
    order = GOOD_ORDER.replace(
        "CHANGES SIGNATURE: none", "CHANGES SIGNATURE: `fitToBounds` in src/zoom.ts"
    ).replace("- src/Tile.tsx —", "- src/zoom.ts — the whole file\n- src/Tile.tsx —")
    found = messages(sweepable, order)
    assert any("STOP WHEN omits the module's own suite" in m for m in found)


def test_edited_module_must_run_its_colocated_suite(repo: Path):
    (repo / "src" / "Other.tsx").write_text("export const Other = 1\n", encoding="utf-8")
    (repo / "src" / "__tests__" / "Other.test.tsx").write_text(
        "test('o', () => {})\n", encoding="utf-8"
    )
    order = GOOD_ORDER.replace(
        "- src/Tile.tsx —", "- src/Other.tsx — the whole file\n- src/Tile.tsx —"
    ).replace("- Render `label` after the title in src/Tile.tsx.", "- Edit src/Other.tsx.")
    found = messages(repo, order)
    assert any("STOP WHEN never runs its suite" in m for m in found)


def test_hook_change_requires_lint_in_stop_when(repo: Path):
    """Neither vitest nor tsc sees a missing dependency; only eslint does."""
    (repo / "src" / "useThing.ts").write_text("export const useThing = () => 1\n", encoding="utf-8")
    order = GOOD_ORDER.replace(
        "- src/Tile.tsx —", "- src/useThing.ts — the whole file\n- src/Tile.tsx —"
    ).replace("- Render `label` after the title in src/Tile.tsx.", "- Edit src/useThing.ts.")
    assert any("does not run npm run lint" in m for m in messages(repo, order))

    linted = order.replace("Tile.test.tsx` passes.", "Tile.test.tsx && npm run lint` passes.")
    assert not any("does not run npm run lint" in m for m in messages(repo, linted))


def test_new_test_needs_an_insertion_anchor(repo: Path):
    """Naming the fixture an order reuses is not the same as naming where the test goes."""
    big = repo / "src" / "__tests__" / "Big.test.tsx"
    big.write_text(
        "\n".join(
            {200: "describe('fullscreen', () => {", 201: "})"}.get(n, f"const f{n} = {n}")
            for n in range(500)
        ),
        encoding="utf-8",
    )
    order = (
        GOOD_ORDER.replace(
            "- src/__tests__/Tile.test.tsx\n",
            '- src/__tests__/Big.test.tsx — lines 100-110 @"const f99 = 99"\n',
        )
        .replace("- Add one test to src/__tests__/Tile.test.tsx.", "- Add one test to src/__tests__/Big.test.tsx.")
        .replace("-- src/__tests__/Tile.test.tsx", "-- src/__tests__/Big.test.tsx")
    )
    assert any("without naming the block to insert it into" in m for m in messages(repo, order))

    anchored = order.replace(
        'lines 100-110 @"const f99 = 99"', 'lines 201-210 @"describe(\'fullscreen\', () => {"'
    )
    assert not any("without naming the block" in m for m in messages(repo, anchored))


# --- vitest filters are frontend-relative ------------------------------------------------
#
# One order compiled a repo-relative filter, matched no test file, and its executor run was
# cancelled arguing with a check that had judged an empty run.


def test_repo_relative_vitest_filter_is_rejected(repo: Path):
    order = GOOD_ORDER.replace(
        "STOP WHEN: `cd frontend && npm run test:check -- src/__tests__/Tile.test.tsx` passes.",
        "STOP WHEN: `python scripts/order_check.py "
        "--tests frontend/src/__tests__/Tile.test.tsx --lint`",
    )
    assert any("repo-relative vitest filter" in m for m in messages(repo, order))


def test_frontend_relative_vitest_filter_passes(repo: Path):
    order = GOOD_ORDER.replace(
        "STOP WHEN: `cd frontend && npm run test:check -- src/__tests__/Tile.test.tsx` passes.",
        "STOP WHEN: `python scripts/order_check.py --tests src/__tests__/Tile.test.tsx --lint`",
    )
    assert not any("vitest filter" in m for m in messages(repo, order))


def test_repo_relative_creates_assertion_is_not_flagged(repo: Path):
    """The existence assertion beside the filter is repo-relative on purpose."""
    order = GOOD_ORDER.replace(
        "STOP WHEN: `cd frontend && npm run test:check -- src/__tests__/Tile.test.tsx` passes.",
        "STOP WHEN: `python -c \"from pathlib import Path; "
        "assert Path('frontend/src/__tests__/Tile.test.tsx').exists()\" && "
        "python scripts/order_check.py --tests src/__tests__/Tile.test.tsx --lint`",
    )
    assert not any("vitest filter" in m for m in messages(repo, order))


def test_fix_strips_the_frontend_prefix(repo: Path):
    order = write(
        repo,
        GOOD_ORDER.replace(
            "STOP WHEN: `cd frontend && npm run test:check -- src/__tests__/Tile.test.tsx` passes.",
            "STOP WHEN: `python scripts/order_check.py "
            "--tests frontend/src/__tests__/Tile.test.tsx --lint`",
        ),
    )
    applied = co.autofix_stop_when_filters(order)
    assert applied == [
        ("frontend/src/__tests__/Tile.test.tsx", "src/__tests__/Tile.test.tsx")
    ]
    assert "--tests src/__tests__/Tile.test.tsx" in order.read_text(encoding="utf-8")


# --- a type is a signature ---------------------------------------------------------------
#
# A stripped exported layout type passed a STOP WHEN scoped to one suite and broke three
# others, because CHANGES SIGNATURE read as being about functions only.


def _with_exported_type(repo: Path) -> None:
    (repo / "src" / "layout.ts").write_text(
        "export type KidMapLayout = { rooms: number[]; doors: number[] }\n", encoding="utf-8"
    )
    (repo / "src" / "__tests__" / "layout.test.ts").write_text(
        "test('x', () => {})\n", encoding="utf-8"
    )


def test_undeclared_exported_type_change_is_rejected(repo: Path):
    _with_exported_type(repo)
    order = GOOD_ORDER.replace(
        "- Render `label` after the title in src/Tile.tsx.",
        "- Remove `doors` from the `KidMapLayout` type in src/layout.ts.",
    ).replace(
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
        "- src/layout.ts — whole file",
    )
    assert any("CHANGES SIGNATURE does not declare it" in m for m in messages(repo, order))


def test_declared_exported_type_change_clears_the_rule(repo: Path):
    _with_exported_type(repo)
    order = (
        GOOD_ORDER.replace(
            "- Render `label` after the title in src/Tile.tsx.",
            "- Remove `doors` from the `KidMapLayout` type in src/layout.ts.",
        )
        .replace(
            "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
            "- src/layout.ts — whole file",
        )
        .replace("CHANGES SIGNATURE: none", "CHANGES SIGNATURE: KidMapLayout in src/layout.ts")
    )
    assert not any("CHANGES SIGNATURE does not declare it" in m for m in messages(repo, order))


def test_merely_reading_a_type_is_not_a_change(repo: Path):
    _with_exported_type(repo)
    order = GOOD_ORDER.replace(
        "- Render `label` after the title in src/Tile.tsx.",
        "- Render the rooms of `KidMapLayout` in src/layout.ts as a list.",
    ).replace(
        "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
        "- src/layout.ts — whole file",
    )
    assert not any("CHANGES SIGNATURE does not declare it" in m for m in messages(repo, order))


# --- shape caps ---------------------------------------------------------------------------
# The three ways an order is simply too big to be one order. Each was previously discovered
# by a compiler writing the whole file first; `scripts/new_order.py` now refuses to emit one,
# and these keep the ceiling it enforces identical to the one the linter enforces.


def _extra_files(repo: Path, count: int) -> list[str]:
    made = []
    for index in range(count):
        name = f"src/extra{index}.ts"
        (repo / name).write_text("export const x = 1\n", encoding="utf-8")
        made.append(f"- {name} — whole file")
    return made


def test_start_in_caps_distinct_files(repo: Path):
    order = GOOD_ORDER.replace(
        "- src/__tests__/Tile.test.tsx\n",
        "- src/__tests__/Tile.test.tsx\n" + "\n".join(_extra_files(repo, 3)) + "\n",
    )
    assert any("distinct files" in m for m in messages(repo, order))


def test_repeated_ranges_of_one_file_are_not_extra_files(repo: Path):
    """A second range of an already-open file is nearly free; only new files cost."""
    order = GOOD_ORDER.replace(
        "- src/__tests__/Tile.test.tsx\n",
        "- src/__tests__/Tile.test.tsx\n"
        "- src/Tile.tsx — the export at lines 1-2, nothing else\n"
        "- src/Tile.tsx — the return at lines 2-3, nothing else\n"
        "- src/Tile.tsx — the close at lines 3-3, nothing else\n",
    )
    assert not any("distinct files" in m for m in messages(repo, order))


def test_do_caps_bullets(repo: Path):
    order = GOOD_ORDER.replace(
        "- Add one test to src/__tests__/Tile.test.tsx.",
        "- Add one test to src/__tests__/Tile.test.tsx.\n"
        "- Rename the header wrapper in src/Tile.tsx.\n"
        "- Sort the props in src/Tile.tsx.",
    )
    assert any("DO asks for 4 things" in m for m in messages(repo, order))


def test_stop_when_caps_test_files(repo: Path):
    for name in ("Second", "Third"):
        (repo / "src" / "__tests__" / f"{name}.test.tsx").write_text(
            "test('x', () => {})\n", encoding="utf-8"
        )
    order = GOOD_ORDER.replace(
        "npm run test:check -- src/__tests__/Tile.test.tsx",
        "npm run test:check -- src/__tests__/Tile.test.tsx "
        "src/__tests__/Second.test.tsx src/__tests__/Third.test.tsx",
    )
    assert any("runs 3 test files" in m for m in messages(repo, order))


def test_one_suite_named_twice_counts_once(repo: Path):
    """The vitest filter and a CREATES assertion spell the same file two ways on purpose."""
    order = GOOD_ORDER.replace(
        "npm run test:check -- src/__tests__/Tile.test.tsx",
        "test -f frontend/src/__tests__/Tile.test.tsx && npm run test:check -- "
        "src/__tests__/Tile.test.tsx",
    )
    assert not any("test files" in m for m in messages(repo, order))


def test_frontend_relative_filter_satisfies_the_colocated_suite_rule(repo: Path):
    """order_check.py wants a frontend-relative filter; the rule used to demand the other
    spelling, so a correct order failed lint until a redundant path was pasted in."""
    frontend = repo / "frontend" / "src"
    (frontend / "__tests__").mkdir(parents=True)
    (frontend / "Panel.tsx").write_text("export function Panel() {}\n", encoding="utf-8")
    (frontend / "__tests__" / "Panel.test.tsx").write_text(
        "test('x', () => {})\n", encoding="utf-8"
    )
    order = (
        GOOD_ORDER.replace(
            "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
            "- frontend/src/Panel.tsx — whole file",
        )
        .replace(
            "- Render `label` after the title in src/Tile.tsx.",
            "- Render `label` in frontend/src/Panel.tsx.",
        )
        .replace(
            "- Add one test to src/__tests__/Tile.test.tsx.",
            "- Add one test to frontend/src/__tests__/Panel.test.tsx.",
        )
        .replace(
            "- src/__tests__/Tile.test.tsx\n",
            "- frontend/src/__tests__/Panel.test.tsx\n",
        )
        .replace(
            "`cd frontend && npm run test:check -- src/__tests__/Tile.test.tsx` passes.",
            "`python scripts/order_check.py --tests src/__tests__/Panel.test.tsx` passes.",
        )
    )
    assert not any("never runs its suite" in m for m in messages(repo, order))


def test_order_check_wrapper_flags_satisfy_the_lint_and_typecheck_rules(repo: Path):
    """`order_check.py --lint --typecheck` runs both; demanding the raw npm scripts as well
    made every compiler paste a redundant second command beside a check already running."""
    (repo / "src" / "useThing.ts").write_text("export function useThing() {}\n", encoding="utf-8")
    order = (
        GOOD_ORDER.replace(
            "- src/Tile.tsx — the header block at lines 3-6, nothing else in this file",
            "- src/useThing.ts — whole file",
        )
        .replace(
            "- Render `label` after the title in src/Tile.tsx.",
            "- Memoise the callback in src/useThing.ts.",
        )
        .replace(
            "`cd frontend && npm run test:check -- src/__tests__/Tile.test.tsx` passes.",
            "`python scripts/order_check.py --tests src/__tests__/Tile.test.tsx --typecheck "
            "--lint` passes.",
        )
    )
    found = messages(repo, order)
    assert not any("does not run npm run lint" in m for m in found)
