# Shared Map Badge Token — one visual system for DM and player maps

> **Status:** Stage 2 shipped — marker-only legacy presentation helpers were removed while inspector behavior and the shared DM/player audience policies remain intact.

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
| Stage 2 | Removed marker-only legacy passage presentation exports while retaining inspector descriptors and fixture presentation helpers. Focused DM/player policy regression suites passed with no audience-policy or geometry changes required. |

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
