"""Tests for scripts/new_order.py — the work-order generator.

The tool exists because three faults kept costing a compiler a whole rewrite pass: a bare
filename, an unbounded large file, and an order carrying more than one order's worth of
work. Each test here is one of those faults, checked at the argument boundary where it is
free, rather than at the lint where it is a rewrite.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _import_new_order():
    spec = importlib.util.spec_from_file_location(
        "new_order_under_test", REPO_ROOT / "scripts" / "new_order.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


no = _import_new_order()


@pytest.fixture()
def repo(tmp_path: Path, monkeypatch) -> Path:
    """A miniature repo both the tool and the linter it imports resolve against."""
    monkeypatch.setattr(no, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(no.co, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(no, "ORDERS_ROOT", tmp_path / "docs" / "plans" / "active")

    src = tmp_path / "frontend" / "src"
    (src / "__tests__").mkdir(parents=True)
    (src / "Tile.tsx").write_text("export function Tile() {\n  return null\n}\n", encoding="utf-8")
    (src / "__tests__" / "Tile.test.tsx").write_text(
        "describe('Tile', () => {\n  it('renders', () => {})\n})\n", encoding="utf-8"
    )
    (tmp_path / "docs" / "plans" / "active" / "demo").mkdir(parents=True)
    return tmp_path


def run(monkeypatch, capsys, *argv: str) -> tuple[int, str]:
    monkeypatch.setattr(no.sys, "argv", ["new_order.py", *argv])
    code = no.main()
    return code, capsys.readouterr().out


BASE = (
    "--feature", "demo",
    "--number", "01",
    "--title", "Show the label",
    "--goal", "the tile shows its label",
    "--known", "The API already returns `label` on each tile.",
)


def test_bare_filename_is_resolved_to_its_one_path(repo: Path, monkeypatch, capsys):
    """`maplabModel.test.ts` with no directory sent one executor to the wrong folder."""
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "Tile.tsx",
        "--start-in", "Tile.test.tsx",
        "--do", "Render `label` after the title in frontend/src/Tile.tsx",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--stdout",
    )
    assert code == 0
    assert "- frontend/src/Tile.tsx" in out
    assert "- frontend/src/__tests__/Tile.test.tsx" in out


def test_ambiguous_basename_is_refused_rather_than_guessed(repo: Path, monkeypatch, capsys):
    other = repo / "frontend" / "src" / "widgets"
    other.mkdir()
    (other / "Tile.tsx").write_text("export const Tile = 1\n", encoding="utf-8")
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "Tile.tsx",
        "--do", "Render the label",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--stdout",
    )
    assert code == 1
    assert "ambiguous" in out
    assert "frontend/src/widgets/Tile.tsx" in out


def test_large_file_gets_a_derived_range_and_anchor(repo: Path, monkeypatch, capsys):
    big = repo / "frontend" / "src" / "Big.tsx"
    body = ["// filler"] * 500 + [
        "export function RoomLabel() {",
        "  return null",
        "}",
    ] + ["// filler"] * 100
    big.write_text("\n".join(body) + "\n", encoding="utf-8")
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "Big.tsx:RoomLabel",
        "--start-in", "Tile.test.tsx",
        "--do", "Render the label in frontend/src/Big.tsx",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--stdout",
    )
    assert code == 0
    assert 'lines 501-503 @"export function RoomLabel() {"' in out


def test_unbounded_large_file_is_refused(repo: Path, monkeypatch, capsys):
    big = repo / "frontend" / "src" / "Big.tsx"
    big.write_text("// filler\n" * 600, encoding="utf-8")
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "Big.tsx",
        "--do", "Render the label",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--stdout",
    )
    assert code == 1
    assert "needs a bound" in out


def test_too_many_start_in_files_warns_and_still_writes(repo: Path, monkeypatch, capsys):
    """Caps are warnings at authoring time: the order is written with the guidance."""
    extra = []
    for index in range(4):
        name = f"Extra{index}.ts"
        (repo / "frontend" / "src" / name).write_text("export const x = 1\n", encoding="utf-8")
        extra += ["--start-in", name]
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "Tile.tsx",
        *extra,
        "--do", "Render the label",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--stdout",
    )
    assert code == 0, out
    assert "warning:" in out
    assert "distinct files (max 4)" in out
    assert "This is two orders" in out


def test_too_many_start_in_files_refused_under_strict(repo: Path, monkeypatch, capsys):
    """`--strict` is the dispatch gate: the same caps become refusals."""
    extra = []
    for index in range(4):
        name = f"Extra{index}.ts"
        (repo / "frontend" / "src" / name).write_text("export const x = 1\n", encoding="utf-8")
        extra += ["--start-in", name]
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--strict",
        "--start-in", "Tile.tsx",
        *extra,
        "--do", "Render the label",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--stdout",
    )
    assert code == 1
    assert "distinct files (max 4)" in out
    assert "This is two orders" in out


def test_too_many_do_bullets_warns_and_still_writes(repo: Path, monkeypatch, capsys):
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "Tile.tsx",
        "--do", "one",
        "--do", "two",
        "--do", "three",
        "--do", "four",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--stdout",
    )
    assert code == 0, out
    assert "warning:" in out
    assert "DO asks for 4 things (max 3)" in out


def test_too_many_do_bullets_refused_under_strict(repo: Path, monkeypatch, capsys):
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--strict",
        "--start-in", "Tile.tsx",
        "--do", "one",
        "--do", "two",
        "--do", "three",
        "--do", "four",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--stdout",
    )
    assert code == 1
    assert "DO asks for 4 things (max 3)" in out


def test_two_frontend_suites_are_permitted_by_default(repo: Path, monkeypatch, capsys):
    (repo / "frontend" / "src" / "__tests__" / "Other.test.tsx").write_text(
        "test('o', () => {})\n", encoding="utf-8"
    )
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "Tile.tsx",
        "--start-in", "Tile.test.tsx",
        "--start-in", "Other.test.tsx",
        "--do", "Render `label` after the title in frontend/src/Tile.tsx",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--tests", "src/__tests__/Other.test.tsx",
        "--stdout",
    )
    assert code == 0, out
    assert "warning:" not in out


def test_colocated_suite_is_added_to_stop_when(repo: Path, monkeypatch, capsys):
    """The rule the linter enforces, applied before the order is written rather than after."""
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "Tile.tsx",
        "--start-in", "Tile.test.tsx",
        "--do", "Render `label` after the title in frontend/src/Tile.tsx",
        "--stdout",
    )
    assert code == 0
    assert "added co-located suite frontend/src/__tests__/Tile.test.tsx" in out
    assert "--tests src/__tests__/Tile.test.tsx" in out


def test_hook_edit_adds_lint(repo: Path, monkeypatch, capsys):
    """Neither vitest nor tsc sees a missing dependency; one shipped as a stale closure."""
    hook = repo / "frontend" / "src" / "useThing.ts"
    hook.write_text("export function useThing() {}\n", encoding="utf-8")
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "useThing.ts",
        "--start-in", "Tile.test.tsx",
        "--do", "Memoise the callback in frontend/src/useThing.ts",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--stdout",
    )
    assert code == 0, out
    assert "added --lint" in out
    assert "--lint" in out


def test_missing_stop_check_is_refused(repo: Path, monkeypatch, capsys):
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "Tile.tsx",
        "--do", "Render the label",
        "--stdout",
    )
    assert code == 1
    assert "no stop-check" in out


def test_empty_known_state_is_refused(repo: Path, monkeypatch, capsys):
    code, out = run(
        monkeypatch,
        capsys,
        "--feature", "demo",
        "--number", "01",
        "--title", "Show the label",
        "--goal", "the tile shows its label",
        "--start-in", "Tile.tsx",
        "--do", "Render the label",
        "--tests", "src/__tests__/Tile.test.tsx",
        "--stdout",
    )
    assert code == 1
    assert "KNOWN STATE is empty" in out


def test_written_order_passes_the_linter(repo: Path, monkeypatch, capsys):
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--start-in", "Tile.tsx",
        "--start-in", "Tile.test.tsx",
        "--do", "Render `label` after the title in frontend/src/Tile.tsx",
        "--tests", "src/__tests__/Tile.test.tsx",
    )
    assert code == 0, out
    written = repo / "docs" / "plans" / "active" / "demo" / "01-show-the-label.md"
    assert written.is_file()
    assert no.co.lint_order(written) == []


def test_a_failing_render_writes_nothing(repo: Path, monkeypatch, capsys):
    """A refusal must leave no half-formed order behind for a compiler to inherit."""
    code, out = run(
        monkeypatch,
        capsys,
        *BASE,
        "--strength", "Standard",
        "--start-in", "Tile.tsx",
        "--start-in", "Tile.test.tsx",
        "--do", "Render `label` after the title in frontend/src/Tile.tsx",
        "--tests", "src/__tests__/Tile.test.tsx",
    )
    assert code == 1
    assert "does not pass scripts/check_orders.py" in out
    assert not (repo / "docs" / "plans" / "active" / "demo" / "01-show-the-label.md").exists()
