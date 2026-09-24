# Base UI migration — direction and audit record

Status: audit approach, master-plan destination, corrected record location and six-slice envelope approved. Component dispositions below remain proposals; no slice, implementation, new dependency or redesign is approved.

Source: `docs/shared-primitives-review.md` (review and recommendations, not an implementation plan).

Current planning record: [Base UI and Shared Interaction Migration](../master-plans/base-ui-migration.md). This document owns the interview evidence and proposed component dispositions; the master plan owns recommended sequencing, dependencies and slice acceptance boundaries. Neither authorizes implementation.

## Current decision summary

- **Approved:** use the A-style audit default—keep the existing interaction/layout where possible, match generic behavior to existing shared/Base UI/off-the-shelf parts, and surface genuine exceptions. Record the six-slice master-plan envelope at the corrected path above.
- **Expressed component preferences:** retain the existing ConditionPicker, LoomRail, MapLab toolbar/panel and CombatantCard arrangements. These inform the proposals; they are not integration approval.
- **Not yet approved:** the full proposed component disposition list, a selected slice or focused implementation Plan, any substantial redesign, or any new package. Base UI is already used; “no dependency selected” means no new dependency selected.
- **Remaining next decision:** confirm the proposed dispositions and choose a bounded planning outcome. Reopen only actual conflicts or exceptions, not the same A-style question for every component.
- **Compatibility interpretation:** preserve intentional feature behavior and contracts, not known accessibility omissions. Fitting menu keyboard behavior or repaired tab semantics must be explicit in later Plans; they do not justify silently changing dismissal rules, domain values or layouts.

## Goal stated by user

Plan a full migration toward Base UI, using off-the-shelf parts where possible, reducing hand-built interaction behavior and domain-specific code where possible. Produce a clear next step for each component in the review.

## Interview notes — not decisions or approvals

The user answered exploratory prompts as follows, then explicitly corrected the framing: **"There is no ... way we've decided anything yet."** Do not treat earlier answers as settled policy or as approval for any component. Revisit their application when discussing actual components.

- Interested in Base UI-backed shared controls by default while allowing justified native behavior.
- Shared primitives should have accurate generic names, never domain-specific names; no naming family has been chosen.
- Open to focused established dependencies where they remove meaningful custom work; none has been selected.
- Wanted full production UI coverage, rather than only the review's examples; at that point no inventory had been performed. The subsequent reported TSX audit is recorded below.
- Open to redesign, with specific decisions per component; no component redesign is approved.

Interview correction: stop presenting exploratory answers as global decisions. Discuss concrete components and tradeoffs before summarizing proposed migration actions for user confirmation. Case-worker choice was asked prematurely and remains unanswered; do not treat it as a prerequisite to interviewing against the supplied review.

## Latest instruction for the audit

The user chose A for `CombatantCard` and then explicitly requested automation: **assume they want the A-style answer for everything, do a full source audit, match as much as possible to Base UI/shared/off-the-shelf parts, and bring back only what cannot be matched for a decision.** This is permission to prepare proposed component dispositions without asking the same keep-the-interaction question repeatedly. It does not approve implementation, a specific dependency, or an unreviewed redesign. Use the explicit component directions already given as evidence, and flag honest exceptions/conflicts instead of forcing a match.

## Remaining decision frontier

1. Use the reported audit below as the baseline; do not rerun it merely because the earlier interview requested an inventory. It does not establish complete behavior coverage, and its excluded helpers may matter to a selected component.
2. Confirm the full proposed dispositions before implementation planning, surfacing only genuine exceptions, conflicts, missing semantics or substantial redesign choices the default cannot settle. Compatibility questions that can be answered by a bounded source check are planning work, not automatically user decisions.
3. Select a bounded outcome from the approved master-plan envelope. Later focused Plans verify current source and define exact scope and finite behavior proof. For a subsequently chosen substantial redesign, use basic HTML, then production Storybook, then explicit approval before integration.

## Luna production-source audit (read-only)

