"""Extract token telemetry for one completed work order and append it to the running log.

The executor model cannot see its own token counters, so numbers must come from the
records the harness wrote. Two transports parse automatically:

- Claude Code subagents: the transcript JSONL under ~/.claude/projects/<slug>/.
- opencode sessions: the SQLite DB at ~/.local/share/opencode/opencode.db.

Discovery searches both for the record whose opening prompt names the order file and
uses the newest match. The script computes usage and cost-driver metrics, appends a
structured record to `docs/plans/telemetry.jsonl`, and re-renders the human-readable
`docs/plans/telemetry-log.md` from that sidecar.

The sidecar is the record; the markdown is a view of it. Correlating order shape against
cost — the whole reason the log exists — needs aggregation, and prose bullets cannot be
aggregated. Every entry still reads the same in the markdown, but the numbers behind it
can now be summed, and the cycle scoreboard at the top of the log is generated rather
than recalled.

Every entry also records the *shape of the order itself*. That shape is captured at
dispatch (`--snapshot`), not at report time: a reissued order overwrites its own file, and
the 2026-07-26 19:16 BLOCKED entry lost its measurements exactly that way.

Usage (from repo root):
    .venv\\Scripts\\python.exe scripts/order_telemetry.py --snapshot --order docs/plans/active/<feature>/<NN>-<slug>.md
    .venv\\Scripts\\python.exe scripts/order_telemetry.py --order docs/plans/active/<feature>/<NN>-<slug>.md --fault none --note "..."

Modes:
    --snapshot            capture the order's compiled shape before dispatch (no log entry)
    --order               log one executor run (the default mode)
    --reconcile LABEL     log one stage-level reconcile entry
    --close-cycle LABEL   distil the live entries into a cycle summary and archive them
    --render              rebuild the markdown from the sidecar
    --import-log          backfill the sidecar from an existing markdown log

Options:
    --fault {order,executor,mixed,none}
                          required for order entries: who the run's cost drivers trace
                          back to. Structured so a note that contradicts the measured
                          lines is visible instead of buried in prose.
    --note "<text>"       one sentence: the lesson for compiling the next order
    --note-detail "<text>"  optional longer reasoning, kept out of the headline
    --status <text>       required when the order file has no STATUS line (a run that was
                          cancelled or stalled): say what actually happened, e.g.
                          "STALLED - manually stopped after 40 turns, no STATUS written"
    --first-pass yes|no   override the automatic first-pass detection (default: "no" when
                          the log already holds an entry for this order)
    --planner-run         this order was implemented directly by the planner (the fast
                          path in CLAUDE.md) rather than dispatched
    --transcript <path>   explicit Claude transcript JSONL (skips auto-discovery). This is the
                          subagent record at
                          ~/.claude/projects/<slug>/<session>/subagents/agent-<id>.jsonl,
                          NOT the .../tasks/<id>.output path the Agent tool reports — that
                          one can be an empty stub. Rejected if it holds no assistant turns.
    --opencode-session <id>  explicit opencode session id (skips auto-discovery)
    --project-dir <path>  Claude Code project dir (default: derived from cwd)
    --opencode-db <path>  opencode DB (default: ~/.local/share/opencode/opencode.db)
    --log <path>          markdown view (default: docs/plans/telemetry-log.md)
    --sidecar <path>      structured record (default: docs/plans/telemetry.jsonl)
    --no-log              print only, do not record
    --manual "<text>"     no parseable record (e.g. ChatGPT transport): log the
                          order's STATUS + DEVIATIONS plus this free-text token/model
                          summary pasted from the other tool's UI
    --model <name>        manual entries only: the model that ran the order
    --turns <n>           manual entries only: assistant turn count, if the UI shows one

Reconcile-only options:
    --checks, --missed, --compile-cost, --dispatch-cost, --reissues

Manual entries print a "missing:" line naming every field auto-parsed entries carry,
so a hollow entry reads as incomplete instead of looking filled in.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sqlite3
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_orders  # noqa: E402  (same directory; shares the order-file parsers)

CHARS_PER_TOKEN = 4  # rough estimate for tool-result sizes only
DEFAULT_LOG = "docs/plans/telemetry-log.md"
DEFAULT_SIDECAR = "docs/plans/telemetry.jsonl"
ARCHIVE_DIR = "docs/plans/telemetry-archive"
SNAPSHOT_DIR = ".telemetry/snapshots"
PRICES_FILE = "scripts/model_prices.json"

EDIT_TOOLS = {"edit", "write", "multiedit", "notebookedit", "patch", "apply_patch"}
READ_TOOLS = {"read", "view"}


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def default_project_dir() -> Path:
    slug = re.sub(r"[^A-Za-z0-9]", "-", str(repo_root()))
    return Path.home() / ".claude" / "projects" / slug


def now_stamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def iter_records(path: Path):
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def first_user_text(path: Path, max_records: int = 5) -> str:
    """Concatenated text of the first few user messages (the dispatch prompt)."""
    chunks: list[str] = []
    for i, rec in enumerate(iter_records(path)):
        if i >= max_records:
            break
        if rec.get("type") != "user":
            continue
        content = rec.get("message", {}).get("content")
        if isinstance(content, str):
            chunks.append(content)
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    chunks.append(block.get("text", ""))
    return "\n".join(chunks)


def find_transcript(project_dir: Path, order_path: Path) -> Path | None:
    """Newest *subagent* transcript whose opening prompt names the order file.

    The dispatcher's own session transcript also names the order — it wrote the dispatch
    prompt — and it keeps growing after the executor finishes, so mixing both pools into
    one newest-wins sort hands back the parent whenever the child left no record. Search
    the subagent pool alone; a missing entry is recoverable, a confident misattribution is
    not (see the 2026-07-25 20:20 correction in the telemetry log).
    """
    needle = order_path.name
    candidates = sorted(
        project_dir.glob("*/subagents/agent-*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for path in candidates:
        try:
            if needle in first_user_text(path):
                return path
        except OSError:
            continue
    return None


def block_text(content) -> str:
    """Flatten a message content field (string or block list) to text."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                if isinstance(block.get("text"), str):
                    parts.append(block["text"])
                elif isinstance(block.get("content"), (str, list)):
                    parts.append(block_text(block["content"]))
        return "".join(parts)
    return ""


def tool_label(name: str, tool_input: dict) -> str:
    if not isinstance(tool_input, dict):
        return name
    target = (
        tool_input.get("file_path")
        or tool_input.get("path")
        or tool_input.get("pattern")
        or tool_input.get("command")
        or tool_input.get("description")
        or ""
    )
    target = str(target).replace("\n", " ")
    root = str(repo_root())
    if target.startswith(root):
        target = target[len(root) :].lstrip("\\/")
    if len(target) > 70:
        target = target[:67] + "..."
    return f"{name} {target}".strip()


def parse_start_in(order_text: str) -> list[str]:
    paths: list[str] = []
    in_section = False
    for line in order_text.splitlines():
        if re.match(r"^START IN\b", line):
            in_section = True
            continue
        if in_section:
            m = re.match(r"^\s*[-*]\s+(\S+)", line)
            if m:
                paths.append(m.group(1).replace("\\", "/"))
            elif line.strip() and re.match(r"^[A-Z][A-Z ]+:", line.strip()):
                break
    return paths


def extract_order_sections(order_text: str) -> tuple[str, str]:
    """Return (STATUS line, DEVIATIONS block) from the order file."""
    status = "not recorded"
    m = re.search(r"^STATUS:\s*(.+)$", order_text, re.MULTILINE)
    if m and not m.group(1).strip().startswith("<"):
        status = m.group(1).strip()
    deviations = "not recorded"
    dm = re.search(
        r"^DEVIATIONS:\s*\n((?:[ \t]*[-*].*\n?)+)", order_text, re.MULTILINE
    )
    if dm:
        lines = [
            re.sub(r"^\s*[-*]\s*", "", ln).strip()
            for ln in dm.group(1).splitlines()
            if ln.strip()
        ]
        # RUN SUMMARY rides in the same block but is reported on its own line.
        lines = [ln for ln in lines if not ln.startswith("RUN SUMMARY:")]
        deviations = " | ".join(lines) or "none stated"
    return status, deviations


