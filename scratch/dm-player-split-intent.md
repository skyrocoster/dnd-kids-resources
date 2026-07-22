# DM / Player Split — Statement of Intent

**Status:** Grilling complete at the level of intent. No plan written, no work orders, no stages.
**What this is:** the settled direction, the reasoning behind it, and the branches still open. It is
the document a plan gets written *from* — expect to break it into several plans, and to re-grill the
open branches before any of them are written.
**What this is not:** a plan. There are no stages, no ordering, no estimates, and several decisions
here are explicitly provisional pending playtest.

---

## Grounding facts (verified in code)

These are the things that already exist. Much of what follows is less new construction than it
appears, because the data model has been quietly heading this way for a while.

- **The viewer/editor split already exists structurally.** `/dungeons/:dungeonId` renders
  `MapLabPage`; `/dungeons/:dungeonId/edit` renders `MapLabEditorPage`; both sit under a shared
  `DungeonShell` (`frontend/src/router.tsx:41-48`). We are not inventing a split — we are deciding
  what the existing viewer becomes.
- **Concealment is already modelled.** `PassageFlags` is
  `{ hidden, locked, trapped, breakDc, pickDc, hiddenDc, note }` and is already shared by doors,
  stairs, props, and portals (`maplabModel.ts:46-56`, and the `extends PassageFlags` on `MapDoor`,
  `MapStair`, `MapProp`, `MapPortal`). The model already knows what a secret is. Nothing currently
  acts on it for an audience.
- **Party-shared, server-persisted session state already exists.** `map_session_state` is a
  per-dungeon JSON blob (`backend/app/routers/session_state.py`) holding door/stair/portal toggles,
  with a `DELETE` that resets to authored defaults. `useMapLabSessionState.ts` write-throughs on
  every change, no debounce.
- **Authored truth plus session overlay is an established pattern.** `effectivePassageState(flags,
  session)` merges them, with documented precedence and independent axes — a locked+trapped door can
  be unlocked while the trap stays armed (`maplabModel.ts:598-625`).
- **The map is an absolute square grid.** `MapRoom.cells` is a cell list relative to an origin;
  `MapFeature.cells` is an absolute cell list explicitly allowed to be disconnected with no adjacency
  requirement (`maplabModel.ts:33-42`, `120-128`). `MapLayoutMeta` carries `cellSizeFt` and a
  `padding` margin of already-modelled unknown space. **A fog layer is the same shape the model
  already ships twice.**
- **A room is already a knowledge record, not just a rectangle.** `DungeonRoom` carries
  `npcs: number[]` plus typed `entries` — feature, encounter, monster, trap, treasure, npc, trick,
  door (`dungeonModel.ts:60`, `RoomContentEditor.tsx:20-36`).
- **Nav is 10 destinations across 3 sections** — Reference (Spells, Monsters, Weapons), Campaign
  (Players, NPCs, The Loom, Encounters, Dungeons), Loot (Items, Loot Bundles)
  (`layout/navSections.ts`).
- **Player records exist and are thin.** `seed_players.json` holds Pip and Lark, both level 1
  Wizards. `player-spellbook-recovery.md` is the active plan that fattens them.
- **`docs/adr/` does not exist yet**, despite CLAUDE.md referencing it. There is an untracked
  `docs/plans/active/docs-restructure.md` in flight.

---

## The campaign this serves

This is not a generic feature. It only makes sense against the campaign being run, and every
decision below is downstream of it.

The players are **four and six years old**. The four-year-old is only beginning to read; the six-year-old
reads fluently. Sessions are about a week apart.

The kids are students at a school — think Hogwarts. They spend most of their time inside it, and
they return to it constantly, session after session, over months. It is riddled with secrets: a
hidden door, a hidey-hole in a wall, a false bottom in a drawer. They will want to refer back to
those discoveries weeks later.

**They are too young to keep notes.** That is the whole problem. A six-year-old will not maintain a
map, will not write down which corridor the locked door was on, and will not remember which teacher
they found in which room three sessions ago. Without something holding that for them, every
discovery evaporates and exploration stops compounding.

And the horizon is shorter than "weeks". A locked chest found at 6:15 is gone by 7:15. The memory
problem is *within* a session as much as between sessions.

There is a second problem underneath it: **kids struggle to visualise connected space.** Dungeon
crawling asks you to hold a mental model of rooms joining rooms, and that model is exactly what
young players don't yet build easily. Without it, a dungeon is a sequence of disconnected scenes
rather than a place.