Luna screened **140 production `.tsx` modules**: 54 in `frontend/src/components/`, 71 in `frontend/src/features/`, and 15 elsewhere under `frontend/src/`. Tests, stories, the component demo, and non-TSX helpers were excluded from the counted set. This count and the mappings below come from its read-only assessment, not from a completed migration or an approved component design. It found no need to choose a new visual layout merely to propose an A-style migration, but did find semantic and lifecycle differences that a master plan must make explicit.

The count is historical reported evidence, not a newly verified inventory or a one-row-per-module ledger. Paths below are relative to `frontend/src/` and grouped by proposed disposition. “Keep” is a deliberate outcome. Before changing a selected interaction, check its current source and directly relevant helpers/callers; no fresh broad audit is required by this record.

### Shared foundation — do this before consumers

“Before consumers” means before consumers of a changed contract, not a global gate. The list also includes already-usable primitives and retain-only components; it is not an instruction to rewrite every shared component. Popover, fields/checkbox and legacy Dialog have separate acceptance boundaries. Existing Menu, Tooltip and disclosure/choice consumers can proceed independently when their APIs already fit.

- `components/form/TextField.tsx`, `TextInput.tsx`: retain meaningful generic APIs; make shared input/textarea usage coherent without blindly renaming callers. Existing `TextField` uses Base UI for its input; its textarea is native. Preserve labels, errors, disabled state, form behavior, controlled values, and styling.
- `components/form/SelectField.tsx`, `Select.tsx`: native `SelectField` and custom Base UI `Select` have different option/value contracts. Offer an appropriately named Base UI-backed choice where semantics fit; retain an explicitly justified native choice where browser behavior is intentional. Do not mass-swap value models.
- `components/form/CheckboxField.tsx`, `MultiSelectField.tsx`, `CheckboxGroup.tsx`: supply a Base UI-backed single-checkbox field and retain actual group semantics, checked values and labels. Do not use a group merely for one checkbox.
- `components/form/NumberField.tsx`, `RadioGroup.tsx`, `Toggle.tsx`, `ToggleGroup.tsx`, `Combobox.tsx`, `Autocomplete.tsx`: reuse when their interaction and data contracts fit; a numeric stepper is not a drop-in replacement for every numeric text input, and grouped rich room results are not automatically a flat Combobox.
- `components/form/DropdownParts.tsx`, `DropdownOptionContent.tsx`, `Field.tsx`, `Fieldset.tsx`, `Form.tsx`, `OtpField.tsx`, `Slider.tsx`, `Switch.tsx`: keep these generic shared parts; no mechanical feature migration for unused controls.
- Add a generally named **Base UI-backed Popover** for anchored interactive panels. `components/CalendarDate.tsx` already uses Base UI Popover with installed `react-day-picker` and retains its UTC/modal calendar behavior; do not create another calendar system.
- `components/Dialog.tsx`: migrate the legacy `open/onClose` branch's hand-built focus trap, Escape, backdrop and focus return behind its existing contract; its compound branch already uses Base UI. Preserve pending/blocked dismissal. `components/ConfirmDialog.tsx`: keep its consumer API and confirm semantics while benefiting from that migration.
- `components/Tooltip.tsx`: retain shared Base UI behavior; test `components/GlossaryTerm.tsx` against it before replacing its custom hover/focus/press/touch placement and single-open lifecycle. `components/DiceText.tsx` stays content composition.
- `components/menus/Menu.tsx`, `ContextMenu.tsx`, `Menubar.tsx`, `MenuItemContent.tsx`, `NavigationMenu.tsx`: retain shared Base UI menu pieces; use `Menu` for true actions, not settings/search panels. NavigationMenu is not a replacement for router links.
- `components/Accordion.tsx`, `Disclosure.tsx`, `Tabs.tsx`, `Button.tsx`, `IconButton.tsx`: retain and reuse for matching interactions; ordinary buttons are not drawing or drag gestures.
- `components/SearchList.tsx`: use a shared generic text input for search, retaining filtering, result metadata and selectable-button behavior rather than forcing a Combobox.
- `components/BrowserLayout.tsx`, `SplitPane.tsx`, `FloatingWindow.tsx`: keep responsive layout, persisted split/collapse, drag, resize and minimize logic; standardize only ordinary controls. `components/PageHeader.tsx`: keep layout but distinguish a static chapter marker from a real content-switching tab; correct currently incomplete tab semantics.
- `components/PreviewCard.tsx`, `Toast.tsx`, `ProgressMeter.tsx`, `ScrollArea.tsx`, `Separator.tsx`, `Avatar.tsx`, `Card.tsx`, `StatePanel.tsx`, `feedback/FeedbackCore.tsx`, `InlineFeedback.tsx`, `PageFeedback.tsx`, `PanelFeedback.tsx`: retain existing Base UI or presentation/status behavior; no interaction-system rewrite indicated.

