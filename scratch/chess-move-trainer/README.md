# ChessMoveTrainer reference copy — for future migration only

Source: `G:/ChessMoveTrainer`, copied 2026-09-23. Every file under
`frontend/` here is a byte-identical copy of the source at that date.
Nothing here was edited for this repo.

## Status: not implemented, not wired into the build

- No product code imports from this directory.
- It is not typechecked (`frontend/tsconfig.app.json` includes
  `frontend/src` only), not run by Vitest, not picked up by Storybook
  (`frontend/.storybook/main.ts` globs `frontend/src` only), and not
  bundled by Vite.
- Do not import from here. Do not move files wholesale into
  `frontend/src`. Migrate one component at a time using the steps below.

## How to migrate a component later

1. Pick one component, for example
   `frontend/src/features/design-system/overlays/Tooltip.tsx` here.
2. Copy it to `frontend/src/components/` next to the existing
   `Button.tsx` / `Tooltip.tsx`, keeping the existing plain-CSS
   colocated-file pattern (`<Name>.tsx` plus `<Name>.css`), not the
   Chess CSS-module pattern.
3. Re-point the tokens (Chess names on the left, this repo on the right):
   - `--cmt-spacing-4/8/12/16/24/32/48` → `--space-1` … `--space-7`
   - `--cmt-radius-4/8/12`, `--cmt-radius-default` → `--radius-sm/md/lg`
   - `--cmt-focus-ring-width/color/separation` → `2px solid
     var(--md-primary)` with `2px` offset, as in `Button.css`
   - `--md-sys-color-*` → the matching `--md-*` token in
     `frontend/src/theme.css`
   - `--cmt-elevation-e1/e2/e3` → `--elevation-shadow`
   - `--cmt-motion-duration-short` → `--motion-fast`
4. Keep the existing component API of this repo where one already
   exists. The already-migrated examples are
   `frontend/src/components/Button.tsx` (Base UI Button, same props and
   classes as before) and `frontend/src/components/Tooltip.tsx` with
   `frontend/src/components/Tooltip.css`.
5. Add a test in `frontend/src/components/__tests__/` in the style of
   `Tooltip.test.tsx`, and run only that test file with an explicit
   timeout, for example
   `npx vitest run src/components/__tests__/<Name>.test.tsx`.

## What is staged

Under `frontend/src/`, mirroring the source layout so relative imports
between staged files still resolve:

- `features/design-system/` — generic Base UI wrappers, each with its
  CSS module, stories, and tests where the source has them:
  - Root: `Accordion`, `Avatar`, `Button`, `CalendarDate` (plus
    `CalendarDateUtils`), `ScrollArea` / `Separator` (plus the shared
    `ContentPrimitives` CSS/stories/tests), `Disclosure`,
    `NavigationMenu`, `ProgressMeter`, `Tabs`,
    `designTokenContract.test.ts`, `themeProvenance.test.ts`.
  - `form-controls/` — `Autocomplete`, `CheckboxGroup`, `Combobox`,
    `DropdownOptionContent`, `Field`, `Fieldset`, `Form`,
    `NumberField`, `OtpField`, `RadioGroup`, `Select`, `Slider`,
    `Switch`, `TextInput`, `Toggle`, `ToggleGroup`, `private/`, both
    CSS modules, `AdvancedFormControls` and `ReusableFormControls`
    stories/tests.
  - `overlays/` — `Dialog`, `PreviewCard`, `Toast`, `Tooltip`, shared
    `OverlayPrimitives` CSS/stories/tests.
  - `menus/` — `Menu`, `ContextMenu`, `Menubar`,
    `MenuItemContent`, `menuTypes`, shared `MenuPrimitives`
    CSS/stories/tests.
  - `feedback/` — `FeedbackCore`, `InlineFeedback`, `PageFeedback`,
    `PanelFeedback`, `feedbackTypes`, each with CSS/stories/tests.
- `styles/` — Chess token reference: `cmt-tokens.css`,
  `cmt-typescale.css`, `material/`. Read-only reference for the token
  mapping above. Do not import these into the app; this repo owns
  `frontend/src/theme.css`.
- `storybook/viewports.ts` — viewport helper imported by the staged
  `CalendarDate.stories.tsx`. Included so the staged stories stay
  self-consistent as reference.
- `test-utils/QueryClientTestProvider.tsx` — Chess test helper,
  included as reference only.

## What was deliberately left behind, and why

- `features/design-system/catalogue/` — Storybook demo shells that
  compose Chess stories. Composition pattern only; nothing reusable.
- `features/design-system/line-library/` — Chess repertoire tree
  (uses `@headless-tree`, Chess domain types). Not generic.
- `features/design-system/OutcomeTrack.*` — win/draw/loss track with
  Chess-shaped props (`wins`, `draws`, `losses`). Reimplement here if
  a proportion bar is ever needed.
- `features/design-system/StorySpecimen*` — Chess Storybook specimens
  for its own token/type reviews. Not components.

## Dependencies the staged files expect

This repo already has `@base-ui/react 1.8.0`, `react 19.3.0`,
`lucide-react 1.47.0`, matching the source. These staged files
additionally expect packages this repo does not have; install only the
ones the component being migrated needs:

- `CalendarDate.tsx` needs `react-day-picker` (Chess pins `10.0.1`).
- The staged `CalendarDate.test.tsx` needs `axe-core` and
  `@chialab/vitest-axe` (Chess test-only deps).
- `test-utils/QueryClientTestProvider.tsx` needs
  `@tanstack/react-query` (Chess pins `5.103.1`).
- `themeProvenance.test.ts` reads Chess's `.storybook/preview.tsx`,
  which was not staged; treat that test as documentation of how Chess
  pins its Material theme export, not as something to run here.

## Verification

Staged with exact copies, then checked with:

- `diff -rq` of source versus staged `design-system/`: only the
  excluded paths above differ.
- `diff -rq` of `styles/` plus `diff -q` of `viewports.ts` and
  `QueryClientTestProvider.tsx`: identical.
- `git status --short`: no file under `frontend/`, `backend/`,
  `scripts/`, or `docs/` was touched by this staging.
