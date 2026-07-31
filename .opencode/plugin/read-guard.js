/**
 * The opencode side of the bounded-executor guard.
 *
 * The rule itself lives in `scripts/read_guard.py` — this file only carries opencode's
 * tool events to it and turns a deny into a thrown error. The `implement-order` and
 * `implement-quick` skills arm it. It blocks post-edit rereads and repair loops after two
 * failed verification runs.
 *
 * Tracked deliberately: `.opencode/` is otherwise gitignored, and an untracked rule is
 * one that silently stops applying on the next clone.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Prefer the repo venv, as AGENTS.md requires for Python-backed validation. */
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
    [join(root, "scripts", "read_guard.py"), "--harness", "opencode", "--event", event],
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

export const ReadGuard = async ({ directory, worktree }) => {
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

    // The two hooks carry `args` on opposite objects: `output.args` before the tool runs,
    // `input.args` after it. Reading `output.args` here sent the guard an empty payload for
    // every post event, so it never saw the arming skill and never locked an edited path —
    // the guard was a silent no-op for a whole telemetry cycle. `output.args` stays as a
    // fallback in case that shape changes back; an empty object is the one value that must
    // not be forwarded.
    "tool.execute.after": async (input, output) => {
      callGuard(root, "post", {
        tool: input.tool,
        sessionID: input.sessionID,
        args: input.args ?? output.args ?? {},
        output: {
          output: output.output,
          title: output.title,
          metadata: output.metadata,
        },
        cwd: root,
      });
    },
  };
};

export default ReadGuard;
