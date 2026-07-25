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
    assert any("START IN does not list" in m for m in found)


def test_bare_filename_in_known_state(repo: Path):
    """Naming `UserIcon`'s file cost a 4.3k-token barrel read when it was left out."""
    order = GOOD_ORDER.replace(
        "- The tile renders the title only.",
        "- The tile renders the title only, per Tile.tsx.",
    )
    assert any("without its path" in m for m in messages(repo, order))


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


def test_large_start_in_entry_needs_a_scope(repo: Path):
    """An unscoped 1000-line file is read whole: ~9.7k tokens for a one-line change."""
    big = repo / "src" / "BigPage.tsx"
    big.write_text("\n".join(f"const line{n} = {n}" for n in range(500)), encoding="utf-8")
    order = GOOD_ORDER.replace(
        "- src/__tests__/Tile.test.tsx\n",
        "- src/__tests__/Tile.test.tsx\n- src/BigPage.tsx\n",
    )
    found = messages(repo, order)
    assert any("has no scope" in m for m in found)

    scoped = order.replace(
        "- src/BigPage.tsx\n",
        "- src/BigPage.tsx — the render at line 12, nothing else in this file\n",
    )
    assert not any("has no scope" in m for m in messages(repo, scoped))


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


def test_lint_orders_on_absent_directory(tmp_path: Path):
    assert co.lint_orders(tmp_path / "nope") == []


def test_lint_orders_walks_the_tree(repo: Path):
    orders = repo / "orders" / "feat"
    orders.mkdir(parents=True)
    (orders / "01.md").write_text("WORK ORDER 01 — y\nGOAL: x\n", encoding="utf-8")
    found = co.lint_orders(repo / "orders")
    assert found and all(error.file.endswith("01.md") for error in found)