### MapLab and dungeon components — proposed default match

- `features/dungeons/maplab/MapLabEditorChrome.tsx` and `MapLabEditorPage.tsx`: keep toolbar arrangement; replace portal positioning and generic panel lifecycle with shared Popover for searchable tool choices and View/Map settings, appropriate shared fields/toggles/buttons within. Keep drawing, tool arming, undo/redo, selection, shortcuts, and ordered Escape behavior in the editor.
- `features/dungeons/maplab/MapLabPage.tsx`: keep viewer arrangement; use interactive Popover rather than an action Menu for its persistent View settings. `MapLabViewerCanvas.tsx`: retain viewer drawing/rendering and selection, standardizing only surrounding ordinary controls.
- `features/dungeons/maplab/ViewerRoomRail.tsx`: share overlay lifecycle and search input, but retain floor-grouped rich results, selected-room behavior and focus/active-item visibility; do not flatten into the existing Combobox merely to consume it.
- `features/dungeons/maplab/FixturePropertiesForm.tsx`, `InspectorPanel.tsx`, `RoomContentEditor.tsx`, `MapLabEditorSelection.tsx`: use shared field/checkbox/select/numeric adapters where matching; retain domain mappings, disabled rules, persisted state and layout.
- `features/dungeons/maplab/MapLabToolbar.tsx`: use shared Disclosure if it preserves each tray's independent persisted collapse/default behavior; otherwise keep the existing shell and share ordinary controls.
- `features/dungeons/maplab/ConnectionsResolveList.tsx`, `RoomDetailsPanel.tsx`, `SelectionActions.tsx`, `MapLabViewerOverlays.tsx`, `DungeonShell.tsx`: keep connection/detail/routing behavior and presentation; use shared ordinary buttons where applicable and router links for navigation.
- `features/dungeons/maplab/MapLabEditorCanvas.tsx`, `MapLabViewerCanvas.tsx`, `DoorMarker.tsx`, `PortalMarker.tsx`, `PropMarker.tsx`, `StairMarker.tsx`, `GhostFloorLayer.tsx`: keep canvas geometry, pointer gestures, marker selection and drawing specialized. `MapLabRouteState.tsx`: keep status/presentation.
- `features/dungeons/DungeonBrowserPage.tsx`: keep browser, search and confirmation flow; use the shared search/field/button adapters rather than changing its feature layout.

### Encounter and Loom components — proposed default match