def extract_run_summary(order_text: str) -> str:
    """The executor's self-reported RUN SUMMARY line, if it wrote one."""
    m = re.search(r"^\s*[-*]?\s*RUN SUMMARY:\s*(.+)$", order_text, re.MULTILINE)
    return m.group(1).strip() if m else ""


def rel_display(path_str: str) -> str:
    p = path_str.replace("\\", "/")
    root = str(repo_root()).replace("\\", "/")
    if p.startswith(root):
        p = p[len(root) :].lstrip("/")
    return p


# --------------------------------------------------------------------------------------
# Order shape
# --------------------------------------------------------------------------------------

# The scope grammar is owned by `check_orders.py`: the linter enforces it and `--fix`
# rewrites it, so a second copy here would let the shape numbers in the log drift away
# from the rules that produced them. Re-exported under the old names because the shape
# code below and its tests already read this way.
RANGE_RE = check_orders.RANGE_RE
BARE_RANGE_RE = check_orders.BARE_RANGE_RE
POINT_RE = check_orders.POINT_RE
MAX_PLAUSIBLE_SPAN = check_orders.MAX_PLAUSIBLE_SPAN
_merge_ranges = check_orders._merge_ranges
scope_ranges = check_orders.scope_ranges


def classify_start_in(path_str: str, scope: str) -> dict:
    """One START IN entry, measured by how much of the file the executor must read.

    `lines` (the size of the named files) turned out to be nearly non-predictive: the two
    cheapest runs in the first three cycles named more than 6,000 lines each, and the only
    BLOCKED run named 4,752. What separated them was whether START IN bounded the reading.
    Small files are counted as bounded — a 200-line file read whole is the scope.
    """
    resolved = check_orders._resolve(path_str)
    lines = check_orders._line_count(resolved) if resolved.is_file() else 0
    entry = {"path": path_str.replace("\\", "/"), "lines": lines}
    if not resolved.is_file():
        entry["class"] = "missing"
        entry["bounded"] = 0
        return entry
    if lines <= check_orders.SCOPE_REQUIRED_LINES:
        entry["class"] = "small"
        entry["bounded"] = lines
        return entry
    ranges, has_point = scope_ranges(scope)
    if ranges:
        entry["class"] = "ranged"
        entry["bounded"] = min(sum(end - start + 1 for start, end in ranges), lines)
        return entry
    if has_point:
        entry["class"] = "point-anchored"
    elif len(scope.strip()) >= 3:
        entry["class"] = "symbol"
    else:
        entry["class"] = "unscoped"
    entry["bounded"] = 0
    return entry


SHAPE_CLASS_LABELS = {
    "ranged": "ranged",
    "point-anchored": "point-anchored",
    "symbol": "symbol-scoped",
    "unscoped": "unscoped",
    "small": "whole-small",
    "missing": "unresolvable",
}


def order_shape(order_text: str) -> tuple[str, dict]:
    """How big a thing the order asked for, measured from the order file itself.

    Returns the one-line rendering and the structured fields behind it. The structured
    form is what the sidecar keeps: an expensive run is usually predictable before dispatch
    from how much of START IN was bounded and how many behaviours DO asked for at once, but
    only if those numbers can be summed across runs rather than re-read as prose.
    """
    sections = check_orders.split_sections(order_text)
    entries = check_orders.start_in_entries(sections)
    files = [classify_start_in(path_str, scope) for _, path_str, scope in entries]
    counts = Counter(item["class"] for item in files)
    level, strength_reason = check_orders.split_strength(
        " ".join(sections.get("REQUIRED STRENGTH", []))
    )
    shape = {
        "strength": level or "not declared",
        "strength_reason": strength_reason,
        "start_in_files": len(entries),
        "start_in_lines": sum(item["lines"] for item in files),
        "bounded_lines": sum(item["bounded"] for item in files),
        "scoping": {SHAPE_CLASS_LABELS[k]: v for k, v in counts.items()},
        "do_behaviours": len(check_orders.bullets(sections.get("DO", []))),
        "creates": len(check_orders.declared_paths(sections, "CREATES")),
        "removes": len(check_orders.declared_paths(sections, "REMOVES")),
        "files": files,
    }
    return fmt_shape(shape), shape


def fmt_shape(shape: dict) -> str:
    scoping = ", ".join(f"{v} {k}" for k, v in shape["scoping"].items()) or "none"
    return (
        f"{shape['strength']} | START IN {shape['start_in_files']} files "
        f"/ {shape['start_in_lines']:,} lines / {shape['bounded_lines']:,} bounded"
        f" | scoping: {scoping}"
        f" | DO {shape['do_behaviours']} behaviour(s)"
        f" | creates {shape['creates']} / removes {shape['removes']}"
    )


def unbounded_large_files(shape: dict) -> int:
    """START IN entries the executor has no stated stopping point inside."""
    return sum(
        shape["scoping"].get(label, 0) for label in ("point-anchored", "unscoped")
    )


# --------------------------------------------------------------------------------------
# Dispatch-time snapshots
# --------------------------------------------------------------------------------------


def snapshot_path(order_rel: str) -> Path:
    slug = re.sub(r"[^A-Za-z0-9._-]", "_", order_rel)
    return repo_root() / SNAPSHOT_DIR / f"{slug}.json"


def load_snapshots(order_rel: str) -> list[dict]:
    path = snapshot_path(order_rel)
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []


def write_snapshot(order_rel: str, order_text: str) -> dict:
    """Freeze the compiled order at dispatch, before the executor can overwrite it.

    A reissue rewrites the order file in place, so shape read at report time is the shape
    of whichever version happened to survive. That is not hypothetical: the BLOCKED entry
    of 2026-07-26 19:16 carries a 90-word caveat explaining that its deviations belong to
    the *second* run, because the first order file was gone by the time it was measured.
    Snapshots also make the reissue diff available, which is the most direct evidence
    there is for what a re-dispatch actually cost.
    """
    shape_line, shape = order_shape(order_text)
    record = {
        "dispatched": datetime.now().isoformat(timespec="seconds"),
        "shape": shape,
        "shape_line": shape_line,
        "sha256": hashlib.sha256(order_text.encode("utf-8")).hexdigest(),
        "text": order_text,
    }
    snapshots = load_snapshots(order_rel)
    snapshots.append(record)
    path = snapshot_path(order_rel)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(snapshots, indent=1), encoding="utf-8")
    return record


def clear_snapshots() -> int:
    directory = repo_root() / SNAPSHOT_DIR
    if not directory.exists():
        return 0
    count = len(list(directory.glob("*.json")))
    shutil.rmtree(directory, ignore_errors=True)
    return count


ORDER_SECTION_RE = re.compile(
    r"^(GOAL|DEPENDS ON|REQUIRED STRENGTH|CREATES|REMOVES|KNOWN STATE|"
    r"KNOWN TEST FAILURES|START IN|DO|STOP WHEN):",
    re.MULTILINE,
)


