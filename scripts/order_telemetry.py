"""Extract token telemetry for one completed work order and append it to the running log.

The executor model cannot see its own token counters, so numbers must come from the
records the harness wrote. Two transports parse automatically:

- Claude Code subagents: the transcript JSONL under ~/.claude/projects/<slug>/.
- opencode sessions: the SQLite DB at ~/.local/share/opencode/opencode.db.

Discovery searches both for the record whose opening prompt names the order file and
uses the newest match. The script computes usage and cost-driver metrics, prints a
TELEMETRY block, and appends a durable entry to docs/plans/telemetry-log.md (the order
files themselves are deleted at reconcile, so the log is the record).

Every entry also records the *shape of the order itself* — how many files START IN named,
how many lines those files hold, how many are unscoped, how many behaviours DO asked for.
The measured columns describe the executor, but nearly every compiler note in the log
concludes the order was at fault; without the order's shape beside its cost there is
nothing to correlate, and each expensive run stays an anecdote. Order files are deleted at
reconcile, so this is the only chance to capture it.

Usage (from repo root):
    .venv\\Scripts\\python.exe scripts/order_telemetry.py --order docs/plans/active/orders/<feature>/<NN>-<slug>.md
Options:
    --status <text>       required when the order file has no STATUS line (a run that was
                          cancelled or stalled): say what actually happened, e.g.
                          "STALLED - manually stopped after 40 turns, no STATUS written"
    --first-pass yes|no   override the automatic first-pass detection (default: "no" when
                          the log already holds an entry for this order)
    --transcript <path>   explicit Claude transcript JSONL (skips auto-discovery)
    --opencode-session <id>  explicit opencode session id (skips auto-discovery)
    --project-dir <path>  Claude Code project dir (default: derived from cwd)
    --opencode-db <path>  opencode DB (default: ~/.local/share/opencode/opencode.db)
    --log <path>          log file (default: docs/plans/telemetry-log.md)
    --no-log              print only, do not append to the log
    --manual "<text>"     no parseable record (e.g. ChatGPT transport): log the
                          order's STATUS + DEVIATIONS plus this free-text token/model
                          summary pasted from the other tool's UI
    --model <name>        manual entries only: the model that ran the order
    --turns <n>           manual entries only: assistant turn count, if the UI shows one

Manual entries print a "missing:" line naming every field auto-parsed entries carry,
so a hollow entry reads as incomplete instead of looking filled in.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_orders  # noqa: E402  (same directory; shares the order-file parsers)

CHARS_PER_TOKEN = 4  # rough estimate for tool-result sizes only


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def default_project_dir() -> Path:
    slug = re.sub(r"[^A-Za-z0-9]", "-", str(repo_root()))
    return Path.home() / ".claude" / "projects" / slug


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


def order_shape(order_text: str) -> str:
    """How big a thing the order asked for, measured from the order file itself.

    An expensive run is usually predictable from these four numbers before dispatch: a
    large unscoped file in START IN gets read whole, and several behaviours at once is
    what stalls a cheap executor. Logging them beside the cost turns the compiler notes
    from anecdotes into something that can be correlated.
    """
    sections = check_orders.split_sections(order_text)
    entries = check_orders.start_in_entries(sections)
    total_lines = 0
    unscoped = 0
    for _, path_str, scope in entries:
        resolved = check_orders._resolve(path_str)
        if resolved.is_file():
            lines = check_orders._line_count(resolved)
            total_lines += lines
            if lines > check_orders.SCOPE_REQUIRED_LINES and len(scope) < 3:
                unscoped += 1
    do_bullets = len(check_orders.bullets(sections.get("DO", [])))
    return (
        f"START IN {len(entries)} files / {total_lines:,} lines"
        + (f" ({unscoped} unscoped over {check_orders.SCOPE_REQUIRED_LINES})" if unscoped else "")
        + f" | DO {do_bullets} behaviour(s)"
    )


def prior_runs(log_path: Path, order_rel: str) -> int:
    """How many entries this order already has — a reissue is not a first pass."""
    if not log_path.exists():
        return 0
    text = log_path.read_text(encoding="utf-8")
    return len(re.findall(rf"^## .+ — {re.escape(order_rel)}\s*$", text, re.MULTILINE))


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


def analyse(transcript: Path, start_in: list[str], order_name: str) -> dict:
    usage_total = Counter()
    tool_counts: Counter = Counter()
    tool_by_id: dict[str, str] = {}
    results: list[tuple[int, str]] = []  # (approx tokens, label)
    read_paths: Counter = Counter()
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
                    tool_counts[name] += 1
                    tool_by_id[block.get("id", "")] = tool_label(
                        name, block.get("input") or {}
                    )
                    if name == "Read":
                        fp = (block.get("input") or {}).get("file_path", "")
                        if fp:
                            read_paths[rel_display(fp)] += 1
        elif rec.get("type") == "user":
            content = msg.get("content")
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "tool_result":
                        text = block_text(block.get("content"))
                        label = tool_by_id.get(block.get("tool_use_id", ""), "?")
                        results.append((len(text) // CHARS_PER_TOKEN, label))

    elapsed = ""
    if first_ts and last_ts:
        try:
            fmt = lambda s: datetime.fromisoformat(s.replace("Z", "+00:00"))
            secs = int((fmt(last_ts) - fmt(first_ts)).total_seconds())
            elapsed = f"{secs // 60}m{secs % 60:02d}s"
        except ValueError:
            pass

    norm_start = [p.lstrip("./") for p in start_in]
    skip_prefixes = (".agents/skills/", "docs/plans/active/orders/")

    def outside(path: str) -> bool:
        if path.startswith(skip_prefixes) or path.endswith(order_name):
            return False
        return not any(path.endswith(s) or s.endswith(path) for s in norm_start)

    return {
        "model": model,
        "turns": turns,
        "elapsed": elapsed,
        "usage": usage_total,
        "tool_counts": tool_counts,
        "largest_results": sorted(results, reverse=True)[:3],
        "duplicate_reads": {p: n for p, n in read_paths.items() if n > 1},
        "outside_reads": sorted(p for p in read_paths if outside(p)),
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


def analyse_opencode(db_path: Path, session_id: str, start_in: list[str], order_name: str) -> dict:
    usage_total = Counter()
    tool_counts: Counter = Counter()
    results: list[tuple[int, str]] = []
    read_paths: Counter = Counter()
    turns = 0
    model = "unknown"
    cost = 0.0
    first_ms = last_ms = None

    with opencode_connect(db_path) as con:
        for (data,) in con.execute(
            "select data from message where session_id = ? order by time_created", (session_id,)
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
            usage_total["output_tokens"] += (tok.get("output") or 0) + (tok.get("reasoning") or 0)
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
            if name.lower() == "read" and tool_input.get("file_path"):
                read_paths[rel_display(str(tool_input["file_path"]))] += 1

    elapsed = ""
    if first_ms and last_ms:
        secs = int((last_ms - first_ms) / 1000)
        elapsed = f"{secs // 60}m{secs % 60:02d}s"

    norm_start = [p.lstrip("./") for p in start_in]
    skip_prefixes = (".agents/skills/", "docs/plans/active/orders/")

    def outside(path: str) -> bool:
        if path.startswith(skip_prefixes) or path.endswith(order_name):
            return False
        return not any(path.endswith(s) or s.endswith(path) for s in norm_start)

    return {
        "model": model,
        "turns": turns,
        "elapsed": elapsed,
        "cost": cost,
        "usage": usage_total,
        "tool_counts": tool_counts,
        "largest_results": sorted(results, reverse=True)[:3],
        "duplicate_reads": {p: n for p, n in read_paths.items() if n > 1},
        "outside_reads": sorted(p for p in read_paths if outside(p)),
    }


def fmt_note(note: str | None) -> str:
    """The dispatcher's own read of the run — why the cost drivers above look the way they
    do, and which of them trace back to how the order was compiled rather than to the
    executor. Collapsed to one line so the entry stays greppable."""
    if not note:
        return "not recorded"
    return " ".join(note.split())


def fmt_entry(
    order_rel: str,
    status: str,
    deviations: str,
    m: dict,
    source: str,
    note: str | None,
    shape: str,
    first_pass: str,
) -> str:
    u = m["usage"]
    fresh_in = u["input_tokens"] + u["cache_creation_input_tokens"]
    tools = ", ".join(f"{n} x{c}" for n, c in m["tool_counts"].most_common()) or "none"
    largest = (
        "; ".join(f"{label} (~{tok:,} tok)" for tok, label in m["largest_results"])
        or "none"
    )
    dups = (
        ", ".join(f"{p} x{n}" for p, n in m["duplicate_reads"].items()) or "none"
    )
    outside = ", ".join(m["outside_reads"]) or "none"
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    cost = f" | cost ${m['cost']:.4f}" if m.get("cost") else ""
    return (
        f"## {stamp} — {order_rel}\n"
        f"- status: {status}\n"
        f"- first pass: {first_pass}\n"
        f"- order shape (compiled): {shape}\n"
        f"- model: {m['model']} | turns: {m['turns']}"
        + (f" | wall: {m['elapsed']}" if m["elapsed"] else "")
        + "\n"
        f"- tokens: output {u['output_tokens']:,} | fresh input {fresh_in:,} "
        f"| cache read {u['cache_read_input_tokens']:,}{cost}\n"
        f"- tool calls: {tools}\n"
        f"- largest tool results: {largest}\n"
        f"- duplicate reads: {dups}\n"
        f"- reads outside START IN: {outside}\n"
        f"- deviations (executor): {deviations}\n"
        f"- compiler note: {fmt_note(note)}\n"
        f"- source: {source}\n"
    )


LOG_HEADER = """# Work-order telemetry log