So the app becomes their memory, and the memory is keyed to place.

But it has to be an *honest* memory. If the map simply showed the whole school, they could point at
the far side and say "there's a kennel of dogs over there, let's go" — knowledge the fiction never
gave them. That is metagaming, it is constant with kids, and it is corrosive to the game. So the map
must only ever contain what they earned.

---

## Principles

These are the load-bearing sentences. When a later decision is unclear, decide it by these.

### The binder holds state. The app holds reference. The DM holds the ruling.

Physical materials track what has *happened*: HP, spell slots spent, loot collected, the battle grid
drawn on the table. The app holds the large, rule-bound, semi-regularly-changing body of *content*
that paper cannot keep current — the spell texts, the weapon rules, the dungeon and everything
learned about it.

This is the cleanest boundary in the whole design and it should be defended. The moment the app
starts tracking spell slots or hit points, it competes with the binder, and the binder wins because
it is faster and the kids already trust it.

The third clause matters as much as the first two: **the app informs, it never adjudicates.** The
rules at this table are deliberately loose — no class restrictions, no levels, no casting-range
rules — because loose rules are what make 5e playable for a four-year-old at all. A system that
knows the rules will hold the DM to them at exactly the moment they need breaking. It also removes
the fudge that keeps an evening recoverable when the mood or the difficulty was misjudged.

### The map is the party's memory.

Not a battle map — combat happens on the table. Not a floorplan — that is the DM's concern. It is
the record of where they have been, what they found there, and how it all connects. It exists
because the kids cannot keep that record themselves.

### The table is where the game is played. Screens are where it is consulted.

A screen can be genuinely *better* at something and still be excluded, because that something is
play. A virtual battle map wins on capability — dynamic lighting, line of sight, automatic fog — and
is excluded anyway, for three reasons that have nothing to do with capability:

- **Tactile.** Physically moving your own figure, which is researched as mattering for children.
- **One shared object.** Everyone attends to the same thing, rather than each to their own screen
  with their own token on it.
- **Dice in the open.** The roll happens in the room, in real time, where everybody sees it.

The argument in one sound: *a child sees the DM's hand move toward the monster beside their figure
and gasps, before a word is spoken.* That does not exist in a VTT — which was tried, and failed
because the children became spectators watching the DM operate the game.

So excluding position tracking is **enforcement, not restraint**. Build a good enough digital
position tracker and the table quietly stops being where the game is.

The same test is what *permits* the encounter tracker on a screen: monster HP and initiative order
are DM bookkeeping, not the children's shared experience, and mid-fight changes are expensive on
paper and cheap on screen.

### Fog is an information ratchet, not atmosphere.

Fog of war here is not about tension in the moment. It is the mechanism that makes knowledge
diegetic. A room enters their reference material only once the fiction put them in it. This is the
single most important behaviour in the design, and several decisions below exist purely to protect
it.

### Time-to-answer is the metric.

The kids pick the device up when they are making a decision and put it down once it is made. They
are not authoring, browsing, or playing with it. Any kid-facing screen that takes more than a couple
of taps to answer a question has failed, however good it looks.

### Read-only, forever.

Nothing on the player side writes. Every mutation of shared truth happens on the DM's device. This
is not a limitation to be lifted later — it is the constraint that keeps the entire distributed
design cheap, and it is a deliberate reflection of how the table actually works.

---

## Settled shape

### Two devices, one backend

The kids have a tablet. The DM has a laptop. Both talk to the same backend. This is the expensive
option and it was chosen with that understood — the cheaper alternatives (one screen toggling
between modes, or a cast view pushed to a TV) were rejected because they cannot give each kid their
own thing.

### The kid app is a different app, not a filtered one

Player mode is **not** the DM app with destinations hidden. It has its own small navigation,
designed from scratch for a child, and it happens to read the same database.

The reasoning:

- **Filtering would hide more than it shows.** Six of the ten current destinations have no business
  on a kid's tablet. When most of a thing is deleted, you have not built a mode — you have built a
  different product wearing the first one's clothes.
- **Filtering is a permanent tax.** Under a filtered model, every DM feature added from now until
  forever carries the question "and what does a kid see?" Under a separate app, the answer is
  "nothing, unless we deliberately put it there." **Default-off is the only version of this that
  stays affordable.**
