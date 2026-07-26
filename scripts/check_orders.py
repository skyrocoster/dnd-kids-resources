#!/usr/bin/env python
"""Work-order linter — enforce the compiling rules the telemetry log paid to learn.

Every recurring fault in `docs/plans/telemetry-log.md` traces back to how an order was
compiled, not to the executor that ran it. Each one is cheap to detect before dispatch
and expensive to discover afterwards, so each is a rule here rather than a note a future
compiler may or may not read:

- a path that does not resolve (an order named `maplabModel.test.ts` with no directory,
  and the executor probed the wrong folder first);
- a file named in DO but missing from START IN (the executor edits files it was never
  told to open);
- a bare filename or symbol with no file (`UserIcon` cost a ~4.3k-token barrel read);
- a conditional instruction ("if order 03 left that inline, lift it into a shared
  function") — that hands a cheap model an architecture decision, and it made a plausible
  wrong one that breached the `src/model/` layering rule;
- an unscoped START IN entry pointing at a large file (a 1000-line file named without a
  line range gets read whole: ~9.7k tokens for a one-line prop pass);
- a fixture-writing order without the cast idiom and a typecheck in STOP WHEN (vitest
  strips types, so a wrong-shaped fixture is green in the executor and red at reconcile —
  this escaped twice);
- an order that spreads several behaviours across a large integrated test file (the one
  order in the log that had to be abandoned at both Light and Standard strength).
- a structural documentation order whose targeted test never ran the real documentation
  checker (missing artifacts and stale links escaped twice);
- a validator change that omitted the validator's own test module; and
- independently runnable orders where one edits a file another consumes.

Run standalone while compiling a stage, before dispatching anything:

    .venv\\Scripts\\python.exe scripts/check_orders.py

`scripts/check_docs.py` imports `lint_orders` so the same rules gate CI.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ORDERS_ROOT = REPO_ROOT / "docs" / "plans" / "active"

# A START IN entry pointing at a file longer than this must say which part of it the
# executor needs; without a scope the file is read whole and the order pays for all of it.
SCOPE_REQUIRED_LINES = 400
# Above this, a test file is an integrated suite: one order may add one behaviour to it.
BIG_TEST_FILE_LINES = 800
MAX_DO_BULLETS_BIG_TEST = 2
MAX_START_IN_ENTRIES = 6

REQUIRED_FIELDS = (
    "GOAL:",
    "DEPENDS ON:",
    "REQUIRED STRENGTH:",
    "CREATES:",
    "REMOVES:",
    "START IN:",
    "STOP WHEN:",
    "STATUS:",
)
VALID_STRENGTHS = {"Light", "Standard", "High"}
TOOL_TEST_PAIRS = {
    "scripts/check_docs.py": "backend/tests/test_docs_contract.py",
    "scripts/check_orders.py": "backend/tests/test_check_orders.py",
}

SECTION_RE = re.compile(
    r"^(WORK ORDER|GOAL:|DEPENDS ON:|REQUIRED STRENGTH:|CREATES:|REMOVES:|"
    r"KNOWN STATE|KNOWN TEST FAILURES|START IN:|DO:|"
    r"STOP WHEN:|STATUS:|DEVIATIONS:|FAILURE REPORT:|RUN SUMMARY:)",
)
FAILURE_STATUS_RE = re.compile(r"^STATUS:\s*(FAILED|BLOCKED)\b", re.MULTILINE)

SOURCE_EXTS = ("ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "css", "json", "md", "ps1", "sql")
PATHFUL_RE = re.compile(r"(?:[\w.\-]+[/\\])+[\w.\-]+\.(?:" + "|".join(SOURCE_EXTS) + r")\b")
BARE_FILE_RE = re.compile(r"(?<![\w./\\-])([\w\-]+\.(?:" + "|".join(SOURCE_EXTS) + r"))\b")
TEST_FILE_RE = re.compile(r"\.test\.tsx?$|(^|[/\\])test_[\w\-]+\.py$|_test\.py$")

# A line that is plainly a shell command may legitimately name a bare file (a vitest
# name filter, a script's own argv). Only prose is held to the full-path rule.
COMMAND_HINT_RE = re.compile(r"\b(npm|npx|pytest|python|node|\.venv|yarn|pnpm|git|uvicorn)\b")

# Conditional *instructions* are the fault, not any sentence containing "if". A factual
# "the button is disabled if the form is empty" is fine; "if X, create a helper" is not.
IMPERATIVE_RE = re.compile(
    r"\b(lift|create|add|use|put|move|extract|refactor|choose|decide|pick|make|write|"
    r"introduce|rename|wire|build|define)\b",
    re.IGNORECASE,
)
CONDITIONAL_RE = re.compile(r"^\s*[-*]?\s*if\b|\bif (the|order|it|that|there|you|a|an|no|not)\b|\bdepending on\b", re.IGNORECASE)

# No trailing boundary: "mocks", "mocking", "fixtures" and "stubbed" all count, and firing
# too readily here only costs the compiler a cast example it should have written anyway.
FIXTURE_HINT_RE = re.compile(r"\b(mock|fixture|stub)", re.IGNORECASE)
CAST_IDIOM_RE = re.compile(r"\bas [A-Z]\w*(\[\])?")
TYPECHECK_RE = re.compile(r"npm run (typecheck|build)")
BARE_FULL_SUITE_RE = re.compile(r"`?\s*(npm (run )?test|pytest|tsc -b)\s*`?\s*$", re.MULTILINE)


class OrderError:
    """One lint failure, in the shape check_docs.py's reporter expects."""

    def __init__(self, file: str, message: str, fix: str) -> None:
        self.file = file
        self.message = message
        self.fix = fix

    def __str__(self) -> str:  # pragma: no cover - display only
        return f"{self.file}: {self.message}\n    fix: {self.fix}"


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return path.name