- `features/encounters/ConditionPicker.tsx`: see explicit provisional direction below; shared Popover and checkbox field, keep controlled selection and missing-from-list selections.
- `features/encounters/CombatantCard.tsx`: see explicit provisional direction below; shared Set HP panel lifecycle, fitting generic controls, keep quick HP and encounter rules.
- `features/encounters/CreatureRowCard.tsx`: shared Disclosure/Accordion for collapse and ToggleGroup for exclusive status if multiple-open and status behavior remain intact.
- `features/encounters/AddPlayerPanel.tsx`, `AddMonsterPanel.tsx`: keep side panels, not dialogs; reuse existing search, fields, picker and ordinary/close buttons.
- `features/encounters/EncounterBrowserPage.tsx`, `EncounterEditor.tsx`, `EncounterRunnerPage.tsx`, `EncounterRunnerBoard.tsx`, `EncounterDock.tsx`: keep encounter flows, business rules, board, reorder and floating dock; update fitting fields and ordinary controls only.
- `features/loom/LoomRail.tsx`: see explicit provisional direction below; shared Menu for overflow actions, Loom drag/drop stays separate.
- `features/loom/LoomBeatBankTray.tsx`: shared Disclosure if it preserves tray state and banked-node activation/drag guards; keep bank/restore behavior.
- `features/loom/LoomThreadManager.tsx`: adapt shared Base UI radio behavior to visual color swatches; keep thread data/CRUD and confirmations.
- `features/loom/LoomPage.tsx`: keep inspector layout, placement and Escape ownership; ordinary buttons may use shared controls.
- `features/loom/LoomNodeEditor.tsx`, `LoomSessionLogDialog.tsx`: keep forms/session behavior; migrate fitting fields and rely on shared Dialog lifecycle.
- `features/loom/LoomBeatReorderDialog.tsx`, `LoomNodeCard.tsx`, `LoomLane.tsx`, `LoomSwimlanes.tsx`: keep specialized sorting, insertion, lane transfer and drag behavior; use shared controls around it, not in place of it.
- `features/loom/LoomWeaverPanel.tsx`, `LoomErrorBanner.tsx`: keep feature actions/content, share ordinary controls as applicable.

### Other features, shell, player and map — proposed default match

- `features/items/ItemBrowserPage.tsx`, `features/loot/LootBundleBrowserPage.tsx`, `features/monsters/MonsterBrowserPage.tsx`, `features/npcs/NPCBrowserPage.tsx`, `features/players/PlayerBrowserPage.tsx`, `features/spells/SpellBrowserPage.tsx`, `features/weapons/WeaponBrowserPage.tsx`: keep browser-specific selection/details; share search and ordinary controls.
- `features/items/ItemEditor.tsx`, `features/loot/LootBundleEditor.tsx`, `features/monsters/MonsterEditor.tsx`, `features/npcs/NPCEditor.tsx`, `features/players/PlayerEditor.tsx`, `features/spells/SpellEditor.tsx`, `features/weapons/WeaponEditor.tsx`: keep validation and data mappings; migrate existing shared field adapters first, then remaining raw inputs. In particular, retain LootBundleEditor quantity behavior.
- `features/spells/DiceRollField.tsx`: compose matching shared select/text fields, retain dice parsing and formatting. `features/players/PlayerAssignments.tsx`, `features/npcs/PullFromMonsterDialog.tsx`: use shared search/checkbox controls, keep their filtering and staged selections. Extract a cross-feature assignment widget only if the contracts actually align.
- `features/npcs/AddToEncounterDialog.tsx`: retain dialog/list flow and use shared adapters; `NpcChip.tsx` retains its click action, may use Button; `NPCStatCard.tsx` and `features/monsters/MonsterStatBlock.tsx` stay stat display.
- `features/players/PlayerCombatSummary.tsx`, `PlayerSpellSection.tsx`, `PlayerWeaponSection.tsx`: use shared Disclosure/Accordion where expansion semantics match, keeping multiple-open state and domain updates.
- `features/loot/AddItemPanel.tsx`, `AddWeaponPanel.tsx`: keep sidebar composition and SearchList, share ordinary controls; do not force a Dialog or a common shell without matching lifecycle.
- `layout/AppShell.tsx`: keep router links, collapse and mobile navigation behavior; migrate ordinary buttons and shared Dialog internals.
- `pages/HomePage.tsx` + `components/PageHeader.tsx`: keep the chapter selector look and associated content, provide genuine tab/panel semantics or an accessible single-choice model according to actual association; static chapter marker remains static.
- `player/PlayerSpellbookRoute.tsx`, `PlayerSpellbookSession.tsx`: keep active-character state and layout; repair incomplete tab roles by associating content panels or using an accessible single-choice control when panel semantics do not fit.
- `player/FloorPicker.tsx`: share single-choice toggle behavior while retaining floors, labels and callback.
- `player/PlayerMapRenderer.tsx`, `PlayerShell.tsx`, `map/MapCanvas.tsx`, `PlayerVisibleMap.tsx`: keep map pan/zoom, follow, SVG and stair navigation; standardize only ordinary controls around those interactions.
- `pages/StubPage.tsx`, `router.tsx`, `main.tsx`: no primitive migration; keep placeholder, routing and entry behavior. `map/BadgeDisc.tsx`, `BadgeRing.tsx`, `markerShape.tsx`: keep display/geometry.