Auto-appended by `scripts/order_telemetry.py` after each dispatched work order reports
back. One entry per order run; order files are deleted at reconcile, so this log is the
durable record. Reviewed periodically (every ~10-15 dispatches) to tighten the
plan/to-orders/implement-order rules — look for repeated large reads, duplicate reads,
reads outside START IN, and executor deviations.

Token notes: "fresh input" = uncached input actually paid at full rate (includes cache
writes); "cache read" is cheap. "largest tool results" sizes are estimated at ~4
chars/token. Cost drivers to optimise: fresh input, output, and turn count.

The "compiler note" line is the dispatcher's own read of the run, written at dispatch
time via `--note`: why the numbers look as they do, and which cost drivers trace back to
how the order was compiled rather than to the executor. The measured lines say what
happened; the note says what to do differently when compiling the next stage, while the
order file still exists to check against. "not recorded" means that judgement was lost.

"first pass" is the number actually worth optimising. Executor runs cost cents; a
re-dispatch costs a cold start, the planner's attention, and often a stalled dependency
chain — far more than the token spread between a clean run and a verbose one. Read the
token lines as a diagnosis of *why* an order thrashed, not as the target.

"order shape (compiled)" measures the order rather than the executor: how many files
START IN named, how many lines they hold, how many were left unscoped, and how many
behaviours DO asked for. Nearly every compiler note below concludes the order was at
fault, so this is the column to correlate an expensive run against — and it is only
capturable now, since order files are deleted at reconcile.