- **Kid-specific means differently shaped, not less.** A spell for a six-year-old is not the DM's
  spell row with the edit button removed. It is a card, one spell at a time, with the quick-rules
  line as the headline rather than a subtitle. You cannot reach that by filtering, because the
  components are genuinely different.

**What is shared is the API and the data, not the components.** Both sides read the same `Spell`,
the same validated reference text, the same quick rules. Any *derived* text — a resolved quick-rules
line, a computed description — is produced in one place so the two faces of it cannot drift.

### One build, enforced by convention

One Vite app, one deploy, one `router.tsx`. `/play/*` mounts a completely different shell.

```
frontend/src/
  features/          ← DM app, unchanged
  player/            ← kid app: own shell, own nav, own components
    PlayerShell.tsx
    map/  spells/  gear/
  api/               ← shared: client, types
  theme.css          ← shared: tokens
```

**The rule: `player/` may import from `api/` and `theme.css`, and nothing else.** No reaching into
`features/`. One line, greppable, and it gives the discipline of separate builds at the price of a
convention.

Two separate builds were rejected. The only thing they buy is a smaller kid bundle, which is
irrelevant on a local tablet on local wifi. What they cost is a shared package to version, two build
pipelines, two test configs, two dev servers running during a session, and every shared type change
touching three places — against a docs contract, `check_docs.py`, and CI all built around one
frontend.

### The switch is an address, not a button

The kid device is pointed at `/play` once and stays there. **Player mode has no affordance to
leave.** Getting to the DM app means typing a URL.

This is not security. The threat model is not a determined attacker; it is a bored six-year-old with
thirty seconds. And the argument against a visible toggle is not that it could be defeated — it is
*temptation design*. A "DM mode" button on a kid's tablet is an invitation, and the ratchet is a game
being played *with* them. Removing the button is not locking a door; it is not putting a door there.

This is also the same decision as "separate app" expressed a second way. The kid app is not a mode
flag inside the DM app; it is a different app at a different address, and either can diverge as far
as it needs to without carrying the other's baggage.

### Liveness: polling, one-way

The kid device re-fetches every few seconds while a screen is open. No websockets, no server push, no
new infrastructure.

At a table with two kids, the difference between "instant" and "a few seconds" sits inside the noise
of the DM narrating what just happened. And polling stays cheap *only because the data flows one
way*: with no writes from the tablet there are no conflicts, no merges, no ordering problems. If live
push is ever wanted, it is a swap behind the same read model.

### Concealment is a curtain, not a wall

The tablet fetches the same data the DM fetches, and the kid app chooses to draw less. No sanitising
endpoints, no player-facing API surface.

This was decided pragmatically — nobody is leaking a screenplay here — and it is the right call.
But it carries one real risk, and the mitigation is cheap enough that it should be treated as part
of the decision:

**One curtain, not many.** A single module takes the full layout plus the fog and knowledge state
and returns the player-visible layout. Every kid-facing component consumes *only its output* and
never touches raw dungeon data.

The failure mode this prevents is not a kid with devtools; it is ordinary carelessness. A field gets
added to props, a kid-facing panel spreads an object for convenience, and a trap flag appears on a
tablet mid-session. That will not be caught by tests, because tests assert what is shown, not what
is absent. Funnelling everything through one transform means the concealment logic exists in exactly
one place and cannot rot component by component — and it means the DM's "what they can see" preview
can call the same transform and be *literally* correct rather than approximately.

---

## Identity

### Ambient, switchable, loud

The device knows which kid is holding it. Entering the personal parts of the app, it is Pip until
someone says otherwise, with the name visible at all times and one tap to swap to Lark. No login —
a profile picker, the pattern kids already know from every console and streaming service.

The device is shared, so switching must be fast and frictionless. A momentary model — asking "whose
spells?" each time — was considered and rejected: fine with two kids and two pages, annoying the
moment there is a third personal surface, and it gives up the thing that matters most.

**Ambient identity makes the personal zone feel owned.** "Pip's Spells", with Pip's name at the top,
is a different emotional object from a spell list that happens to be filtered. Kid-specific features
are not only about reducing complexity; ownership is one of them.

The cost is stale identity — Lark picks up the tablet, sees Pip's spells, does not notice. That is
mitigated by design rather than logic: a large, per-character-coloured badge that is hard to miss.
This is a visual-design problem the project is already equipped for, via `theme.css` and the MD3
custom-colour and harmonisation standard.

