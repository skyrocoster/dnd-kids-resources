"""Post-edit re-read guard for the opencode work-order executor.

The telemetry log measured one waste class that survived every order-side correction:
an executor re-reading a file it had just edited, to verify an edit the tool already
confirmed. Orders 05 and 07 of the Map Lab editor stage paid 2 and 3 of these; no
wording in an order or a skill prevented them, because the behaviour is a reflex
rather than a decision.

So it moves out of the prose and into the harness. This script is the single
implementation of the rule. opencode calls it from `.opencode/plugin/read-guard.js`,
which sends a normalised payload and turns a deny into a thrown error, so every
opencode executor is bound by the same rule.

The rule
--------
While a session is *armed*, reading a file that this session has already edited is
denied. The guard arms itself when the session invokes the `implement-order` skill, so
a planner session is never touched — only a session that is actually executing an order.

Three things unlock a file, because a re-read is legitimate when the edit is in doubt:

* a shell command failing since the edit (the STOP WHEN check went red);
* an explicit `--unlock <path> --reason "<why>"`, which is logged;
* `READ_GUARD=off` in the environment, which disables the guard entirely.

Failure detection is deliberately generous. A false unlock costs one re-read; a false
deny costs a stalled order, which the log values far higher.

CLI
---
    read_guard.py --harness opencode --event pre|post     # payload JSON on stdin
    read_guard.py --unlock <path> [--reason "<why>"] [--session <id>]
    read_guard.py --status [--session <id>]

Never raises into a harness: any internal error resolves to "allow".
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = REPO_ROOT / ".telemetry" / "read-guard"

# The skill whose presence means "this session is executing a work order".
ARMING_SKILL = "implement-order"

READ_TOOLS = {"read"}
EDIT_TOOLS = {"edit", "write", "multiedit", "patch"}
SHELL_TOOLS = {"bash", "shell", "powershell", "run"}
SKILL_TOOLS = {"skill"}

# Keys opencode uses for the path and command arguments.
PATH_KEYS = ("filePath", "path")
COMMAND_KEYS = ("command", "cmd", "script")

DENY_MESSAGE = (
    "read_guard: {path} was edited by this session and the edit succeeded. "
    "Re-reading it to confirm the edit is the one waste class the telemetry log "
    "could not remove with wording, so it is blocked here.\n"
    "If you genuinely need it back: run the order's STOP WHEN command first — a "
    "failing check unlocks every file automatically. To override deliberately, run "
    '`python scripts/read_guard.py --unlock {path} --reason "<why>"`, which is logged.'
)

# Generous: anything that smells like a red check unlocks. Ordered cheapest-first.
FAILURE_PATTERNS = (
    r"exit(?: code|status)?[ :]+[1-9]",
    r"\bTraceback \(most recent call last\)",
    r"\bAssertionError\b",
    r"^\s*FAIL\b",
    r"\bFAILED\b",
    r"\bfailed\b",
    r"\berror TS\d+",
    r"\bSyntaxError\b",
    r"\bTypeError\b",
    r"✕|✗|×",
    r"\bERROR\b",
    r"\bnot ok\b",
)
# Substrings that make a "failed"/"error" hit meaningless — green runs say these too.
FAILURE_NOISE = (
    "0 failed",
    "0 failing",
    "failures: 0",
    "failed: 0",
    "0 errors",
    "errors: 0",
    "known failures",
    "known-test-failures",
    "no new failures",
)

_FAILURE_RE = re.compile("|".join(FAILURE_PATTERNS), re.IGNORECASE | re.MULTILINE)


# --------------------------------------------------------------------------- state


def _state_path(session: str) -> Path:
    safe = re.sub(r"[^A-Za-z0-9_.-]", "_", session or "unknown")[:120]
    return STATE_DIR / f"{safe}.json"


def _load(session: str) -> dict[str, Any]:
    path = _state_path(session)
    if not path.is_file():
        return {"session": session, "armed": False, "files": {}, "unlocks": []}
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"session": session, "armed": False, "files": {}, "unlocks": []}
    state.setdefault("files", {})
    state.setdefault("unlocks", [])
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
    files = sorted(
        (p for p in STATE_DIR.glob("*.json")),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
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


def _looks_like_failure(payload: dict[str, Any]) -> bool:
    response = payload.get("output")
    if isinstance(response, dict):
        if response.get("is_error") or response.get("isError"):
            return True
        text = " ".join(
            str(response.get(key, ""))
            for key in ("stdout", "stderr", "output", "error", "title")
        )
    elif isinstance(response, str):
        text = response
    else:
        text = ""
    if payload.get("exit_code") not in (None, 0):
        return True
    if not text:
        return False
    haystack = text.lower()
    hit = _FAILURE_RE.search(text)
    if not hit:
        return False
    # A green suite still prints the word "failed" in "0 failed". Only treat the hit as
    # real when it isn't fully explained by known-noise phrasing.
    return not any(noise in haystack for noise in FAILURE_NOISE)


# ------------------------------------------------------------------------- decisions


def _record_pre(payload: dict[str, Any]) -> tuple[bool, str]:
    """(allow, reason). Called before a tool runs."""
    if os.environ.get("READ_GUARD", "").lower() in {"off", "0", "false"}:
        return True, ""

    tool = str(payload.get("tool") or "").lower()
    if tool not in READ_TOOLS:
        return True, ""

    session = str(payload.get("sessionID") or "unknown")
    state = _load(session)
    if not state.get("armed"):
        return True, ""

    path = _normalise(
        _first(payload.get("args") or {}, PATH_KEYS),
        payload.get("cwd"),
    )
    if not path:
        return True, ""

    entry = state["files"].get(path)
    if not entry or not entry.get("locked"):
        return True, ""

    entry["denied"] = entry.get("denied", 0) + 1
    _save(state)
    return False, DENY_MESSAGE.format(path=path)


def _record_post(payload: dict[str, Any]) -> None:
    """Update state after a tool has run."""
    if os.environ.get("READ_GUARD", "").lower() in {"off", "0", "false"}:
        return

    tool = str(payload.get("tool") or "").lower()
    session = str(payload.get("sessionID") or "unknown")
    args = payload.get("args") or {}
    state = _load(session)
    dirty = False

    # opencode exposes the skill as a `skill` tool taking its name, or as a tool named
    # after the skill itself. Either spelling arms; a planner session invokes neither.
    arming = ARMING_SKILL in tool or (tool in SKILL_TOOLS and _mentions_arming_skill(args))
    if arming:
        if not state.get("armed"):
            state["armed"] = True
            state["armed_at"] = time.time()
            dirty = True

    elif not state.get("armed"):
        # A planner session edits and checks all day and is never policed, so there is
        # nothing worth recording — and recording it anyway would litter .telemetry/ with
        # a state file per session.
        return

    elif tool in EDIT_TOOLS:
        path = _normalise(_first(args, PATH_KEYS), payload.get("cwd"))
        if path:
            entry = state["files"].setdefault(path, {"edits": 0, "denied": 0})
            entry["edits"] = entry.get("edits", 0) + 1
            entry["locked"] = True
            entry["locked_at"] = time.time()
            dirty = True

    elif tool in SHELL_TOOLS:
        # A red check is the sanctioned reason to reopen an edited file.
        if _looks_like_failure(payload) and state["files"]:
            for entry in state["files"].values():
                if entry.get("locked"):
                    entry["locked"] = False
                    entry["unlocked_by"] = "failing-check"
            dirty = True

    if dirty:
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


def _cmd_unlock(path_arg: str, reason: str, session: str | None) -> int:
    session = session or _latest_session()
    if not session:
        print("read_guard: no active session state; nothing to unlock.")
        return 0
    state = _load(session)
    path = _normalise(path_arg)
    if not path or path not in state["files"]:
        print(f"read_guard: {path_arg} is not locked in session {session}.")
        return 0
    state["files"][path]["locked"] = False
    state["files"][path]["unlocked_by"] = "explicit"
    state["unlocks"].append({"path": path, "reason": reason, "at": time.time()})
    _save(state)
    print(f"read_guard: unlocked {path} ({reason or 'no reason given'}).")
    return 0


def _cmd_status(session: str | None) -> int:
    session = session or _latest_session()
    if not session:
        print("read_guard: no session state recorded.")
        return 0
    state = _load(session)
    locked = [p for p, e in state["files"].items() if e.get("locked")]
    denied = sum(e.get("denied", 0) for e in state["files"].values())
    print(f"session: {session}")
    print(f"armed: {state.get('armed', False)}")
    print(f"tracked files: {len(state['files'])} | locked: {len(locked)}")
    print(f"reads denied: {denied} | explicit unlocks: {len(state['unlocks'])}")
    for path in locked:
        print(f"  locked: {path}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--harness", choices=("opencode",))
    parser.add_argument("--event", choices=("pre", "post"))
    parser.add_argument("--unlock", metavar="PATH")
    parser.add_argument("--reason", default="")
    parser.add_argument("--session")
    parser.add_argument("--status", action="store_true")
    args = parser.parse_args(argv)

    if args.unlock:
        return _cmd_unlock(args.unlock, args.reason, args.session)
    if args.status:
        return _cmd_status(args.session)
    if not args.harness or not args.event:
        parser.error("--harness and --event are required unless --unlock/--status")

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
        print(f"read_guard: internal error, allowing ({exc})", file=sys.stderr)
        sys.exit(0)
