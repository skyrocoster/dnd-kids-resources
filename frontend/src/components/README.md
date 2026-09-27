# Shared frontend components

Reusable, feature-agnostic React components shared across pages and features. Each category directory holds one component family:

- `actions/` – buttons and icon buttons.
- `content/` – content display primitives (cards, accordions, dice text, glossary terms, separators, etc.).
- `feedback/` – inline, panel, and page feedback messages.
- `forms/` – form fields and controls (text/number/select fields, checkbox, radio, slider, switches, etc.).
- `icons/` – icon exports via `index.ts`.
- `layout/` – page and window layout primitives, including the generic `DetailRegionGrid`.
- `menus/` – menus, menubar, and context menu.
- `navigation/` – page header, navigation menu, tabs.
- `overlays/` – dialogs, popovers, tooltips, toasts, confirm dialogs, preview cards.
- `stat-block/` – generic stat-block primitives: identity, vitals, ability scores, and proficiencies. Monster-specific mapping and composition live in `features/monsters/MonsterStatBlock.tsx`, not here.
- `state/` – shared state panels and remote-state helpers.

## Tests and stories

- Component tests live in each category's `__tests__/` directory.
- Component stories are colocated next to their components and use the `Production/Design System/...` Storybook category.
- Feature and page-level stories stay with their feature, not in this directory.