def _order_sections_map(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    matches = list(ORDER_SECTION_RE.finditer(text))
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        sections[match.group(1)] = text[match.end() : end]
    return sections


def reissue_diff(previous: dict, current: dict) -> str:
    """Which fields the reissue changed — the cheapest available lesson about a re-dispatch."""
    before = _order_sections_map(previous.get("text", ""))
    after = _order_sections_map(current.get("text", ""))
    changed = [
        name
        for name in sorted(set(before) | set(after))
        if before.get(name, "").strip() != after.get(name, "").strip()
    ]
    before_lines = len(previous.get("text", "").splitlines())
    after_lines = len(current.get("text", "").splitlines())
    delta = after_lines - before_lines
    return (
        f"fields changed: {', '.join(changed) or 'none'} "
        f"({after_lines - before_lines:+d} lines, {before_lines} → {after_lines})"
        if changed or delta
        else "no field changed"
    )


# --------------------------------------------------------------------------------------
# Cost
# --------------------------------------------------------------------------------------

DEFAULT_PRICES = {
    "_note": (
        "USD per million tokens. cache_read/cache_write default to 0.1x and 1.25x of "
        "input when omitted. Keys match on longest prefix of the model id. Edit this "
        "file rather than the script when a rate changes; unknown models log as "
        "'not priced' instead of guessing."
    ),
    "models": {
        "claude-opus-5": {"input": 15.0, "output": 75.0},
        "claude-opus-4": {"input": 15.0, "output": 75.0},
        "claude-sonnet-5": {"input": 3.0, "output": 15.0},
        "claude-sonnet-4": {"input": 3.0, "output": 15.0},
        "claude-haiku-4-5": {"input": 1.0, "output": 5.0},
        "claude-3-5-haiku": {"input": 0.8, "output": 4.0},
    },
}


def load_prices(path: Path | None = None) -> dict:
    path = path or (repo_root() / PRICES_FILE)
    if not path.exists():
        return DEFAULT_PRICES
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return DEFAULT_PRICES


def model_rates(model: str, prices: dict) -> dict | None:
    models = prices.get("models") or {}
    best: tuple[int, dict] | None = None
    for key, rates in models.items():
        if model.startswith(key) and (best is None or len(key) > best[0]):
            best = (len(key), rates)
    return best[1] if best else None


def estimate_cost(usage: Counter, rates: dict) -> float:
    per_m = lambda n, rate: (n or 0) / 1_000_000 * rate
    cache_read = rates.get("cache_read", rates["input"] * 0.1)
    cache_write = rates.get("cache_write", rates["input"] * 1.25)
    return (
        per_m(usage.get("input_tokens"), rates["input"])
        + per_m(usage.get("output_tokens"), rates["output"])
        + per_m(usage.get("cache_read_input_tokens"), cache_read)
        + per_m(usage.get("cache_creation_input_tokens"), cache_write)
    )


def resolve_cost(metrics: dict, prices: dict) -> dict:
    """One comparable cost field for every transport.

    opencode reports a figure; Claude transcripts do not, so those entries carried no cost
    at all and could not be compared against the runs they were meant to be compared
    against. Deriving the missing side from the token counts is the only way the log can
    answer which role each model is actually worth running.
    """
    if metrics.get("cost"):
        return {"value": float(metrics["cost"]), "source": "reported"}
    rates = model_rates(metrics.get("model", ""), prices)
    if not rates:
        return {"value": None, "source": "not priced"}
    return {"value": estimate_cost(metrics["usage"], rates), "source": "estimated"}


def fmt_cost(cost: dict, model: str) -> str:
    if cost.get("value") is None:
        return f" | cost not priced (no rate for {model})"
    suffix = " est" if cost.get("source") == "estimated" else ""
    return f" | cost ${cost['value']:.4f}{suffix}"


# --------------------------------------------------------------------------------------
# Transcript analysis
# --------------------------------------------------------------------------------------


def _reread_profile(sequence: list[tuple[str, str]]) -> dict[str, dict]:
    """Split re-reads of a file into locating and post-edit.

    `path x15` conflated two behaviours with opposite fixes: fifteen failures to find a
    target inside an unbounded file (an order-shape fault) and fifteen read-after-edit
    verifications (an executor-discipline fault, and the one `implement-order` now
    forbids). The compliance rule added at the last cycle close cannot be checked against a
    metric that cannot tell them apart.
    """
    edited: set[str] = set()
    reads: dict[str, dict] = {}
    for kind, path in sequence:
        if kind == "read":
            bucket = reads.setdefault(path, {"total": 0, "locating": 0, "post_edit": 0})
            bucket["total"] += 1
            if bucket["total"] > 1:
                bucket["post_edit" if path in edited else "locating"] += 1
        elif kind == "edit":
            edited.add(path)
    return {path: data for path, data in reads.items() if data["total"] > 1}


def _outside_reads(read_paths, start_in: list[str], order_name: str) -> list[str]:
    norm_start = [p.lstrip("./") for p in start_in]
    skip_prefixes = (".claude/skills/", ".agents/skills/", "docs/plans/active/")

    def outside(path: str) -> bool:
        if path.startswith(skip_prefixes) or path.endswith(order_name):
            return False
        return not any(path.endswith(s) or s.endswith(path) for s in norm_start)

    return sorted(p for p in read_paths if outside(p))


def _elapsed(seconds: int | None) -> str:
    if seconds is None:
        return ""
    return f"{seconds // 60}m{seconds % 60:02d}s"


def analyse(transcript: Path, start_in: list[str], order_name: str) -> dict:
    usage_total = Counter()
    tool_counts: Counter = Counter()
    tool_by_id: dict[str, str] = {}
    results: list[tuple[int, str]] = []  # (approx tokens, label)
    sequence: list[tuple[str, str]] = []
    turns = 0
    model = "unknown"
    first_ts = last_ts = None

    for rec in iter_records(transcript):
        ts = rec.get("timestamp")
        if ts:
            first_ts = first_ts or ts
            last_ts = ts
        msg = rec.get("message", {})
        if rec.get("type") == "assistant":
            turns += 1
            model = msg.get("model", model)
            usage = msg.get("usage") or {}
            for key in (
                "input_tokens",
                "output_tokens",
                "cache_read_input_tokens",
                "cache_creation_input_tokens",
            ):
                usage_total[key] += usage.get(key) or 0
            for block in msg.get("content") or []:
                if isinstance(block, dict) and block.get("type") == "tool_use":
                    name = block.get("name", "?")
                    tool_input = block.get("input") or {}
                    tool_counts[name] += 1
                    tool_by_id[block.get("id", "")] = tool_label(name, tool_input)
                    target = tool_input.get("file_path") or tool_input.get("path") or ""
                    if not target:
                        continue
                    lowered = name.lower()
                    if lowered in READ_TOOLS:
                        sequence.append(("read", rel_display(str(target))))
                    elif lowered in EDIT_TOOLS:
                        sequence.append(("edit", rel_display(str(target))))
        elif rec.get("type") == "user":
            content = msg.get("content")
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "tool_result":
                        text = block_text(block.get("content"))
                        label = tool_by_id.get(block.get("tool_use_id", ""), "?")
                        results.append((len(text) // CHARS_PER_TOKEN, label))

    started = None
    seconds = None
    if first_ts:
        try:
            parse = lambda s: datetime.fromisoformat(s.replace("Z", "+00:00"))
            started = parse(first_ts).astimezone()
            if last_ts:
                seconds = int((parse(last_ts) - parse(first_ts)).total_seconds())
        except ValueError:
            started = None

    reads = _reread_profile(sequence)
    read_paths = {path for kind, path in sequence if kind == "read"}
    return {
        "model": model,
        "turns": turns,
        "started": started,
        "wall_seconds": seconds,
        "elapsed": _elapsed(seconds),
        "usage": usage_total,
        "tool_counts": tool_counts,
        "largest_results": sorted(results, reverse=True)[:3],
        "duplicate_reads": reads,
        "outside_reads": _outside_reads(read_paths, start_in, order_name),
    }


def default_opencode_db() -> Path:
    return Path.home() / ".local" / "share" / "opencode" / "opencode.db"


def opencode_connect(db_path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)


def find_opencode_session(db_path: Path, order_path: Path) -> tuple[str, float] | None:
    """(session_id, last_update) of the executor's *child* session for this order.

    The dispatcher's own session also names the order file — it wrote the dispatch prompt —
    and it keeps updating after the executor finishes, so a plain "newest session naming the
    order" lookup returns the parent deterministically whenever the child leaves no record.
    That is not hypothetical: the 2026-07-25 20:20 entry in the telemetry log recorded the
    gpt-5.6-sol *dispatcher* as if it were the executor, and the real run's numbers were lost.

    Executor runs are spawned as child sessions, so restrict the search to sessions with a
    parent. If the only match is a parent session, return None and let the caller refuse to
    guess: a missing entry is recoverable, a confidently wrong one is not.
    """
    needle = order_path.name
    with opencode_connect(db_path) as con:
        rows = con.execute(
            "select p.session_id, max(p.time_updated) from part p "
            "join session s on s.id = p.session_id "
            "where p.data like ? and p.data like '%\"type\":\"text\"%' "
            "and s.parent_id is not null "
            "group by p.session_id order by max(p.time_updated) desc limit 1",
            (f"%{needle}%",),
        ).fetchall()
    if not rows or rows[0][0] is None:
        return None
    return rows[0][0], rows[0][1] / 1000.0


def analyse_opencode(
    db_path: Path, session_id: str, start_in: list[str], order_name: str
) -> dict:
    usage_total = Counter()
    tool_counts: Counter = Counter()
    results: list[tuple[int, str]] = []
    sequence: list[tuple[str, str]] = []
    turns = 0
    model = "unknown"
    cost = 0.0
    first_ms = last_ms = None

    with opencode_connect(db_path) as con:
        for (data,) in con.execute(
            "select data from message where session_id = ? order by time_created",
            (session_id,),
        ):
            try:
                d = json.loads(data)
            except json.JSONDecodeError:
                continue
            t = d.get("time", {})
            for ms in (t.get("created"), t.get("completed")):
                if ms:
                    first_ms = ms if first_ms is None else min(first_ms, ms)
                    last_ms = ms if last_ms is None else max(last_ms, ms)
            if d.get("role") != "assistant":
                continue
            turns += 1
            model = d.get("modelID", model)
            cost += d.get("cost") or 0
            tok = d.get("tokens") or {}
            usage_total["input_tokens"] += tok.get("input") or 0
            usage_total["output_tokens"] += (tok.get("output") or 0) + (
                tok.get("reasoning") or 0
            )
            cache = tok.get("cache") or {}
            usage_total["cache_read_input_tokens"] += cache.get("read") or 0
            usage_total["cache_creation_input_tokens"] += cache.get("write") or 0

        for (data,) in con.execute(
            "select data from part where session_id = ? and data like '%\"type\":\"tool\"%' "
            "order by time_created",
            (session_id,),
        ):
            try:
                d = json.loads(data)
            except json.JSONDecodeError:
                continue
            if d.get("type") != "tool":
                continue
            name = d.get("tool", "?")
            tool_counts[name] += 1
            state = d.get("state") or {}
            tool_input = state.get("input") or {}
            if not isinstance(tool_input, dict):
                tool_input = {}
            # opencode uses filePath / command / pattern in tool inputs
            tool_input.setdefault("file_path", tool_input.get("filePath", ""))
            label = tool_label(name, tool_input)
            output = state.get("output")
            if isinstance(output, str):
                results.append((len(output) // CHARS_PER_TOKEN, label))
            target = tool_input.get("file_path")
            if not target:
                continue
            lowered = name.lower()
            if lowered in READ_TOOLS:
                sequence.append(("read", rel_display(str(target))))
            elif lowered in EDIT_TOOLS:
                sequence.append(("edit", rel_display(str(target))))

    started = datetime.fromtimestamp(first_ms / 1000) if first_ms else None
    seconds = int((last_ms - first_ms) / 1000) if first_ms and last_ms else None
    reads = _reread_profile(sequence)
    read_paths = {path for kind, path in sequence if kind == "read"}
    return {
        "model": model,
        "turns": turns,
        "started": started,
        "wall_seconds": seconds,
        "elapsed": _elapsed(seconds),
        "cost": cost,
        "usage": usage_total,
        "tool_counts": tool_counts,
        "largest_results": sorted(results, reverse=True)[:3],
        "duplicate_reads": reads,
        "outside_reads": _outside_reads(read_paths, start_in, order_name),
    }


# --------------------------------------------------------------------------------------
# Sidecar
# --------------------------------------------------------------------------------------


def read_sidecar(path: Path) -> list[dict]:
    if not path.exists():
        return []
    records = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return records


def write_sidecar(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for record in records:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def prior_runs(records: list[dict], order_rel: str) -> int:
    """How many entries this order already has — a reissue is not a first pass."""
    return sum(
        1
        for r in records
        if r.get("kind") == "order" and r.get("order") == order_rel
    )


# --------------------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------------------

LOG_HEADER = """# Work-order telemetry log

Generated from `docs/plans/telemetry.jsonl` by `scripts/order_telemetry.py`. **Do not edit
this file by hand** — edits are overwritten on the next render. The sidecar is the record;
this is the readable view of it, so that order shape can actually be summed against cost
instead of re-read as prose.

One entry per order run. Order files are deleted at reconcile, so the sidecar is the only
durable trace. At each cycle close (`--close-cycle`) the live entries are distilled into a
summary and moved to `docs/plans/telemetry-archive/`, which is why this file stays short.

Token notes: "fresh input" = uncached input actually paid at full rate (includes cache
writes); "cache read" is cheap. "largest tool results" sizes are estimated at ~4
chars/token. Cost is the transport's own figure where it reports one and is otherwise
derived from the token counts and `scripts/model_prices.json`, marked "est"; a model with
no rate logs as "not priced" rather than as zero.

"compiler note" is the dispatcher's read of the run, written at dispatch time. It opens
with a structured `fault:` — order, executor, mixed, or none — so a note that contradicts
the measured lines is visible at a glance rather than buried in prose. When it does
contradict them, the entry carries a `flag:` line saying so.

"first pass" is the number actually worth optimising. Executor runs cost cents; a
re-dispatch costs a cold start, the planner's attention, and often a stalled dependency
chain — far more than the token spread between a clean run and a verbose one. Read the
token lines as a diagnosis of *why* an order thrashed, not as the target.

"order shape (compiled)" measures the order rather than the executor, captured at dispatch
before a reissue can overwrite the file. The number that predicts cost is **bounded** —
how many of the START IN lines sit inside a named range — not how many lines the files
hold. `scoping` breaks the entries down: `ranged` names a line range, `point-anchored`
names a bare line number inside a large file (the shape that produced every re-read loop
so far), `symbol-scoped` names a symbol to grep for, `unscoped` names nothing, and
`whole-small` is a file short enough that reading it whole *is* the scope.

"duplicate reads" splits re-reads into `locating` (the executor could not find its target —
an order-shape fault) and `post-edit` (read-back after an edit — the executor-discipline
fault that `implement-order` forbids). They have opposite fixes.

Entries marked "(reconcile)" are stage-level, written once per stage by the `reconcile`
skill rather than per order. Their "escaped targeted checks" lines are the ones to read
first in a review pass: each is a defect that passed an order's own STOP WHEN and was
only caught by the full suites, the typecheck or the contract checks. A repeat across
stages means the fix belongs in the `to-orders` template, not in another one-off note.
Those entries also carry the planner-side cost of the stage — compiling and dispatching —
without which the log cannot say whether dispatching beat implementing the change directly.
"""


def fmt_note(note: str | None) -> str:
    if not note:
        return "not recorded"
    return " ".join(note.split())


def fmt_duplicates(duplicates: dict) -> str:
    if not duplicates:
        return "none"
    parts = []
    for path, data in sorted(
        duplicates.items(), key=lambda kv: kv[1]["total"], reverse=True
    ):
        parts.append(
            f"{path} x{data['total']} ({data['locating']} locating, "
            f"{data['post_edit']} post-edit)"
        )
    return ", ".join(parts)


def consistency_flag(record: dict) -> str:
    """Does the dispatcher's `fault:` survive contact with the measured lines?

    Three notes in the first three cycles asserted a clean run while the lines directly
    above them recorded reads outside START IN. The contradiction was invisible because
    both sides were prose. This is the cheapest possible check: state it in the entry.
    """
    if record.get("fault") != "none":
        return ""
    problems = []
    outside = record.get("reads", {}).get("outside") or []
    if outside:
        problems.append(f"{len(outside)} read(s) outside START IN")
    post_edit = sum(
        data.get("post_edit", 0)
        for data in (record.get("reads", {}).get("duplicates") or {}).values()
    )
    if post_edit:
        problems.append(f"{post_edit} post-edit re-read(s)")
    if not problems:
        return ""
    return (
        "compiler note says fault: none, but the measured lines show "
        + " and ".join(problems)
    )


def render_order_entry(record: dict) -> str:
    if record.get("raw"):
        return record["raw"]
    usage = record.get("usage") or {}
    fresh = (usage.get("input_tokens") or 0) + (
        usage.get("cache_creation_input_tokens") or 0
    )
    lines = [
        f"## {record['stamp']} — {record['order']}\n",
        f"- status: {record['status']}\n",
        f"- first pass: {record['first_pass']}\n",
        f"- order shape (compiled): {record.get('shape_line', 'not recorded')}"
        f" [{record.get('shape_source', 'unknown')}]\n",
    ]
    if record.get("reissue_diff"):
        lines.append(f"- reissue diff: {record['reissue_diff']}\n")
    if record.get("planner_run"):
        lines.append("- transport: planner (direct implementation, not dispatched)\n")
    if record.get("transport") == "manual":
        lines.append("- transport: manual (chat UI — no parseable local record)\n")
    model_line = f"- model: {record.get('model', 'unknown')}"
    if record.get("turns") is not None:
        model_line += f" | turns: {record['turns']}"
    if record.get("elapsed"):
        model_line += f" | wall: {record['elapsed']}"
    lines.append(model_line + "\n")
    if record.get("reported"):
        lines.append(f"- reported: {record['reported']}\n")
    else:
        lines.append(
            f"- tokens: output {usage.get('output_tokens', 0):,} | fresh input {fresh:,} "
            f"| cache read {usage.get('cache_read_input_tokens', 0):,}"
            f"{fmt_cost(record.get('cost') or {}, record.get('model', 'unknown'))}\n"
        )
        tools = (
            ", ".join(f"{n} x{c}" for n, c in (record.get("tools") or {}).items())
            or "none"
        )
        largest = (
            "; ".join(
                f"{item['label']} (~{item['tokens']:,} tok)"
                for item in record.get("largest_results") or []
            )
            or "none"
        )
        lines.append(f"- tool calls: {tools}\n")
        lines.append(f"- largest tool results: {largest}\n")
        lines.append(
            f"- duplicate reads: {fmt_duplicates((record.get('reads') or {}).get('duplicates') or {})}\n"
        )
        lines.append(
            "- reads outside START IN: "
            + (", ".join((record.get("reads") or {}).get("outside") or []) or "none")
            + "\n"
        )
    if record.get("run_summary"):
        lines.append(f"- executor run summary: {record['run_summary']}\n")
    lines.append(f"- deviations (executor): {record.get('deviations', 'not recorded')}\n")
    note = f"fault: {record.get('fault', 'not stated')} — {fmt_note(record.get('note'))}"
    lines.append(f"- compiler note: {note}\n")
    if record.get("note_detail"):
        lines.append(f"- note detail: {fmt_note(record['note_detail'])}\n")
    flag = consistency_flag(record)
    if flag:
        lines.append(f"- flag: {flag}\n")
    if record.get("missing"):
        lines.append(
            f"- missing (not measurable in this transport): {', '.join(record['missing'])}\n"
        )
    lines.append(f"- source: {record.get('source', 'not recorded')}\n")
    return "".join(lines)


def render_reconcile_entry(record: dict) -> str:
    if record.get("raw"):
        return record["raw"]
    lines = [f"## {record['stamp']} — {record['label']} (reconcile)\n"]
    lines.append(f"- stage checks: {record.get('checks') or 'not recorded'}\n")
    missed = record.get("missed") or []
    if missed:
        for item in missed:
            lines.append(f"- escaped targeted checks: {item}\n")
    else:
        lines.append(
            "- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN\n"
        )
    planner = record.get("planner") or {}
    if any(planner.get(k) is not None for k in ("compile_cost", "dispatch_cost", "reissues")):
        parts = []
        for key, label in (
            ("compile_cost", "compile"),
            ("dispatch_cost", "dispatch + repair"),
        ):
            value = planner.get(key)
            parts.append(
                f"{label} ${value:.2f}" if value is not None else f"{label} not recorded"
            )
        if planner.get("reissues") is not None:
            parts.append(f"reissues {planner['reissues']}")
        lines.append(f"- planner cost: {' | '.join(parts)}\n")
    else:
        lines.append(
            "- planner cost: not recorded — the dispatch-vs-direct comparison cannot be made for this stage\n"
        )
    if record.get("note"):
        lines.append(f"- reconcile note: {fmt_note(record['note'])}\n")
    return "".join(lines)


def render_cycle_entry(record: dict) -> str:
    body = record["raw"] if record.get("raw") else _render_cycle_body(record)
    if record.get("archive"):
        name = Path(record["archive"]).name
        body = (
            body.rstrip()
            + f"\n\nRaw entries for this cycle: [{name}](telemetry-archive/{name})\n"
        )
    return body


def _render_cycle_body(record: dict) -> str:
    lines = [f"## Closed cycle — {record['stamp']} — {record['label']}\n"]
    if record.get("summary"):
        lines.append(f"\n{fmt_note(record['summary'])}\n")
    stats = record.get("stats") or {}
    if stats:
        lines.append("\n" + render_stats(stats, heading=None))
    lessons = record.get("lessons") or []
    if lessons:
        lines.append("\nLessons, and where each one now lives:\n\n")
        for lesson in lessons:
            marker = (
                f"**enforced** ({lesson['ref']})"
                if lesson["status"] == "enforced"
                else "**judgement**"
            )
            lines.append(f"- {marker} — {lesson['text']}\n")
    return "".join(lines)


def render_entry(record: dict) -> str:
    kind = record.get("kind")
    if kind == "reconcile":
        return render_reconcile_entry(record)
    if kind == "cycle":
        return render_cycle_entry(record)
    return render_order_entry(record)


def compute_stats(records: list[dict]) -> dict:
    orders = [r for r in records if r.get("kind") == "order"]
    reconciles = [r for r in records if r.get("kind") == "reconcile"]

    # "Clean" means one run that finished DONE — not merely a run that happened to be the
    # first. A BLOCKED first attempt is still marked "first pass: yes" on its own entry,
    # so counting those reports a 100% rate for a cycle that in fact paid for a reissue.
    by_order: dict[str, list[dict]] = {}
    for record in orders:
        by_order.setdefault(record.get("order") or "?", []).append(record)
    unique = set(by_order)
    clean = sum(
        1
        for runs in by_order.values()
        if len(runs) == 1 and str(runs[0].get("status", "")).upper().startswith("DONE")
    )
    faults = Counter(r.get("fault") for r in orders if r.get("fault"))
    executor_spend = sum(
        (r.get("cost") or {}).get("value") or 0.0
        for r in orders
        if isinstance(r.get("cost"), dict)
    )
    planner_spend = 0.0
    planner_stages = 0
    for r in reconciles:
        planner = r.get("planner") or {}
        values = [planner.get("compile_cost"), planner.get("dispatch_cost")]
        if any(v is not None for v in values):
            planner_stages += 1
            planner_spend += sum(v for v in values if v is not None)
    unbounded = sum(
        1
        for r in orders
        if (r.get("shape") or {}).get("scoping")
        and unbounded_large_files(r["shape"]) > 0
    )
    # Light is the default for every order, so an escalation is an exception that should
    # stay visible and stay rare — and be readable against whether it actually paid off.
    escalated = [
        r
        for r in orders
        if (r.get("shape") or {}).get("strength") not in (None, "", check_orders.DEFAULT_STRENGTH)
    ]
    return {
        "runs": len(orders),
        "unique_orders": len(unique),
        "clean": clean,
        "redispatched_orders": sum(1 for runs in by_order.values() if len(runs) > 1),
        "redispatches": len(orders) - len(unique),
        "stages": len(reconciles),
        "escapes": sum(len(r.get("missed") or []) for r in reconciles),
        "faults": dict(faults),
        "executor_spend": round(executor_spend, 4),
        "planner_spend": round(planner_spend, 4),
        "planner_stages": planner_stages,
        "unbounded_orders": unbounded,
        "measured_shapes": sum(1 for r in orders if r.get("shape")),
        "escalated": len(escalated),
        "escalated_strengths": dict(
            Counter(r["shape"]["strength"] for r in escalated)
        ),
    }


def render_stats(stats: dict, heading: str | None = "## Scoreboard — current cycle") -> str:
    unique = stats.get("unique_orders") or 0
    clean = stats.get("clean", 0)
    pct = f" ({clean * 100 // unique}%)" if unique else ""
    lines = []
    if heading:
        lines.append(f"{heading}\n\n")
    lines.append(
        f"- order runs: {stats['runs']} across {unique} unique order(s); "
        f"DONE on one run {clean} of {unique}{pct}, "
        f"re-dispatched orders {stats.get('redispatched_orders', 0)} "
        f"({stats['redispatches']} extra run(s))\n"
    )
    lines.append(
        f"- stages reconciled: {stats['stages']} | escaped targeted checks: {stats['escapes']}\n"
    )
    faults = stats.get("faults") or {}
    lines.append(
        "- fault attribution: "
        + (", ".join(f"{k} {v}" for k, v in sorted(faults.items())) or "none recorded")
        + "\n"
    )
    planner = (
        f"${stats['planner_spend']:.2f} over {stats['planner_stages']} stage(s)"
        if stats.get("planner_stages")
        else "not recorded"
    )
    lines.append(
        f"- spend: executor ${stats['executor_spend']:.2f} | planner {planner}\n"
    )
    lines.append(
        f"- orders dispatched with an unbounded large file in START IN: "
        f"{stats['unbounded_orders']} of {stats['measured_shapes']} measured\n"
    )
    escalated = stats.get("escalated")
    if escalated is not None:
        detail = ", ".join(
            f"{v} {k}" for k, v in sorted((stats.get("escalated_strengths") or {}).items())
        )
        lines.append(
            f"- escalated above {check_orders.DEFAULT_STRENGTH}: {escalated} of "
            f"{stats['measured_shapes']} measured"
            + (f" ({detail})" if detail else "")
            + "\n"
        )
    return "".join(lines)


def render_log(records: list[dict]) -> str:
    live = [r for r in records if not r.get("archived")]
    cycles = [r for r in live if r.get("kind") == "cycle"]
    entries = [r for r in live if r.get("kind") != "cycle"]
    parts = [LOG_HEADER, "\n", render_stats(compute_stats(entries)), "\n"]
    for cycle in cycles:
        parts.append(render_cycle_entry(cycle).rstrip() + "\n\n")
    for entry in entries:
        parts.append(render_entry(entry).rstrip() + "\n\n")
    return "".join(parts).rstrip() + "\n"


def commit(
    root: Path,
    sidecar_rel: str,
    log_rel: str,
    record: dict,
    records: list[dict] | None = None,
) -> None:
    """Append one record to the sidecar and re-render the markdown from it."""
    sidecar = root / sidecar_rel
    all_records = records if records is not None else read_sidecar(sidecar)
    if record is not None:
        all_records.append(record)
    write_sidecar(sidecar, all_records)
    (root / log_rel).write_text(render_log(all_records), encoding="utf-8")
    print(f"Recorded in {sidecar_rel}; re-rendered {log_rel}")


# --------------------------------------------------------------------------------------
# Importing an existing markdown log
# --------------------------------------------------------------------------------------

HEADING_RE = re.compile(r"^## (.+)$", re.MULTILINE)


def import_markdown(text: str) -> list[dict]:
    """Backfill the sidecar from a hand-appended log, keeping every entry verbatim.

    Shape and fault cannot be re-derived for orders that no longer exist, so legacy blocks
    are stored as `raw` and rendered unchanged. Enough is parsed off them — status, first
    pass, cost — for the scoreboard to count history rather than restart at zero.
    """
    records: list[dict] = []
    matches = list(HEADING_RE.finditer(text))
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[match.start() : end].rstrip() + "\n"
        heading = match.group(1).strip()
        if heading.lower().startswith("closed cycle"):
            stamp = _first_date(heading) or ""
            body = re.sub(
                r"\n*Reset here for the next cycle\.[^\n]*\n?", "\n", block
            ).rstrip() + "\n"
            records.append(
                {"kind": "cycle", "stamp": stamp, "label": heading, "raw": body,
                 "legacy": True}
            )
            continue
        stamp, _, label = heading.partition(" — ")
        record = {
            "kind": "reconcile" if label.endswith("(reconcile)") else "order",
            "stamp": stamp.strip(),
            "raw": block,
            "legacy": True,
        }
        if record["kind"] == "reconcile":
            record["label"] = label.replace("(reconcile)", "").strip()
            record["missed"] = [
                m.group(1).strip()
                for m in re.finditer(r"^- escaped targeted checks: (.+)$", block, re.M)
                if not m.group(1).startswith("none —")
            ]
        else:
            record["order"] = label.strip()
            record["status"] = _field(block, "status") or "not recorded"
            record["first_pass"] = _field(block, "first pass") or "not recorded"
            cost = re.search(r"cost \$([0-9.]+)", block)
            record["cost"] = (
                {"value": float(cost.group(1)), "source": "reported"} if cost else {}
            )
        records.append(record)
    return records


def _field(block: str, name: str) -> str:
    m = re.search(rf"^- {re.escape(name)}: (.+)$", block, re.MULTILINE)
    return m.group(1).strip() if m else ""


def _first_date(text: str) -> str:
    m = re.search(r"\d{4}-\d{2}-\d{2}", text)
    return m.group(0) if m else ""


def ensure_sidecar(root: Path, sidecar_rel: str, log_rel: str) -> list[dict]:
    """Records for this log, importing a pre-sidecar markdown log on first use."""
    sidecar = root / sidecar_rel
    if sidecar.exists():
        return read_sidecar(sidecar)
    log_path = root / log_rel
    if not log_path.exists():
        return []
    records = import_markdown(log_path.read_text(encoding="utf-8"))
    write_sidecar(sidecar, records)
    print(
        f"Imported {len(records)} existing entries from {log_rel} into {sidecar_rel}",
        file=sys.stderr,
    )
    return records


# --------------------------------------------------------------------------------------
# Entry points
# --------------------------------------------------------------------------------------


def build_arg_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--order")
    ap.add_argument(
        "--snapshot",
        action="store_true",
        help=(
            "Capture the compiled order's shape before dispatch and exit. Run this from "
            "dispatch-orders; without it, shape is read from whichever version of the "
            "order file survived, which a reissue overwrites."
        ),
    )
    ap.add_argument(
        "--reconcile",
        metavar="LABEL",
        help=(
            "Write a stage-level reconcile entry instead of an order entry, e.g. "
            "--reconcile 'maplab-ux-pass stage 7'. Use with --checks, --missed, --note "
            "and the planner-cost flags. Required by the reconcile skill once per stage, "
            "whether or not anything escaped."
        ),
    )
    ap.add_argument(
        "--close-cycle",
        metavar="LABEL",
        help=(
            "Distil the live entries into a cycle summary, archive them under "
            "docs/plans/telemetry-archive/, and clear dispatch snapshots. Use with "
            "--summary and --lesson."
        ),
    )
    ap.add_argument("--summary", help="cycle close: the prose read of the cycle")
    ap.add_argument(
        "--lesson",
        action="append",
        metavar="LESSON",
        help=(
            "Repeatable, cycle close only. One lesson, prefixed 'enforced:<ref> — text' "
            "or 'judgement: text'. A lesson with nowhere to live is one that will be "
            "rediscovered next cycle, so the prefix is required."
        ),
    )
    ap.add_argument("--render", action="store_true", help="rebuild the markdown and exit")
    ap.add_argument(
        "--import-log",
        action="store_true",
        help="backfill the sidecar from the markdown log and exit",
    )
    ap.add_argument(
        "--checks",
        help="One line of stage-level results: pytest, npm run test, npm run build, check_docs.",
    )
    ap.add_argument(
        "--missed",
        action="append",
        metavar="DEFECT",
        help=(
            "Repeatable. One defect that passed an order's targeted STOP WHEN but failed at "
            "stage level. Say what it was, which order it traces to, and whether it is a repeat."
        ),
    )
    ap.add_argument(
        "--compile-cost",
        type=float,
        help=(
            "Reconcile only. USD the planner spent compiling this stage into orders. The "
            "executor side has always been logged and the planner side never was, so the "
            "log could not say whether dispatching beat implementing the change directly."
        ),
    )
    ap.add_argument(
        "--dispatch-cost",
        type=float,
        help="Reconcile only. USD the planner spent dispatching, diagnosing and repairing this stage.",
    )
    ap.add_argument(
        "--reissues",
        type=int,
        help="Reconcile only. How many orders in this stage had to be re-dispatched.",
    )
    ap.add_argument("--transcript")
    ap.add_argument("--opencode-session")
    ap.add_argument("--project-dir")
    ap.add_argument("--opencode-db")
    ap.add_argument("--log", default=DEFAULT_LOG)
    ap.add_argument("--sidecar", default=DEFAULT_SIDECAR)
    ap.add_argument("--no-log", action="store_true")
    ap.add_argument("--manual")
    ap.add_argument("--model")
    ap.add_argument("--turns", type=int)
    ap.add_argument(
        "--planner-run",
        action="store_true",
        help=(
            "This order was implemented directly by the planner rather than dispatched. "
            "Marks the entry so the fast path can be compared against dispatched runs."
        ),
    )
    ap.add_argument(
        "--status",
        help=(
            "What actually happened, for a run that wrote no STATUS line — cancelled, "
            "stalled, or manually stopped. Required in that case: 'status: not recorded' "
            "is how the two most instructive runs in the log lost their outcome."
        ),
    )
    ap.add_argument(
        "--first-pass",
        choices=("yes", "no"),
        help=(
            "Override first-pass detection. By default this is 'no' when the log already "
            "holds an entry for this order. First-pass rate is the number worth optimising: "
            "a re-dispatch costs far more than any token spread between clean runs."
        ),
    )
    ap.add_argument(
        "--fault",
        choices=("order", "executor", "mixed", "none"),
        help=(
            "Required for order entries. Who this run's cost drivers trace back to: the "
            "compiled order, the executor, both, or neither. Structured rather than prose "
            "so it can be counted, and so a note contradicting the measured lines is flagged."
        ),
    )
    ap.add_argument(
        "--note",
        help=(
            "One sentence: the lesson for compiling the next order. Required by the "
            "dispatch-orders skill; logged as 'not recorded' when omitted."
        ),
    )
    ap.add_argument(
        "--note-detail",
        help="Optional longer reasoning, kept off the headline note line.",
    )
    return ap


def cmd_snapshot(root: Path, args) -> int:
    order_path = resolve_order(root, args.order)
    if order_path is None:
        return 1
    order_rel = rel_display(str(order_path))
    text = order_path.read_text(encoding="utf-8")
    snapshots = load_snapshots(order_rel)
    record = write_snapshot(order_rel, text)
    print(f"Snapshot {len(snapshots) + 1} for {order_rel}")
    print(f"  {record['shape_line']}")
    if snapshots:
        print(f"  reissue diff: {reissue_diff(snapshots[-1], record)}")
    unbounded = unbounded_large_files(record["shape"])
    if unbounded:
        print(
            f"  WARNING: {unbounded} large START IN file(s) have no bounded range. "
            "Every re-read loop in the log so far came from this shape.",
            file=sys.stderr,
        )
    return 0


def resolve_order(root: Path, order_arg: str | None) -> Path | None:
    if not order_arg:
        print(
            "ERROR: --order is required (or use --reconcile / --close-cycle / --render)",
            file=sys.stderr,
        )
        return None
    order_path = (
        Path(order_arg)
        if Path(order_arg).is_absolute()
        else (root / order_arg).resolve()
    )
    if not order_path.exists():
        print(f"ERROR: order file not found: {order_path}", file=sys.stderr)
        return None
    return order_path


def cmd_close_cycle(root: Path, args, records: list[dict]) -> int:
    lessons = []
    for raw in args.lesson or []:
        text = " ".join(raw.split())
        if text.startswith("enforced:"):
            body = text[len("enforced:") :].strip()
            ref, _, rest = body.partition("—")
            if not rest.strip():
                ref, _, rest = body.partition(" - ")
            if not rest.strip():
                print(
                    f"ERROR: enforced lesson needs '<ref> — <text>': {text}",
                    file=sys.stderr,
                )
                return 1
            lessons.append(
                {"status": "enforced", "ref": ref.strip(), "text": rest.strip()}
            )
        elif text.startswith("judgement:"):
            lessons.append(
                {"status": "judgement", "ref": "", "text": text[len("judgement:"):].strip()}
            )
        else:
            print(
                "ERROR: each --lesson must start with 'enforced:<ref> — ' or 'judgement: '.\n"
                "       A lesson with nowhere to live is one that gets rediscovered next "
                "cycle; the prefix is what makes a repeat legible.",
                file=sys.stderr,
            )
            return 1

    live = [r for r in records if not r.get("archived")]
    entries = [r for r in live if r.get("kind") != "cycle"]
    if not entries:
        print("ERROR: no live entries to close.", file=sys.stderr)
        return 1
    stats = compute_stats(entries)
    stamp = now_stamp()
    cycle = {
        "kind": "cycle",
        "stamp": stamp,
        "label": args.close_cycle,
        "summary": args.summary or "",
        "lessons": lessons,
        "stats": stats,
    }

    if args.no_log:
        print(render_cycle_entry(cycle))
        return 0

    slug = re.sub(r"[^a-z0-9]+", "-", args.close_cycle.lower()).strip("-")
    stem = f"{datetime.now().strftime('%Y-%m-%d')}-{slug}.md"
    # The archive belongs beside whichever log is being written, so a test or a
    # scratch run cannot deposit files into the real docs tree.
    if args.log == DEFAULT_LOG:
        archive_rel = f"{ARCHIVE_DIR}/{stem}"
        archive_path = root / archive_rel
    else:
        archive_path = Path(args.log).resolve().parent / "telemetry-archive" / stem
        archive_rel = archive_path.name
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    body = [
        f"# Archived telemetry — {args.close_cycle}\n\n",
        f"Raw entries distilled into the closed-cycle summary in "
        f"[{Path(args.log).name}](../{Path(args.log).name}) on {stamp}. "
        "Kept for evidence; the summary is the part that is meant to be read.\n\n",
        render_stats(stats, heading="## Cycle totals"),
        "\n",
    ]
    for entry in entries:
        body.append(render_entry(entry).rstrip() + "\n\n")
    archive_path.write_text("".join(body).rstrip() + "\n", encoding="utf-8")

    for entry in entries:
        entry["archived"] = True
        entry["cycle"] = args.close_cycle
    cycle["archive"] = archive_rel
    print(render_cycle_entry(cycle))
    commit(root, args.sidecar, args.log, cycle, records)
    cleared = clear_snapshots()
    print(f"Archived {len(entries)} entries to {archive_rel}; cleared {cleared} snapshot(s)")
    return 0


def cmd_reconcile(root: Path, args, records: list[dict]) -> int:
    record = {
        "kind": "reconcile",
        "stamp": now_stamp(),
        "label": args.reconcile,
        "checks": " ".join((args.checks or "not recorded").split()),
        "missed": [" ".join(item.split()) for item in (args.missed or [])],
        "note": args.note or "",
        "planner": {
            "compile_cost": args.compile_cost,
            "dispatch_cost": args.dispatch_cost,
            "reissues": args.reissues,
        },
    }
    print(render_reconcile_entry(record))
    if args.compile_cost is None and args.dispatch_cost is None:
        print(
            "WARNING: no planner cost recorded for this stage. Without it the log cannot "
            "say whether dispatching this stage beat implementing it directly.",
            file=sys.stderr,
        )
    if not args.no_log:
        commit(root, args.sidecar, args.log, record, records)
    return 0


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    args = build_arg_parser().parse_args()
    root = repo_root()

    if args.snapshot:
        return cmd_snapshot(root, args)

    if args.import_log:
        log_path = root / args.log
        if not log_path.exists():
            print(f"ERROR: no log at {args.log}", file=sys.stderr)
            return 1
        records = import_markdown(log_path.read_text(encoding="utf-8"))
        write_sidecar(root / args.sidecar, records)
        (root / args.log).write_text(render_log(records), encoding="utf-8")
        print(f"Imported {len(records)} entries into {args.sidecar}")
        return 0

    records = ensure_sidecar(root, args.sidecar, args.log)

    if args.render:
        (root / args.log).write_text(render_log(records), encoding="utf-8")
        print(f"Rendered {args.log} from {args.sidecar}")
        return 0

    if args.close_cycle:
        return cmd_close_cycle(root, args, records)

    if args.reconcile:
        return cmd_reconcile(root, args, records)

    order_path = resolve_order(root, args.order)
    if order_path is None:
        return 1
    order_text = order_path.read_text(encoding="utf-8")
    status, deviations = extract_order_sections(order_text)
    start_in = parse_start_in(order_text)
    order_rel_full = rel_display(str(order_path))
    order_rel = order_path.name

    if not args.fault:
        print(
            "ERROR: --fault {order,executor,mixed,none} is required for an order entry.\n"
            "       Say who this run's cost drivers trace back to. Prose notes that "
            "asserted a clean run\n"
            "       while the measured lines said otherwise are why this is a field.",
            file=sys.stderr,
        )
        return 1

    # A run that never wrote STATUS is exactly the run worth recording — it was cancelled,
    # or it stalled. Refuse to log it as "not recorded" and quietly lose the outcome.
    if status == "not recorded":
        if not args.status:
            print(
                "ERROR: the order file has no STATUS line, so this run's outcome is unknown.\n"
                "       Pass --status \"<what happened>\" (e.g. "
                "\"STALLED - manually stopped after 40 turns\").",
                file=sys.stderr,
            )
            return 1
        status = args.status.strip()
    elif args.status:
        status = args.status.strip()

    snapshots = load_snapshots(order_rel_full)
    if snapshots:
        shape_line = snapshots[-1]["shape_line"]
        shape = snapshots[-1]["shape"]
        shape_source = f"dispatch snapshot {snapshots[-1]['dispatched']}"
        current_sha = hashlib.sha256(order_text.encode("utf-8")).hexdigest()
        if current_sha != snapshots[-1]["sha256"]:
            shape_source += "; order file changed after dispatch"
    else:
        shape_line, shape = order_shape(order_text)
        shape_source = "live file — no dispatch snapshot"
        print(
            "WARNING: no dispatch snapshot for this order, so shape is measured from "
            "whichever version survived. Run --snapshot at dispatch.",
            file=sys.stderr,
        )

    if args.first_pass:
        first_pass = args.first_pass
    else:
        earlier = prior_runs(records, order_rel)
        first_pass = "yes" if earlier == 0 else f"no - run {earlier + 1} of this order"

    record = {
        "kind": "order",
        "stamp": now_stamp(),
        "order": order_rel,
        "order_path": order_rel_full,
        "status": status,
        "first_pass": first_pass,
        "shape_line": shape_line,
        "shape": shape,
        "shape_source": shape_source,
        "deviations": deviations,
        "fault": args.fault,
        "note": args.note or "",
        "note_detail": args.note_detail or "",
        "planner_run": bool(args.planner_run),
    }
    if len(snapshots) > 1:
        record["reissue_diff"] = reissue_diff(snapshots[-2], snapshots[-1])

    if args.manual is not None:
        run_summary = extract_run_summary(order_text)
        missing = [
            "tool calls",
            "largest tool results",
            "duplicate reads",
            "reads outside START IN",
        ]
        if not args.model:
            missing.insert(0, "model")
        if args.turns is None:
            missing.insert(1 if args.model else 2, "turns")
        if not re.search(r"\d", args.manual or ""):
            missing.insert(0, "tokens")
        record.update(
            {
                "transport": "manual",
                "model": args.model or "unknown",
                "turns": args.turns,
                "reported": args.manual or "no details given",
                "run_summary": run_summary,
                "missing": missing,
                "source": "manual entry (no parseable record)",
            }
        )
        print(render_order_entry(record))
        if not args.no_log:
            commit(root, args.sidecar, args.log, record, records)
        return 0

    db_path = Path(args.opencode_db) if args.opencode_db else default_opencode_db()

    transcript: Path | None = None
    oc_session: str | None = None
    if args.transcript:
        transcript = Path(args.transcript)
        if not transcript.exists():
            print(f"ERROR: transcript not found: {transcript}", file=sys.stderr)
            return 1
    elif args.opencode_session:
        oc_session = args.opencode_session
    else:
        # Auto-discover in both transports; use whichever record is newer.
        project_dir = Path(args.project_dir) if args.project_dir else default_project_dir()
        claude_hit = find_transcript(project_dir, order_path) if project_dir.exists() else None
        oc_hit = None
        if db_path.exists():
            try:
                oc_hit = find_opencode_session(db_path, order_path)
            except sqlite3.Error as exc:
                print(f"WARNING: could not read opencode DB: {exc}", file=sys.stderr)
        claude_time = claude_hit.stat().st_mtime if claude_hit else -1.0
        oc_time = oc_hit[1] if oc_hit else -1.0
        if claude_hit is None and oc_hit is None:
            print(
                f"ERROR: no executor record naming {order_path.name} found.\n"
                "       Only child records count — a Claude subagent transcript or an "
                "opencode child session.\n"
                "       The dispatcher's own session names the order too, and logging it "
                "would record the dispatcher's\n"
                "       model and tokens as if they were the executor's (see the "
                "2026-07-25 20:20 correction).\n"
                "       Pass --transcript / --opencode-session for the child run, or log "
                "with --manual.",
                file=sys.stderr,
            )
            return 1
        if claude_time >= oc_time:
            transcript = claude_hit
        else:
            oc_session = oc_hit[0]

    if transcript is not None:
        metrics = analyse(transcript, start_in, order_path.name)
        # A transcript that parses to zero assistant turns is not a cheap run — it is no run
        # at all, and logging it writes "output 0 | fresh input 0 | cache read 0" into the
        # record as if that were the measurement. Claude Code's Agent tool reports an
        # `output_file` under .../tasks/<id>.output that can be an empty stub; the real
        # executor record is .../projects/<slug>/<session>/subagents/agent-<id>.jsonl, which
        # is what auto-discovery finds. Refuse rather than log a hollow entry.
        if metrics["turns"] == 0:
            print(
                f"ERROR: {transcript} yielded no assistant turns "
                f"({transcript.stat().st_size} bytes).\n"
                "       This is usually the Agent tool's .../tasks/<id>.output stub rather "
                "than the executor transcript.\n"
                "       The real record is "
                "~/.claude/projects/<slug>/<session>/subagents/agent-<id>.jsonl.\n"
                "       Re-run without --transcript to auto-discover it, pass that path "
                "directly, or log with --manual.",
                file=sys.stderr,
            )
            return 1
        source = f"claude transcript {transcript.name}"
        transport = "claude"
    else:
        metrics = analyse_opencode(db_path, oc_session, start_in, order_path.name)
        source = f"opencode session {oc_session}"
        transport = "opencode"

    if metrics.get("started"):
        record["stamp"] = metrics["started"].strftime("%Y-%m-%d %H:%M")
    record.update(
        {
            "transport": transport,
            "model": metrics["model"],
            "turns": metrics["turns"],
            "elapsed": metrics["elapsed"],
            "wall_seconds": metrics["wall_seconds"],
            "usage": dict(metrics["usage"]),
            "cost": resolve_cost(metrics, load_prices()),
            "tools": dict(metrics["tool_counts"].most_common()),
            "largest_results": [
                {"tokens": tok, "label": label} for tok, label in metrics["largest_results"]
            ],
            "reads": {
                "duplicates": metrics["duplicate_reads"],
                "outside": metrics["outside_reads"],
            },
            "source": source,
        }
    )
    print(render_order_entry(record))
    flag = consistency_flag(record)
    if flag:
        print(f"WARNING: {flag}", file=sys.stderr)
    if not args.no_log:
        commit(root, args.sidecar, args.log, record, records)
    return 0


if __name__ == "__main__":
    sys.exit(main())