### Actual gaps and limits to carry into planning

1. Base UI Popover already exists in a calendar usage, but no general shared anchored-control-panel wrapper exists. It must support per-consumer dismissal and MapLab's Escape priority; do not promise one blanket outside-click/Escape rule. `CombatantCard` currently closes Set HP on Apply, Enter or retoggle and silently discards invalid input; changing those rules needs an explicit user choice.
2. The legacy shared Dialog branch needs migration independently of new popovers; pending confirmation must still prevent dismissal.
3. The existing Combobox is not a direct fit for grouped, metadata-rich room search; NumberField's stepper is not a direct fit for every numeric input. Keep these feature behaviors rather than forcing a primitive.
4. Several tab roles need associated-panel/keyboard semantics without automatically converting navigation or static headings into tabs.
5. No new package is necessary for the identified overlay/field/menu migration. A drag-and-drop library such as `@dnd-kit/core`/`@dnd-kit/sortable` is only an **evaluation candidate** for Loom/encounter drag flows; cross-lane insertion, bank/restore, pointer sorting and server order parity remain unproven. Do not add a dependency or promise replacement on this evidence alone; keep MapLab drawing out of that evaluation.

The subsequently approved master-plan envelope is: shared Popover/field/checkbox/Dialog foundation; overlays and menus; forms/search/assignments; disclosure/tabs/toggles/radio; ordinary action controls; and an **optional, separately approved** drag-and-drop evaluation. Approval covers the envelope, not every proposed component match. The master plan supplies recommended order and acceptance boundaries; focused Plans later supply exact files and finite behavior proof. No blanket lint/build/test-suite closeout.

Planning must distinguish three kinds of uncertainty:

- **Engineering fit to verify:** grouped room results, intermediate numeric values, GlossaryTerm's touch/single-open lifecycle, persistent tray state and differing assignment contracts. Reuse only when the existing behavior can be represented; keeping a specialized shell is allowed.
- **Semantics to establish from actual content:** tabs versus a single-choice control versus a static marker. Do not assume a visual tab implies a tab panel or force navigation into tabs.
- **User decisions if a change is proposed:** Set HP close/invalid-input rules, MapLab Escape priority, substantial redesign, or new dependency adoption. The default is preservation; no forced replacement is necessary to complete the audit disposition.

## Approval and record-location history

At the time of the bounded Scout lookup, `docs/MASTER_PLAN_TEMPLATE.md` was found and no existing master-plan record or conflicting Base UI master plan was reported. This is historical lookup context, not the current repository state. The template says a master plan describes destination, direction, independently selectable slices and exclusions, and **does not authorize implementation**. The user initially approved `docs/plans/active/base-ui-migration/MASTER_PLAN.md` and the following selectable envelope: (1) shared Popover/field/checkbox/Dialog foundations, (2) overlays and menus, (3) forms/search/assignments, (4) disclosure/tabs/toggles/radio, (5) ordinary action buttons, (6) optional separately approved drag-and-drop library evaluation. Master-plan writing was authorized; no slice selection, product edit, new package, or application integration was approved.

Writing attempt: the retained Luna session found a workflow constraint that the earlier Scout lookup missed: `.opencode/skills/master-plan/SKILL.md` requires master-plan targets under `docs/master-plans/`. Luna correctly stopped without writing to the originally approved `docs/plans/active/` path or silently relocating it. The user explicitly approved the corrected record path **`docs/master-plans/base-ui-migration.md`**; the six-slice envelope is unchanged. The older approved path is superseded for this master-plan record only.

## Component direction candidates — provisional, not approved for implementation

