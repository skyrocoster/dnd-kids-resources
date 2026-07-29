# DM / Player Split - Statement of Intent

**Status:** Intent settled for the next sequence of work: **Knowledge -> Fog -> Personal Surfaces**.

**What this is:** the current product and architecture intent from which focused Plans can be written.

**What this is not:** an implementation plan, implementation history, work-order set, or commitment to
the detailed design of Personal Surfaces.

---

## The campaign this serves

The players are four and six years old. The four-year-old is only beginning to read; the six-year-old
reads fluently. Sessions are about a week apart.

The campaign centres on a school that the party revisits over months. It is full of connected places
and persistent discoveries: hidden doors, locked passages, traps, concealed objects, and people or
things found in particular rooms.

The children are too young to maintain useful notes or reliably hold a connected spatial model in
their heads. Discoveries can be forgotten between sessions or within the same evening. The app must
therefore act as their memory, keyed to place, without exposing facts the fiction has not given them.

---

## Principles

### The binder holds state. The app holds reference. The DM holds the ruling.

Physical materials track what has happened at the table: HP, spent spell slots, collected loot, and
the battle grid. The app holds reference material that paper cannot keep current, including the map,
spell text, and what the party has learned about the dungeon.

The app informs; it does not adjudicate. It must not enforce class restrictions, spell levels,
casting ranges, rolls, or other rules that the DM may deliberately bend for young players.

### The map is the party's memory.

The kid map is not a battle map or a complete floorplan. It records the places the party has reached,
how those places connect, and the in-world facts the party has discovered.

### The table is where the game is played. Screens are where it is consulted.

The screen supports decisions and memory. It does not replace figures, dice, shared physical play,
or the DM's narration. There is no digital player-position tracking or player-operated game state.

### Time-to-answer is the metric.

The children pick up the device to answer a question and put it down once they have an answer.
Kid-facing interactions should reach useful information within a couple of taps.

### Player domain data is read-only.

`/play` cannot mutate dungeon, character, spell, or session state. Shared truth and disclosure are
controlled from the DM app. Device-local UI preferences, including the most recently selected player
profile, may be stored locally.

### Human error must be reversible.

Truth, player knowledge, and fog visibility may all be corrected in either direction by the DM.
Knowledge normally advances during play, but the software must not make an accidental disclosure
permanent.

---

## Application boundary

### Two devices, one backend

The children use a tablet and the DM uses a laptop. Both use the same backend.

### `/play` is a separate kid app

The kid experience is not the DM app with controls and destinations hidden. `/play/*` mounts its own
shell, navigation, modules, and child-specific presentation inside the existing frontend build.
There is no visible route from the kid app into the DM app.

The two apps share domain data, APIs, theme foundations, and pure logic where that reuse is useful.
Kid components do not reach into DM feature components merely to avoid writing a child-appropriate
surface. Conversely, useful interaction ideas discovered in the kid app may justify later redesign
of the DM surface.

### Liveness remains simple and one-way

The kid app refreshes its read models automatically while a surface is open. It does not require a
manual refresh gesture and does not introduce player-side write conflicts.

### Concealment passes through one curtain

A single player-view transform takes full domain data plus current knowledge and fog state and
returns the player-visible result. Kid-facing components consume that result rather than raw dungeon
data.

The DM's **What they see** preview uses that same transform. It must be the actual kid-facing result,
not a separately maintained approximation.

---

## Knowledge

Knowledge is the next implementation outcome because it applies to passage and object tokens that
already exist. It establishes the disclosure model before Fog adds spatial visibility.

### Truth and knowledge are separate axes

Truth describes the current world state: open or shut, locked or unlocked, armed or disarmed.
Knowledge describes the in-world facts the party has discovered.

Changing truth does not automatically change knowledge. A DM may update an object's live state for
many reasons that do not imply the party observed or understood it. Inherently visible presentation,
such as whether a visible door is open, may still follow live state.

Both axes are reversible by the DM to correct human error.

### Knowledge is controlled per fact

The DM independently controls whether the party knows each applicable in-world fact, including:

- that a hidden object exists;
- that a passage or object is lockable or currently known to be locked;
- that a passage or object is trapped; and
- other player-facing discoveries represented by existing object tokens.

An undiscovered hidden door, stair, portal, prop, or room entry is omitted from the player-view result
entirely. Once its existence is known, it may be rendered like the corresponding visible object.
Other known conditions appear independently; discovering a lock does not reveal a trap.

Room titles and descriptions are not independent knowledge facts. Their visibility is governed by
Fog.

### Mechanics remain behind the curtain