def split_sections(text: str) -> dict[str, list[str]]:
    """Map each order field to the lines under it (the header line included)."""
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in text.splitlines():
        match = SECTION_RE.match(line)
        if match:
            current = match.group(1).rstrip(":")
            sections.setdefault(current, [])
            remainder = line[match.end():].lstrip(": ").strip()
            if remainder:
                sections[current].append(remainder)
            continue
        if current is not None and line.strip():
            sections[current].append(line)
    return sections


def bullets(lines: list[str]) -> list[str]:
    """Bullet bodies from a section, ignoring wrapped continuation lines."""
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(("-", "*")):
            out.append(stripped.lstrip("-* ").strip())
        elif out and line.startswith((" ", "\t")):
            out[-1] += " " + stripped
        elif stripped and not out:
            out.append(stripped)
    return out


def _strip_prefix(path_str: str) -> str:
    """Drop a leading `./` only.

    `lstrip("./")` strips a *character set*, so it ate the leading dot of every
    dot-directory: `.agents/skills/plan/SKILL.md` resolved as `agents/...` and was
    reported missing even though the order named it correctly.
    """
    cleaned = path_str.replace("\\", "/")
    while cleaned.startswith("./"):
        cleaned = cleaned[2:]
    return cleaned


def _normalise(path_str: str) -> str:
    return _strip_prefix(path_str).lower()


def start_in_entries(sections: dict[str, list[str]]) -> list[tuple[str, str, str]]:
    """(raw entry, path, scope text) for every START IN entry."""
    entries: list[tuple[str, str, str]] = []
    for entry in bullets(sections.get("START IN", [])):
        cleaned = entry.strip().strip("`")
        match = PATHFUL_RE.search(cleaned) or BARE_FILE_RE.search(cleaned)
        if match:
            path = match.group(0)
            scope = (cleaned[: match.start()] + cleaned[match.end():]).strip(" `—-–,:")
        else:
            # A folder, or something that isn't a file path at all.
            token = cleaned.split()[0].strip("`,") if cleaned.split() else ""
            path = token
            scope = cleaned[len(token):].strip(" `—-–,:")
        if path:
            entries.append((entry, path, scope))
    return entries


