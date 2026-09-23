# Frontend component inventory

This document lists the React component files under `frontend/src`. It is an inventory, not a quality or accessibility audit. Names are taken from the component filenames; page components may also contain smaller inline elements.

## Shared components (`src/components`)

- `BrowserLayout` — common browse-and-detail page layout.
- `Button` — shared button.
- `Card` — shared card surface.
- `ConfirmDialog` — confirmation dialog.
- `Dialog` — dialog foundation.
- `DiceText` — renders dice notation/text.
- `FloatingWindow` — floating window surface.
- `GlossaryTerm` — glossary term display.
- `IconButton` — icon-only button with a label.
- `PageHeader` — page title and actions header.
- `SearchList` — searchable/selectable list.
- `SplitPane` — split-panel layout.
- `StatePanel` — loading, error, empty, and selection states.
- `Tooltip` — tooltip.

## Design-system primitives

These shared primitives were migrated from the read-only reference at
`scratch/chess-move-trainer/frontend/src/features/design-system/` into
`frontend/src/components/`. They use the production theme tokens in
`frontend/src/theme.css`.

- Core and content: `Accordion`, `Avatar`, `CalendarDate`, `Disclosure`,
  `NavigationMenu`, `ProgressMeter`, `ScrollArea`, `Separator`, and `Tabs`.
- Overlays: `PreviewCard` and `Toast`; `Dialog` and `Tooltip` extend the
  existing shared components while preserving their original production APIs.
- Menus (`src/components/menus`): `Menu`, `Menubar`, and `ContextMenu`.
- Feedback (`src/components/feedback`): `FeedbackCore`, `InlineFeedback`,
  `PageFeedback`, and `PanelFeedback`.
- Form controls (`src/components/form`): `Autocomplete`, `CheckboxGroup`,
  `Combobox`, `DropdownOptionContent`, `Field`, `Fieldset`, `Form`,
  `NumberField`, `OtpField`, `RadioGroup`, `Select`, `Slider`, `Switch`,
  `TextInput`, `Toggle`, and `ToggleGroup`.

## Application shell and pages

- `src/layout/AppShell.tsx` — application navigation and shell.
- `src/pages/HomePage.tsx` — home page.
- `src/pages/StubPage.tsx` — placeholder page.
- `src/pages/ComponentDemoPage.tsx` — component demonstration page.

## Player-facing experience

- `src/player/PlayerShell.tsx` — player view shell.
- `src/player/PlayerSpellbookRoute.tsx` — player spellbook route.
- `src/player/PlayerSpellbookSession.tsx` — player spellbook session.
- `src/player/PlayerMapRenderer.tsx` — map display in player view.
- `src/player/FloorPicker.tsx` — floor selection control.

## Map components

- `src/map/MapCanvas.tsx` — map canvas.
- `src/map/PlayerVisibleMap.tsx` — player-visible map view.
- `src/map/BadgeDisc.tsx` — circular map badge.
- `src/map/BadgeRing.tsx` — ring-style map badge.
- `src/map/markerShape.tsx` — map marker shape renderer.

## Feature components

### Dungeons and maps

- `src/features/dungeons/maplab/DungeonShell.tsx`
- `src/features/dungeons/maplab/FixturePropertiesForm.tsx`
- `src/features/dungeons/maplab/GhostFloorLayer.tsx`

### Encounters

- `src/features/encounters/EncounterBrowserPage.tsx`
- `src/features/encounters/EncounterEditor.tsx`
- `src/features/encounters/EncounterRunnerPage.tsx`
- `src/features/encounters/EncounterRunnerBoard.tsx`
- `src/features/encounters/EncounterDock.tsx`
- `src/features/encounters/CreatureRowCard.tsx`
- `src/features/encounters/CombatantCard.tsx`
- `src/features/encounters/ConditionPicker.tsx`
- `src/features/encounters/AddPlayerPanel.tsx`
- `src/features/encounters/AddMonsterPanel.tsx`

### Items

- `src/features/items/ItemBrowserPage.tsx`
- `src/features/items/ItemEditor.tsx`

### Loot

- `src/features/loot/LootBundleBrowserPage.tsx`
- `src/features/loot/LootBundleEditor.tsx`
- `src/features/loot/AddItemPanel.tsx`
- `src/features/loot/AddWeaponPanel.tsx`

### Loom / campaign story planning

- `src/features/loom/LoomPage.tsx`
- `src/features/loom/LoomLane.tsx`
- `src/features/loom/LoomSwimlanes.tsx`
- `src/features/loom/LoomNodeCard.tsx`
- `src/features/loom/LoomNodeEditor.tsx`
- `src/features/loom/LoomRail.tsx`
- `src/features/loom/LoomThreadManager.tsx`
- `src/features/loom/LoomWeaverPanel.tsx`
- `src/features/loom/LoomBeatBankTray.tsx`
- `src/features/loom/LoomBeatReorderDialog.tsx`
- `src/features/loom/LoomSessionLogDialog.tsx`
- `src/features/loom/LoomErrorBanner.tsx`

### Monsters

- `src/features/monsters/MonsterBrowserPage.tsx`
- `src/features/monsters/MonsterEditor.tsx`
- `src/features/monsters/MonsterStatBlock.tsx`

### NPCs

- `src/features/npcs/NPCBrowserPage.tsx`
- `src/features/npcs/NPCEditor.tsx`
- `src/features/npcs/NPCStatCard.tsx`
- `src/features/npcs/NpcChip.tsx`
- `src/features/npcs/AddToEncounterDialog.tsx`
- `src/features/npcs/PullFromMonsterDialog.tsx`

### Players

- `src/features/players/PlayerBrowserPage.tsx`
- `src/features/players/PlayerEditor.tsx`
- `src/features/players/PlayerCombatSummary.tsx`
- `src/features/players/PlayerAssignments.tsx`
- `src/features/players/PlayerSpellSection.tsx`
- `src/features/players/PlayerWeaponSection.tsx`

### Spells

- `src/features/spells/SpellBrowserPage.tsx`
- `src/features/spells/SpellEditor.tsx`
- `src/features/spells/DiceRollField.tsx`

### Weapons

- `src/features/weapons/WeaponBrowserPage.tsx`
- `src/features/weapons/WeaponEditor.tsx`

## Storybook example components

- `src/stories/Button.tsx`
- `src/stories/Header.tsx`
- `src/stories/Page.tsx`

## Counting and exclusions

The inventory includes `.tsx` files that implement or render React components. It excludes tests, route/bootstrap files, hooks, data/model utilities, and non-React `.ts` files. The `icons` directory is not expanded here; it contains the individual icon components used across the application.