The kid map exposes in-world information, not game mechanics. `breakDc`, `pickDc`, `hiddenDc`,
`searchDc`, and DM notes never cross the curtain, even when the related condition is known.

`hiddenDc` and `searchDc` remain distinct DM-side concepts:

- `hiddenDc` is the difficulty of noticing that an object exists at all.
- `searchDc` is the difficulty of finding something concealed within an otherwise visible object.

The intent document requires independently reversible knowledge facts and stable object identities.
It deliberately leaves the database and API representation to the Knowledge Plan.

### Passage-like objects use one vocabulary

Doors, stairs, portals, passage-like props, and room entries use the shared `PassageFlags` vocabulary.
Rooms themselves do not. Inapplicable combinations remain unused rather than creating a separate
flag shape for every passage-like object.

### DM controls belong in the existing inspector

Selecting a passage-like object exposes player-knowledge toggles beside its live-state controls. The
layout must make the distinction between truth and player knowledge clear.

Mouse hover may visually highlight a room, but it must not change the inspector's selected object.
With a mouse, only clicking selects a room. This change is part of the Knowledge work so disclosure
controls remain stable while the pointer crosses the map.

### Preview begins with Knowledge

The Knowledge work introduces a **What they see** mode in the DM map toolbar. It renders the same
curtain output used by `/play`, allowing the DM to verify hidden objects and disclosed conditions.

The preview is not a structural map editor. Fog controls are added to it when Fog is implemented.

---

## Fog

Fog follows Knowledge because its storage seam exists but its DM interaction and player-visible
behaviour still need implementing.

### One reversible cell layer

Fog is one spatial visibility layer keyed to absolute cells per dungeon. A room's visibility is
derived from its cells rather than stored as a second room-level visibility system. This keeps one
answer to whether a cell is visible and supports rooms, partial rooms, and outside areas consistently.

The DM can toggle cells between hidden and visible. Fog is reversible, including previously visible
areas, because accidental reveals must be correctable with the simplest direct interaction.

With no saved Fog state, everything begins hidden.

### Room and freeform controls share the same layer

The DM can toggle a whole room and can paint or toggle freeform cells for outside areas and partial
reveals. Both interactions update the same cell layer. The room control may derive fully visible,
partly visible, or hidden state from its cells.

### Reveal follows confirmed party movement

Moving **Party is here** to a room automatically reveals that room. This uses an action the DM is
already taking and represents confirmed entry more accurately than opening a passage. The DM may
subsequently hide any part again to correct an error.

### Fog controls extend the preview

In **What they see** mode, the DM may toggle room and cell visibility while continuing to see the
actual kid-facing result. Structural map editing remains outside preview mode.

Fog governs whether room geometry, titles, and descriptions are visible. It does not reveal hidden
objects or conditions inside a visible room; those remain governed by Knowledge.

---

## Personal Surfaces

Personal Surfaces follow Knowledge and Fog and constitute a new product area rather than an extension
of the shared map.

### Shared map, personal reference

The Map is party-shared and displays no player identity. Personal surfaces display the active player
prominently and provide a one-tap profile switcher directly on the surface.

The kid app remembers the most recently selected profile locally on that device. Entering a personal
surface uses that profile immediately while keeping switching obvious and frictionless. Profile
selection filters read-only reference data; it does not mutate shared domain state.

### Separate kid modules over shared data

Personal surfaces use the same underlying character and reference data as the DM app but have their
own `/play` modules and child-specific presentation. Reuse shared logic where it helps; do not force
component reuse when the kid interaction needs a different shape.

### Spells is provisional and must be grilled separately

The current direction is a small set of DM-curated prepared shortcuts rather than opening on a full
browsable spell catalogue. This is only a starting hypothesis.

Before any Personal Surfaces Plan or implementation, run a dedicated grilling session covering at
least:

- how the DM curates the shortcuts;
- what a shortcut contains and how it answers a child's question;
- how a child reaches spell details or the wider roster;
- empty, incomplete, and newly created character states;
- profile-switching behaviour within the surface;
- the relationship between kid presentation and the DM spellbook; and
- what table test would validate the interaction model.

No detailed Personal Surfaces design should be inferred from this document before that grilling.

---

## Intended sequence

### 1. Knowledge

Add reversible per-fact disclosure for existing tokens, unify the passage-like flag vocabulary, make
mouse selection stable, and introduce the DM's actual-player-view preview.

### 2. Fog

Add reversible room and cell visibility, automatic room reveal from **Party is here**, and Fog
controls inside the preview.

### 3. Personal Surfaces

Run a dedicated grilling session, then plan the first personal reference surface using separate kid
modules over shared domain data.
