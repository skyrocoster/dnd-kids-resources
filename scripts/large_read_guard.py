"""Unbounded large-file read guard for the compiler role.

`read_guard.py` polices the executor: it stops a work order re-reading a file it just
edited. This is the same idea aimed at the other end of the workflow. When `to-orders`
compiles a stage, its most expensive habit is opening a 1,000-line page component whole
to answer a question worth two hundred tokens — the exact cost the skill spends four
paragraphs telling the compiler to avoid, and the exact kind of reflex prose does not
stop. `to-orders` already names the three cheaper routes: a bounded range, a grep for the
anchor, or a dispatch to the read-only explorer. This makes them the only routes.

The rule
--------
While a session is *armed*, reading a file over `LARGE_FILE_LINES` lines is denied unless
the read is bounded — a `limit` of at most `MAX_WINDOW_LINES` lines. The guard arms itself
the moment a session picks up the `to-orders` skill — whether it invokes it as a tool or
simply reads `SKILL.md` — so a session doing anything else is never touched.

Reading a *bounded* range is always allowed, at any size of file. This guard has no opinion
about how many times you read, only about reading a large file whole.

Four things get a file through anyway:

* it is small — at or under the line threshold, where reading it whole *is* the scope, per
  the same 400-line rule `check_orders.py` enforces on START IN entries;
* it is on `ALWAYS_ALLOWED` — the routing and contract documents a compiler is *supposed*
  to read end to end, plus the plan and order files that are the session's actual subject;
* an explicit `--unlock <path> --reason "<why>"`, which is logged;
* `LARGE_READ_GUARD=off` in the environment, which disables the guard entirely.

Deliberately *not* an exemption: `docs/plans/telemetry-log.md`. The skill says the tail is
enough, and the tail is a bounded read.

CLI
---
    large_read_guard.py --harness opencode --event pre|post   # payload JSON on stdin
    large_read_guard.py --arm [--session <id>] | --disarm [--session <id>]
    large_read_guard.py --unlock <path> [--reason "<why>"] [--session <id>]
    large_read_guard.py --status [--session <id>]

Never raises into a harness: any internal error resolves to "allow".
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = REPO_ROOT / ".telemetry" / "large-read-guard"

# The skill whose presence means "this session is compiling a stage".
ARMING_SKILL = "to-orders"
# ...and the skill's own file, because invoking it is not the only way to start following it.
# opencode's `/to-orders` slash command, run under the default agent, satisfied itself by
# *reading* .opencode/skills/to-orders/SKILL.md with the read tool: no `skill` tool event, so
# nothing armed, while ALWAYS_ALLOWED waved the read through. A session holding the skill's
# text is compiling a stage however it got there.
ARMING_SKILL_DOC = re.compile(rf"(?:^|/)skills/{re.escape(ARMING_SKILL)}/skill\.md$")

# The repo's own definition of a large file, from check_orders.py and the START IN rule:
# at or under this, reading the file whole is the scope.
LARGE_FILE_LINES = 400
# The largest window a single bounded read may ask for. A range wider than the threshold
# is an unbounded read wearing a limit.
MAX_WINDOW_LINES = 400

READ_TOOLS = {"read"}
SHELL_TOOLS = {"bash", "shell", "powershell", "run"}
SKILL_TOOLS = {"skill"}

PATH_KEYS = ("filePath", "path")
LIMIT_KEYS = ("limit", "line_limit", "lineLimit", "length")
COMMAND_KEYS = ("command", "cmd", "script")

# Documents a compiler is meant to read end to end: the routing spine, the contracts that
# define what an order may say, and the plan/order files that are the session's subject.
# Everything here is either short, or long *because* it is an index.
ALWAYS_ALLOWED = (
    "agents.md",
    "readme.md",
    "context.md",
    "docs/readme.md",
    "docs/plan_template.md",
    "docs/inventory.md",
    "docs/adr/*.md",
    "docs/agents/*.md",
    "docs/plans/*.md",
    "docs/plans/active/**",
    "docs/plans/done/index.md",
    "docs/plans/_example/**",
    ".opencode/skills/**",
    ".agents/skills/**",
)
# Carved back out of the patterns above: the skill itself says the tail is enough, and a
# tail is a bounded read.
NEVER_ALLOWED = ("docs/plans/telemetry-log.md",)

DENY_MESSAGE = (
    "large_read_guard: {path} is {lines} lines. While compiling a stage, reading a file "
    "over {threshold} lines whole is blocked — it is the compiler's most expensive habit "
    "and the one `to-orders` cannot stop with wording.\n"
    "Take one of the routes the skill already names:\n"
    "  1. Bounded read — grep the file for your anchor, then read a range "
    "(offset/limit, at most {window} lines). A grep hit with context is often the answer.\n"
    "  2. Delegate the retrieval — send a bounded question to the `explore-deepseek` "
    "subagent. It answers with path:line citations at the cheap model's rate.\n"
    "  3. Let the tooling derive it — `scripts/check_orders.py --fix` resolves a backticked "
    "symbol to a real line range and anchor without you opening the file at all.\n"
    "If you genuinely need the whole file (you are judging its shape, not looking something "
    'up): `python scripts/large_read_guard.py --unlock {path} --reason "<why>"`, which is logged.'
)

# A bare dump of a file through the shell is the same read wearing a different tool.
_DUMP_RE = re.compile(
    r"(?:^|[|;&]\s*)(?:cat|type|Get-Content|gc)\s+(?P<path>[^|;&<>\r\n]+)",
    re.IGNORECASE,
)
# ...unless it is already bounded by one of these.
_BOUNDED_SHELL = re.compile(
    r"(?:\bhead\b|\btail\b|\bsed\s+-n\b|\bawk\b|-TotalCount\b|-Tail\b|"
    r"\bSelect-Object\b|\bSelect-String\b|\bgrep\b|\brg\b|\bfindstr\b)",
    re.IGNORECASE,
)


# --------------------------------------------------------------------------- state


def _state_path(session: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9_.-]", "_", session or "unknown")[:120]
    return STATE_DIR / f"{safe}.json"


def _load(session: str) -> dict[str, Any]:
    path = _state_path(session)
    if not path.is_file():
        return {"session": session, "armed": False, "allowed": [], "denied": 0, "unlocks": []}
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"session": session, "armed": False, "allowed": [], "denied": 0, "unlocks": []}
    state.setdefault("allowed", [])
    state.setdefault("unlocks", [])
    state.setdefault("denied", 0)
    state.setdefault("armed", False)
    return state


def _save(state: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    path = _state_path(state.get("session", "unknown"))
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2), encoding="utf-8")
    tmp.replace(path)


def _latest_session() -> str | None:
    """The most recently touched session, for CLI calls that can't know their own id."""
    if not STATE_DIR.is_dir():
        return None
    files = sorted(STATE_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        return None
    try:
        return json.loads(files[0].read_text(encoding="utf-8")).get("session")
    except (OSError, ValueError):
        return files[0].stem


# ---------------------------------------------------------------------- normalising


def _normalise(raw: str | None, cwd: str | None = None) -> str | None:
    """Repo-relative, forward-slashed, case-folded — one key the whole pipeline agrees on."""
    if not raw or not isinstance(raw, str):
        return None
    candidate = Path(raw.strip().strip('"').strip("'"))
    if not candidate.is_absolute():
        base = Path(cwd) if cwd else REPO_ROOT
        candidate = base / candidate
    try:
        resolved = candidate.resolve()
    except (OSError, ValueError):
        return None
    try:
        rel = resolved.relative_to(REPO_ROOT)
    except ValueError:
        return None  # Outside the repo: not ours to police.
    return rel.as_posix().lower()


def _first(args: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = args.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def _first_int(args: dict[str, Any], keys: tuple[str, ...]) -> int | None:
    for key in keys:
        value = args.get(key)
        if isinstance(value, bool):
            continue
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.strip().isdigit():
            return int(value.strip())
    return None


def _mentions_arming_skill(args: dict[str, Any]) -> bool:
    """Any string value naming the arming skill counts."""

    def walk(value: Any) -> bool:
        if isinstance(value, str):
            return ARMING_SKILL in value.lower()
        if isinstance(value, dict):
            return any(walk(item) for item in value.values())
        if isinstance(value, list):
            return any(walk(item) for item in value)
        return False

    return walk(args)


def _exempt(path: str) -> bool:
    if any(fnmatch.fnmatch(path, pattern) for pattern in NEVER_ALLOWED):
        return False
    return any(fnmatch.fnmatch(path, pattern) for pattern in ALWAYS_ALLOWED)


def _display(path: str, raw: str | None) -> str:
    """The case-folded key is for state; a human needs the path as it exists on disk."""
    if raw and not Path(raw).is_absolute() and (REPO_ROOT / raw).is_file():
        return Path(raw).as_posix()
    return path


def _line_count(path: str) -> int | None:
    """Lines in a repo-relative path, or None when it isn't a readable text file."""
    target = REPO_ROOT / path
    if not target.is_file():
        return None
    try:
        with target.open("rb") as handle:
            chunk = handle.read(4096)
            if b"\0" in chunk:
                return None  # Binary: an image read is not what this guard is about.
            lines = chunk.count(b"\n")
            while True:
                chunk = handle.read(1 << 20)
                if not chunk:
                    break
                lines += chunk.count(b"\n")
    except OSError:
        return None
    return lines + 1


# ------------------------------------------------------------------------- decisions


def _shell_dump_path(args: dict[str, Any], cwd: str | None) -> str | None:
    """The path a bare `cat`/`Get-Content` would dump, if the command is one."""
    command = _first(args, COMMAND_KEYS)
    if not command or _BOUNDED_SHELL.search(command):
        return None
    match = _DUMP_RE.search(command)
    if not match:
        return None
    tokens = [t for t in match.group("path").split() if not t.startswith("-")]
    if len(tokens) != 1:
        return None  # Several paths or flags we don't model: not worth a false deny.
    return _normalise(tokens[0], cwd)


def _decide(
    path: str, limit: int | None, state: dict[str, Any], display: str | None = None
) -> tuple[bool, str]:
    if _exempt(path) or path in state.get("allowed", []):
        return True, ""
    if limit is not None and 0 < limit <= MAX_WINDOW_LINES:
        return True, ""  # Bounded is always fine, however big the file.
    lines = _line_count(path)
    if lines is None or lines <= LARGE_FILE_LINES:
        return True, ""
    # The state key is case-folded so the pipeline agrees on it; the message is not, because
    # the reader may paste it straight into --unlock on a case-sensitive filesystem.
    return False, DENY_MESSAGE.format(
        path=display or path, lines=lines, threshold=LARGE_FILE_LINES, window=MAX_WINDOW_LINES
    )


def _record_pre(payload: dict[str, Any]) -> tuple[bool, str]:
    """(allow, reason). Called before a tool runs."""
    if os.environ.get("LARGE_READ_GUARD", "").lower() in {"off", "0", "false"}:
        return True, ""

    tool = str(payload.get("tool") or "").lower()
    if tool not in READ_TOOLS and tool not in SHELL_TOOLS:
        return True, ""

    session = str(payload.get("sessionID") or "unknown")
    state = _load(session)
    if not state.get("armed"):
        return True, ""

    args = payload.get("args") or {}
    cwd = payload.get("cwd")

    if tool in SHELL_TOOLS:
        path = _shell_dump_path(args, cwd)
        raw, limit = None, None
    else:
        raw = _first(args, PATH_KEYS)
        path = _normalise(raw, cwd)
        limit = _first_int(args, LIMIT_KEYS)
    if not path:
        return True, ""

    allow, reason = _decide(path, limit, state, display=_display(path, raw))
    if not allow:
        state["denied"] = state.get("denied", 0) + 1
        _save(state)
    return allow, reason


def _arms(tool: str, args: dict[str, Any], cwd: str | None) -> bool:
    """Does this completed tool call mean the session is now compiling a stage?

    Two spellings, because opencode reaches the skill two ways and a guard that arms on
    only one of them is a guard that is off. It may expose the skill as a `skill` tool
    taking its name, or as a tool named after the skill itself — or not as a tool at all,
    in which case the model reaches the skill by reading its SKILL.md, and that read is
    the arming event.
    """
    if ARMING_SKILL in tool:
        return True
    if tool in SKILL_TOOLS and _mentions_arming_skill(args):
        return True
    if tool in READ_TOOLS:
        path = _normalise(_first(args, PATH_KEYS), cwd)
        return bool(path and ARMING_SKILL_DOC.search(path))
    if tool in SHELL_TOOLS:
        # `cat .opencode/skills/to-orders/SKILL.md` is the same read wearing a different tool;
        # so is a bounded one, since a tail of the skill still starts the session following it.
        command = (_first(args, COMMAND_KEYS) or "").replace("\\", "/").lower()
        return f"skills/{ARMING_SKILL}/skill.md" in command
    return False


def _record_post(payload: dict[str, Any]) -> None:
    """Arm the session the moment it invokes the compiler skill."""
    if os.environ.get("LARGE_READ_GUARD", "").lower() in {"off", "0", "false"}:
        return

    tool = str(payload.get("tool") or "").lower()
    args = payload.get("args") or {}
    if not _arms(tool, args, payload.get("cwd")):
        return

    session = str(payload.get("sessionID") or "unknown")
    state = _load(session)
    if state.get("armed"):
        return
    state["armed"] = True
    state["armed_at"] = time.time()
    _save(state)


# --------------------------------------------------------------------------- harness I/O


def _emit_opencode(allow: bool, reason: str) -> int:
    print(json.dumps({"allow": allow, "reason": reason}))
    return 0


def _read_payload() -> dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        payload = json.loads(raw)
    except ValueError:
        return {}
    return payload if isinstance(payload, dict) else {}


# ------------------------------------------------------------------------------ CLI


def _cmd_arm(session: str | None, armed: bool) -> int:
    session = session or _latest_session() or "manual"
    state = _load(session)
    state["armed"] = armed
    state["armed_at"] = time.time()
    _save(state)
    print(f"large_read_guard: session {session} {'armed' if armed else 'disarmed'}.")
    return 0


def _cmd_unlock(path_arg: str, reason: str, session: str | None) -> int:
    session = session or _latest_session()
    if not session:
        print("large_read_guard: no active session state; nothing to unlock.")
        return 0
    state = _load(session)
    path = _normalise(path_arg)
    if not path:
        print(f"large_read_guard: {path_arg} is not inside the repo; nothing to unlock.")
        return 0
    if path not in state["allowed"]:
        state["allowed"].append(path)
    state["unlocks"].append({"path": path, "reason": reason, "at": time.time()})
    _save(state)
    print(f"large_read_guard: {path} may now be read whole ({reason or 'no reason given'}).")
    return 0


def _cmd_status(session: str | None) -> int:
    session = session or _latest_session()
    if not session:
        print("large_read_guard: no session state recorded.")
        return 0
    state = _load(session)
    print(f"session: {session}")
    print(f"armed: {state.get('armed', False)}")
    print(f"threshold: {LARGE_FILE_LINES} lines | max bounded window: {MAX_WINDOW_LINES} lines")
    print(f"reads denied: {state.get('denied', 0)} | explicit unlocks: {len(state['unlocks'])}")
    for path in state["allowed"]:
        print(f"  unlocked: {path}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--harness", choices=("opencode",))
    parser.add_argument("--event", choices=("pre", "post"))
    parser.add_argument("--arm", action="store_true")
    parser.add_argument("--disarm", action="store_true")
    parser.add_argument("--unlock", metavar="PATH")
    parser.add_argument("--reason", default="")
    parser.add_argument("--session")
    parser.add_argument("--status", action="store_true")
    args = parser.parse_args(argv)

    if args.arm or args.disarm:
        return _cmd_arm(args.session, armed=args.arm)
    if args.unlock:
        return _cmd_unlock(args.unlock, args.reason, args.session)
    if args.status:
        return _cmd_status(args.session)
    if not args.harness or not args.event:
        parser.error("--harness and --event are required unless --arm/--unlock/--status")

    payload = _read_payload()
    if args.event == "post":
        _record_post(payload)
        allow, reason = True, ""
    else:
        allow, reason = _record_pre(payload)

    return _emit_opencode(allow, reason)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001 - a guard must never break the harness
        print(f"large_read_guard: internal error, allowing ({exc})", file=sys.stderr)
        sys.exit(0)