def declared_paths(sections: dict[str, list[str]], field: str) -> list[str]:
    """Repo-relative paths declared by CREATES or REMOVES."""
    paths: list[str] = []
    for entry in bullets(sections.get(field, [])):
        if entry.lower() == "none":
            continue
        match = PATHFUL_RE.search(entry)
        if match:
            paths.append(match.group(0))
    return paths


def paths_in_do(sections: dict[str, list[str]]) -> set[str]:
    return {m.group(0) for m in PATHFUL_RE.finditer("\n".join(sections.get("DO", [])))}


def _resolve(path_str: str) -> Path:
    return REPO_ROOT / _strip_prefix(path_str)


def _line_count(path: Path) -> int:
    try:
        return len(path.read_text(encoding="utf-8", errors="replace").splitlines())
    except OSError:
        return 0


def lint_order(order_path: Path) -> list[OrderError]:
    """Every compiling rule this repo has paid to learn, applied to one order file."""
    rel = _rel(order_path)
    errors: list[OrderError] = []

    def fail(message: str, fix: str) -> None:
        errors.append(OrderError(rel, message, fix))

    text = order_path.read_text(encoding="utf-8")
    sections = split_sections(text)

    missing = [field for field in REQUIRED_FIELDS if field not in text]
    if missing:
        fail(
            f"Work order is missing required fields: {', '.join(missing)}",
            "Add the missing work-order fields (see docs/PLAN_TEMPLATE.md)",
        )

    strength = " ".join(sections.get("REQUIRED STRENGTH", []))
    if "REQUIRED STRENGTH:" in text and strength not in VALID_STRENGTHS:
        fail(
            f"REQUIRED STRENGTH must be one of {', '.join(sorted(VALID_STRENGTHS))}: {strength or 'blank'}",
            "Choose the lowest capability that can execute the bounded order: Light, Standard, or High",
        )

    failure_status = FAILURE_STATUS_RE.search(text)
    if failure_status and "FAILURE REPORT:" not in text:
        fail(
            f"STATUS is {failure_status.group(1)} but there is no FAILURE REPORT block",
            "Append the FAILURE REPORT block below the STATUS line (see docs/PLAN_TEMPLATE.md)",
        )

    entries = start_in_entries(sections)
    creates = declared_paths(sections, "CREATES")
    removes = declared_paths(sections, "REMOVES")
    lifecycle_paths = {_normalise(path) for path in creates + removes}
    for field, paths in (("CREATES", creates), ("REMOVES", removes)):
        raw = " ".join(sections.get(field, []))
        if field + ":" in text and raw.lower() != "none" and not paths:
            fail(
                f"{field} must be `none` or list full repo-relative file paths",
                f"List each {field.lower()} path explicitly so the linter can verify the artifact lifecycle",
            )
    overlap = sorted(set(map(_normalise, creates)) & set(map(_normalise, removes)))
    if overlap:
        fail(
            f"The same path appears in CREATES and REMOVES: {', '.join(overlap)}",
            "Declare the final lifecycle once; use separate source and destination paths for a move",
        )
    if not entries and "START IN:" in text:
        fail(
            "START IN names no files",
            "List the 2-4 exact files the executor may open, each with the part it needs",
        )
    if len(entries) > MAX_START_IN_ENTRIES:
        fail(
            f"START IN names {len(entries)} entries (max {MAX_START_IN_ENTRIES})",
            "Split the order; an executor that must hold this many files will re-read them",
        )

    start_in_paths: list[str] = []
    for raw, path_str, scope in entries:
        resolved = _resolve(path_str)
        if not resolved.exists():
            if _normalise(path_str) not in {_normalise(path) for path in removes}:
                fail(
                    f"START IN path does not exist: {path_str}",
                    "Write the full repo-relative path, verified by opening it while compiling "
                    "— a bare filename is a search instruction, not a location",
                )
            continue
        start_in_paths.append(_normalise(path_str))
        if resolved.is_file():
            lines = _line_count(resolved)
            if lines > SCOPE_REQUIRED_LINES and len(scope) < 3:
                fail(
                    f"START IN entry for {path_str} ({lines} lines) has no scope",
                    "Name the symbol or line range the executor needs and nothing else "
                    f"(e.g. '- {path_str} — the <Foo> render at line 120, nothing else in "
                    "this file'); an unscoped large file is read whole",
                )

    do_lines = sections.get("DO", [])
    do_bullets = bullets(do_lines)
    do_text = "\n".join(do_lines)
    do_paths = paths_in_do(sections)
    for path_str in sorted(do_paths):
        normalised = _normalise(path_str)
        if not any(
            normalised.endswith(candidate) or candidate.endswith(normalised)
            for candidate in start_in_paths
        ) and normalised not in lifecycle_paths:
            fail(
                f"DO names a file that START IN, CREATES, and REMOVES do not list: {path_str}",
                "Every edit site must be an existing START IN file or an explicit lifecycle artifact",
            )

    for field, paths in (("CREATES", creates), ("REMOVES", removes)):
        for path_str in paths:
            if _normalise(path_str) not in {_normalise(path) for path in do_paths}:
                fail(
                    f"{field} declares a path that DO does not name: {path_str}",
                    "Name the lifecycle operation and full path in DO so the executor is explicitly authorized",
                )

    # Bare filenames and unlocated symbols, in the prose fields only. STOP WHEN is
    # excluded: a vitest name filter is legitimately not a path.
    for field in ("KNOWN STATE", "DO", "KNOWN TEST FAILURES"):
        for bullet in bullets(sections.get(field, [])):
            if COMMAND_HINT_RE.search(bullet):
                continue
            without_paths = PATHFUL_RE.sub(" ", bullet)
            for match in BARE_FILE_RE.finditer(without_paths):
                name = match.group(1)
                hits = [
                    _rel(p)
                    for p in REPO_ROOT.rglob(name)
                    if "node_modules" not in p.parts and ".venv" not in p.parts
                ]
                # A repo-root file's full path *is* its bare name, so there is nothing
                # to add and the executor has nowhere to search.
                if hits and not any(hit == name for hit in hits):
                    fail(
                        f"{field} names `{name}` without its path",
                        "Write the full repo-relative path so the executor does not search "
                        f"for it: {hits[0]}" + (f" (or one of {len(hits)} matches)" if len(hits) > 1 else ""),
                    )

    # Conditional instructions — the single most expensive fault in the telemetry log.
    for field in ("KNOWN STATE", "DO"):
        for bullet in bullets(sections.get(field, [])):
            if CONDITIONAL_RE.search(bullet) and IMPERATIVE_RE.search(bullet):
                fail(
                    f"{field} contains a conditional instruction: \"{bullet[:70]}...\"",
                    "Decide it while compiling and state it flatly, including which layers "
                    "any shared code may import from. A conditional hands the executor an "
                    "architecture decision, which is what it is worst at",
                )

    stop_when = " ".join(sections.get("STOP WHEN", []))
    if "pytest" in stop_when and "--no-cov" not in stop_when:
        fail(
            "STOP WHEN runs pytest without --no-cov",
            "Add --no-cov; without it the 97% coverage gate fails every subset run "
            "regardless of the tests",
        )

    for path_str in creates + removes:
        if _normalise(path_str) not in _normalise(stop_when):
            fail(
                f"STOP WHEN does not assert the lifecycle artifact: {path_str}",
                "Include the full path in an existence/non-existence assertion before the test command",
            )

    status_done = bool(re.search(r"^STATUS:\s*DONE\b", text, re.MULTILINE))
    if status_done:
        for path_str in creates:
            if not _resolve(path_str).exists():
                fail(
                    f"CREATES path is missing from a DONE order: {path_str}",
                    "Create the declared artifact or do not mark the order DONE",
                )
        for path_str in removes:
            if _resolve(path_str).exists():
                fail(
                    f"REMOVES path still exists in a DONE order: {path_str}",
                    "Remove the declared artifact or do not mark the order DONE",
                )

    changed_docs = {
        _normalise(path)
        for path in do_paths | set(creates) | set(removes)
        if _normalise(path).startswith("docs/")
        and not re.match(r"docs/plans/active/[^/]+/\d+-[^/]+\.md$", _normalise(path))
    }
    if changed_docs and "scripts/check_docs.py --check" not in stop_when.replace("\\", "/"):
        fail(
            "Structural documentation order does not run scripts/check_docs.py --check",
            "Append the repo-local documentation checker to STOP WHEN so missing artifacts and stale links cannot escape",
        )

    normalised_start = set(start_in_paths)
    normalised_stop = _normalise(stop_when)
    for tool, test_path in TOOL_TEST_PAIRS.items():
        if _normalise(tool) not in {_normalise(path) for path in do_paths}:
            continue
        if _normalise(test_path) not in normalised_start:
            fail(
                f"Validator change omits its direct test module from START IN: {test_path}",
                "A tool discovery or parsing contract must carry the tool's own tests, not only higher-level checks",
            )
        if _normalise(test_path) not in normalised_stop:
            fail(
                f"Validator change omits its direct test module from STOP WHEN: {test_path}",
                "Run the validator's exact test module in STOP WHEN",
            )
    for match in BARE_FULL_SUITE_RE.finditer(stop_when):
        if "typecheck" in match.group(0) or "build" in match.group(0):
            continue
        fail(
            f"STOP WHEN is a full-suite command: {match.group(0).strip()}",
            "Name the exact test files the order touches; full suites are reconcile's job",
        )

    # Fixture orders: vitest is a false green for types, twice over.
    named_test_files = [
        path_str
        for _, path_str, _ in entries
        if TEST_FILE_RE.search(path_str.replace("\\", "/"))
    ]
    named_test_files += [
        path_str
        for path_str in PATHFUL_RE.findall(do_text)
        if TEST_FILE_RE.search(path_str.replace("\\", "/"))
    ]
    frontend_tests = [p for p in named_test_files if p.endswith((".test.ts", ".test.tsx"))]
    known_state = "\n".join(sections.get("KNOWN STATE", []))
    if frontend_tests and FIXTURE_HINT_RE.search(text):
        if not CAST_IDIOM_RE.search(known_state):
            fail(
                "Order writes a test fixture but KNOWN STATE has no cast idiom example",
                "Put the repo's minimal-plus-cast idiom in KNOWN STATE with a real sibling "
                "example (`mockResolvedValue([{ id: 9, name: 'Mira' }] as NPC[])`); an "
                "executor told to 'mock the NPC list' invents fields that do not typecheck",
            )
        if not TYPECHECK_RE.search(stop_when):
            fail(
                "Order writes a test fixture but STOP WHEN has no typecheck",
                "Append `&& npm run typecheck` — vitest strips types, so a wrong-shaped "
                "fixture passes green and breaks the build at reconcile",
            )

    unique_frontend_tests = {_normalise(p) for p in frontend_tests}
    if len(unique_frontend_tests) > 1:
        fail(
            f"Order names {len(unique_frontend_tests)} frontend test files",
            "One order adds tests to at most one test file; split it",
        )
    for path_str in unique_frontend_tests:
        resolved = _resolve(path_str)
        if resolved.exists() and _line_count(resolved) > BIG_TEST_FILE_LINES:
            if len(do_bullets) > MAX_DO_BULLETS_BIG_TEST:
                fail(
                    f"{path_str} is a {_line_count(resolved)}-line integrated suite and DO "
                    f"asks for {len(do_bullets)} behaviours",
                    "One behaviour per order against a suite this size, and name the test "
                    "seam it turns on; several at once is the one order in the telemetry "
                    "log that had to be abandoned at both Light and Standard strength",
                )

    return errors


