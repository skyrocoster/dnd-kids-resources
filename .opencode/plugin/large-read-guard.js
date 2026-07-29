/**
 * opencode half of the unbounded large-file read guard.
 *
 * The rule itself lives in `scripts/large_read_guard.py` — this file only carries opencode's
 * tool events to it and turns a deny into a thrown error. It is a deliberate copy of
 * `read-guard.js` rather than a shared abstraction: the two guards arm on different skills
 * and police opposite ends of the workflow, and one of them silently no-opping for a whole
 * telemetry cycle (see the `tool.execute.after` note in that file) is the failure mode worth
 * paying thirty duplicated lines to keep independent.
 *
 * Tracked deliberately: `.opencode/` is otherwise gitignored, and an untracked rule is one
 * that silently stops applying on the next clone.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Prefer the repo venv, as CLAUDE.md requires for Python-backed validation. */
function interpreter(root) {
  const candidates = [
    join(root, ".venv", "Scripts", "python.exe"),
    join(root, ".venv", "bin", "python"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return process.platform === "win32" ? "python" : "python3";
}

function callGuard(root, event, payload) {
  const result = spawnSync(
    interpreter(root),
    [join(root, "scripts", "large_read_guard.py"), "--harness", "opencode", "--event", event],
    { input: JSON.stringify(payload), encoding: "utf8", timeout: 10_000 },
  );
  if (result.error || result.status !== 0 || !result.stdout) {
    return { allow: true, reason: "" }; // A guard must never break the harness.
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { allow: true, reason: "" };
  }
}

export const LargeReadGuard = async ({ directory, worktree }) => {
  const root = worktree || directory || process.cwd();

  return {
    "tool.execute.before": async (input, output) => {
      const decision = callGuard(root, "pre", {
        tool: input.tool,
        sessionID: input.sessionID,
        args: output.args,
        cwd: root,
      });
      if (decision.allow === false) {
        throw new Error(decision.reason);
      }
    },

    // `args` lives on opposite objects in the two hooks: `output.args` before the tool runs,
    // `input.args` after it. The post event only needs to spot the arming skill, but it needs
    // real args to do it — forwarding an empty object is what made the sibling guard a no-op.
    "tool.execute.after": async (input, output) => {
      callGuard(root, "post", {
        tool: input.tool,
        sessionID: input.sessionID,
        args: input.args ?? output.args ?? {},
        cwd: root,
      });
    },
  };
};

export default LargeReadGuard;