Entries marked "(reconcile)" are stage-level, written once per stage by the `reconcile`
skill rather than per order. Their "escaped targeted checks" lines are the ones to read
first in a review pass: each is a defect that passed an order's own STOP WHEN and was
only caught by the full suites, the typecheck or the contract checks. A repeat across
stages means the fix belongs in the `to-orders` template, not in another one-off note.
"""


def fmt_reconcile_entry(
    label: str, checks: str | None, missed: list[str] | None, note: str | None
) -> str:
    """Stage-level entry written by `reconcile`, not tied to a single order run.

    Records what the full suites, the typecheck and the contract checks caught *after* every
    order had already reported DONE against its own targeted STOP WHEN. Those escapes are the
    highest-value signal in the log — a defect that passes an order's stop-check but fails at
    stage level means the stop-check was the wrong shape, which is a `to-orders` bug that will
    silently repeat until someone writes it down.
    """
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [f"## {stamp} — {label} (reconcile)\n"]
    lines.append(f"- stage checks: {' '.join((checks or 'not recorded').split())}\n")
    if missed:
        for item in missed:
            lines.append(f"- escaped targeted checks: {' '.join(item.split())}\n")
    else:
        lines.append(
            "- escaped targeted checks: none — every defect was caught by an order's own STOP WHEN\n"
        )
    lines.append(f"- reconcile note: {fmt_note(note)}\n")
    return "".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--order")
    ap.add_argument(
        "--reconcile",
        metavar="LABEL",
        help=(
            "Write a stage-level reconcile entry instead of an order entry, e.g. "
            "--reconcile 'maplab-ux-pass stage 7'. Use with --checks, --missed and --note. "
            "Required by the reconcile skill once per stage, whether or not anything escaped."
        ),
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
    ap.add_argument("--transcript")
    ap.add_argument("--opencode-session")
    ap.add_argument("--project-dir")
    ap.add_argument("--opencode-db")
    ap.add_argument("--log", default="docs/plans/telemetry-log.md")
    ap.add_argument("--no-log", action="store_true")
    ap.add_argument("--manual")
    ap.add_argument("--model")
    ap.add_argument("--turns", type=int)
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
        "--note",
        help=(
            "The dispatcher's read of this run: why the cost drivers look as they do, and "
            "which trace back to how the order was compiled rather than to the executor. "
            "Required by the dispatch-orders skill; logged as 'not recorded' when omitted."
        ),
    )
    args = ap.parse_args()

    root = repo_root()

    if args.reconcile:
        entry = fmt_reconcile_entry(args.reconcile, args.checks, args.missed, args.note)
        print(entry)
        if not args.no_log:
            append_log(root / args.log, entry, args.log)
        return 0

    if not args.order:
        print("ERROR: --order is required (or use --reconcile for a stage entry)", file=sys.stderr)
        return 1

    order_path = (root / args.order).resolve() if not Path(args.order).is_absolute() else Path(args.order)
    if not order_path.exists():
        print(f"ERROR: order file not found: {order_path}", file=sys.stderr)
        return 1
    order_text = order_path.read_text(encoding="utf-8")
    status, deviations = extract_order_sections(order_text)
    start_in = parse_start_in(order_text)

    try:
        order_rel = str(
            order_path.relative_to(root / "docs" / "plans" / "active" / "orders")
        ).replace("\\", "/")
    except ValueError:
        order_rel = order_path.name

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

    shape = order_shape(order_text)
    if args.first_pass:
        first_pass = args.first_pass
    else:
        earlier = prior_runs(root / args.log, order_rel)
        first_pass = "yes" if earlier == 0 else f"no - run {earlier + 1} of this order"

    if args.manual is not None:
        stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        run_summary = extract_run_summary(order_text)
        missing = ["tool calls", "largest tool results", "duplicate reads", "reads outside START IN"]
        if not args.model:
            missing.insert(0, "model")
        if args.turns is None:
            missing.insert(1 if args.model else 2, "turns")
        if not re.search(r"\d", args.manual or ""):
            missing.insert(0, "tokens")
        entry = (
            f"## {stamp} — {order_rel}\n"
            f"- status: {status}\n"
            f"- first pass: {first_pass}\n"
            f"- order shape (compiled): {shape}\n"
            f"- transport: manual (chat UI — no parseable local record)\n"
            + (f"- model: {args.model}" if args.model else "")
            + (f" | turns: {args.turns}" if args.turns is not None else "")
            + ("\n" if args.model or args.turns is not None else "")
            + f"- reported: {args.manual or 'no details given'}\n"
            + (f"- executor run summary: {run_summary}\n" if run_summary else "")
            + f"- deviations (executor): {deviations}\n"
            + f"- compiler note: {fmt_note(args.note)}\n"
            + f"- missing (not measurable in this transport): {', '.join(missing)}\n"
        )
        print(entry)
        if not args.no_log:
            append_log(root / args.log, entry, args.log)
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
        source = f"claude transcript {transcript.name}"
    else:
        metrics = analyse_opencode(db_path, oc_session, start_in, order_path.name)
        source = f"opencode session {oc_session}"
    entry = fmt_entry(
        order_rel, status, deviations, metrics, source, args.note, shape, first_pass
    )
    print(entry)

    if not args.no_log:
        append_log(root / args.log, entry, args.log)
    return 0


def append_log(log_path: Path, entry: str, display_name: str) -> None:
    if not log_path.exists():
        log_path.write_text(LOG_HEADER + "\n", encoding="utf-8")
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write("\n" + entry)
    print(f"Appended to {display_name}")


if __name__ == "__main__":
    sys.exit(main())
