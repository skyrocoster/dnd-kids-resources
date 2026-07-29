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
- a REQUIRED STRENGTH above Light with no stated reason (Light is the default for every
  order; the one order that was escalated after a block stalled again at the higher
  strength, because the fault was in the order rather than in the executor);
- a fixture-writing order without the cast idiom and a typecheck in STOP WHEN (vitest
  strips types, so a wrong-shaped fixture is green in the executor and red at reconcile —
  this escaped twice);
- an order that spreads several behaviours across a large integrated test file (the one
  order in the log that had to be abandoned at both Light and Standard strength).
- a structural documentation order whose targeted test never ran the real documentation
  checker (missing artifacts and stale links escaped twice);
- a validator change that omitted the validator's own test module;
- independently runnable orders where one edits a file another consumes;
- a large START IN file bounded by a symbol name or a bare line number instead of a line
  range (four consecutive orders in one stage spent their only measurable waste on
  re-locating such a target, and the fix cut locating re-reads from 6 to 1);
- a line range with no anchor text, or an anchor that has drifted out of its range (an
  upstream order editing a shared file silently invalidates every downstream order's line
  numbers — `--fix` re-heals these rather than reporting them);
- an exported signature change that does not enumerate its call sites, which forced an
  executor out of bounds to satisfy its own stop-check and let a stale assertion escape;
- a source file whose own co-located test suite is missing from STOP WHEN; and
- a React hook change with no `npm run lint` in STOP WHEN, the only check that catches a
  missing dependency; and
- an order that is simply too big to be one order — more than four distinct START IN
  files, more than three DO bullets, or more than two test files in STOP WHEN. These are
  the caps `scripts/new_order.py` refuses to exceed, so the split happens while the order
  is being written rather than after a compiler has spent a pass on a shape that cannot
  pass lint.

Run standalone while compiling a stage, before dispatching anything:

    .venv\\Scripts\\python.exe scripts/check_orders.py

Pass `--fix` first to rewrite unambiguous bare-filename faults (exactly one repo match) to
their full path before linting, so the compiler edits fewer of them by hand:

    .venv\\Scripts\\python.exe scripts/check_orders.py --fix

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
MAX_DO_BULLETS = 3
MAX_START_IN_ENTRIES = 6
# Entries and files are capped apart because they cost apart. A second range in a file the
# executor has already opened is nearly free; a fourth *file* is a fourth thing to hold in
# one context window, and orders that named more are the ones that came back re-read-heavy.
MAX_START_IN_FILES = 4
# One frontend suite is already the rule below; two test files total is what lets an order
# pair that with a backend module, and no more. Beyond this the order is two orders.
MAX_STOP_WHEN_TESTS = 2

REQUIRED_FIELDS = (
    "GOAL:",
    "DEPENDS ON:",
    "REQUIRED STRENGTH:",
    "CREATES:",
    "REMOVES:",
    "CHANGES SIGNATURE:",
    "START IN:",
    "STOP WHEN:",
    "STATUS:",
)
VALID_STRENGTHS = {"Light", "Standard", "High"}
DEFAULT_STRENGTH = "Light"
# Escalating above the default costs real money and, on the evidence so far, buys nothing:
# every Light order in the log finished on its first pass, while the only order ever to need
# a re-dispatch was Standard — and its own compiler note put the block on a compile defect,
# not on the model. So a higher strength has to say what a Light executor cannot do here.
STRENGTH_REASON_MIN = 12
TOOL_TEST_PAIRS = {
    "scripts/check_docs.py": "backend/tests/test_docs_contract.py",
    "scripts/check_orders.py": "backend/tests/test_check_orders.py",
    "scripts/order_telemetry.py": "backend/tests/test_order_telemetry.py",
}

