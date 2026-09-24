# MapLab viewer View popover - View settings stay usable and Escape dismisses one owner

> **Status:** done - viewer View Popover and ordered priority accepted.

- **Read trigger:** Read before migrating the MapLab viewer's View panel to the shared Popover or changing its dismissal, focus, or Escape handling.
- **Upstream:** [Base UI and Shared Interaction Migration](../../../master-plans/base-ui-migration.md) — OVERLAYS boundaries and proof expectations. [MapLab editor popovers](../../done/base-ui-maplab-editor-popovers/PLAN.md) is a completed separate editor-owned Plan; this Plan does not change its scope or paths. No signed-off design artifact is declared.

## Outcome

The MapLab viewer's View settings use the existing shared Popover and retain their settings, outside-press dismissal, visual layout, and mutual exclusion with the room Finder. Each Escape press dismisses only the first active viewer owner in this order: **View → finder → encounter → NPC → reset → selected**.

## Scope

- **Included:** Migrate only the viewer View panel to a controlled shared Popover. Preserve its layer and density controls, their state behavior, trigger behavior, outside-press dismissal, and current viewer styling. Keep View and Finder mutually exclusive. Preserve the viewer's ordered Escape ownership; keyboard dismissal returns focus to View's trigger, while outside-press dismissal does not steal focus from the outside target.
- **Expected edit areas:** `frontend/src/features/dungeons/maplab/MapLabPage.tsx`, `frontend/src/features/dungeons/maplab/MapLabPage.css`, `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.layout-controls.test.tsx`, and `frontend/src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx`. Read-only shared API evidence: `frontend/src/components/Popover.tsx` and `frontend/src/components/__tests__/Popover.test.tsx`.
- **Excluded:** Migrating the Finder primitive or changing `ViewerRoomRail`; editor panels, Chrome, CSS, and tests owned by the active editor Plan; map geometry, drawing, and gestures; encounter, NPC, reset, or other domain/data behavior; changes to shared Popover or dependencies; visual redesign; unrelated files and worktree changes.

## Stages

1. **pending - Migrate the viewer View panel.** Actions: (1) use the existing shared Popover with controlled View state; (2) retain all layer and density controls, labels, state behavior, and trigger behavior; (3) retain the current outside-press close path and viewer styling; (4) preserve focus ownership on keyboard close and outside press. **Proof:** run the focused command in Proof. **Escalate** if retaining the approved layout, dismissal, or focus behavior requires changing the shared Popover API or expanding into Finder or editor ownership. **Breakpoint:** none.
2. **pending - Prove mutual exclusion and ordered Escape ownership.** Actions: (1) prove opening View closes Finder and opening Finder closes View; (2) prove each Escape press dismisses only the first active owner in this order: **View → finder → encounter → NPC → reset → selected**; (3) leave encounter, NPC, reset, and selection domain behavior unchanged. **Proof:** rerun the focused command in Proof; this stage changes the viewer owner logic exercised by Stage 1. **Escalate** if preserving the order or mutual exclusion requires changing Finder's primitive, downstream domain behavior, or editor ownership. **Breakpoint:** none.

## Progress and decisions

- **Stage 1:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabPage.layout-controls.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx` passed (2 files, 45 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Viewer View controls and outside/focus contract passed; Stage 2 formal priority regression remains.
- **Stage 2:** accepted - `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabPage.layout-controls.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx` passed (2 files, 47 tests; `frontend/`, command timeout 120s, Bash tool timeout 130000 ms). Re-proved Stage 1 after test additions; mutual exclusion and one-owner-per-Escape, including NPC and Reset dialog names/roles, passed.
- **Decision:** Reuse the existing shared Popover without changing its API or adding dependencies. Finder primitive migration remains separate work.

## Proof

Run from `frontend/`. The command timeout is 120 seconds; use a 130000 ms Bash tool timeout. Run the command after each stage. A passing behavioral proof remains valid until a later change affects its command, inputs, exercised behavior, configuration, dependencies, or environment.

- **Focused acceptance:** `timeout 120s npm test -- --testTimeout=120000 src/features/dungeons/maplab/__tests__/MapLabPage.layout-controls.test.tsx src/features/dungeons/maplab/__tests__/MapLabPage.navigation.test.tsx`

Acceptance coverage must show that View controls and settings still work; outside presses close View while inside actions remain usable; keyboard dismissal returns focus to its trigger without an outside press stealing focus; View and Finder cannot remain open together; and Escape dismisses only the highest-priority active owner in the specified order.

## Escalation boundaries

- Stop and ask before changing the approved Escape order, View/Finder mutual exclusion, View dismissal or focus behavior, or visual layout; migrating the Finder primitive; changing shared Popover contracts or dependencies; touching editor-owned paths; or including map geometry, drawing, gestures, or domain/data behavior.

## Visible result

> The viewer's View settings remain usable, View and Find room never stay open together, and each Escape press closes only the current highest-priority viewer interaction.
