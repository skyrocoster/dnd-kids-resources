"""Tests for scripts/order_telemetry.py.

The telemetry script is the only durable record of what a dispatched order cost, and its
numbers are read months later to decide how the next stage gets compiled. Each test here
pins one measurement that a previous cycle got wrong or could not make at all: shape
measured by bounded lines rather than file size, re-reads split by cause, a cost that is
comparable across transports, a first-pass rate that does not count a BLOCKED run as a
success, and a markdown view that regenerates from the sidecar without losing an entry.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def _import_order_telemetry():
    spec = importlib.util.spec_from_file_location(
        "order_telemetry_under_test", REPO_ROOT / "scripts" / "order_telemetry.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


ot = _import_order_telemetry()


# --------------------------------------------------------------------------------------
# Scope parsing — the metric that predicts what a run costs
# --------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "scope, expected",
    [
        ("the header block at lines 3-6, nothing else", [(3, 6)]),
        ("lines 1111–1290 only", [(1111, 1290)]),
        ("lines 120 to 180", [(120, 180)]),
        ("the responsive block, 860-905", [(860, 905)]),
        ("lines 10-20 and lines 40-50", [(10, 20), (40, 50)]),
        ("lines 10-20 and lines 21-30", [(10, 30)]),  # adjacent ranges merge
    ],
)
def test_scope_ranges_parses_bounded_ranges(scope, expected):
    ranges, _ = ot.scope_ranges(scope)
    assert ranges == expected


def test_scope_ranges_flags_a_bare_line_anchor():
    """'at line 1469' is the shape behind every re-read loop the log has recorded."""
    ranges, has_point = ot.scope_ranges("the toggle at line 1469, nothing else")
    assert ranges == []
    assert has_point is True


def test_scope_ranges_does_not_treat_a_symbol_scope_as_an_anchor():
    ranges, has_point = ot.scope_ranges("the toggleCanvasFullscreen callback")
    assert ranges == []
    assert has_point is False


def test_scope_ranges_ignores_an_implausible_span():
    ranges, _ = ot.scope_ranges("lines 1-999999")
    assert ranges == []


def _write(tmp_path: Path, name: str, lines: int) -> Path:
    path = tmp_path / name
    path.write_text("x\n" * lines, encoding="utf-8")
    return path


def test_classify_start_in_distinguishes_the_four_scoping_classes(tmp_path, monkeypatch):
    big = _write(tmp_path, "big.tsx", 2300)
    small = _write(tmp_path, "small.tsx", 120)
    monkeypatch.setattr(ot.check_orders, "_resolve", lambda p: tmp_path / Path(p).name)

    ranged = ot.classify_start_in("big.tsx", "the render, lines 200-320, nothing else")
    assert ranged["class"] == "ranged"
    assert ranged["bounded"] == 121

    anchored = ot.classify_start_in("big.tsx", "the toggle at line 1469")
    assert anchored["class"] == "point-anchored"
    assert anchored["bounded"] == 0

    symbol = ot.classify_start_in("big.tsx", "the Scan export")
    assert symbol["class"] == "symbol"

    unscoped = ot.classify_start_in("big.tsx", "")
    assert unscoped["class"] == "unscoped"

    # A file short enough to read whole is bounded by its own size, not a defect.
    whole = ot.classify_start_in("small.tsx", "")
    assert whole["class"] == "small"
    assert whole["bounded"] == 120


def test_classify_start_in_marks_an_unresolvable_path():
    entry = ot.classify_start_in("does/not/exist.tsx", "lines 1-10")
    assert entry["class"] == "missing"
    assert entry["bounded"] == 0


def test_order_shape_reports_bounded_lines_and_scoping(tmp_path, monkeypatch):
    _write(tmp_path, "big.tsx", 2300)
    _write(tmp_path, "small.tsx", 120)
    monkeypatch.setattr(ot.check_orders, "_resolve", lambda p: tmp_path / Path(p).name)
    order = (
        "WORK ORDER 01 — x\n"
        "GOAL: x\n"
        "DEPENDS ON: none\n"
        "REQUIRED STRENGTH: Light\n"
        "CREATES: none\n"
        "REMOVES: none\n"
        "START IN:\n"
        "- big.tsx — the render, lines 200-320, nothing else in this file\n"
        "- small.tsx\n"
        "DO:\n"
        "- Change one thing.\n"
        "STOP WHEN:\n"
        "- it passes\n"
        "STATUS: DONE\n"
    )
    line, shape = ot.order_shape(order)
    assert shape["start_in_files"] == 2
    assert shape["start_in_lines"] == 2420
    assert shape["bounded_lines"] == 241
    assert shape["scoping"] == {"ranged": 1, "whole-small": 1}
    assert shape["do_behaviours"] == 1
    assert "2,420 lines / 241 bounded" in line
    assert ot.unbounded_large_files(shape) == 0


def test_order_shape_separates_an_escalation_from_its_reason(tmp_path, monkeypatch):
    _write(tmp_path, "small.tsx", 120)
    monkeypatch.setattr(ot.check_orders, "_resolve", lambda p: tmp_path / Path(p).name)
    order = (
        "WORK ORDER 01 — x\n"
        "GOAL: x\n"
        "DEPENDS ON: none\n"
        "REQUIRED STRENGTH: Standard — three call sites disagree on the fixture shape\n"
        "CREATES: none\n"
        "REMOVES: none\n"
        "START IN:\n- small.tsx\n"
        "DO:\n- Change one thing.\n"
        "STOP WHEN:\n- it passes\n"
        "STATUS: DONE\n"
    )
    line, shape = ot.order_shape(order)
    assert shape["strength"] == "Standard"
    assert shape["strength_reason"] == "three call sites disagree on the fixture shape"
    # The shape line stays scannable; the reason lives in the structured record.
    assert line.startswith("Standard | START IN")


def test_compute_stats_counts_escalations_above_the_default():
    records = [
        {"kind": "order", "order": "01.md", "status": "DONE",
         "shape": {"scoping": {}, "strength": "Light"}},
        {"kind": "order", "order": "02.md", "status": "DONE",
         "shape": {"scoping": {}, "strength": "Standard"}},
    ]
    stats = ot.compute_stats(records)
    assert stats["escalated"] == 1
    assert stats["escalated_strengths"] == {"Standard": 1}
    assert "escalated above Light: 1 of 2 measured (1 Standard)" in ot.render_stats(stats)


def test_unbounded_large_files_counts_the_risky_classes():
    shape = {"scoping": {"ranged": 2, "point-anchored": 1, "unscoped": 1, "symbol": 3}}
    assert ot.unbounded_large_files(shape) == 2


# --------------------------------------------------------------------------------------
# Re-read profile — locating and post-edit re-reads have opposite fixes
# --------------------------------------------------------------------------------------


def test_reread_profile_splits_locating_from_post_edit():
    sequence = [
        ("read", "a.tsx"),
        ("read", "a.tsx"),  # still looking for the target
        ("edit", "a.tsx"),
        ("read", "a.tsx"),  # reading back after an edit
        ("read", "b.tsx"),  # read once; not a duplicate at all
    ]
    profile = ot._reread_profile(sequence)
    assert profile == {"a.tsx": {"total": 3, "locating": 1, "post_edit": 1}}


def test_reread_profile_ignores_single_reads():
    assert ot._reread_profile([("read", "a.tsx"), ("edit", "a.tsx")]) == {}


def test_fmt_duplicates_names_both_causes():
    rendered = ot.fmt_duplicates({"a.tsx": {"total": 15, "locating": 13, "post_edit": 1}})
    assert rendered == "a.tsx x15 (13 locating, 1 post-edit)"


# --------------------------------------------------------------------------------------
# Cost — comparable across transports
# --------------------------------------------------------------------------------------


def test_model_rates_matches_the_longest_prefix():
    prices = {"models": {"claude": {"input": 1.0, "output": 1.0},
                         "claude-sonnet-5": {"input": 3.0, "output": 15.0}}}
    assert ot.model_rates("claude-sonnet-5-20260101", prices)["input"] == 3.0


def test_estimate_cost_prices_cache_reads_and_writes():
    usage = {
        "input_tokens": 1_000_000,
        "output_tokens": 1_000_000,
        "cache_read_input_tokens": 1_000_000,
        "cache_creation_input_tokens": 1_000_000,
    }
    cost = ot.estimate_cost(usage, {"input": 3.0, "output": 15.0})
    assert cost == pytest.approx(3.0 + 15.0 + 0.3 + 3.75)


def test_resolve_cost_prefers_the_transport_figure():
    metrics = {"cost": 0.0306, "model": "claude-sonnet-5", "usage": {}}
    assert ot.resolve_cost(metrics, ot.DEFAULT_PRICES) == {
        "value": 0.0306,
        "source": "reported",
    }


def test_resolve_cost_derives_a_figure_when_the_transport_reports_none():
    """Claude transcripts carry tokens but no price, so those entries had no cost at all."""
    metrics = {"model": "claude-sonnet-5", "usage": {"output_tokens": 1_000_000}}
    resolved = ot.resolve_cost(metrics, ot.DEFAULT_PRICES)
    assert resolved["source"] == "estimated"
    assert resolved["value"] == pytest.approx(15.0)


def test_resolve_cost_refuses_to_invent_a_rate():
    metrics = {"model": "some-new-model", "usage": {"output_tokens": 500}}
    resolved = ot.resolve_cost(metrics, ot.DEFAULT_PRICES)
    assert resolved == {"value": None, "source": "not priced"}
    assert "not priced" in ot.fmt_cost(resolved, "some-new-model")


def test_repo_price_table_parses_and_covers_the_models_in_use():
    prices = ot.load_prices(REPO_ROOT / "scripts" / "model_prices.json")
    assert ot.model_rates("claude-sonnet-5", prices)
    assert ot.model_rates("claude-haiku-4-5-20251001", prices)


# --------------------------------------------------------------------------------------
# Consistency flag — a note that contradicts the measured lines
# --------------------------------------------------------------------------------------


def test_consistency_flag_catches_a_clean_claim_with_outside_reads():
    record = {"fault": "none", "reads": {"outside": ["src/other.tsx"], "duplicates": {}}}
    assert "outside START IN" in ot.consistency_flag(record)


def test_consistency_flag_catches_a_clean_claim_with_post_edit_rereads():
    record = {
        "fault": "none",
        "reads": {"outside": [], "duplicates": {"a.tsx": {"total": 3, "post_edit": 2}}},
    }
    assert "post-edit" in ot.consistency_flag(record)


def test_consistency_flag_is_silent_for_a_genuinely_clean_run():
    record = {"fault": "none", "reads": {"outside": [], "duplicates": {}}}
    assert ot.consistency_flag(record) == ""


def test_consistency_flag_does_not_second_guess_an_admitted_fault():
    record = {"fault": "order", "reads": {"outside": ["src/other.tsx"], "duplicates": {}}}
    assert ot.consistency_flag(record) == ""


# --------------------------------------------------------------------------------------
# Scoreboard
# --------------------------------------------------------------------------------------


def test_compute_stats_does_not_count_a_blocked_first_run_as_clean():
    """A BLOCKED first attempt is still 'first pass: yes' on its own entry."""
    records = [
        {"kind": "order", "order": "01.md", "status": "BLOCKED - bad KNOWN STATE"},
        {"kind": "order", "order": "01.md", "status": "DONE"},
        {"kind": "order", "order": "02.md", "status": "DONE"},
    ]
    stats = ot.compute_stats(records)
    assert stats["runs"] == 3
    assert stats["unique_orders"] == 2
    assert stats["clean"] == 1
    assert stats["redispatched_orders"] == 1


def test_compute_stats_sums_both_sides_of_the_ledger():
    records = [
        {"kind": "order", "order": "01.md", "status": "DONE",
         "cost": {"value": 0.03, "source": "reported"}, "fault": "none"},
        {"kind": "reconcile", "label": "stage 1", "missed": ["a stale assertion"],
         "planner": {"compile_cost": 1.85, "dispatch_cost": 0.40, "reissues": 0}},
    ]
    stats = ot.compute_stats(records)
    assert stats["executor_spend"] == pytest.approx(0.03)
    assert stats["planner_spend"] == pytest.approx(2.25)
    assert stats["planner_stages"] == 1
    assert stats["escapes"] == 1
    assert stats["faults"] == {"none": 1}


def test_compute_stats_counts_orders_dispatched_without_a_bound():
    records = [
        {"kind": "order", "order": "01.md", "status": "DONE",
         "shape": {"scoping": {"point-anchored": 1, "ranged": 1}}},
        {"kind": "order", "order": "02.md", "status": "DONE",
         "shape": {"scoping": {"ranged": 2}}},
    ]
    stats = ot.compute_stats(records)
    assert stats["unbounded_orders"] == 1
    assert stats["measured_shapes"] == 2


# --------------------------------------------------------------------------------------
# Rendering and the sidecar round trip
# --------------------------------------------------------------------------------------


def test_reconcile_entry_says_so_when_planner_cost_is_missing():
    rendered = ot.render_reconcile_entry(
        {"stamp": "2026-07-26 20:00", "label": "stage 1", "checks": "pytest: pass",
         "missed": [], "planner": {}}
    )
    assert "planner cost: not recorded" in rendered
    # A note that only restates "nothing escaped" is noise; omit it entirely.
    assert "reconcile note" not in rendered


def test_order_entry_carries_the_structured_fault_and_flag():
    rendered = ot.render_order_entry(
        {
            "stamp": "2026-07-26 20:00",
            "order": "01-x.md",
            "status": "DONE",
            "first_pass": "yes",
            "shape_line": "Light | START IN 1 files / 100 lines / 100 bounded",
            "shape_source": "dispatch snapshot 2026-07-26T19:00:00",
            "model": "claude-haiku-4-5",
            "turns": 27,
            "usage": {"output_tokens": 2658, "input_tokens": 100},
            "cost": {"value": 0.01, "source": "estimated"},
            "tools": {"Read": 5},
            "largest_results": [],
            "reads": {"duplicates": {}, "outside": ["src/other.tsx"]},
            "deviations": "none",
            "fault": "none",
            "note": "Clean run.",
            "source": "claude transcript agent-x.jsonl",
        }
    )
    assert "- compiler note: fault: none — Clean run." in rendered
    assert "cost $0.0100 est" in rendered
    assert "- flag: " in rendered  # claimed clean, but read outside START IN


def test_import_render_round_trip_loses_no_entry_line(tmp_path):
    """The migration path: every '- ' line of a hand-written log survives regeneration."""
    original = (REPO_ROOT / "docs" / "plans" / "telemetry-log.md").read_text(
        encoding="utf-8"
    )
    records = ot.import_markdown(original)
    rendered = ot.render_log(records)
    kept = set(rendered.splitlines())
    missing = [
        line
        for line in original.splitlines()
        if line.startswith(("- ", "## ")) and line not in kept
    ]
    assert missing == []


def test_import_markdown_separates_the_three_entry_kinds():
    text = (
        "# header\n\n"
        "## Closed cycle - 2026-07-25 (12 runs)\n\nsome prose\n\n"
        "Reset here for the next cycle. Nothing below this line predates 2026-07-25.\n\n"
        "## 2026-07-26 17:37 — 01-x.md\n- status: DONE\n- first pass: yes\n"
        "- tokens: output 1 | fresh input 2 | cache read 3 | cost $0.0072\n\n"
        "## 2026-07-26 17:46 — feature stage 1 (reconcile)\n"
        "- escaped targeted checks: a stale assertion\n"
    )
    records = ot.import_markdown(text)
    assert [r["kind"] for r in records] == ["cycle", "order", "reconcile"]
    assert records[1]["order"] == "01-x.md"
    assert records[1]["cost"] == {"value": 0.0072, "source": "reported"}
    assert records[2]["missed"] == ["a stale assertion"]
    # The reset bookmark described a truncation that never happened; --close-cycle does it now.
    assert "Reset here" not in records[0]["raw"]


def test_import_markdown_keeps_a_clean_reconcile_out_of_the_escape_count():
    text = (
        "## 2026-07-26 17:46 — feature stage 1 (reconcile)\n"
        "- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN\n"
    )
    assert ot.import_markdown(text)[0]["missed"] == []


def test_sidecar_round_trips(tmp_path):
    sidecar = tmp_path / "telemetry.jsonl"
    records = [{"kind": "order", "order": "01.md", "status": "DONE", "note": "é — em dash"}]
    ot.write_sidecar(sidecar, records)
    assert ot.read_sidecar(sidecar) == records
    assert json.loads(sidecar.read_text(encoding="utf-8").strip())["note"] == "é — em dash"


def test_prior_runs_counts_only_this_order():
    records = [
        {"kind": "order", "order": "01.md"},
        {"kind": "order", "order": "01.md"},
        {"kind": "order", "order": "02.md"},
        {"kind": "reconcile", "label": "01.md"},
    ]
    assert ot.prior_runs(records, "01.md") == 2


def test_render_log_drops_archived_entries_but_keeps_cycles():
    records = [
        {"kind": "cycle", "stamp": "2026-07-26", "label": "cycle 1", "summary": "done",
         "lessons": [], "stats": {}, "archive": "docs/plans/telemetry-archive/x.md"},
        {"kind": "order", "order": "01.md", "status": "DONE", "archived": True,
         "raw": "## old — 01.md\n- status: DONE\n"},
        {"kind": "order", "order": "02.md", "status": "DONE",
         "raw": "## new — 02.md\n- status: DONE\n"},
    ]
    rendered = ot.render_log(records)
    assert "01.md" not in rendered
    assert "02.md" in rendered
    assert "cycle 1" in rendered
    assert "telemetry-archive/x.md" in rendered


def test_render_cycle_entry_labels_lesson_enforcement():
    rendered = ot.render_cycle_entry(
        {
            "stamp": "2026-07-26 20:00",
            "label": "cycle 4",
            "summary": "Two lessons.",
            "lessons": [
                {"status": "enforced", "ref": "check_orders/scope", "text": "bounded ranges"},
                {"status": "judgement", "ref": "", "text": "name the harness transition"},
            ],
            "stats": ot.compute_stats([]),
        }
    )
    assert "**enforced** (check_orders/scope) — bounded ranges" in rendered
    assert "**judgement** — name the harness transition" in rendered


# --------------------------------------------------------------------------------------
# Snapshots
# --------------------------------------------------------------------------------------


def test_reissue_diff_names_the_fields_that_changed():
    before = {"text": "GOAL: a\nKNOWN STATE:\n- wrong fact\nDO:\n- x\n"}
    after = {"text": "GOAL: a\nKNOWN STATE:\n- the corrected fact\n- and another\nDO:\n- x\n"}
    diff = ot.reissue_diff(before, after)
    assert "KNOWN STATE" in diff
    assert "GOAL" not in diff
    assert "+1 lines" in diff


def test_reissue_diff_reports_an_unchanged_order():
    same = {"text": "GOAL: a\nDO:\n- x\n"}
    assert ot.reissue_diff(same, same) == "no field changed"
