# Documentation Inventory — D&D Kids Resources

Authority: **Canonical** documents define current contracts. **Working** documents direct planned work. **Historical** documents record prior analysis or decisions and are not active facts. **Redirect** documents preserve links to moved material. **Template** documents define required form.

## Document Inventory

| Document | Type | Authority | Status | Read trigger | Update trigger |
|---|---|---|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Reference | Canonical | Active | Folder layout, request flow, registration, or conventions | A structural convention, route tree, or shared architecture changes |
| [API_REFERENCE.md](API_REFERENCE.md) | Reference | Canonical | Active | API methods, paths, parameters, schemas, or responses | An API contract changes |
| [DATA_MODEL.md](DATA_MODEL.md) | Reference | Canonical | Active | Tables, relationships, seeds, JSON storage, or database rebuilds | DDL, seed shape, importer, or exporter changes |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Reference | Canonical | Active | Shared tokens, icons, visual primitives, or accessibility | A shared design contract changes |
| [UX_PATTERNS.md](UX_PATTERNS.md) | Reference | Canonical | Active | Surface modes, route shape, data/error states, saving, destructive actions, or keyboard | An interaction contract changes, or a rule moves from TARGET to IN FORCE |
| [TESTING.md](TESTING.md) | Reference | Canonical | Active | Commands, fixtures, coverage, or test locations | A test command, fixture topology, coverage gate, or CI contract changes |
| [README.md](README.md) | Manifest | Canonical | Active | Routing a task or locating documentation | Documentation inventory, routing, or plan status changes |
| [PLAN_TEMPLATE.md](PLAN_TEMPLATE.md) | Template | Canonical | Active | Creating, executing, or closing a plan | Plan execution or lifecycle requirements change |
| [TABLE_TESTING.md](TABLE_TESTING.md) | Reference | Canonical | Active | Running or recording a real session at the table, the record format, or its lifecycle | The table-test format, lifecycle, standing questions, or checks change |
| [table-tests/](table-tests/) | Record set | Historical | Active | Tracing what a real session at the table taught us | Append a new record per session; frozen once folded in |
| [Analysis/README.md](Analysis/README.md) | Archive index | Historical | Active | Tracing analysis or decision provenance | Analysis/archive organization changes |
| [Analysis/seed_spells_analysis.md](Analysis/seed_spells_analysis.md) | Analysis | Historical | Complete | Spell migration provenance | Do not update; add a new analysis if needed |

### Area guides and plans

Generated from each document's own `**Read trigger:**` and Status line — do not hand-edit.

