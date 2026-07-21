WORK ORDER 01 — let an area guide own more than one active plan
GOAL: `check_docs.py` accepts an `Active plan:` line listing several plans and registers every one of them, so an area can hold an active-but-not-next plan.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- `check_area_guide_contract()` in `scripts/check_docs.py` (starts line 460) builds `guide_targets: dict[Path, Path]` mapping plan -> owning guide, then verifies every active plan is pointed back to by its guide.
- Line 487 is `link = MARKDOWN_LINK_RE.search(status.group(1))` — **singular**. Only the first Markdown link on the `Active plan:` line is ever registered, so a second active plan always fails with "Owning area guide does not point back to this active plan".
- `ACTIVE_PLAN_RE` (line 73) already captures the whole rest of the line, so multiple links are available in `status.group(1)` — no regex change needed there.
- `find_active_plan_files()` (line 184) globs `docs/plans/active/*.md`, non-recursive. Unchanged by this order.
- `docs/PLAN_TEMPLATE.md` has already been updated to describe this: an area may hold several active plans, exactly one marked `(next up)`.
- `docs/areas/dungeons.md` already carries a two-plan line, and `docs/plans/active/dungeon-connections.md` is the plan currently failing. That failure is the acceptance test for this order.
- The "None." case (guide with no active plan) must keep working — nine area guides rely on it.

START IN: `scripts/check_docs.py` (function `check_area_guide_contract`, lines 460-533)

DO:
- Replace the single-link lookup with an iteration over every Markdown link on the `Active plan:` line, registering each resolved target in `guide_targets`.
- Keep the existing per-link validation: a link that does not resolve to a file under `docs/plans/active/` is still an error, reported per link so the message names which one.
- Leave the "must be None or a Markdown link" branch, the `Missing active-plan status blockquote` branch, and the second loop over `active_plans` unchanged.

STOP WHEN: `.venv\Scripts\python.exe scripts/check_docs.py --check` reports no `docs\plans\active\dungeon-connections.md` failure. (A pre-existing, unrelated `docs\DATA_MODEL.md` "Generated inventory is stale" failure is expected and is NOT yours to fix — leave it.)

STATUS: <-- executor writes DONE, or FAILED - <one-line reason>