### Identity is a filter, not stored state

Because the player side never writes, identity stores nothing. It selects which spells and which
gear to show. That is all. This keeps profile-switching genuinely free — there is no state to
migrate, flush, or reconcile when the tablet changes hands.

### The player side has two zones

This is the structural consequence of a shared device, and it should be treated as a first-class
distinction:

- **Party-shared zone — the map.** Identity-free. One truth for everyone. A shared device is fine
  here because nothing on screen is personal. There is no position tracking; the map records
  *information*, which is shared by nature.
- **Personal zone — spells, gear.** Needs to know who is holding the tablet.

An open question worth settling later: whether the map should even display the identity badge, or
whether the shared screen stays visibly, deliberately shared.

---

## The knowledge model

This is the heart of the design and the part most worth getting right, because everything the kids
experience runs through it.

### Two axes, and they behave differently

```
VALUE       — what is true                 — toggles BOTH WAYS
              locked ⇄ unlocked, trap armed ⇄ disarmed, door open ⇄ shut
              → existing session state. Already built.

KNOWLEDGE   — what the party has learnt    — RATCHETS FORWARD ONLY
              exists · is lockable · is trapped · has been searched · contents
              → new.
```

A door gets unlocked, and later re-locked. But the kids never *un*-learn that it is a door with a
lock on it. Value oscillates; knowledge accumulates.

This is why bolting a "hidden" bit onto each flag feels awkward — concealment is not a property *of*
a flag, it is a second axis crossing all of them. Rather than `TRAPPED` + `TRAPPED_HIDDEN` +
`LOCKED` + `LOCKED_HIDDEN`, there is one set per object of **what the party knows about it**, where
*existence* is simply one of the knowable things rather than a special case.

```
Door 14
  DM truth:    hidden ✓   locked ✓   trapped ✓   pickDc 15
  Party knows: exists ✓   lockable ✓  trapped ✗      ← they tried it and felt the lock,
                                                       but never spotted the needle
Kid's screen: 🚪 "Locked"      (no trap shown, no DC shown)
```

This directly answers the problem that prompted it: **a lock is information they should not have
until they try the door.** So is a trap. Both are knowable properties whose knowledge is tracked
separately from their truth.

### Fog and knowledge are the same idea at two granularities

Both ratchet forward. Both are permanent. Both are "what they earned." Fog is keyed to cells;
knowledge is keyed to objects. They should be understood, and probably stored, as one family —
distinct from session state, which is the oscillating stuff.

The whole model in one sentence:

> **What the party has earned only ever accumulates. What is true can change freely. They are stored
> separately and never confused.**

### Fog: one layer of revealed cells

There is exactly one fog layer — a set of revealed absolute cells, per dungeon, permanent.

- **Drag to paint.** Freehand, on the square grid. This matters because outside areas exist and are
  not rooms — courtyards, grounds, the space between buildings.
- **One click to stamp a room.** Reveals all of that room's cells at once.

Both gestures write to the same cell set. A room's "shown" state is therefore a *derived read* — are
all, some, or none of its cells revealed — rather than a stored boolean, and the one-click control
is a **command** ("reveal this room") rather than a checkbox. This means the DM UI shows a tri-state:
fully shown, partly shown, hidden.

Two independent layers — a boolean on rooms plus painted fog outside — were rejected. Reasons, in
order of weight:

1. **Two layers means two answers to "can they see cell [4,7]?"** and every renderer, every test, and
   every future feature must reconcile them. One cell set has exactly one answer, forever.
2. **Rooms and outside are less different than they look.** Outdoor features are already loose cell
   lists. A courtyard is as much "a place the party is standing in" as a room is. If reveal worked
   differently inside and out, the seam would be hit constantly at exactly the moments outdoor maps
   matter.
3. **Partial reveal is a real table moment.** Kids open a door and see the near half of a long hall.
   A room-as-unit model cannot express that; it pops the room in whole, overshooting what they
   actually know.

Fog is **per dungeon and permanent**, which is right for a persistent school revisited over months.
The reset primitive already exists in the same shape (`DELETE /session-state` returns to authored
defaults).

### Reveal should fall out of what the DM was already doing

Wherever possible, revealing should be a *consequence* of an action the DM is already taking —
opening a door reveals the room beyond it — rather than a second, separate action.