<!-- GENERATED:INVENTORY:AREAS_AND_PLANS:START -->
| Document | Type | Authority | Status | Read trigger | Update trigger |
|---|---|---|---|---|---|
| [areas/design.md](areas/design.md) | Area guide | Canonical | - | Shared UI, tokens, shell, or accessibility | Design ownership, source map, or active work changes |
| [areas/dungeons.md](areas/dungeons.md) | Area guide | Canonical | - | Dungeon behavior | Dungeons ownership, source map, or active work changes |
| [areas/encounters.md](areas/encounters.md) | Area guide | Canonical | - | Encounter behavior | Encounters ownership, source map, or active work changes |
| [areas/infra.md](areas/infra.md) | Area guide | Canonical | - | Shared backend infra, documentation governance, or repo-wide test tooling | Infra ownership, source map, or active work changes |
| [areas/loom.md](areas/loom.md) | Area guide | Canonical | - | Story-thread (Loom) behavior | Loom ownership, source map, or active work changes |
| [areas/players.md](areas/players.md) | Area guide | Canonical | - | Player records, recovery profiles, player rosters, or the kid app | Players ownership, source map, or active work changes |
| [areas/reference.md](areas/reference.md) | Area guide | Canonical | - | Spells, weapons, items, or loot | Reference ownership, source map, or active work changes |
| [Map Obstacle State - authored baselines and one persisted run overlay](plans/active/map-obstacle-state/map-obstacle-state.md) | Plan | Working | Stage 2 shipped — sparse session persistence, authoring-aware pruning, monotonic layout counters, legacy-layout normalization, and editor loading coverage are live. | Map fixture concealment, locks, traps, DCs, shown state, session overrides, player-map obstacle badges, the Map Lab inspector, or removal of map knowledge and player preview | A stage ships, or its scope or settled decisions change |
| [Production Nightly Deploys — ship every night without losing what you authored](plans/active/production-nightly-deploys/production-nightly-deploys.md) | Plan | Working | Part of Stage 1 has already shipped out of band — see *Landed early* below. | Schema generation, database migrations, or the deploy path | A stage ships, or its scope or settled decisions change |
| [Table Testing Records — real sessions become a comparable, checked record](plans/active/table-testing-records/table-testing-records.md) | Plan | Working | Stages 1–2 shipped — the format is documented in `docs/TABLE_TESTING.md`, and the workflow now produces records by default: `PLAN_TEMPLATE.md` teaches the `**Table test:**` stage line, `to-orders` stops session-run orders at a record, and Player App Skeleton Stage 6 demonstrates the shape. | Recording a real session, the table-test format, or its lifecycle and checks | A stage ships, or its scope or settled decisions change |
| [Area Context Refactor — Keep AI context scoped by ownership](plans/done/area-context-refactor/area-context-refactor.md) | Archived plan | Historical | Complete | Area-scoped context refactor history | Never — archived record |
| [Backend Test Coverage — close the gap toward 100%](plans/done/backend-test-coverage/backend-test-coverage.md) | Archived plan | Historical | Complete | Backend coverage gap-closing history | Never — archived record |
| [Collapsible Catalog Rail — every browser can give its detail view more room](plans/done/collapsible-catalog-rail/collapsible-catalog-rail.md) | Archived plan | Historical | Complete | Shared BrowserLayout list collapse and catalog rail adoption history | Never — archived record |
| [Dark Mode Design Plan — Material Design 3](plans/done/design-system-dark-mode/design-system-dark-mode.md) | Archived plan | Historical | Complete | Design-system migration provenance | Never — archived record |
| [Design Plan — Cross-Cutting Site Chrome & Tooling](plans/done/design_plan/design_plan.md) | Archived plan | Historical | Complete | Shared-design implementation history | Never — archived record |
| [Docs Restructure — make routing cheap enough that an AI stops exploring](plans/done/docs-restructure/docs-restructure.md) | Archived plan | Historical | Complete | Documentation routing restructure, area cuts, plan folder layout, manifest shape, or source-map coverage history | Never — archived record |
| [Plan Closeout Correction](plans/done/documentation-plan-closeout-correction/documentation-plan-closeout-correction.md) | Archived plan | Historical | Complete | Plan closeout correction history | Never — archived record |
| [Plan Template Workflow Update](plans/done/documentation-plan-template-workflow/documentation-plan-template-workflow.md) | Archived plan | Historical | Complete | Plan-template workflow history | Never — archived record |
| [Documentation Rework Plan: AI Signposting and Continuous Upkeep](plans/done/documentation_rework_plan/documentation_rework_plan.md) | Archived plan | Historical | Complete | Documentation-contract implementation history | Never — archived record |
| [Dungeon Connections — dungeons link to each other, and a session survives the walk between them](plans/done/dungeon-connections/dungeon-connections.md) | Archived plan | Historical | Complete | Permanent session state, optional portal destinations, the connections resolve list, and cross-dungeon gateways implementation history | Never — archived record |
| [Dungeon Outside — the world around the rooms becomes real, authored map space](plans/done/dungeon-outside/dungeon-outside.md) | Archived plan | Historical | Complete | Wall kinds, padding, outside features, and map layer/density controls implementation history | Never — archived record |
| [Dungeon Feature - Map Lab Cutover Plan](plans/done/dungeon_plan/dungeon_plan.md) | Archived plan | Historical | Complete | Dungeon implementation history | Never — archived record |
| [Encounters Feature — Expansion Plan](plans/done/encounters_plan/encounters_plan.md) | Archived plan | Historical | Complete | Encounter implementation history | Never — archived record |
| [Generated Documentation — the docs a script can derive stop being written by hand](plans/done/generated-documentation/generated-documentation.md) | Archived plan | Historical | Complete | Generated documentation blocks, the `GENERATED:` marker mechanism, what `--write-generated` refreshes, or whether a doc section should be hand-written at all | Never — archived record |
| [Glossary term tooltips — hover/tap explanations for rule terms in rendered text](plans/done/glossary-term-tooltips/glossary-term-tooltips.md) | Archived plan | Historical | Complete | Glossary term tooltips, rule-term explanations in rendered text | Never — archived record |
| [Kid Map Legibility — the tablet map reads from a child's seat](plans/done/kid-map-legibility/kid-map-legibility.md) | Archived plan | Historical | Complete | Kid map contrast history, the shared `roomLabelAnchor`, or why the legibility diagnosis was wrong | Never — archived record |
| [Kid Map Viewer — the tablet gets the DM's map, and colour a child can say out loud](plans/done/kid-map-viewer/kid-map-viewer.md) | Archived plan | Historical | Complete | How the kid map draws rooms, doors, stairs, markers and names; the shared map canvas; the curtain's per-field visibility; the kid colour families and their solver; the party marker; room label placement in either app | Never — archived record |
| [Loom Beat Reorder Plan — Drag-to-Reorder Story Beats](plans/done/loom-beat-reorder/loom-beat-reorder.md) | Archived plan | Historical | Complete | Drag-to-reorder story beats history | Never — archived record |
| [Loom Campaign Progress UI — keep campaign advancement visible and the tapestry readable](plans/done/loom-campaign-progress-ui/loom-campaign-progress-ui.md) | Archived plan | Historical | Complete | Loom board/inspector campaign-progress UI patch history | Never — archived record |
| [The Loom: Fell Line — rebuild the tapestry as a session grid](plans/done/loom-fell-line/loom-fell-line.md) | Archived plan | Historical | Complete | Loom fell-line rebuild history | Never — archived record |
| [Freeform Tapestry — rearrange the loom by hand, on a canvas that survives zoom](plans/done/loom-freeform-tapestry/loom-freeform-tapestry.md) | Archived plan | Historical | Complete | Freeform tapestry implementation history | Never — archived record |
| [Loom Storyline Refactor — From Flat DAG to Ordered Threads](plans/done/loom-storyline-refactor/loom-storyline-refactor.md) | Archived plan | Historical | Complete | Loom storyline refactor history | Never — archived record |
| [Loom Swimlanes Redesign](plans/done/loom-swimlanes-redesign/loom-swimlanes-redesign.md) | Archived plan | Historical | Complete | Loom swimlanes redesign history | Never — archived record |
| [The Loom — Tapestry Story-Thread Tracker](plans/done/loom-tapestry-tracker/loom-tapestry-tracker.md) | Archived plan | Historical | Complete | Loom tapestry tracker implementation history | Never — archived record |
| [The Loom — Weaver's Workspace (UI/UX Pass)](plans/done/loom-weavers-workspace/loom-weavers-workspace.md) | Archived plan | Historical | Complete | Loom UI/UX pass implementation history | Never — archived record |
| [Loot System — Plan Doc](plans/done/loot_plan/loot_plan.md) | Archived plan | Historical | Complete | Loot-system implementation history | Never — archived record |
| [Map Lab Editor Usability — the map fills the screen, and every tool is reachable](plans/done/maplab-editor-usability/maplab-editor-usability.md) | Archived plan | Historical | Complete | Map Lab tool palette and flyouts, editor vertical layout, fit/zoom framing, viewer rail, or rooms with no squares | Never — archived record |
| [Map Lab UX Pass — a calm, touch-first editor and viewer](plans/done/maplab-ux-pass/maplab-ux-pass.md) | Archived plan | Historical | Complete | Map Lab editor/viewer chrome, gestures, brushes, undo, or tablet-layout history | Never — archived record |
| [Monsters — Data Restructure & Stat-Block Redesign](plans/done/monsters_plan/monsters_plan.md) | Archived plan | Historical | Complete | Monster implementation history | Never — archived record |
| [NPC Statblocks — NPCs gain a combat half, built by pulling fields from monsters](plans/done/npc-statblocks/npc-statblocks.md) | Archived plan | Historical | Complete | NPC statblock shape, monster pull panel, and add-to-encounter history | Never — archived record |
| [Phase E Recovery Plan — restore Map Lab zoom/unified-data after a commit accident](plans/done/phase-e-recovery-plan/phase-e-recovery-plan.md) | Archived plan | Historical | Complete | Rebuild recovery history | Never — archived record |
| [Player App Skeleton — a tablet at the table showing the live dungeon map](plans/done/player-app-skeleton/player-app-skeleton.md) | Archived plan | Historical | Complete | The `/play` shell, the import rule, the fog and curtain seams, or how the kid map first reached a table | Never — archived record |
| [Player Map Knowledge — the DM controls each fact the party has learned](plans/done/player-map-knowledge/player-map-knowledge.md) | Archived plan | Historical | Complete | Reversible per-fact disclosure, the map knowledge document, inspector selection, or the DM's player-result preview | Never — archived record |
| [Player Spellbook Recovery — fast playtime spell reference backed by recoverable character records](plans/done/player-spellbook-recovery/player-spellbook-recovery.md) | Archived plan | Historical | Complete | Player recovery data, spell-first reference, or character assignments | Never — archived record |
| [Seed Pipeline Fix Plan — Export/Import Consistency](plans/done/seed_pipeline_fix_plan/seed_pipeline_fix_plan.md) | Archived plan | Historical | Complete | Seed-pipeline repair history | Never — archived record |
| [Spells - Data Restructure & Experience Rewire](plans/done/spells_plan/spells_plan.md) | Archived plan | Historical | Complete | Spell implementation history | Never — archived record |
| [UX Patterns — give the repo one design skill and a reference for how the app behaves](plans/done/ux-patterns/ux-patterns.md) | Archived plan | Historical | Complete | UX reference and design-skill replacement history | Never — archived record |
| [D&D Kids Resources — v2 Rebuild Plan (staged)](plans/done/v2-rebuild-plan/v2-rebuild-plan.md) | Archived plan | Historical | Complete | v2 rebuild history | Never — archived record |
| [Validated Reference Text — concise rules can safely resolve character values](plans/done/validated-reference-text/validated-reference-text.md) | Archived plan | Historical | Complete | Validated placeholders, spell quick rules, extensible reference text, or Spell detail player assignment history | Never — archived record |
| [Visual Consistency Plan — Cross-Cutting Aesthetic Remediation](plans/done/visual-consistency/visual-consistency.md) | Archived plan | Historical | Complete | Visual consistency remediation history | Never — archived record |
| [Weapon Quick Reference — every weapon explains the exact roll before the long rules](plans/done/weapon-quick-reference/weapon-quick-reference.md) | Archived plan | Historical | Complete | Weapon quick rules, sheet-ready attacks, or Copy as New | Never — archived record |
<!-- GENERATED:INVENTORY:AREAS_AND_PLANS:END -->

## Entry Points

| File | Role |
|---|---|
