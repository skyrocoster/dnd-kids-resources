# Shared primitives and Base UI review

## Decision

**Refactor selectively, not wholesale.** The frontend has useful shared components and many already use Base UI, but several production components still recreate controls, menus, popovers, disclosures, and keyboard/focus behavior. Move those repeated basics behind the existing shared primitives, adding a small shared primitive only where the current set has a real gap. Keep domain-specific layouts, drawing interactions, and business behavior custom.

This is a review and recommendation, not an implementation plan. No product code was changed for this review.

## What is already shared

`@base-ui/react` 1.8.0 is installed. Existing shared components such as `Button`, `Dialog`, and `Tooltip` are Base UI-backed; `TextField` uses Base UI Field/Input, and `MultiSelectField` uses Base UI Checkbox/CheckboxGroup. Feature code already composes shared `Dialog`, `Button`, `SearchList`, `StatePanel`, `TextField`, and `MultiSelectField` in many places. Preserve those APIs and migrate consumers incrementally.

There is an adoption gap between the newer primitives and application code. The newer `TextInput`, `Select`, `Combobox`, `Autocomplete`, `NumberField`, `CheckboxGroup`, `ToggleGroup`, `Accordion`, `Disclosure`, `Tabs`, and `Menu` wrappers are not used by production feature/page code. Instead, form code mixes the older shared field wrappers with raw controls, while some newer primitives are currently demonstrated only by their own tests/stories. The `SelectField` and `CheckboxField` wrappers still render native controls. This is not a reason to replace every native element: first settle on a small, consistent shared field API that preserves existing feature behavior.

One specific primitive gap is an anchored **popover** for panels containing controls. The shared `Menu` is appropriate for action/choice menus, `Dialog` is a dialog, and `Tooltip`/`PreviewCard` are hints/previews; none is a general replacement for an interactive toolbar popover. Add a Base UI-backed shared Popover only if it is needed to remove the repeated behavior below. Do not repurpose a tooltip or modal dialog for that job.

## Recommended refactors

### 1. Replace repeated overlay and menu mechanics

These components own their own open state, outside-click handling, Escape handling, focus restoration, or menu semantics. They should compose shared primitives rather than each maintaining those rules:

| Component(s) | Current duplication | Recommendation |
| --- | --- | --- |
| `features/encounters/ConditionPicker.tsx` | A checkbox panel implements its own outside-click and Escape listeners and restores focus manually. | Use a shared Base UI Popover for the anchored panel and the shared checkbox-group primitive (or a single-checkbox Base UI field where appropriate). This is a multi-select, so do not model it as a conventional action menu. |
| `features/loom/LoomRail.tsx` | An overflow menu reimplements outside-click/Escape dismissal and uses a delayed listener-registration workaround. | Replace the action list with the existing `components/menus/Menu` wrapper. |
| `features/dungeons/maplab/MapLabEditorChrome.tsx`, `MapLabEditorPage.tsx` | Tool flyouts, View/Map panels, and their state owner repeat portal positioning, outside-click/Escape handling, and open/close coordination. Some panels contain search inputs, toggles, or number fields and are not action menus. | Use `Menu` for actual action menus. Use a shared Base UI Popover for interactive panels; compose `Combobox`/`TextInput`, `ToggleGroup`, `NumberField`, and buttons inside as their semantics fit. Keep editor-specific tool shortcuts, undo/redo, and selection Escape behavior in MapLab. |
| `features/encounters/CombatantCard.tsx` | The “Set HP” input panel is conditionally rendered without standard outside-click/Escape/focus behavior. | Put the input in the shared Popover and use the shared numeric field only if its interaction matches the feature. Keep the custom quick-heal/quick-damage actions; they are domain actions, not a generic number stepper. |
| `components/GlossaryTerm.tsx` | It implements tooltip positioning, global dismissal, and click/hover/focus behavior itself. | Check whether the existing Base UI `Tooltip` can preserve its press/touch and single-open behavior, then route it through that wrapper rather than maintaining a second positioning system. |
| `features/dungeons/maplab/ViewerRoomRail.tsx` | A search panel manually traps Tab, handles Escape/focus restoration, and renders a search/result list. | Reuse a shared dialog/overlay foundation for the panel lifecycle. Use `TextInput` for search; evaluate `Combobox` for the result selection only if its option model can preserve grouped floors and room metadata. |

The MapLab toolbar and the condition picker are the best first cases: they have repeated lifecycle code and visibly benefit from a shared Base UI behavior layer. Add the Popover wrapper before migrating these controls; do not copy Base UI's low-level event handling into another app component.

### 2. Standardize repeated form fields

Keep current shared field APIs working while migrating the raw-control hotspots below. A small compatibility wrapper around the newer Base UI primitives is preferable to changing every feature's form code at once.

