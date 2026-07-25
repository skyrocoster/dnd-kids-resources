# Collapsible Catalog Rail — every browser can give its detail view more room

> **Status:** Complete.

- **Area guide:** [Visual Design](../areas/visual-design.md)

## What we're building & why

Catalog browsers all use the same searchable list beside a detail view, but only the divider can
resize today. A shared collapse control will let the DM reclaim the list width after selecting a
record, then restore the same list without losing search, selection, scroll, or width.

The behavior belongs to BrowserLayout/SplitPane, not to Players. It ships across every existing
catalog browser so the Players roster uses an established design-language primitive rather than a
one-off menu.

## UX decisions — catalog list rail

```
Surface:      the list rail in every existing BrowserLayout surface; no new route or area-owned
              product surface is introduced.
Mode:         both. The shared shell preserves each consuming surface's declared mode.
Operator:     DM.
Focal:        the selected record's detail. Collapsing removes list competition while leaving one
              stable 48px restore control at the leading edge.
Route shape:  existing Browser routes.
Edit style:   direct layout control; collapsing never edits domain data.
Save:         collapse state and last expanded width persist as one app-wide browser preference in
              localStorage. Search, selected record, and list scroll remain mounted and unchanged.
Empty:        BrowserLayout owns no collection empty state; each SearchList keeps its existing
              exact empty copy.
Filtered empty: each SearchList keeps its existing distinct "No matches" state.
No selection: each browser keeps its existing area-specific instruction.
Load failure: each browser's existing BrowserLayout error remains visible whether the rail is open
              or collapsed.
Action failure: storage failure is silent and falls back to in-memory state; collapse still works.
Destructive:  none.
Keyboard:     the icon button is reached in DOM order and toggles with Enter/Space. The existing
              separator arrow/Home/End resize contract remains when expanded and is absent while
              collapsed.
Touch:        48px collapse/restore target. At the existing mobile breakpoint, retain the list/detail
              navigation and Back button; do not add a second collapse control.
```

## Stages

1. **Shared rail contract.** Add collapse/restore and persisted expanded width to the shared
   BrowserLayout/SplitPane composition, with labelled standard icons, focus continuity, storage
   fallback, responsive behavior, and tests for preserved child state.
2. **Catalog adoption.** Enable the shared rail across Weapons, Items, Players, NPCs, Spells,
   Monsters, Encounters, Loot Bundles, and Dungeons; verify their existing loading, empty, selection,
   resizing, and mobile detail behavior remains intact and document the shared component contract.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Shared SplitPane/BrowserLayout rail contract now supports optional collapse/restore, app-wide persisted expanded width, storage fallback, labelled icon controls, focus continuity, mobile suppression, and mounted child preservation. |
| 2 | Weapons, Items, Players, NPCs, Spells, Monsters, Encounters, Loot Bundles, and Dungeons now opt into the shared BrowserLayout list rail collapse control. Catalog regression coverage verifies each browser exposes its labelled collapse button while preserving existing route-specific loading, empty, selection, action, and detail behavior coverage. |
