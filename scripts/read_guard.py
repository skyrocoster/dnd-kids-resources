"""Post-edit re-read guard for the opencode work-order executor.

One waste class survived every order-side correction: an executor re-reading a file it
had just edited, to verify an edit the tool already confirmed. Orders 05 and 07 of the
Map Lab editor stage paid 2 and 3 of these; no wording in an order or a skill prevented
them, because the behaviour is a reflex rather than a decision.

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
deny stalls the order, which costs far more.

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

# Skills whose presence means "this session is a bounded implementation run".
ARMING_SKILLS = {"implement-order", "implement-quick", "browser-validation-invoke"}
VALIDATOR_CLOSEOUT_PHASES = {"APPLY CLOSEOUT", "ARCHIVE AND CLEAN", "VERIFY CLOSEOUT", "COMMIT"}
VALIDATOR_CLOSEOUT_SKILL = "coordinator-test-validator"

# Browser validation is deliberately invoke-only: the runner source must not be
# inspected by a validation session, even though ordinary maintainer sessions may
# read it.
PROTECTED_VALIDATION_PATH = "scripts/browser_validation.py"

READ_TOOLS = {"read"}
EDIT_TOOLS = {"edit", "write", "multiedit", "patch"}
SHELL_TOOLS = {"bash", "shell", "powershell", "run"}
SKILL_TOOLS = {"skill"}
SEARCH_TOOLS = {"glob", "grep", "list"}

MAX_FAILED_CHECKS = 2
ORDER_PATH_RE = re.compile(r"^docs/plans/active/[^/]+/\d{2}[^/]*\.md$", re.IGNORECASE)
VERIFICATION_COMMAND_RE = re.compile(
    r"(?:^|\s)(?:pytest|vitest|npm\s+(?:run\s+)?(?:test|lint|build)|"
    r"(?:python(?:\.exe)?\s+)?[^\s]*(?:order_check|stage_check|check_docs|check_orders)\.py|"
    r"tsc(?:\s|$))",
    re.IGNORECASE,
)

# Keys opencode uses for the path and command arguments.
PATH_KEYS = ("filePath", "path")
COMMAND_KEYS = ("command", "cmd", "script")

DENY_MESSAGE = (
    "read_guard: {path} was edited by this session and the edit succeeded. "
    "Re-reading it to confirm the edit is the one waste class wording could not "
    "remove, so it is blocked here.\n"
    "If you genuinely need it back: run the order's STOP WHEN command first — a "
    "failing check unlocks every file automatically. To override deliberately, run "
    '`python scripts/read_guard.py --unlock {path} --reason "<why>"`, which is logged.'
)

ATTEMPT_LIMIT_MESSAGE = (
    "read_guard: this bounded executor has already had two failed verification runs. "
    "Further implementation, exploration, and checks are blocked to prevent a repair loop. "
    "Stop now and report the exact failing command/output and the dirty files to the coordinator."
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
        return {
            "session": session,
            "armed": False,
            "files": {},
            "unlocks": [],
            "failed_checks": 0,
        }
    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {
            "session": session,
            "armed": False,
            "files": {},
            "unlocks": [],
            "failed_checks": 0,
        }
    state.setdefault("files", {})
    state.setdefault("unlocks", [])
    state.setdefault("armed", False)
    state.setdefault("failed_checks", 0)
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


def _arming_skill(args: dict[str, Any]) -> str | None:
    """Any string value naming the arming skill counts."""

    def walk(value: Any) -> str | None:
        if isinstance(value, str):
            lowered = value.lower()
            return next((skill for skill in ARMING_SKILLS if skill in lowered), None)
        if isinstance(value, dict):
            return next((found for item in value.values() if (found := walk(item))), None)
        if isinstance(value, list):
            return next((found for item in value if (found := walk(item))), None)
        return None

    return walk(args)


def _closeout_authorization(args: dict[str, Any], cwd: str | None) -> dict[str, Any] | None:
    """Parse only explicit validator approval and its exact repository manifest."""
    if str(args.get("validator") or "") != VALIDATOR_CLOSEOUT_SKILL:
        return None
    if args.get("coordinator_approved") is not True:
        return None
    phase = str(args.get("phase") or "").strip().upper()
    paths = args.get("approved_paths")
    if phase not in VALIDATOR_CLOSEOUT_PHASES or not isinstance(paths, list) or not paths:
        return None
    manifest = {_normalise(path, cwd) for path in paths if isinstance(path, str)}
    if len(manifest) != len(paths) or None in manifest:
        return None
    return {"phase": phase, "paths": sorted(manifest)}


def _is_verification_command(args: dict[str, Any]) -> bool:
    command = _first(args, COMMAND_KEYS)
    return bool(command and VERIFICATION_COMMAND_RE.search(command))


def _is_failure_report_edit(payload: dict[str, Any]) -> bool:
    path = _normalise(
        _first(payload.get("args") or {}, PATH_KEYS),
        payload.get("cwd"),
    )
    return bool(path and ORDER_PATH_RE.fullmatch(path))


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
    session = str(payload.get("sessionID") or "unknown")
    state = _load(session)
    if not state.get("armed"):
        return True, ""

    if tool in READ_TOOLS:
        requested = _normalise(
            _first(payload.get("args") or {}, PATH_KEYS), payload.get("cwd")
        )
        if requested == PROTECTED_VALIDATION_PATH:
            return False, "read_guard: browser-validation sessions may invoke the runner but may not read its source."
        authorization = state.get("closeout_authorization")
        if authorization and state.get("mode") == "validator-closeout":
            if requested in authorization.get("paths", []):
                return True, ""
            return False, "read_guard: path is outside the coordinator-approved validator closeout manifest."

    if state.get("failed_checks", 0) >= MAX_FAILED_CHECKS:
        if tool in EDIT_TOOLS and _is_failure_report_edit(payload):
            return True, ""
        if tool in READ_TOOLS | EDIT_TOOLS | SEARCH_TOOLS | SHELL_TOOLS:
            return False, ATTEMPT_LIMIT_MESSAGE

    if tool not in READ_TOOLS:
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
    arming = next((skill for skill in ARMING_SKILLS if skill in tool), None)
    if not arming and tool in SKILL_TOOLS:
        arming = _arming_skill(args)
    if arming:
        if not state.get("armed"):
            state["armed"] = True
            state["mode"] = arming
            state["armed_at"] = time.time()
            dirty = True

    authorization = _closeout_authorization(args, payload.get("cwd"))
    if authorization and state.get("mode") not in {"implement-order", "implement-quick"}:
        state["armed"] = True
        state["mode"] = "validator-closeout"
        state["closeout_authorization"] = authorization
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
        if _looks_like_failure(payload):
            if _is_verification_command(args):
                state["failed_checks"] = state.get("failed_checks", 0) + 1
                state["last_failed_command"] = _first(args, COMMAND_KEYS)
            if state["files"]:
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
    print(
        f"failed checks: {state.get('failed_checks', 0)}/{MAX_FAILED_CHECKS} | "
        f"attempt limit reached: {state.get('failed_checks', 0) >= MAX_FAILED_CHECKS}"
    )
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