| Component(s) | Current duplication | Recommendation |
| --- | --- | --- |
| `features/dungeons/maplab/FixturePropertiesForm.tsx`, `InspectorPanel.tsx`, `RoomContentEditor.tsx`, `MapLabEditorSelection.tsx` | Many directly rendered text, number, select, textarea, and checkbox inputs. | Migrate common fields to the shared field layer. Use Base UI `Select` when a styled custom dropdown is wanted; keep a native select when its browser behavior is intentional. Reuse a shared single-checkbox field or add a Base UI-backed one; `CheckboxGroup` is for actual groups. |
| `features/spells/DiceRollField.tsx` | Two selects and a text input make up a reusable compound field. | Compose shared select/text controls and retain dice-string parsing/formatting as feature logic. |
| `features/encounters/CombatantCard.tsx`, `features/loot/LootBundleEditor.tsx` | Raw name/number inputs, including an editable HP value and quantity field. | Use shared labeled text/number fields where their API and step behavior fit. Do not replace the fixed HP adjustment buttons with `NumberField`. |
| `features/spells/SpellBrowserPage.tsx`, `features/players/PlayerAssignments.tsx`, `features/npcs/PullFromMonsterDialog.tsx`, `features/dungeons/maplab/RoomContentEditor.tsx` | Search inputs and/or checkbox lists repeat inside dialogs and panels. | Reuse shared search and checkbox controls; consider extracting the repeated searchable-assignment list only if both callers can share a stable API. |
| `components/SearchList.tsx`, `features/dungeons/maplab/ViewerRoomRail.tsx` | Shared/list search UI still renders raw search inputs. | Use the shared Base UI text input while retaining the list's feature-specific filtering, result content, and selection behavior. |

Before broad adoption, decide which public field API is canonical. `TextField` is already used and Base UI-backed; the lower-level `TextInput` has a different API. `SelectField` is a native-select wrapper while the newer `Select` is a custom Base UI dropdown with a different value/options contract. Preserve labels, validation, disabled state, form submission, styling, and keyboard behavior through adapters instead of introducing a third style of field.

### 3. Use shared disclosure, tabs, and toggle behavior where it matches

- Replace the hand-managed expansion in `features/players/PlayerSpellSection.tsx` and `features/encounters/CreatureRowCard.tsx` with `Accordion` or `Disclosure`, preserving the current multiple-open/collapsed behavior and feature styling.
- Use `ToggleGroup` for mutually exclusive pressed-state choices such as combatant status chips in `features/encounters/CombatantCard.tsx` / `CreatureRowCard.tsx` and MapLab's active tool choices where the interaction matches. Keep keyboard shortcuts and tool-placement state in the feature.
- Review the tab-like controls in `components/PageHeader.tsx`, `player/PlayerSpellbookRoute.tsx`, and MapLab's floor selector. Where they switch associated content, use the shared Base UI `Tabs` behavior. Where they navigate, use navigation semantics instead of `role="tab"`. In particular, do not leave tab roles without a tab list, panel association, and keyboard navigation.

### 4. Use shared buttons for ordinary actions

Adopt `Button` for regular feature actions and `IconButton` for icon-only actions as those components are touched. Likely candidates include buttons in `layout/AppShell.tsx`, `player/PlayerSpellbookRoute.tsx`, `player/PlayerMapRenderer.tsx`, encounter runner/cards, MapLab controls, and Loom action cards/panels. Preserve the existing feature-specific classes and pressed/drag semantics. This is lower priority than the repeated overlay and field behavior; do not mechanically replace buttons that implement map gestures, draggable handles, or other specialized controls.

The four add panels (`features/encounters/AddPlayerPanel.tsx`, `AddMonsterPanel.tsx`, `features/loot/AddItemPanel.tsx`, and `AddWeaponPanel.tsx`) should reuse shared buttons/close controls. Extract a common panel shell only if a follow-up confirms their layout and lifecycle are genuinely the same; do not force sidebar panels into `Dialog` just because it exists.

## Components that should stay specialized

No broad Base UI rewrite is recommended for:

- SVG/canvas map rendering and geometry under `src/map/` and MapLab's canvas/marker components. Their pointer, selection, and keyboard behavior is part of the map interaction model, not a generic form/menu primitive.
- MapLab editor shortcuts and domain state (tool arming, undo/redo, drawing strokes, selecting rooms/fixtures), Loom drag/reorder/lane behavior, and encounter HP/status business rules. Reuse generic controls around these actions, not in place of the rules themselves.
- `BrowserLayout`, `SplitPane`, and `FloatingWindow`. Their split resizing, persistence, drag, and minimize/resize behavior has no matching Base UI primitive in the current shared set. Their ordinary close/collapse buttons can still use `IconButton` when practical.
- Display/composition components such as `Card`, `StatePanel`, `DiceText`, stat blocks, badges, and feature-specific cards. Base UI is useful for interaction behavior; it does not require replacing domain-specific presentation with generic components.
- Existing feature editors that already compose shared `TextField`, `SelectField`, `MultiSelectField`, `Dialog`, `Button`, or `ConfirmDialog`. Migrate their underlying shared field adapter first; do not rewrite the feature form simply to import newer names.
- Native HTML controls whose native semantics are the right fit. Use Base UI where it removes custom interaction work or gives the application a needed consistent interaction, not just to wrap a single native element.

## Coverage and follow-up

The review cross-checked the production React source under `frontend/src` (shared components, layout/pages, player/map, features including MapLab, and supporting UI) against `docs/COMPONENTS.md`, excluding tests and Storybook-only examples. The inventory document is not currently complete: its dungeon/MapLab section lists only `DungeonShell`, `FixturePropertiesForm`, and `GhostFloorLayer`, while the implementation includes additional MapLab pages, panels, rails, editor chrome, and canvas/marker components. Refreshing that inventory is a separate documentation task; this review used the source tree rather than treating that list as exhaustive.

Suggested order: (1) agree on the shared field API and add the missing Popover/single-checkbox adapters if needed; (2) migrate the repeated MapLab and condition/overflow overlays; (3) move raw repeated fields and disclosure/tab/toggle patterns; (4) adopt `Button`/`IconButton` opportunistically. Preserve current APIs and add focused tests for each migrated interaction, especially dismissal, focus restoration, keyboard navigation, form submission, and controlled values.