SECTION_RE = re.compile(
    r"^(WORK ORDER|GOAL:|DEPENDS ON:|REQUIRED STRENGTH:|CREATES:|REMOVES:|"
    r"CHANGES SIGNATURE:|KNOWN STATE|KNOWN TEST FAILURES|START IN:|DO:|"
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
# Both spellings count: the raw npm script, and the `order_check.py` flag that runs it.
# The wrapper is the form this workflow prefers — it prints pass/fail instead of the whole
# runner output — so a rule that only recognised the raw script was pushing compilers to
# paste a redundant `&& npm run typecheck` beside a check that already ran.
TYPECHECK_RE = re.compile(r"npm run (typecheck|build)|order_check\.py[^&|]*--typecheck")
BARE_FULL_SUITE_RE = re.compile(r"`?\s*(npm (run )?test|pytest|tsc -b)\s*`?\s*$", re.MULTILINE)

# --- START IN scope grammar -----------------------------------------------------------
# Canonical here because both this linter and `order_telemetry.py` classify entries by it;
# two copies of the parser would drift, and the shape numbers in the log would stop
# matching the rules that produced them.
RANGE_RE = re.compile(
    r"\blines?\s*(\d{1,6})\s*(?:-|–|—|to|through|\.\.+)\s*(\d{1,6})", re.IGNORECASE
)
BARE_RANGE_RE = re.compile(r"(?<![\w.])(\d{1,6})\s*(?:-|–|—)\s*(\d{1,6})(?![\w.])")
POINT_RE = re.compile(r"\blines?\s*(\d{1,6})\b", re.IGNORECASE)
MAX_PLAUSIBLE_SPAN = 5000

# The anchor is what makes a line range survive an upstream edit: `@"<verbatim text>"`.
# Ranges rot silently, anchors do not — an anchor that has moved is repairable, and a
# range with no anchor is only checkable by a human reopening the file.
ANCHOR_RE = re.compile(r'@\s*"([^"\n]{3,160})"')
MIN_ANCHOR_LEN = 3
# How far either side of a cited range an anchor may sit and still count as "in place".
# Non-zero because a one-line insertion above the range is not worth failing an order for.
ANCHOR_SLACK_LINES = 3

# A symbol worth resolving to a range: backticked in the scope text.
SCOPE_SYMBOL_RE = re.compile(r"`([A-Za-z_][\w.]{2,60})`")
DEFINITION_TEMPLATES = (
    r"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?"
    r"(?:function|const|let|var|class|interface|type|enum)\s+{name}\b",
    r"^\s*(?:export\s+)?(?:async\s+)?def\s+{name}\b",
    r"^\s*class\s+{name}\b",
    r"^\s*case\s+['\"]{name}['\"]",
    r"^\s*{name}\s*[:(]",
    r"^\s*\.{name}\b",
)
MAX_SYMBOL_SPAN = 400

# Trees a call-site sweep should look at; everything else is generated or vendored.
SOURCE_ROOTS = ("frontend/src", "backend", "scripts")
CALL_SITE_EXTS = {".ts", ".tsx", ".js", ".jsx", ".py"}

# A React hook: neither vitest nor tsc detects a missing dependency, only eslint does.
HOOK_FILE_RE = re.compile(r"(^|/)use[A-Z]\w*\.tsx?$")
HOOK_DEP_RE = re.compile(r"\b(useCallback|useMemo|useEffect|useLayoutEffect|dependency array|deps array)\b")
LINT_RE = re.compile(r"npm run lint\b|order_check\.py[^&|]*--lint\b")

# DO asking for a NEW test, as opposed to editing an existing one. Naming the fixture an
# order reuses is not the same as naming where the new test goes: leaving that out cost
# one order 6 locating re-reads of a 2,000-line suite.
NEW_TEST_RE = re.compile(r"\b(add|append|write|introduce)\b[^.]{0,60}\b(test|case|spec|it\()", re.IGNORECASE)
TEST_BLOCK_RE = re.compile(r"^\s*(describe|it|test)\s*[.(]")


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
    dot-directory: `.claude/skills/plan/SKILL.md` resolved as `claude/...` and was
    reported missing even though the order named it correctly.
    """
    cleaned = path_str.replace("\\", "/")
    while cleaned.startswith("./"):
        cleaned = cleaned[2:]
    return cleaned


def _normalise(path_str: str) -> str:
    return _strip_prefix(path_str).lower()


def split_entry(entry: str) -> tuple[str, str]:
    """(path, scope text) for one START IN bullet body."""
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
    return path, scope


def start_in_entries(sections: dict[str, list[str]]) -> list[tuple[str, str, str]]:
    """(raw entry, path, scope text) for every START IN entry."""
    entries: list[tuple[str, str, str]] = []
    for entry in bullets(sections.get("START IN", [])):
        path, scope = split_entry(entry)
        if path:
            entries.append((entry, path, scope))
    return entries


def split_strength(text: str) -> tuple[str, str]:
    """(level, reason) from a REQUIRED STRENGTH field.

    `Light` needs no reason; `Standard — the fixture shape has to be derived from three
    call sites` does. Splitting them keeps the level machine-readable for the dispatcher
    and the telemetry shape line while leaving room for the justification the escalation
    now has to carry.
    """
    parts = re.split(r"\s*(?:[—–-]|\()\s*", text.strip(), maxsplit=1)
    level = parts[0].strip()
    reason = parts[1].strip(" )").strip() if len(parts) > 1 else ""
    return level, reason


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


def _rglob_hits(name: str) -> list[str]:
    """Repo-relative paths whose basename is `name`, ignoring vendored trees."""
    return [
        _rel(p)
        for p in REPO_ROOT.rglob(name)
        if "node_modules" not in p.parts and ".venv" not in p.parts
    ]


def _line_count(path: Path) -> int:
    try:
        return len(path.read_text(encoding="utf-8", errors="replace").splitlines())
    except OSError:
        return 0


def _file_lines(path: Path) -> list[str]:
    try:
        return path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return []


def _merge_ranges(ranges: list[tuple[int, int]]) -> list[tuple[int, int]]:
    merged: list[list[int]] = []
    for start, end in sorted(ranges):
        if merged and start <= merged[-1][1] + 1:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [(a, b) for a, b in merged]


def scope_ranges(scope: str) -> tuple[list[tuple[int, int]], bool]:
    """Line ranges named by a START IN scope, and whether a bare anchor is left over.

    A range ("lines 1111-1290") tells the executor where to stop reading. A bare anchor
    ("the toggle at line 1469") does not, and the difference is not cosmetic: three
    separate compiler notes in the log traced a re-read loop to exactly that shape — an
    exact line number pointing into a file thousands of lines long, which the executor
    then paid to re-locate on every return trip. They are counted apart because they fail
    apart.
    """
    ranges: list[tuple[int, int]] = []
    rest = scope
    for pattern in (RANGE_RE, BARE_RANGE_RE):
        for match in pattern.finditer(rest):
            start, end = int(match.group(1)), int(match.group(2))
            if start <= end and end - start <= MAX_PLAUSIBLE_SPAN:
                ranges.append((start, end))
        rest = pattern.sub(" ", rest)
    return _merge_ranges(ranges), bool(POINT_RE.search(rest))


def scope_anchor(scope: str) -> str | None:
    """The verbatim `@"..."` anchor text on a START IN entry, if it has one."""
    match = ANCHOR_RE.search(scope)
    return match.group(1).strip() if match else None


def anchor_lines(path: Path, anchor: str) -> list[int]:
    """1-indexed lines whose text contains the anchor.

    Whitespace-insensitive: an anchor copied out of an order should still match after a
    reformat that only moved indentation.
    """
    needle = " ".join(anchor.split())
    if len(needle) < MIN_ANCHOR_LEN:
        return []
    return [
        number
        for number, line in enumerate(_file_lines(path), start=1)
        if needle in " ".join(line.split())
    ]


def anchor_state(path: Path, ranges: list[tuple[int, int]], anchor: str) -> tuple[str, int | None]:
    """Where an anchor actually sits relative to the range the order cites.

    Returns ("in-range", None), ("moved", line) or ("absent", None). "moved" is the
    interesting one: it is precisely the stale-line-number fault, it is repairable without
    a human reopening the file, and `--fix` repairs it.
    """
    hits = anchor_lines(path, anchor)
    if not hits:
        return "absent", None
    for start, end in ranges:
        for hit in hits:
            if start - ANCHOR_SLACK_LINES <= hit <= end + ANCHOR_SLACK_LINES:
                return "in-range", hit
    return "moved", hits[0]


def symbol_span(path: Path, symbol: str) -> tuple[int, int, str] | None:
    """(start, end, anchor text) for a symbol's definition block, or None if unclear.

    Deliberately conservative. This exists so `--fix` can turn a symbol-scoped entry into
    a ranged one without the compiler reopening the file; guessing a wrong range would be
    worse than leaving the lint error standing, so anything ambiguous returns None.
    """
    lines = _file_lines(path)
    if not lines:
        return None
    patterns = [
        re.compile(template.format(name=re.escape(symbol)))
        for template in DEFINITION_TEMPLATES
    ]
    start = None
    for number, line in enumerate(lines, start=1):
        if any(pattern.search(line) for pattern in patterns):
            start = number
            break
    if start is None:
        return None

    opened = closed = 0
    end = start
    for number in range(start, min(len(lines), start + MAX_SYMBOL_SPAN) + 1):
        line = lines[number - 1]
        opened += line.count("{") + line.count("(") + line.count("[")
        closed += line.count("}") + line.count(")") + line.count("]")
        end = number
        if opened and opened <= closed:
            break
        if not opened and line.rstrip().endswith(";"):
            break
    else:
        return None  # Ran past the cap without closing: not a block we understand.

    anchor = " ".join(lines[start - 1].split())[:80]
    if len(anchor) < MIN_ANCHOR_LEN:
        return None
    return start, end, anchor


def _source_files() -> list[Path]:
    """Every file a call-site sweep should consider."""
    found: list[Path] = []
    for root in SOURCE_ROOTS:
        base = REPO_ROOT / root
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix not in CALL_SITE_EXTS:
                continue
            if "node_modules" in path.parts or ".venv" in path.parts:
                continue
            found.append(path)
    return found


def call_sites(symbol: str, exclude: set[str] | None = None) -> list[str]:
    """Repo-relative files referencing `symbol`, so START IN can be checked against them.

    The rule this serves was learned the expensive way: an order made a shared hook
    parameter required while STOP WHEN ran only the caller's tests, so every other call
    site had to move and the executor was forced out of bounds to get its own stop-check
    green. Enumerating them is a grep, not a judgement call.
    """
    pattern = re.compile(r"(?<![\w.])" + re.escape(symbol) + r"(?![\w])")
    excluded = exclude or set()
    hits: list[str] = []
    for path in _source_files():
        rel = _rel(path)
        if _normalise(rel) in excluded:
            continue
        try:
            if pattern.search(path.read_text(encoding="utf-8", errors="replace")):
                hits.append(rel)
        except OSError:
            continue
    return sorted(hits)


def signature_changes(sections: dict[str, list[str]]) -> list[tuple[str, str]]:
    """(symbol, path) pairs declared by CHANGES SIGNATURE."""
    pairs: list[tuple[str, str]] = []
    for entry in bullets(sections.get("CHANGES SIGNATURE", [])):
        if entry.strip().lower() in {"none", "none."}:
            continue
        symbol_match = re.search(r"`?([A-Za-z_][\w.]*)`?\s+in\s+", entry)
        path_match = PATHFUL_RE.search(entry)
        if symbol_match and path_match:
            pairs.append((symbol_match.group(1), path_match.group(0)))
    return pairs


# A type is a signature. Changing the shape of an exported one breaks every consumer just
# as a changed parameter list does, but it went undeclared because CHANGES SIGNATURE read
# as being about functions — and a stripped layout type reached reconcile through three
# player suites the order neither named nor ran.
TYPE_MUTATION_RE = re.compile(
    r"\b(remove|removes|removing|drop|drops|dropping|strip|strips|stripping|rename|renames|"
    r"renaming|replace|replaces|narrow|narrows|widen|widens|add|adds|adding|extend|extends|"
    r"change|changes|changing)\b",
    re.IGNORECASE,
)
EXPORTED_TYPE_RE = re.compile(
    r"^\s*export\s+(?:type|interface)\s+([A-Za-z_]\w*)", re.MULTILINE
)
# A bullet often names a type precisely to say it is NOT being touched — "leaving MapRoom
# outside it", "MapRoom unchanged". Co-occurrence with a mutation verb elsewhere in the
# same bullet then read as a reshape, so the rule refused orders for being explicit about
# their boundary. Stating what you do not touch must not cost a rewrite cycle.
TYPE_EXCLUDED_RE_TEMPLATE = (
    r"(?:\b(?:leav\w+|keep\w*|keeping|not|never|without|outside|excluding|exclude\w*|"
    r"unaffected|untouched|unchanged)\b[^.;,]{{0,60}}?\b{name}\b"
    r"|\b{name}\b[^.;,]{{0,60}}?\b(?:outside|unchanged|untouched|unaffected|alone|as-is|"
    r"as is|intact)\b)"
)


def type_is_excluded(bullet: str, type_name: str) -> bool:
    """True when the bullet names the type to exclude it, not to reshape it."""
    pattern = TYPE_EXCLUDED_RE_TEMPLATE.format(name=re.escape(type_name))
    return re.search(pattern, bullet, re.IGNORECASE) is not None


# Introducing an exported type is not reshaping one: there are no existing consumers to
# drag into START IN. The rule only saw this after the order landed, when the new type
# existed and re-linting the still-present order file flagged its own creator.
TYPE_CREATION_RE_TEMPLATE = (
    r"\b(?:export|exports|exporting|add|adds|adding|introduce\w*|create\w*|define\w*|"
    r"declare\w*)\s+(?:a\s+|an\s+|the\s+|new\s+|exported\s+|type\s+|interface\s+)*`?{name}\b"
)


def type_is_created(bullet: str, type_name: str) -> bool:
    """True when the bullet introduces the type rather than reshaping an existing one."""
    pattern = TYPE_CREATION_RE_TEMPLATE.format(name=re.escape(type_name))
    return re.search(pattern, bullet, re.IGNORECASE) is not None


def vitest_filters(stop_when: str) -> str:
    """Just the arguments to `--tests`, where paths are frontend-relative.

    Everything else in a STOP WHEN — the CREATES existence assertion above all — is
    repo-relative and correct as written, so the prefix rule must not see it.
    """
    chunks: list[str] = []
    for match in re.finditer(r"--tests\s+(.*?)(?=\s--\w|\s&&|\s\|\||\"|$)", stop_when, re.S):
        chunks.append(match.group(1))
    return " ".join(chunks)


def stop_when_runs(test_path: str, stop_when: str) -> bool:
    """Does this STOP WHEN run that test file, in either of the two correct spellings?

    A vitest filter must be frontend-relative and everything else in a STOP WHEN is
    repo-relative, so the same suite has two legitimate forms. Matching only the
    repo-relative one made the co-located-suite rule unsatisfiable for a plain frontend
    order: the compiler either added a redundant path assertion or rewrote the order until
    the lint went quiet. Accept both spellings and the rule means what it says.
    """
    haystack = _normalise(stop_when)
    candidates = {_normalise(test_path)}
    for candidate in list(candidates):
        if candidate.startswith("frontend/"):
            candidates.add(candidate[len("frontend/") :])
    return any(candidate in haystack for candidate in candidates)


def stop_when_test_files(stop_when: str) -> set[str]:
    """Distinct test files a STOP WHEN actually runs, keyed by basename.

    Basename rather than path because the same file legitimately appears twice in one
    command — frontend-relative as a vitest filter, repo-relative in a CREATES existence
    assertion — and counting those as two tests would fail an order for being correct.
    """
    found: set[str] = set()
    for token in PATHFUL_RE.findall(stop_when) + BARE_FILE_RE.findall(stop_when):
        normalised = token.replace("\\", "/")
        if TEST_FILE_RE.search(normalised):
            found.add(normalised.rsplit("/", 1)[-1])
    return found


def exported_types(path_str: str) -> set[str]:
    """Type and interface names a TypeScript file exports."""
    resolved = _resolve(path_str)
    if resolved.suffix not in {".ts", ".tsx"} or not resolved.is_file():
        return set()
    try:
        return set(EXPORTED_TYPE_RE.findall(resolved.read_text(encoding="utf-8")))
    except OSError:
        return set()


def colocated_tests(path_str: str) -> list[str]:
    """Test files that exist for a source file, by this repo's two conventions."""
    rel = _strip_prefix(path_str)
    resolved = REPO_ROOT / rel
    stem = resolved.stem
    candidates = [
        resolved.parent / "__tests__" / f"{stem}.test.tsx",
        resolved.parent / "__tests__" / f"{stem}.test.ts",
        resolved.parent / f"{stem}.test.tsx",
        resolved.parent / f"{stem}.test.ts",
    ]
    return [_rel(candidate) for candidate in candidates if candidate.is_file()]


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

    level, strength_reason = split_strength(
        " ".join(sections.get("REQUIRED STRENGTH", []))
    )
    if "REQUIRED STRENGTH:" in text:
        if level not in VALID_STRENGTHS:
            fail(
                f"REQUIRED STRENGTH must be one of {', '.join(sorted(VALID_STRENGTHS))}: "
                f"{level or 'blank'}",
                f"{DEFAULT_STRENGTH} is the default for every order; declare a higher "
                "strength only with a reason",
            )
        elif level != DEFAULT_STRENGTH and len(strength_reason) < STRENGTH_REASON_MIN:
            fail(
                f"REQUIRED STRENGTH is {level} with no stated reason",
                f"{DEFAULT_STRENGTH} is the default for every order. To escalate, write "
                f"'REQUIRED STRENGTH: {level} — <what a {DEFAULT_STRENGTH} executor cannot "
                "do here>'. If the answer is that the order is under-specified, fix the "
                "order instead — that is what the one abandoned order in the log turned "
                "out to be",
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
    distinct_start_in_files = {_normalise(path_str) for _, path_str, _ in entries}
    if len(distinct_start_in_files) > MAX_START_IN_FILES:
        fail(
            f"START IN names {len(distinct_start_in_files)} distinct files "
            f"(max {MAX_START_IN_FILES})",
            "Split the order. Several ranges of one file are fine — a fourth separate file "
            "is a fourth thing the executor holds at once, and `scripts/new_order.py` "
            "refuses to emit one so the split happens before the order is written",
        )

    start_in_paths: list[str] = []
    start_in_meta: list[tuple[str, str, Path, int]] = []
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
        if not resolved.is_file():
            continue

        lines = _line_count(resolved)
        start_in_meta.append((path_str, scope, resolved, lines))
        if lines <= SCOPE_REQUIRED_LINES:
            # Reading a file this size whole *is* the scope; nothing to bound.
            continue

        ranges, has_point = scope_ranges(scope)
        anchor = scope_anchor(scope)
        if not ranges:
            if has_point:
                detail = "a bare line number, which the executor pays to re-locate on every return trip"
            elif len(scope.strip()) >= 3:
                detail = "a symbol name, which costs one re-locating read per visit"
            else:
                detail = "nothing, so the file is read whole"
            fail(
                f"START IN entry for {path_str} ({lines} lines) is bounded by {detail}",
                "Give an explicit line range with an anchor — "
                f"'- {path_str} — lines 120-168 @\"export function fitToBounds\"'. "
                "Run `check_orders.py --fix` and it will resolve a backticked symbol to its "
                "range for you; four consecutive orders in one stage spent their only "
                "measurable waste on this exact shape",
            )
            continue

        if not anchor:
            fail(
                f"START IN entry for {path_str} cites lines "
                f"{ranges[0][0]}-{ranges[0][1]} with no anchor",
                'Append the first line of the range verbatim as `@"<text>"`. Line numbers '
                "rot the moment an upstream order edits the file; an anchor is what lets "
                "the linter re-check and `--fix` repair the range instead of an executor "
                "discovering it mid-run",
            )
            continue

        state, line = anchor_state(resolved, ranges, anchor)
        if state == "moved":
            fail(
                f"START IN range for {path_str} is stale: anchor \"{anchor[:40]}\" is at "
                f"line {line}, not in {ranges[0][0]}-{ranges[0][1]}",
                "Run `check_orders.py --fix` to re-heal the range. An upstream order in this "
                "stage almost certainly edited the file and shifted every line below its edit",
            )
        elif state == "absent":
            fail(
                f"START IN anchor for {path_str} no longer appears in the file: \"{anchor[:40]}\"",
                "Re-derive the anchor from the current file. The code it pointed at has been "
                "renamed or removed, so the order is compiled against a version that no "
                "longer exists",
            )

    do_lines = sections.get("DO", [])
    do_bullets = bullets(do_lines)
    do_text = "\n".join(do_lines)
    do_paths = paths_in_do(sections)
    if len(do_bullets) > MAX_DO_BULLETS:
        fail(
            f"DO asks for {len(do_bullets)} things (max {MAX_DO_BULLETS})",
            "One work order is one logical change. A fourth DO bullet is the shape the log "
            "keeps paying for: split it into two orders and set DEPENDS ON",
        )
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
                hits = _rglob_hits(name)
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
    # Vitest filters passed to order_check.py are matched from `frontend/`, so a
    # repo-relative path matches nothing. One order compiled this way ran zero tests and
    # its executor run was cancelled arguing with the result.
    # Only the filter arguments themselves: the same order's CREATES assertion is repo-
    # relative on purpose, and flagging that would trade one wrong path for another.
    for bad in re.findall(r"(?<![\w/])frontend/\S+\.(?:test|spec)\.[jt]sx?", vitest_filters(stop_when)):
        fail(
            f"STOP WHEN passes a repo-relative vitest filter: {bad}",
            f"Drop the `frontend/` prefix — write {bad[len('frontend/'):]}. "
            "order_check.py runs vitest from frontend/, so the prefixed form matches "
            "no test file and the check reports on an empty run",
        )

    stop_when_tests = stop_when_test_files(stop_when)
    if len(stop_when_tests) > MAX_STOP_WHEN_TESTS:
        fail(
            f"STOP WHEN runs {len(stop_when_tests)} test files "
            f"(max {MAX_STOP_WHEN_TESTS}): {', '.join(sorted(stop_when_tests))}",
            "A stop-check this wide is a stage check wearing an order's clothes. Run the "
            "suites for the files this order edits and split the rest into their own order",
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
    if frontend_tests and FIXTURE_HINT_RE.search(PATHFUL_RE.sub(" ", text)):
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
            # Count the bullets aimed at *this suite*, not every bullet in the order. A
            # bullet editing the model or a fixture module is not a behaviour against the
            # big suite, and counting it refused orders that were correctly sized.
            # A bullet naming only *other* files is not a behaviour against this suite: an
            # order that edits a model, a field list, and adds one test was refused for
            # asking three behaviours of a suite two of its bullets never touch. Bullets
            # naming no path at all still count — that is how the abandoned seven-behaviour
            # order was phrased.
            base = _normalise(path_str).rsplit("/", 1)[-1]
            test_bullets = []
            for bullet in do_bullets:
                paths = PATHFUL_RE.findall(bullet)
                if paths and not any(base in p.replace("\\", "/").lower() for p in paths):
                    continue
                test_bullets.append(bullet)
            if len(test_bullets) > MAX_DO_BULLETS_BIG_TEST:
                fail(
                    f"{path_str} is a {_line_count(resolved)}-line integrated suite and DO "
                    f"asks for {len(test_bullets)} behaviours",
                    "One behaviour per order against a suite this size, and name the test "
                    "seam it turns on; several at once is the one order in the telemetry "
                    "log that had to be abandoned at both Light and Standard strength",
                )

    # An exported signature change drags every caller with it. Enumerating them is a
    # grep; leaving it to the executor cost a BLOCKED run and a stale assertion that
    # escaped to reconcile.
    normalised_start_set = set(start_in_paths)

    # The same rule, reached from the other side: an order that reshapes an exported type
    # without declaring it escapes every caller check above. That is how a stripped layout
    # type shipped past a STOP WHEN scoped to one suite and broke three others.
    declared_symbols = {symbol for symbol, _ in signature_changes(sections)}
    for path_str in sorted(do_paths):
        for type_name in sorted(exported_types(path_str)):
            if type_name in declared_symbols:
                continue
            for bullet in bullets(sections.get("DO", [])):
                # Whole-identifier match only: a substring test read `DungeonData` inside
                # `parseDungeonData` and charged an order a rewrite for mentioning the
                # parser's own describe block.
                if (
                    re.search(rf"\b{re.escape(type_name)}\b", bullet)
                    and TYPE_MUTATION_RE.search(bullet)
                    and not type_is_excluded(bullet, type_name)
                    and not type_is_created(bullet, type_name)
                ):
                    fail(
                        f"DO reshapes the exported type `{type_name}` in {path_str} but "
                        "CHANGES SIGNATURE does not declare it",
                        f"Declare `CHANGES SIGNATURE: {type_name} in {path_str}`. A type is "
                        "a signature: declaring it is what pulls every consumer into START "
                        "IN and the module's own suite into STOP WHEN",
                    )
                    break

    for symbol, path_str in signature_changes(sections):
        if _normalise(path_str) not in normalised_start_set:
            fail(
                f"CHANGES SIGNATURE names {path_str}, which START IN does not list",
                "The file whose signature changes must be an authorized START IN entry",
            )
        missing = [
            site
            for site in call_sites(symbol, exclude={_normalise(path_str)})
            if _normalise(site) not in normalised_start_set
        ]
        if missing:
            shown = ", ".join(missing[:4]) + (f" (+{len(missing) - 4} more)" if len(missing) > 4 else "")
            fail(
                f"CHANGES SIGNATURE `{symbol}` has call sites outside START IN: {shown}",
                "Add every call site to START IN, or the executor is forced out of bounds "
                "to satisfy its own typecheck — which is exactly what happened to the one "
                "order in the log that both blocked and leaked a stale assertion",
            )
        for test_path in colocated_tests(path_str):
            if not stop_when_runs(test_path, stop_when):
                fail(
                    f"CHANGES SIGNATURE `{symbol}` but STOP WHEN omits the module's own "
                    f"suite: {test_path}",
                    "Run the changed module's test suite, not only the caller's; scoping "
                    "STOP WHEN to the caller is how a stale hook assertion reached reconcile",
                )

    # The same lesson, one step weaker: any edited source file whose own suite exists
    # should be run by the order that edits it.
    for path_str in sorted(do_paths):
        if TEST_FILE_RE.search(path_str.replace("\\", "/")):
            continue
        if not path_str.endswith((".ts", ".tsx", ".js", ".jsx", ".py")):
            continue
        tests = colocated_tests(path_str)
        if tests and not any(stop_when_runs(t, stop_when) for t in tests):
            fail(
                f"DO edits {path_str} but STOP WHEN never runs its suite: {tests[0]}",
                "Name the co-located test file in STOP WHEN. An order that edits a module "
                "without running that module's own tests is the shape that let a stale "
                "assertion pass every targeted check and fail at reconcile",
            )

    # Hook dependencies: vitest and tsc are both blind to this, eslint is not.
    # Case matters here: `useMapLabEditor.ts` is a hook, `username.ts` is not.
    hook_paths = [p for p in do_paths if HOOK_FILE_RE.search(p.replace("\\", "/"))]
    touches_deps = bool(HOOK_DEP_RE.search(do_text + "\n" + known_state))
    if (hook_paths or touches_deps) and not LINT_RE.search(stop_when):
        trigger = hook_paths[0] if hook_paths else "a hook dependency array"
        fail(
            f"Order changes {trigger} but STOP WHEN does not run npm run lint",
            "Append `&& npm run lint`. A missing useCallback dependency is invisible to "
            "vitest and to tsc; lint is the only check that catches it, and one slipped "
            "through to reconcile as a latent stale-closure bug",
        )

    # Where does a NEW test go? Naming the fixture it reuses is not the same answer.
    if NEW_TEST_RE.search(do_text):
        for path_str, scope, resolved, lines in start_in_meta:
            if not TEST_FILE_RE.search(path_str.replace("\\", "/")):
                continue
            if lines <= SCOPE_REQUIRED_LINES:
                continue
            anchor = scope_anchor(scope)
            hits = anchor_lines(resolved, anchor) if anchor else []
            file_lines = _file_lines(resolved)
            if not any(TEST_BLOCK_RE.match(file_lines[hit - 1]) for hit in hits if hit <= len(file_lines)):
                fail(
                    f"DO adds a test to {path_str} ({lines} lines) without naming the "
                    "block to insert it into",
                    'Anchor the entry on the describe/it line the new test joins '
                    '(`@"describe(\'fullscreen\', ...)"`). Leaving this out after it had '
                    "already been diagnosed let one order pay 6 locating reads of a "
                    "2,000-line suite; naming it on the next order brought that back to 1",
                )

    return errors


def autofix_order(order_path: Path) -> list[tuple[str, str]]:
    """Rewrite unambiguous bare filenames to their full repo-relative path.

    Only fires when `_rglob_hits` finds exactly one candidate: the same compiling mistake
    every time (a bare name typed while the file's real location was still in the
    compiler's head, not the order) has exactly one honest fix. Two or more hits, or zero,
    is a judgement call the linter still has to surface as an error — guessing wrong here
    would send an executor to the wrong file silently instead of loudly.

    Returns the (bare_name, full_path) pairs applied, and rewrites the file in place when
    any are found.
    """
    text = order_path.read_text(encoding="utf-8")
    sections = split_sections(text)
    fixes: dict[str, str] = {}

    removed = {_normalise(path) for path in declared_paths(sections, "REMOVES")}
    for _, path_str, _ in start_in_entries(sections):
        if "/" in path_str or "\\" in path_str:
            continue  # already has a directory; a wrong directory is not ours to guess
        if _resolve(path_str).exists() or _normalise(path_str) in removed:
            continue
        hits = _rglob_hits(path_str)
        if len(hits) == 1 and hits[0] != path_str:
            fixes[path_str] = hits[0]

    for field in ("KNOWN STATE", "DO", "KNOWN TEST FAILURES"):
        for bullet in bullets(sections.get(field, [])):
            if COMMAND_HINT_RE.search(bullet):
                continue
            without_paths = PATHFUL_RE.sub(" ", bullet)
            for match in BARE_FILE_RE.finditer(without_paths):
                name = match.group(1)
                if name in fixes:
                    continue
                hits = _rglob_hits(name)
                if len(hits) == 1 and hits[0] != name:
                    fixes[name] = hits[0]

    if not fixes:
        return []

    applied: dict[str, str] = {}
    new_lines: list[str] = []
    for line in text.splitlines(keepends=True):
        if COMMAND_HINT_RE.search(line):
            new_lines.append(line)
            continue
        for bare, full in fixes.items():
            pattern = re.compile(r"(?<![\w./\\-])" + re.escape(bare) + r"\b")
            if pattern.search(line):
                line = pattern.sub(full.replace("\\", "/"), line)
                applied[bare] = full
        new_lines.append(line)

    if applied:
        order_path.write_text("".join(new_lines), encoding="utf-8")
    return sorted(applied.items())


def autofix_stop_when_filters(order_path: Path) -> list[tuple[str, str]]:
    """Strip the `frontend/` prefix from vitest filters in STOP WHEN.

    `autofix_order` deliberately leaves command lines alone, and STOP WHEN is nothing but a
    command line — so this fault, which cancelled one executor run, needed its own pass.
    The rewrite is safe precisely because it is not a guess: order_check.py runs vitest with
    `frontend/` as its working directory, so the prefixed form can only ever match nothing.
    """
    text = order_path.read_text(encoding="utf-8")
    applied: list[tuple[str, str]] = []
    new_lines: list[str] = []
    for line in text.splitlines(keepends=True):
        if line.startswith("STOP WHEN:"):
            for bad in re.findall(
                r"(?<![\w/])frontend/\S+\.(?:test|spec)\.[jt]sx?", vitest_filters(line)
            ):
                good = bad[len("frontend/") :]
                line = line.replace(bad, good)
                applied.append((bad, good))
        new_lines.append(line)
    if applied:
        order_path.write_text("".join(new_lines), encoding="utf-8")
    return applied


def _sub_first_range(text: str, start: int, end: int) -> str:
    """Rewrite the first line range in `text`, keeping whatever wording surrounds it."""
    for pattern in (RANGE_RE, BARE_RANGE_RE):
        match = pattern.search(text)
        if match:
            replaced = re.sub(
                r"\d{1,6}\s*(?:-|–|—|to|through|\.\.+)\s*\d{1,6}",
                f"{start}-{end}",
                match.group(0),
                count=1,
            )
            return text[: match.start()] + replaced + text[match.end():]
    return text


def autofix_start_in(order_path: Path) -> list[tuple[str, str]]:
    """Re-heal stale line ranges and resolve symbol-scoped entries into ranges.

    This is the automation the telemetry log kept asking for in prose. Two facts drove it:

    * when consecutive orders edit one large file, every downstream order's line numbers
      go stale the moment the upstream one lands — re-verifying them by hand cost the
      planner a full read of a 2,300-line file per dispatch; and
    * bounding a large file by symbol name alone cost one re-locating read per symbol, in
      four consecutive orders of a single stage.

    Both are mechanical given an anchor, so neither should cost a model anything. Anything
    ambiguous is left alone for the linter to report — a silently wrong range would send an
    executor to the wrong code instead of loudly failing.
    """
    raw = order_path.read_text(encoding="utf-8")
    lines = raw.splitlines(keepends=True)
    applied: list[tuple[str, str]] = []
    in_section = False

    for index, line in enumerate(lines):
        if SECTION_RE.match(line):
            in_section = line.startswith("START IN")
            continue
        if not in_section:
            continue
        stripped = line.strip()
        if not stripped.startswith(("-", "*")):
            continue

        body = stripped.lstrip("-* ").strip()
        path_str, scope = split_entry(body)
        if not path_str:
            continue
        resolved = _resolve(path_str)
        if not resolved.is_file() or _line_count(resolved) <= SCOPE_REQUIRED_LINES:
            continue

        ranges, _ = scope_ranges(scope)
        anchor = scope_anchor(scope)
        file_lines = _file_lines(resolved)
        new_line = line

        if ranges and anchor:
            state, hit = anchor_state(resolved, ranges, anchor)
            if state != "moved" or hit is None:
                continue
            span = ranges[0][1] - ranges[0][0]
            new_line = _sub_first_range(line, hit, min(hit + span, len(file_lines)))
            applied.append(
                (f"{path_str} lines {ranges[0][0]}-{ranges[0][1]}", f"lines {hit}-{hit + span} (anchor moved)")
            )

        elif ranges and not anchor:
            start = ranges[0][0]
            if not (1 <= start <= len(file_lines)):
                continue
            anchor_text = " ".join(file_lines[start - 1].split())[:80]
            if len(anchor_text) < MIN_ANCHOR_LEN:
                continue
            new_line = line.rstrip("\n") + f' @"{anchor_text}"' + ("\n" if line.endswith("\n") else "")
            applied.append((f"{path_str} lines {start}-{ranges[0][1]}", f'anchored @"{anchor_text[:40]}"'))

        else:
            symbols = SCOPE_SYMBOL_RE.findall(scope)
            span = next(
                (found for found in (symbol_span(resolved, symbol) for symbol in symbols) if found),
                None,
            )
            if not span:
                continue
            start, end, anchor_text = span
            addition = f' — lines {start}-{end} @"{anchor_text}"' if not scope else f', lines {start}-{end} @"{anchor_text}"'
            new_line = line.rstrip("\n") + addition + ("\n" if line.endswith("\n") else "")
            applied.append((f"{path_str} (symbol-scoped)", f"lines {start}-{end}"))

        lines[index] = new_line

    if applied:
        order_path.write_text("".join(lines), encoding="utf-8")
    return applied


def _discover_orders(orders_root: Path | None = None) -> list[Path]:
    root = orders_root if orders_root is not None else ORDERS_ROOT
    if not root.exists():
        return []
    return [order for order in sorted(root.rglob("*.md")) if re.match(r"\d+-", order.name)]


def lint_orders(orders_root: Path | None = None) -> list[OrderError]:
    """Lint every active work order."""
    orders = _discover_orders(orders_root)
    errors: list[OrderError] = []
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
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Repair mechanically-fixable faults before linting: unambiguous bare "
        "filenames become full paths, stale line ranges are re-healed from their anchors, "
        "and symbol-scoped large files are resolved to real ranges. Anything ambiguous is "
        "left as an error, since guessing there would be worse",
    )
    args = parser.parse_args()

    if args.orders:
        paths: list[Path] = []
        for name in args.orders:
            path = Path(name)
            if not path.is_absolute():
                path = REPO_ROOT / name
            if not path.exists():
                print(f"ERROR: no such order file: {name}", file=sys.stderr)
                return 1
            paths.append(path)
    else:
        paths = _discover_orders()

    if args.fix:
        for path in paths:
            # Bare names first: a path has to resolve before its ranges can be checked.
            for bare, full in autofix_order(path):
                print(f"fixed {_rel(path)}: {bare} -> {full}")
            for before, after in autofix_start_in(path):
                print(f"fixed {_rel(path)}: {before} -> {after}")
            for before, after in autofix_stop_when_filters(path):
                print(f"fixed {_rel(path)}: {before} -> {after}")

    if args.orders:
        errors: list[OrderError] = []
        for path in paths:
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
