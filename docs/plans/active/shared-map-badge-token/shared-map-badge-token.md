# Shared Map Badge Token — one visual system for DM and player maps

> **Status:** Stage 1 shipped — DM and player map markers now use the shared badge renderer and geometry; Stage 2 remains to reconcile audience policy helpers and marker-only legacy presentation.

- **Areas:** design, dungeons, players
- **Read trigger:** When changing map marker badge anatomy, shared badge rendering, or the audience-specific information shown by a map token.

## What we're building & why

DM and player maps currently share badge vocabulary only partially: they use different marker anatomy, placement, sizing, and DM/player composition rules. This makes a token redesign drift between audiences and leaves the DM surface on the obsolete identity-ring-plus-status-disc treatment.

Create one shared badge-token visual implementation used by both map audiences. Keep the audience distinction in which descriptors are selected: DM remains armed-state aware, while the player map receives only the curtain-filtered armed-and-shown facts.

## Stages
1. Replace the old DM marker composition and player cue anatomy with one shared token renderer and shared visual geometry.
2. Preserve the distinct DM/player information policies, remove marker-only legacy presentation helpers, and add focused regression coverage for shared visuals and filtering.

## UX decisions — shared map badge token

Surface:      DM Map Lab session/editor markers and kid map fixture markers, owned by Dungeons and Players with shared primitives owned by Design
Mode:         play for DM session and kid map; prep for DM editor markers
Operator:     DM on Map Lab; kid on `/play/map`
Focal:        the fixture's status token; it is one bounded, icon-backed token whose stable shape, placement, sizing, and styling are shared across audiences
Route shape:  bespoke canvas marker rendering; badges are map annotations, not record-shaped surfaces
Edit style:   direct controls through the existing Map Lab inspector; this plan does not change editing behavior
Save:         no badge-local save behavior; existing Map Lab authored/session persistence remains unchanged
Empty:        no badge is rendered when no eligible status exists
Filtered empty: not applicable; marker eligibility is not a list filter
No selection: not applicable; existing Map Lab inspector owns selection state
Load failure: unchanged; existing Map Lab canvas/session failure region remains responsible
Action failure: unchanged; existing Map Lab local action-failure chip remains responsible
Destructive:  unchanged; existing Map Lab reverse-action or ConfirmDialog policy remains responsible
Keyboard:     unchanged; marker focus and inspector controls retain existing keyboard behavior
Touch:        existing Map Lab canvas-glyph exception; no new interactive badge control is introduced

## Shipped
| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| Stage 1 | DM prop, stair, portal, and door markers plus the player map cue now use the shared bounded badge renderer and geometry. Existing audience-specific status selection and curtain filtering remain unchanged. |

## Touches
- `frontend/src/map/**`
- `frontend/src/player/**`
- `frontend/src/features/dungeons/maplab/**`
- `frontend/src/map/__tests__/**`
- `frontend/src/player/__tests__/**`
- `frontend/src/features/dungeons/maplab/__tests__/**`
- `docs/DESIGN_SYSTEM.md`
- `docs/areas/dungeons.md`
- `docs/areas/players.md`

## Compiler handoff

### Stage 2
- **Verified edit sites:** `frontend/src/map/markerBadges.ts` — DM armed-state composition and player Trap/Lock precedence. `frontend/src/player/curtain.ts` — player-visible fixture filtering on armed and shown. `frontend/src/features/dungeons/maplab/maplabPresentation.ts` — legacy flat passage presentation helpers. `frontend/src/features/dungeons/maplab/InspectorPanel.tsx` and related presentation consumers — retain any non-marker inspector behavior.
- **Verified tests:** `frontend/src/map/__tests__/markerBadges.test.ts` — DM armed regardless of shown and player descriptor behavior. `frontend/src/player/__tests__/curtain.test.ts` — player field-removal and armed/shown disclosure contract. Existing Map Lab marker suites cover multiple-status collapse and DM visibility.
- **Settled contracts:** DM displays armed Concealment, Lock, and Trap regardless of `shown`; multiple active DM statuses collapse to one multiple-status token. Player displays only curtain-filtered armed-and-shown Trap/Lock facts, with Trap precedence. The player renderer remains presentation-only and relies on the curtain. Remove only marker-only legacy helpers; retain helpers needed by inspector prose/chips.
- **Constraints:** Preserve Loot as DM-only, concealment removal at the curtain, accessibility labels enumerating collapsed states, and the existing shared obstacle inspector's independent Armed/Shown controls. Update canonical design/area references during reconcile if their current marker anatomy statements change.
- **Open questions:** `to-orders` must identify which legacy helpers are marker-only and confirm the exact focused test command for the final touch set.
