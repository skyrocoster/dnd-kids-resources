#!/usr/bin/env python
r"""Emit a work order in the maximum shape a work order is allowed to have.

`to-orders` kept costing a compiler several passes for the same three reasons: a path
written as a bare filename, a large file named with no bound, and an order carrying more
START IN files, DO bullets, or test files than one order may carry. Each of those is
cheap to detect *before* the order exists and expensive to discover after — the compiler
writes the whole file, runs `check_orders.py`, and rewrites it.

So this tool takes the facts as arguments and does the parts a compiler kept getting
wrong:

- resolves a bare filename to its one repo path, and refuses ambiguity rather than guessing;
- turns `path:Symbol` into a real line range plus anchor for any file over the scope
  threshold, and refuses to emit an unbounded large file;
- assembles the STOP WHEN command, adding the typecheck, lint, docs check, and co-located
  suites the linter would have demanded;
- enforces the shape caps at the argument boundary: in the default authoring mode an
  over-cap order is still written with the split-the-order guidance printed as warnings,
  and `--strict` escalates the same caps into refusals (the dispatch gate); and
- runs the real linter on the rendered text and writes nothing if it fails — prose
  heuristics and shape caps come back as non-fatal warnings, deterministic violations
  always refuse.

    python scripts/new_order.py --feature <feature> --number 11 \
        --title "Room label" \
        --goal "the party's room shows its name under the marker" \
        --known "<a fact you verified while compiling>" \
        --start-in "<Renderer>.tsx:<Symbol>" \
        --start-in "<Renderer>.test.tsx — the describe block the new test joins" \
        --do "Render the room name under the marker in <full path>" \
        --tests src/<area>/__tests__/<Renderer>.test.tsx

Real symbol names are kept out of this docstring on purpose: `scripts/` is one of the trees
the linter's call-site sweep reads, so an example naming a real export would make every
order that changes it look like it had an undeclared call site here.

Pass `--stdout` to print the order instead of writing it. The caps live in
`scripts/check_orders.py`, which is imported here so the two can never disagree.

For PowerShell, prefer structured JSON over quoting compound `--start-in` prose:

    @{ feature = "<feature>"; number = "11"; title = "Room label";
       goal = "the party's room shows its name"; known = @("<verified fact>");
       start_in = @("<Renderer>.tsx:<Symbol>", "<Renderer>.test.tsx");
       do = @("Render the room name in <full path>");
       tests = @("src/<area>/__tests__/<Renderer>.test.tsx"); stdout = $true }
    | ConvertTo-Json -Depth 3
    | .venv\\Scripts\\python.exe scripts/new_order.py --json -

`--json -` reads the structured argument object from stdin; `--json <path>` reads
the same object from a file. JSON keys use CLI names with underscores, such as
`start_in` and `depends_on`. CLI arguments after `--json` override scalar values.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ORDERS_ROOT = REPO_ROOT / "docs" / "plans" / "active"

# Orders are full of em dashes and a Windows console defaults to cp1252, which would
# mangle the very refusal message telling a compiler how to fix its arguments.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def _load_check_orders():
    """Import the linter as a module so caps and resolution have exactly one home."""
    spec = importlib.util.spec_from_file_location(
        "check_orders_for_new_order", Path(__file__).resolve().parent / "check_orders.py"
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


co = _load_check_orders()

# `path:Symbol — prose`, `path — prose`, or `path`. The em dash is what the order format
# already uses; a plain hyphen surrounded by spaces is accepted because it is what a
# keyboard produces.
SPEC_SPLIT_RE = re.compile(r"\s+(?:—|–|--|-)\s+")
SYMBOL_SUFFIX_RE = re.compile(r"^(?P<path>[^:\s]+):(?P<symbol>[A-Za-z_][\w.]*)$")

DEFAULT_STOP_TAIL = "Then stop — change nothing else."


class OrderRefused(Exception):
    """The order cannot be written in the allowed shape. The message says what to split."""


# --- resolution ------------------------------------------------------------------------


def resolve_path(raw: str, *, allow_missing: bool = False) -> str:
    """A verified repo-relative path, or a refusal naming the candidates.

    This is the fault that sent one executor probing the wrong folder first: an order that
    said `maplabModel.test.ts` with no directory. Resolving it here means the compiler
    never has to know the directory, and never gets to guess it either.
    """
    cleaned = raw.strip().replace("\\", "/").lstrip("./")
    if "/" in cleaned:
        if allow_missing or (REPO_ROOT / cleaned).exists():
            return cleaned
        raise OrderRefused(
            f"no such file: {cleaned}\n"
            "  START IN paths must exist. A path for a file this order creates belongs in "
            "--creates, not --start-in."
        )
    hits = [h for h in co._rglob_hits(cleaned) if not h.startswith("frontend/dist/")]
    if len(hits) == 1:
        return hits[0]
    if not hits:
        raise OrderRefused(
            f"no file named {cleaned} in the repo.\n"
            "  Check the spelling, or pass the full repo-relative path."
        )
    listed = "\n".join(f"    {h}" for h in sorted(hits))
    raise OrderRefused(
        f"{cleaned} is ambiguous — {len(hits)} files share that name:\n{listed}\n"
        "  Pass the full repo-relative path. Guessing here is exactly the fault this tool "
        "exists to remove."
    )


def build_start_in(spec: str) -> tuple[str, str]:
    """(repo-relative path, rendered START IN bullet) for one --start-in argument."""
    locator, _, prose = (part.strip() for part in _split_spec(spec))
    symbol = None
    match = SYMBOL_SUFFIX_RE.match(locator)
    if match:
        locator, symbol = match.group("path"), match.group("symbol")
    path = resolve_path(locator)
    resolved = REPO_ROOT / path
    lines = co._line_count(resolved)

    if lines <= co.SCOPE_REQUIRED_LINES:
        if symbol:
            # Small file: reading it whole *is* the scope, so a symbol adds nothing but a
            # line number that will rot on the next edit.
            prose = prose or f"the `{symbol}` block; the file is {lines} lines, read it whole"
        scope = prose or f"whole file ({lines} lines)"
        return path, f"- {path} — {scope}"

    if symbol:
        span = co.symbol_span(resolved, symbol)
        if span is None:
            raise OrderRefused(
                f"could not locate `{symbol}` in {path} ({lines} lines).\n"
                "  Give the bound yourself instead, preferably through --json - in PowerShell. "
                f'For a direct CLI call: --start-in \'{path} — lines 120-168 @"<first line verbatim>"\''
            )
        start, end, anchor = span
        tail = f" — {prose}" if prose else ""
        return path, f'- {path} — lines {start}-{end} @"{anchor}"{tail}'

    ranges, _ = co.scope_ranges(prose)
    if ranges and co.scope_anchor(prose):
        return path, f"- {path} — {prose}"

    raise OrderRefused(
        f"{path} is {lines} lines and needs a bound (anything over "
        f"{co.SCOPE_REQUIRED_LINES} does).\n"
        f'  Name the symbol and this tool derives the range: --start-in "{path}:MySymbol"\n'
        "  An unbounded file this size is read whole — that is ~9.7k tokens for a one-line "
        "change, and it is the single most repeated waste."
    )


def _split_spec(spec: str) -> tuple[str, str, str]:
    parts = SPEC_SPLIT_RE.split(spec.strip(), maxsplit=1)
    return (parts[0], "", parts[1] if len(parts) > 1 else "")


def json_argv(raw_argv: list[str]) -> list[str]:
    """Expand one JSON argument object into argv without shell-quoting compound values."""
    if "--json" not in raw_argv:
        return raw_argv
    index = raw_argv.index("--json")
    if index + 1 >= len(raw_argv):
        raise OrderRefused("--json needs a file path or - for stdin")
    source = raw_argv[index + 1]
    try:
        if source == "-":
            payload = json.load(sys.stdin)
        else:
            with Path(source).open(encoding="utf-8") as handle:
                payload = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        raise OrderRefused(f"could not read JSON arguments: {error}") from error
    if not isinstance(payload, dict):
        raise OrderRefused("JSON arguments must be an object of CLI field names")

    expanded: list[str] = []
    for key, value in payload.items():
        if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", key):
            raise OrderRefused(f"invalid JSON argument name: {key!r}")
        if value is None:
            continue
        option = "--" + key.replace("_", "-")
        values = value if isinstance(value, list) else [value]
        for item in values:
            if isinstance(item, bool):
                if item:
                    expanded.append(option)
            elif isinstance(item, (str, int, float)):
                expanded.extend((option, str(item)))
            else:
                raise OrderRefused(f"JSON argument {key!r} values must be scalar or arrays")

    # Keep ordinary CLI overrides usable while removing the transport-only --json pair.
    return expanded + raw_argv[index + 2 :]


# --- stop-check assembly -----------------------------------------------------------------


def frontend_filter(raw: str) -> str:
    """A vitest filter as order_check.py wants it: relative to `frontend/`.

    The `frontend/` prefix is not a harmless variant. One order shipped it, the filter
    matched no test file, the check reported on an empty run, and the executor spent its
    context arguing with a result that was never going to go green.
    """
    cleaned = raw.strip().replace("\\", "/").lstrip("./")
    if cleaned.startswith("frontend/"):
        cleaned = cleaned[len("frontend/") :]
    if not (REPO_ROOT / "frontend" / cleaned).exists():
        resolved = resolve_path(Path(cleaned).name)
        if not resolved.startswith("frontend/"):
            raise OrderRefused(f"{raw} is not a frontend test file")
        cleaned = resolved[len("frontend/") :]
    return cleaned


def lifecycle_assertions(creates: list[str], removes: list[str]) -> list[str]:
    """Existence assertions the linter requires for every declared artifact."""
    checks = []
    for path in creates:
        checks.append(
            f"pwsh -NoProfile -Command \"if (-not (Test-Path '{path}')) {{ exit 1 }}\""
        )
    for path in removes:
        checks.append(f"pwsh -NoProfile -Command \"if (Test-Path '{path}') {{ exit 1 }}\"")
    return checks


# --- rendering ---------------------------------------------------------------------------


def render(args, start_in: list[str], stop_when: str) -> str:
    def block(field: str, values: list[str]) -> str:
        if not values:
            return f"{field}: none"
        if len(values) == 1:
            return f"{field}: {values[0]}"
        return f"{field}:\n" + "\n".join(f"- {value}" for value in values)

    parts = [
        f"WORK ORDER {args.number} — {args.title}",
        f"GOAL: {args.goal}",
        f"DEPENDS ON: {args.depends_on}",
        f"REQUIRED STRENGTH: {args.strength}",
        block("CREATES", args.creates),
        block("REMOVES", args.removes),
        block("CHANGES SIGNATURE", args.signature),
        "",
        "KNOWN STATE (already true — do NOT redo or re-derive):",
        *(f"- {fact}" for fact in args.known),
    ]
    if args.known_test_failure:
        parts += [
            "",
            "KNOWN TEST FAILURES (pre-existing — NOT yours to fix, NOT caused by you):",
            *(f"- {node}" for node in args.known_test_failure),
        ]
    parts += [
        "",
        "START IN:",
        *start_in,
        "",
        "DO:",
        *(f"- {line}" for line in args.do),
        "",
        f"STOP WHEN: `{stop_when}` passes. {DEFAULT_STOP_TAIL}",
        "",
        "STATUS: <-- executor writes DONE, FAILED - <reason>, or BLOCKED - <reason>",
        "",
        "DEVIATIONS: <-- executor appends, always (even on DONE) — one line",
        '- KNOWN STATE re-verified or wrong: <one line, or "none">',
        "",
        "EVIDENCE ENVELOPE: <-- executor appends, always (even on DONE) — directly below DEVIATIONS",
        "- COMMAND: <the exact STOP WHEN command the executor ran>",
        "- RESULT: pass | fail",
        "- CHECKS: <what passed and what failed — one line per check>",
        '- DIRTY PATHS: <every file the edits left changed in the worktree, or "none">',
        "- AUTHORIZATION: <edited files matched to the START IN / DO / CREATES / REMOVES entries that authorize each>",
        '- GUARD: <read-guard denials or `--unlock` overrides, or "none">',
        "- ATTEMPTS: <0 if STOP WHEN passed first try, else the number of fix attempts>",
    ]
    return "\n".join(parts) + "\n"


# --- caps ---------------------------------------------------------------------------------


def _cap_refusal(message: str, strict: bool, warnings: list[str]) -> None:
    """A shape-cap finding: refused under `--strict`, otherwise warned but not blocked."""
    if strict:
        raise OrderRefused(message)
    warnings.append(message)


def check_caps(args, start_in_paths: list[str], test_files: list[str], strict: bool = False) -> list[str]:
    """The shape ceiling, applied twice: warned at authoring time, refused under --strict.

    Every message here says *split the order*, because that is always the answer. The
    default authoring mode writes an over-cap order and prints this guidance as warnings
    so the compiler sees it without losing the order; `--strict` (the dispatch gate)
    escalates the same findings into refusals. The structural checks below are not caps
    and are always refused.
    """
    if len(args.do) == 0:
        raise OrderRefused("DO is empty: pass at least one --do line saying what changes.")
    if not args.known:
        raise OrderRefused(
            "KNOWN STATE is empty. Pass --known facts you verified while compiling — the "
            "values, the file locations, the counts. An executor sent to 'go find out' "
            "pays the exploration cost this workflow exists to avoid."
        )

    warnings: list[str] = []

    distinct = list(dict.fromkeys(start_in_paths))
    if len(distinct) > co.MAX_START_IN_FILES:
        _cap_refusal(
            f"START IN names {len(distinct)} distinct files "
            f"(max {co.MAX_START_IN_FILES}):\n"
            + "\n".join(f"    {path}" for path in distinct)
            + "\n  This is two orders. Split it and set --depends-on on the second."
            "\n  (Several ranges of the same file count once — those are cheap.)",
            strict,
            warnings,
        )
    if len(args.start_in) > co.MAX_START_IN_ENTRIES:
        _cap_refusal(
            f"START IN has {len(args.start_in)} entries (max {co.MAX_START_IN_ENTRIES}). "
            "Merge adjacent ranges or split the order.",
            strict,
            warnings,
        )
    if len(args.do) > co.MAX_DO_BULLETS:
        _cap_refusal(
            f"DO asks for {len(args.do)} things (max {co.MAX_DO_BULLETS}):\n"
            + "\n".join(f"    {line}" for line in args.do)
            + "\n  One work order is one logical change. Split it.",
            strict,
            warnings,
        )
    unique_tests = {Path(path).name for path in test_files}
    if len(unique_tests) > co.MAX_STOP_WHEN_TESTS:
        _cap_refusal(
            f"STOP WHEN would run {len(unique_tests)} test files "
            f"(max {co.MAX_STOP_WHEN_TESTS}): {', '.join(sorted(unique_tests))}\n"
            "  Some of these came from the co-located-suite rule, which means this order "
            "edits source files belonging to different suites. That is the definition of "
            "two orders.",
            strict,
            warnings,
        )
    return warnings


# --- main ----------------------------------------------------------------------------------


def build(args) -> tuple[Path, str, list[str], list[str]]:
    """(target path, rendered order, derived notes, cap warnings)."""
    notes: list[str] = []

    args.creates = [resolve_path(p, allow_missing=True) for p in args.creates]
    args.removes = [resolve_path(p) for p in args.removes]

    start_in_paths: list[str] = []
    start_in_bullets: list[str] = []
    for spec in args.start_in:
        path, bullet = build_start_in(spec)
        start_in_paths.append(path)
        start_in_bullets.append(bullet)
        if "@\"" in bullet and ":" in spec:
            notes.append(f"derived range for {path} from its symbol")

    do_text = "\n".join(args.do)
    do_paths = sorted(co.paths_in_do({"DO": args.do}))

    tests = [frontend_filter(path) for path in args.tests]
    pytests = [resolve_path(path) for path in args.pytest]

    # The co-located-suite rule: a source file this order edits must have its own suite in
    # STOP WHEN. Adding it here is the difference between the tool knowing the rule and the
    # compiler rediscovering it from a lint failure.
    for path in do_paths:
        for suite in co.colocated_tests(path):
            if suite.endswith((".test.ts", ".test.tsx")):
                candidate = suite[len("frontend/") :] if suite.startswith("frontend/") else suite
                if candidate not in tests:
                    tests.append(candidate)
                    notes.append(f"added co-located suite {suite} to STOP WHEN")
            elif suite not in pytests:
                pytests.append(suite)
                notes.append(f"added co-located suite {suite} to STOP WHEN")

    typecheck = args.typecheck
    lint = args.lint
    docs = args.docs
    known_text = "\n".join(args.known)

    if tests and co.FIXTURE_HINT_RE.search(known_text + do_text) and not typecheck:
        typecheck = True
        notes.append("added --typecheck: this order writes a fixture and vitest strips types")
    hook_touch = any(co.HOOK_FILE_RE.search(p) for p in start_in_paths + do_paths)
    if (hook_touch or co.HOOK_DEP_RE.search(do_text)) and not lint:
        lint = True
        notes.append("added --lint: only eslint sees a missing hook dependency")
    doc_touch = [
        p
        for p in set(do_paths) | set(args.creates) | set(args.removes)
        if p.startswith("docs/") and not re.match(r"docs/plans/active/[^/]+/\d+-[^/]+\.md$", p)
    ]
    if doc_touch and not docs:
        docs = True
        notes.append("added --docs: this order changes contract-managed documentation")

    cap_warnings = check_caps(args, start_in_paths, tests + pytests, strict=args.strict)

    command_parts = ["python scripts/order_check.py"]
    if tests:
        command_parts.append("--tests " + " ".join(tests))
    if pytests:
        command_parts.append("--pytest " + " ".join(pytests))
    if typecheck:
        command_parts.append("--typecheck")
    if lint:
        command_parts.append("--lint")
    if docs:
        command_parts.append("--docs")
    if len(command_parts) == 1:
        raise OrderRefused(
            "no stop-check: pass --tests or --pytest. An order with no runnable STOP WHEN "
            "has no leash, and gold-plating is what fills the gap."
        )

    stop_when = " && ".join(
        lifecycle_assertions(args.creates, args.removes) + [" ".join(command_parts)]
    )

    target = ORDERS_ROOT / args.feature / f"{args.number}-{args.slug}.md"
    return target, render(args, start_in_bullets, stop_when), notes, cap_warnings


def lint_rendered(target: Path, text: str, strict: bool = False) -> tuple[list[str], list[str]]:
    """(errors, warnings) from running the real linter over the rendered order.

    Deterministic violations are errors and always refuse. Prose heuristics and shape caps
    are warnings by default; `--strict` escalates them into errors via the linter itself.
    """
    host = target.parent if target.parent.is_dir() else ORDERS_ROOT
    host.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=str(host)) as tmp:
        probe = Path(tmp) / target.name
        probe.write_text(text, encoding="utf-8")
        errors, warnings = [], []
        for finding in co.lint_order(probe, strict=strict):
            entry = f"{finding.message}\n    fix: {finding.fix}"
            if finding.severity == "error":
                errors.append(entry)
            else:
                warnings.append(entry)
        return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Emit one work order in the maximum allowed shape, already linted.",
    )
    parser.add_argument("--feature", required=True, help="directory under docs/plans/active/")
    parser.add_argument("--number", required=True, help="two-digit order number, e.g. 03")
    parser.add_argument("--title", required=True)
    parser.add_argument("--slug", help="filename slug; defaults to the title, kebab-cased")
    parser.add_argument("--goal", required=True, help="one sentence: what done looks like")
    parser.add_argument("--depends-on", default="none")
    parser.add_argument(
        "--strength",
        default=co.DEFAULT_STRENGTH,
        help='Light (default). Above it, give the reason on the same line: "Standard — <why>"',
    )
    parser.add_argument("--creates", action="append", default=[], metavar="PATH")
    parser.add_argument("--removes", action="append", default=[], metavar="PATH")
    parser.add_argument(
        "--signature",
        action="append",
        default=[],
        metavar="ENTRY",
        help='exported signature this order changes: "`useMapState` in frontend/src/...ts"',
    )
    parser.add_argument(
        "--known",
        action="append",
        default=[],
        metavar="FACT",
        help="a verified fact, stated as an answer (repeatable)",
    )
    parser.add_argument(
        "--known-test-failure", action="append", default=[], metavar="NODE_ID"
    )
    parser.add_argument(
        "--start-in",
        action="append",
        default=[],
        metavar="SPEC",
        help='"path[:Symbol][ — what is needed]"; bare filenames are resolved, large files '
        "get a derived range and anchor",
    )
    parser.add_argument("--do", action="append", default=[], metavar="LINE")
    parser.add_argument(
        "--tests", action="append", default=[], metavar="PATH", help="frontend test file"
    )
    parser.add_argument(
        "--pytest", action="append", default=[], metavar="PATH", help="backend test module"
    )
    parser.add_argument("--typecheck", action="store_true")
    parser.add_argument("--lint", action="store_true")
    parser.add_argument("--docs", action="store_true")
    parser.add_argument("--stdout", action="store_true", help="print instead of writing")
    parser.add_argument(
        "--json",
        metavar="PATH",
        help="read CLI arguments from a JSON object; use - for stdin (PowerShell-safe)",
    )
    parser.add_argument("--force", action="store_true", help="overwrite an existing order")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="refuse orders that exceed the shape caps instead of writing them with "
        "warnings (the dispatch gate; the default authoring mode is permissive)",
    )
    try:
        args = parser.parse_args(json_argv(sys.argv[1:]))
    except OrderRefused as refusal:
        print(f"REFUSED: {refusal}")
        return 1

    if not args.slug:
        args.slug = re.sub(r"[^a-z0-9]+", "-", args.title.lower()).strip("-")

    try:
        target, text, notes, cap_warnings = build(args)
    except OrderRefused as refusal:
        print(f"REFUSED: {refusal}")
        return 1

    errors, lint_warnings = lint_rendered(target, text, strict=args.strict)
    if errors:
        print("REFUSED: the rendered order does not pass scripts/check_orders.py:")
        for error in errors:
            print(f"  - {error}")
        print("\nNothing was written. Fix the arguments above and re-run.")
        return 1

    for warning in cap_warnings + lint_warnings:
        print(f"warning: {warning}")
    for note in notes:
        print(f"note: {note}")

    if args.stdout:
        print()
        print(text, end="")
        return 0

    if target.exists() and not args.force:
        print(f"REFUSED: {co._rel(target)} already exists (pass --force to overwrite)")
        return 1
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")
    count = len(cap_warnings) + len(lint_warnings)
    suffix = f" ({count} warning{'s' if count != 1 else ''})" if count else ""
    print(f"wrote {co._rel(target)} — passes check_orders.py{suffix}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