Any design that adds a per-room DM action at the table will be skipped during play, and the player
map will silently drift out of date. This is the single most reliable predictor of whether a feature
survives contact with a real session, and it recurs throughout the open questions below.

The corollary: because the player map's truth is partly a side effect, the DM needs to be able to see
**what the players can currently see**, at a glance, as a first-class thing — not something to be
inferred.

### Uniform flags on everything

Every object on the map — doors, stairs, props, portals, **and room entries** — carries the same flag
set. Some combinations are nonsense (`locked` on a fountain) and simply go unused.

A uniform shape that is sometimes left blank is far cheaper to maintain than four bespoke shapes.
`PassageFlags` already does exactly this for doors, stairs, props, and portals; extending it to room
entries is a continuation, not a new idea.

Two DCs, distinct and both DM-only:

- **`hiddenDc`** — the DC to notice *that the thing exists at all*.
- **`searchDc`** — the DC to find *what is concealed within it*. "A ruby in the false bottom of the
  drawer."

These are genuinely different. An object can be plainly visible and still be concealing something,
and "they found the ruby" is a knowledge event one level deeper: the drawer's *contents* become
known while the drawer itself was never hidden.

### Entry knowledge is DM-edited in place

For room entries, the DM edits the authored flag directly. If something is unflagged as hidden, it
stays unhidden. If the party removes it from the room, the DM removes it from the room.

For a persistent school there is no "next group," so permanent edits are honest here in a way they
would not be in a re-runnable one-shot dungeon. The reversible-overlay treatment used for passage
state exists to serve re-runnability that this campaign will never need.

---

## Surfaces

```
KID APP  /play                          DM APP  /  (unchanged, plus controls)
┌──────────────────────────┐            ┌────────────────────────────────┐
│  🧙 Pip ▾                 │            │  Reference · Campaign · Loot   │
├──────────────────────────┤            │  all 10 destinations as today  │
│  🗺 Map    ✨ Spells   ⚔ …│            │                                │
└──────────────────────────┘            │  Dungeon viewer gains:          │
                                        │   · drag-paint fog              │
                                        │   · one-click reveal room       │
                                        │   · mark knowledge learnt       │
                                        │   · preview of what they see    │
                                        └────────────────────────────────┘
```

### Kid app — Map (settled, and the primary surface)

The memory. A fogged overview of the school that fills in permanently as they explore.

- Answers *where have we been*, *what is through there*, *what did we find*, *how does this connect*.
- **Not** the battle map — that is drawn on the table. This is the other scale entirely: the whole
  place, and their relationship to it.
- Party-shared, identity-free, read-only.
- Tapping a revealed room shows what they know about it.
- Directly serves the two problems from the campaign: it is the notes they cannot take, and it is the
  spatial model they cannot yet hold in their heads.

**Room contents show live truth for now.** If an NPC moves, the revealed room reflects it
immediately, even though nobody told them. This is provisional — see Open Branches.

### Kid app — Spells (understood in principle, shape not settled)

- Personal. Filtered by ambient identity.
- Big cards, one spell at a time, with the resolved quick-rules line as the *headline* rather than a
  subtitle.
- Answers *what can I cast* and *what does it do*.
- No slot tracking, no HP, no dice — the binder owns all of that.

This aligns cleanly with the existing `player-spellbook-recovery.md` plan, which already states the
app "does not derive D&D rules, track current health or spent slots, or roll dice." That plan's data
is exactly what the kid device reads.

One tension to resolve when that plan is next touched: it currently declares *"Operator: DM"* and
*"no global play/edit mode,"* framed entirely around the DM reconstructing a lost paper sheet. Under
this split, the spellbook is the most obvious thing a kid holds in their hands. The philosophies
agree; the framing does not, and the plan will need reconciling.

### Kid app — Gear and weapons (open branch, deliberately unresolved)

Gear and weapons are their own decision trees and have not been walked. They are named here as an
open branch, not settled. Do not infer a third destination's shape from this document.

### DM app — unchanged, plus map controls

Every existing destination stays exactly as it is. The DM app is not reduced, reshaped, or split.
What it gains is the authoring side of the knowledge model:

- Drag-paint fog on the grid; one-click reveal for a room.
- Mark knowledge as learnt on any object — exists, lockable, trapped, contents.
- A first-class view of **what the players can currently see**, which should run through the same
  transform the kid app uses rather than re-deriving it.

---

## Rejected, and why