def lint_orders(orders_root: Path | None = None) -> list[OrderError]:
    """Lint every active work order."""
    root = orders_root if orders_root is not None else ORDERS_ROOT
    if not root.exists():
        return []
    errors: list[OrderError] = []
    orders = [order for order in sorted(root.rglob("*.md")) if re.match(r"\d+-", order.name)]
    for order in orders:
        # Only lint numbered work orders, not Plan files in feature directories.
        errors.extend(lint_order(order))
    errors.extend(_lint_order_dependencies(orders))
    return errors


def _lint_order_dependencies(orders: list[Path]) -> list[OrderError]:
    """Require ordering when one runnable order mutates a path another consumes."""
    errors: list[OrderError] = []
    parents = sorted({order.parent for order in orders})
    for parent in parents:
        errors.extend(_lint_feature_dependencies([order for order in orders if order.parent == parent]))
    return errors


def _lint_feature_dependencies(orders: list[Path]) -> list[OrderError]:
    """Check dependency conflicts within one feature's order batch."""
    records: dict[str, tuple[Path, set[str], set[str], set[str]]] = {}
    for order in orders:
        text = order.read_text(encoding="utf-8")
        sections = split_sections(text)
        number_match = re.match(r"(\d+)-", order.name)
        if not number_match:
            continue
        number = number_match.group(1)
        reads = {_normalise(path) for _, path, _ in start_in_entries(sections)}
        writes = {_normalise(path) for path in paths_in_do(sections)}
        writes.update(_normalise(path) for path in declared_paths(sections, "CREATES"))
        writes.update(_normalise(path) for path in declared_paths(sections, "REMOVES"))
        dep_text = " ".join(sections.get("DEPENDS ON", []))
        deps = set(re.findall(r"\b\d+\b", dep_text)) if dep_text.lower() != "none" else set()
        records[number] = (order, reads, writes, deps)

    def depends_on(start: str, target: str, seen: set[str] | None = None) -> bool:
        seen = seen or set()
        if start in seen or start not in records:
            return False
        seen.add(start)
        deps = records[start][3]
        return target in deps or any(depends_on(dep, target, seen) for dep in deps)

    errors: list[OrderError] = []
    numbers = sorted(records)
    for index, left in enumerate(numbers):
        left_path, left_reads, left_writes, _ = records[left]
        for right in numbers[index + 1 :]:
            right_path, right_reads, right_writes, _ = records[right]
            conflict = (left_writes & (right_reads | right_writes)) | (
                right_writes & (left_reads | left_writes)
            )
            if not conflict or depends_on(left, right) or depends_on(right, left):
                continue
            errors.append(
                OrderError(
                    _rel(right_path),
                    f"Orders {left} and {right} share mutable paths without a dependency: {', '.join(sorted(conflict))}",
                    f"Add DEPENDS ON: {left} to order {right}, or split the edit sites so the orders are genuinely independent",
                )
            )
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Lint work orders before dispatch.")
    parser.add_argument(
        "orders",
        nargs="*",
        help="Order files to lint (default: numbered orders in active feature folders)",
    )
    args = parser.parse_args()

    if args.orders:
        errors: list[OrderError] = []
        for name in args.orders:
            path = Path(name)
            if not path.is_absolute():
                path = REPO_ROOT / name
            if not path.exists():
                print(f"ERROR: no such order file: {name}", file=sys.stderr)
                return 1
            errors.extend(lint_order(path))
    else:
        errors = lint_orders()

    if not errors:
        print("Work orders OK.")
        return 0
    for error in errors:
        print(str(error), file=sys.stderr)
    print(f"\n{len(errors)} work-order problem(s).", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