- **`ConditionPicker`** — user chose A: keep the compact summary-button and checkbox-panel interaction. Proposed next step: replace hand-managed anchored-panel lifecycle with a shared Base UI-backed Popover and ordinary checkbox controls with appropriately named shared Base UI-backed parts, while retaining controlled selection, selected values absent from the options list, and an accessible summary trigger. No redesign requested for this piece; verify dismissal, focus return, and controlled selection during a later migration. This is a component-level preference, subject to the final full-disposition confirmation.
- **`LoomRail`** — user chose A: keep the overflow action menu and its conditional Loom actions. Proposed next step: compose the existing shared Base UI-backed `Menu` instead of the manual outside-click/Escape and delayed listener registration, retain destructive-item treatment and rail drag/drop behavior, and prove keyboard/focus and click action behavior. This is a component-level preference, subject to final confirmation.
- **`MapLabEditorChrome` + `MapLabEditorPage`** — user chose A: keep the current toolbar arrangement and distinct tool/View/Map panels. Proposed next step: separate panel lifecycle/positioning into shared Base UI-backed Popover where interactive, use Menu only for genuine action menus, compose shared search, toggle, numeric, and button controls where suited; keep editor-specific tool arming, shortcuts, drawing, undo/redo, selection, and ordered Escape ownership in MapLab. Verify anchored panel dismissal, focus, tool search/selection, and that Escape continues to respect drawing/selection priority. No layout redesign requested; this is provisional, not integration approval.
- **`CombatantCard`** — user chose A: keep the compact Set HP panel, separate quick damage/heal actions, status choice chips, and existing card arrangement. Proposed next step: shared Base UI-backed Popover for Set HP, a suitable shared numeric input if its value behavior fits, shared exclusive-toggle behavior for status, and generic shared field/button controls where suited; retain encounter HP rules, controlled rename, and drag handle. The current input's validation and dismissal differences need focused proof and explicit handling, not a silent rule change. Provisional pending final disposition confirmation.

## Component facts gathered (not decisions)

These bounded checks preceded the A-style preferences above. Statements that no direction had been selected applied at the time of those checks and are superseded by the later preferences; the behavior facts remain audit evidence, subject to checking current source before implementation.

- `frontend/src/features/encounters/ConditionPicker.tsx`: a summary button opens a hand-managed checkbox panel. It accepts controlled `selected`/`onChange` values, retains selected conditions not in the available list, closes on outside click or Escape, and returns focus to the button on Escape. The checkboxes use a native-input `CheckboxField`. Bounded source check by Scout; these existing behaviors are facts, not an instruction to preserve or redesign them.
- `frontend/src/features/loom/LoomRail.tsx`: the More actions trigger opens an inline, hand-managed action menu. Items vary by node type; some are destructive, and a planned beat can offer reorder, bank, replace, and delete. There is a custom outside-click/Escape listener with a delayed registration workaround, but no keyboard menu navigation or explicit focus return. Drag/drop behavior lives elsewhere in the rail. Bounded source check by Scout; no LoomRail direction selected yet.
- `frontend/src/features/dungeons/maplab/MapLabEditorChrome.tsx` and `MapLabEditorPage.tsx`: three tool flyouts (passages, props, terrain) have searchable tool choices; View has layer and display toggles; Map has four padding inputs and a reset action. Chrome renders panels; Page owns mutually coordinated open state, separate outside-click handlers, and a prioritized Escape chain that also handles drawing and tool selection. Tool panels use a manually positioned portal. These are not all action menus: search, toggles, and numbers must remain operable. Bounded Scout read; no MapLab direction selected yet.
- `frontend/src/features/encounters/CombatantCard.tsx`: monster cards have quick damage/heal actions, a small hand-managed Set HP number-entry panel that closes only on Apply, Enter, or retoggle, and mutually exclusive pressed status buttons. Name editing is controlled; drag handle and encounter status/HP rules are separate domain interactions. Bounded Scout read; no card direction selected yet.

This record preserves the distinction between historical evidence, expressed preferences, approved planning direction and proposed component actions. Recommendations in the source review or audit do not become implementation approval through inclusion here.