Keeping these so they are not silently re-litigated.

| Rejected | Why |
|---|---|
| **One screen toggling DM/player** | Cheapest option, but the kids only ever see what the DM is looking at. No kid ever gets their own thing. |
| **Cast view pushed to a TV** | Needs live sync between two clients — the expensive part — without the benefit of a personal device. |
| **Filtered app** (same pages, less shown) | Hides more than it shows, and taxes every future DM feature with "what does a kid see?" forever. |
| **Two separate builds** | Buys only a smaller bundle, which is irrelevant locally. Costs a shared package, two pipelines, two test configs, and a docs contract built for one frontend. |
| **Visible mode toggle** | Not a security failure — a temptation-design failure. A button is an invitation to defeat the ratchet. |
| **Sanitising API (wall)** | Overkill for the threat model. Replaced by the single-transform curtain, which addresses the real risk (careless spillage) at far lower cost. |
| **Pull-to-refresh** | A stale map needing a manual gesture is exactly what fails at 7pm on a school night. "Tap refresh" is the instruction a distracted six-year-old does not follow. |
| **Two reveal layers** (room boolean + painted cells) | Two answers to one question, a seam between inside and outside, and no way to express partial reveal. |
| **No fog, authored `is_hidden` only** | Shippable, but gives them a printed map. The map filling in as they explore *is* the feature. |
| **Per-room manual reveal as the primary action** | A second DM action per room gets skipped in play; the player map silently drifts stale. |
| **Fog covering secrets entirely** | Would mean entering a room reveals every secret in it, deleting the search-and-discover beat. |
| **Authored-only unhide for secrets** | Would require permanently damaging the dungeon to run it once — the reason session state exists. *(Note: for room entries specifically, permanent editing was chosen deliberately; see the knowledge model.)* |
| **Per-room authored "what the kids know" text** | Doubles the authoring burden for a castle that will keep expanding — against the whole reason the app is worth building. |
| **Momentary identity** (ask each time) | Fine at two kids and two pages, annoying at three, and gives up the sense of ownership that ambient identity provides. |
| **DM-assigned device identity** | Device-registration machinery to solve a problem — sibling peeking — that is not real here. |

---

## Open branches

Each of these deserves its own grilling session before it becomes a plan.

1. **Gear and weapons.** Their own decision trees, untouched. What the third kid destination is, or
   whether there is one.
2. **The shape of the personal surfaces.** Spells are understood in principle but not designed.
   Worth exploring whether a kid surface should be shaped as a *decision tree* — "what am I trying to
   do?" → "what do I have that does it?" → "what happens?" — rather than a browsable list. That
   would fit "pick it up when making a decision, put it down once made" far better than a catalogue,
   and is the clearest expression yet of the kid app being differently shaped rather than merely
   reduced.
3. **Whether the map shows the identity badge**, or whether the shared surface stays deliberately
   identity-free.
4. **How knowledge is stored** — the two-axis model is settled conceptually; its representation is
   not.
5. **How the `player-spellbook-recovery` plan reconciles** with a kid-held spellbook.
6. **Where this document's decisions eventually live.** `docs/adr/` does not exist; several of these
   are genuine ADRs individually. There is a `docs-restructure` plan in flight that should probably
   absorb the question.

---

## To watch in playtest

Provisional decisions, with the signal that should trigger revisiting them.

- **Live room contents (chosen for v1).** Watch for the first time a kid knows something nobody told
  them — an NPC's location updating silently on a map they haven't revisited. If that happens and it
  matters, the alternatives are: snapshot-on-discovery (honest, but needs the DM to re-observe rooms
  on every revisit, which by the "skipped at the table" rule will rot), or separating *place*
  knowledge from *people* knowledge so that where someone is right now is something they must ask
  about rather than look up.
- **Entry knowledge as permanent DM edits.** Watch for wanting to un-know something, or to re-run a
  location fresh. Adding an overlay later is easier than removing one.
- **Treasure entries showing on reveal.** The likeliest early leak in the ratchet: a `treasure` entry
  appearing before the room has been searched. Excluding treasure by default may be needed
  immediately.
- **Polling interval.** Watch whether a few seconds' lag is ever noticeable enough to matter. It
  probably is not; if it is, push is a swap behind the same read model.
- **Stale identity on the shared tablet.** Watch whether kids actually notice the badge. If not, it
  is a visual-design problem, not a logic one.
