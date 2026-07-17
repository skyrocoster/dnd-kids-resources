# Technical Planning Prompt: Refine the Existing Loom Repository

You are working with an existing repository for a tabletop RPG campaign-planning tool called **The Loom**.

Your task is **not to begin implementation immediately**. First inspect the current repository, understand its existing architecture, data model, canvas behavior, terminology, and implemented features. Then produce a detailed technical transformation plan for evolving the existing application into the refined product model described below.

The plan must build from the current Loom setup rather than proposing an unrelated greenfield rewrite.

## Primary Goal

Transform The Loom into a lightweight campaign planning and session-recording tool for tabletop RPG game masters who plan in broad narrative strokes rather than scripting detailed plots.

The application should let a game master:

1. Create a storyline with a clear beginning and intended resolution.
2. Place a small number of planned story beats between them.
3. Record relevant things the players actually did during play.
4. Insert those events into the appropriate position in the storyline.
5. Convert achieved planned beats into historical session records.
6. remove unused planned beats without treating this as an error.
7. Save unused beats for possible reuse later.
8. Start new storylines from events that occurred during play.
9. Allow one historical event to belong to several storylines when appropriate.

The system should distinguish clearly between:

* what the game master currently plans;
* what the players actually did;
* and which storylines those events affected.

Do not design this as a conventional node-and-edge graph editor. Users should not manually create arbitrary relationships or draw generic connector lines. The visible paths represent ordered storylines.

---

# Product Vocabulary

Use the following terms consistently in the technical plan, data model, API naming recommendations, and migration strategy.

## The Loom

**The Loom** is the complete campaign workspace.

It contains all active storylines, recorded events, reusable planned beats, and their ordering.

The Loom is not intended to model every person, place, clue, combat, or decision in the campaign. It records only events and planned milestones that materially affect a storyline.

---

## Thread

A **Thread** is one active storyline or narrative objective.

Examples:

* Kill the Ice Queen
* Return the Wizard's Hat
* Discover Who Betrayed the King
* Lift the Family Curse

A Thread is an explicitly ordered path.

Its minimum structure is:

```text
Start → End
```

It may also contain Story Beats and Session Nodes:

```text
Start → Session Node → Story Beat → Story Beat → End
```

Important Thread rules:

* A Thread has exactly one Start.
* A Thread has exactly one currently active End.
* Every item on a Thread has an explicit order.
* A Thread is linear internally.
* A Thread does not fork into multiple paths within itself.
* Branching creates another Thread rather than creating a forked path inside the original Thread.
* More than one Thread may pass through the same Session Node.
* Story Beats belong to only one Thread at a time.
* Thread ordering expresses narrative progression, not strict physical causality.

A Thread is a lightweight guide to a storyline, not a complete plot script.

---

## Start

A **Start** defines why a Thread exists.

It is the initial premise, objective, problem, or inciting condition of the storyline.

Example:

```text
Start: Kill the Ice Queen
```

A Start may be created manually when the game master plans a new storyline.

A new Thread may also originate from an existing Session Node. In that case, the Session Node is the historical event that gave rise to the Thread, but the new Thread must still have a defined narrative premise or objective.

For example:

```text
Session Node: Met a wizard who asked the party to recover his hat
```

This may spawn:

```text
Start: Help the Wizard
End: Return the Wizard's Hat
```

The technical plan must decide how this relationship is represented without duplicating the historical event unnecessarily.

---

## End

An **End** is the Thread's current intended resolution.

Examples:

* Ice Queen Defeated
* Wizard's Hat Returned
* Betrayer Exposed
* Family Curse Lifted

An End is a planning object, not a statement of guaranteed future history.

Important End rules:

* A Thread has one active End.
* The End may be renamed or replaced if the campaign changes direction.
* Changing an End must not destroy the Thread's historical Session Nodes.
* Replacing an End should be treated as revising the future, not rewriting the past.
* The technical plan should consider whether previous End concepts need to be retained in an optional revision history, but this should not add unnecessary complexity to the primary workflow.

---

## Story Beat

A **Story Beat** is a broad, planned milestone that the game master currently expects may need to happen before the Thread reaches its End.

Example:

```text
Story Beat: Get the Amulet of Fire
```

Story Beats are deliberately broad.

They should not specify exactly how the players must accomplish them.

The game master may care that the party obtains protection against the Ice Queen, but not whether they buy, steal, earn, discover, or negotiate for it.

Story Beats are planning aids, not contractual plot requirements.

Important Story Beat rules:

* A Story Beat belongs to exactly one Thread while it is placed on that Thread.
* A Story Beat occupies a specific ordered position between two other items.
* Story Beats are mutable.
* Story Beats may be renamed.
* Story Beats may be reordered.
* Story Beats may be removed from a Thread.
* Removing a Story Beat does not mean the campaign failed.
* Removed Story Beats may be sent to a reusable bank rather than permanently deleted.
* A Story Beat may later be reused on the same Thread or another Thread.
* A Story Beat is part of the future plan until it is either achieved, removed, replaced, or banked.

A Story Beat should not require detailed substeps, dependencies, conditions, or branching logic.

---

## Session Node

A **Session Node** records one specific thing the party did during actual play that was relevant to one or more Threads.

Examples:

* Met a wizard who knows where the Amulet of Fire is.
* Recovered the Amulet of Fire.
* Promised to retrieve the wizard's stolen hat.
* Freed the Ice Queen's imprisoned sister.
* Destroyed the bridge leading to the frozen palace.

A Session Node does not represent an entire gaming session.

A single real-world session may produce:

* no relevant Session Nodes;
* one Session Node;
* or several Session Nodes.

Each Session Node should represent one narratively meaningful event.

Important Session Node rules:

* Session Nodes describe historical reality.
* They are normally created after or during play.
* They may optionally reference the real-world session in which the event occurred.
* They should be treated as more durable than future planning objects.
* They may be edited to correct mistakes, but routine planning changes should not rewrite them.
* A Session Node can belong to one Thread or several Threads.
* Its position may differ conceptually between Threads only if the data model can support that without ambiguity. The technical plan must explicitly address this issue.
* A Session Node may become the origin point of a new Thread.
* A Session Node may fulfill an existing Story Beat.
* A Session Node may make an existing Story Beat unnecessary.
* A Session Node does not need to correspond to a previously planned Story Beat.

The interface and data model must not assume that one Session Node equals one real-world session.

---

## Real-World Session

A **Real-World Session** is the actual dated tabletop game meeting.

Examples:

* Session 12 — 14 March 2026
* The Frost Palace
* Friday Night Game

This concept is separate from a Session Node.

A Real-World Session may contain or reference several Session Nodes.

The technical plan should inspect whether the current repository already has a session entity. If it does, preserve or adapt it rather than conflating it with Session Nodes.

Suggested relationship:

```text
Real-World Session
├── Session Node: Met the wizard
├── Session Node: Learned the amulet's location
└── Session Node: Agreed to recover the wizard's hat
```

The plan should state whether Real-World Sessions are required, optional, or deferred based on the existing application.

---

## Beat Bank

The **Beat Bank** is a reusable collection of Story Beats that are not currently placed on a Thread.

Example:

```text
Beat Bank
- Get the Amulet of Fire
- Meet the Exiled Prince
- Find the Crystal Key
```

A beat may enter the Beat Bank because:

* the players bypassed it;
* it is no longer needed;
* the game master changed direction;
* it is a good idea that may be useful later;
* it was removed while reorganising a Thread.

Important Beat Bank rules:

* Banked beats are not historical events.
* They do not remain active steps in their former Threads.
* They may retain provenance such as their original Thread or former position.
* They may be reused by placing them onto a Thread.
* Reusing a beat should not duplicate hidden relationships from its previous placement.
* Permanent deletion should remain possible but should be distinct from banking.

The technical plan should decide whether this is represented as a Story Beat status, a separate collection, or another simple mechanism.

---

## Beat Fulfilment

When the players accomplish a planned Story Beat, the Story Beat becomes historical reality.

Example before play:

```text
Start: Kill the Ice Queen
→ Story Beat: Get the Amulet of Fire
→ End: Ice Queen Defeated
```

After the party obtains it:

```text
Start: Kill the Ice Queen
→ Session Node: Recovered the Amulet of Fire
→ End: Ice Queen Defeated
```

The planned Story Beat should be replaced by, transformed into, or resolved into a Session Node.

The plan must recommend the safest data-model approach.

It should consider preserving lightweight provenance such as:

* this Session Node originated as a planned Story Beat;
* the original planned wording;
* when it was fulfilled;
* the real-world session in which it was fulfilled.

However, this provenance should not require both the old Story Beat and the new Session Node to remain visible as two separate items in the Thread.

The game master must be able to edit the historical wording because the actual event may be described differently from the original plan.

Example:

```text
Planned beat:
Get the Amulet of Fire

Historical event:
Stole the Amulet of Fire from the Ash Monastery
```

---

## Beat Bypass

A planned Story Beat may become unnecessary without being achieved literally.

Example:

```text
Story Beat: Get the Amulet of Fire
```

The party instead allies with a fire dragon and no longer needs the amulet.

The game master should be able to:

* remove the Story Beat from the Thread;
* bank it for future reuse;
* replace it with another Story Beat;
* or delete it permanently.

The party's alternative solution may be recorded as a Session Node:

```text
Session Node: Formed an alliance with the fire dragon
```

The system should not require the game master to mark the original Story Beat as failed.

The central philosophy is:

> Future planning is flexible. Historical play is durable.

---

## Branching and Spawned Threads

A Thread remains linear.

When an event creates another objective, the game master creates a new Thread originating from a Session Node.

Example:

```text
Thread: Kill the Ice Queen

Start: Kill the Ice Queen
→ Session Node: Met the wizard
→ Story Beat: Get the Amulet of Fire
→ End: Ice Queen Defeated
```

The same Session Node can spawn:

```text
Thread: Return the Wizard's Hat

Origin: Session Node — Met the wizard
Start: Help the Wizard
→ End: Return the Wizard's Hat
```

The technical plan must distinguish between:

1. A Session Node participating in multiple existing Threads.
2. A Session Node acting as the historical origin of a newly created Thread.
3. A Start defining the new Thread's narrative premise.

Do not model this as an arbitrary visual fork inside a Thread.

A new objective means a new Thread with its own identity, ordering, and End.

---

## Shared Session Nodes

A Session Node may matter to several Threads.

Example:

```text
Session Node:
The party killed the corrupt archbishop.
```

This event might advance:

* Expose the Royal Conspiracy
* Restore the Old Religion
* Protect the Crown Prince

The Session Node should remain one historical record rather than being copied three times.

Each Thread may include that same Session Node in its own ordered path.

The plan must explicitly address:

* how shared identity is represented;
* how Thread membership is represented;
* how ordering is represented;
* what happens when the Session Node is edited;
* what happens when it is removed from one Thread but retained on others;
* whether a Session Node can have different neighbouring items on different Threads;
* how deletion is handled when the node is shared;
* how the existing repository currently handles similar relationships.

---

# Core User Workflows

The technical plan must support the following workflows.

## Workflow 1: Create a Thread

The game master creates a new Thread.

The system creates:

```text
Start → End
```

The game master supplies the Thread name or premise and the intended End.

The plan should identify how this maps onto existing repository entities and UI state.

---

## Workflow 2: Add Planned Story Beats

The game master inserts Story Beats into explicit positions.

Example:

```text
Start
→ Get the Amulet of Fire
→ Enter the Frozen Citadel
→ End
```

The important operation is:

> Insert this Story Beat between item A and item B on this Thread.

Do not rely solely on unconstrained canvas coordinates to determine narrative order.

The data model must store explicit Thread ordering.

---

## Workflow 3: Record an Unplanned Event

After play, the game master records:

```text
Session Node:
Met a wizard who knows where the Amulet of Fire is.
```

They insert it between:

```text
Start
```

and:

```text
Story Beat: Get the Amulet of Fire
```

The resulting Thread is:

```text
Start
→ Session Node: Met the wizard
→ Story Beat: Get the Amulet of Fire
→ End
```

The plan should specify how insertion works in the underlying ordered structure.

---

## Workflow 4: Fulfil a Story Beat

The players obtain the Amulet of Fire.

The game master chooses the existing Story Beat and records that it occurred.

The resulting Thread is:

```text
Start
→ Session Node: Met the wizard
→ Session Node: Recovered the Amulet of Fire
→ End
```

The plan must decide whether this is implemented as:

* an in-place entity type transition;
* creation of a Session Node followed by archival of the Story Beat;
* a stable generic Thread Item with changing subtype;
* or another approach compatible with the current repository.

Explain the trade-offs and recommend one.

---

## Workflow 5: Bypass a Story Beat

The players solve the problem another way.

The game master records the actual event:

```text
Session Node:
Allied with a fire dragon.
```

They then remove:

```text
Story Beat:
Get the Amulet of Fire
```

The removed beat may be:

* banked;
* replaced;
* or permanently deleted.

No failure state is required.

---

## Workflow 6: Spawn a New Thread

A Session Node creates a new objective.

Existing Session Node:

```text
Met a wizard who asked the party to retrieve his hat.
```

From that Session Node, the game master creates:

```text
Thread: Return the Wizard's Hat
Start: Help the Wizard
End: Return the Wizard's Hat
```

The plan should define the smallest understandable creation flow and the necessary relationships in the data model.

---

## Workflow 7: Add One Session Node to Multiple Threads

The game master records one event and assigns it to several Threads.

The Session Node must remain one shared historical object.

Each Thread must store its own ordered membership of that object.

---

## Workflow 8: Revise an End

The intended resolution changes.

Example:

```text
Old End:
Defeat the Ice Queen
```

becomes:

```text
New End:
End the Eternal Winter
```

Existing Session Nodes remain intact.

The plan should identify whether replacing the End mutates the existing End object, archives it, or creates a new active End.

Prefer the simplest model consistent with future extensibility.

---

## Workflow 9: Remove Items Safely

The plan must define deletion and removal semantics for every item type.

At minimum:

### Story Beat

May be:

* removed from its Thread and banked;
* removed and deleted;
* moved elsewhere on the same Thread;
* moved to another Thread;
* converted into a Session Node when achieved.

### Session Node

May be:

* removed from one Thread while remaining on others;
* corrected;
* linked or unlinked from a Real-World Session;
* deleted only with appropriate warning when it is shared or acts as a Thread origin.

### Start

Must not be casually deleted while its Thread exists.

The plan should explain what deleting a Thread does to:

* its Start;
* its End;
* its Story Beats;
* shared Session Nodes;
* Session Nodes used as origins for other Threads.

### End

May be replaced or renamed.

Deleting it should require either creating a replacement End or closing/deleting the Thread.

---

# Product Invariants

The technical plan should preserve these invariants.

1. Every active Thread has exactly one Start.
2. Every active Thread has exactly one active End.
3. Every Thread has an explicit ordered sequence.
4. Starts and Ends are Thread-specific.
5. Story Beats are Thread-specific while placed.
6. Session Nodes may belong to several Threads.
7. A Session Node represents one meaningful event, not an entire game session.
8. A Story Beat represents tentative future planning.
9. A Session Node represents historical play.
10. A Story Beat may become a Session Node when achieved.
11. A bypassed Story Beat may be banked without being marked failed.
12. A Thread never branches internally.
13. New narrative branches are represented as new Threads.
14. A new Thread may originate from a Session Node.
15. Moving or removing future planning must not rewrite historical records.
16. Removing a Session Node from one Thread must not remove it from other Threads.
17. Canvas position must not be the sole source of narrative ordering.
18. Users should not manually create generic graph edges.

---

# Scope Boundaries

Do not expand the product into a complete campaign-management suite.

Unless the current repository already includes these capabilities and they materially affect the migration, do not prioritise:

* NPC databases;
* location databases;
* encounter builders;
* initiative tracking;
* inventory management;
* rules reference systems;
* detailed quest dependency graphs;
* automated plot generation;
* conditional logic trees;
* multiple simultaneous active endings inside one Thread;
* detailed scene-by-scene scripting;
* arbitrary graph relationships;
* generic mind-map editing.

The Loom should remain focused on broad story planning and historical session recording.

---

# Required Repository Analysis

Before recommending changes, inspect the repository and document:

1. The current framework and application architecture.
2. Existing domain entities and database schema.
3. Current state-management approach.
4. Existing canvas or graph library.
5. How nodes are currently represented.
6. How edges or connections are currently represented.
7. Whether ordering is explicit or inferred from geometry.
8. Existing persistence and migration mechanisms.
9. Existing Thread, node, session, story, or campaign terminology.
10. Current creation, editing, deletion, and drag interactions.
11. Test coverage relevant to the domain model.
12. Features that can be retained with minimal change.
13. Features that conflict with the refined model.
14. Technical debt or constraints that affect the transformation.
15. Whether the repository currently supports shared nodes or many-to-many relationships.

Reference concrete files, modules, components, schemas, and functions from the repository in the plan.

Do not provide generic recommendations that could apply to any application.

---

# Required Planning Deliverable

Produce a structured technical plan containing the following sections.

## 1. Current-State Summary

Explain how the current Loom works, using references to actual repository structures.

Identify where its current mental model differs from the refined Thread model.

---

## 2. Target Domain Model

Define the recommended entities and relationships.

At minimum, cover:

* Loom or Campaign
* Thread
* Start
* End
* Story Beat
* Session Node
* Real-World Session, if applicable
* Beat Bank
* ordered Thread membership
* Thread origin relationships
* Story Beat fulfilment provenance

Include a relationship diagram or precise textual equivalent.

Do not assume that every visible item needs a separate database table. Recommend the model that best fits the current codebase.

---

## 3. Ordering Model

Explain exactly how item ordering within a Thread will be represented.

Address:

* inserting an item between two existing items;
* reordering Story Beats;
* inserting a Session Node;
* sharing one Session Node across Threads;
* removing an item;
* converting a Story Beat into a Session Node;
* avoiding reliance on canvas coordinates;
* avoiding fragile global linked lists if the shared-node model makes them unsuitable.

Compare viable ordering approaches where necessary and make a recommendation.

---

## 4. State Transitions

Define allowed state transitions.

Examples:

```text
Story Beat → Session Node
Story Beat → Banked Story Beat
Banked Story Beat → Placed Story Beat
Placed Story Beat → Deleted
Session Node → Added to another Thread
Session Node → Removed from one Thread
End → Replaced End
Session Node → Origin of new Thread
```

For each transition, specify:

* the triggering user action;
* resulting data changes;
* validation rules;
* undo implications;
* shared-reference implications.

---

## 5. Migration Strategy

Explain how to migrate existing Loom data into the refined model.

Address:

* existing generic nodes;
* existing graph edges;
* existing thread concepts;
* existing start and end nodes;
* existing session records;
* existing planned nodes;
* ambiguous structures;
* invalid or branching graphs;
* shared nodes;
* data that cannot be mapped automatically.

Categorise migrations as:

* automatic;
* heuristic;
* requiring user review;
* unsupported or archived.

The migration must avoid data loss wherever practical.

---

## 6. Feature Transformation Map

For each significant existing feature, classify it as:

* retain;
* adapt;
* replace;
* deprecate;
* remove.

Explain why.

Pay particular attention to any generic edge creation, node connection, branching, or free-form graph functionality that conflicts with ordered Threads.

---

## 7. Interaction and Command Model

Do not focus on visual styling.

Define the functional interactions and commands required to support the workflows.

Examples:

* Create Thread
* Add Story Beat between two items
* Record Session Node
* Fulfil Story Beat
* Bank Story Beat
* Restore Story Beat from bank
* Replace Story Beat
* Add Session Node to another Thread
* Spawn Thread from Session Node
* Change End
* Remove item from Thread
* Delete historical event
* Delete Thread
* Undo recent structural change

For each command, describe the expected domain operation.

---

## 8. Validation and Edge Cases

Cover at least the following:

* A Story Beat is fulfilled while shared historical events already exist before and after it.
* A Story Beat is bypassed and banked.
* A banked beat is reused on another Thread.
* One Session Node belongs to several Threads.
* A shared Session Node is edited.
* A shared Session Node is removed from only one Thread.
* A shared Session Node is deleted globally.
* A Session Node serving as a Thread origin is deleted.
* A Thread's End changes.
* A Thread is deleted while its Session Nodes remain relevant elsewhere.
* A Thread is deleted while other Threads originated from one of its Session Nodes.
* A user attempts to create two active Ends.
* A user attempts to create a branch inside a Thread.
* A user attempts to move a historical Session Node into an impossible ordering position.
* The same Session Node appears twice on one Thread.
* A Story Beat is converted to a Session Node and then the action is undone.
* Existing malformed graph data is loaded.
* Offline or concurrent edits alter the same Thread ordering, if the current architecture supports collaboration or synchronisation.

---

## 9. Implementation Phases

Break the work into incremental phases that keep the application usable.

A likely sequence may include:

1. Introduce the refined domain vocabulary.
2. Add explicit ordered Thread membership.
3. Separate planned Story Beats from historical Session Nodes.
4. Implement Story Beat fulfilment.
5. Implement the Beat Bank.
6. Implement shared Session Nodes.
7. Implement Thread spawning from Session Nodes.
8. Migrate or retire generic edge behavior.
9. Update persistence and migration tooling.
10. Add comprehensive tests.
11. Remove obsolete graph assumptions.

Adjust this sequence based on the actual repository.

For every phase, include:

* objective;
* affected files or subsystems;
* dependencies;
* data migration requirements;
* tests;
* rollout risks;
* clear completion criteria.

---

## 10. Test Strategy

Define unit, integration, migration, and end-to-end tests.

Prioritise domain invariants over visual snapshot tests.

Include tests for:

* ordered insertion;
* beat conversion;
* beat banking;
* beat restoration;
* shared Session Node membership;
* spawned Threads;
* End replacement;
* Thread deletion;
* undo behavior;
* migration from existing data;
* prevention of internal Thread branching;
* prevention of multiple active Ends.

---

## 11. Open Decisions

List genuine unresolved decisions exposed by the current repository.

For each decision:

* explain why it matters;
* identify the viable choices;
* state the trade-offs;
* make a recommended default.

Do not use open decisions as a substitute for making recommendations.

---

# Planning Principles

Follow these principles throughout the plan.

## Build from the existing repository

Prefer incremental transformation over wholesale replacement unless the existing architecture makes the target model genuinely impractical.

Any recommended rewrite must be justified with concrete evidence from the repository.

## Preserve user data

Campaign history is valuable.

Prefer migrations, compatibility layers, and user-review tools over destructive resets.

## Make narrative order explicit

The application's saved model must know that one item comes before another on a Thread.

Canvas layout is presentation state, not the authoritative narrative model.

## Keep planning soft

Story Beats and Ends represent current intentions.

They should be easy to rename, reorder, replace, bank, or remove.

## Keep history durable

Session Nodes represent things that happened.

They may be corrected, but routine plan changes must not silently alter or destroy them.

## Avoid overplanning mechanics

Do not introduce requirements, dependencies, completion percentages, nested objectives, conditional logic, or complex workflow statuses unless they are essential to the stated model.

## Avoid generic graph semantics

A Thread is not an arbitrary collection of connected nodes.

It is an ordered storyline.

A shared Session Node is not an invitation to restore unrestricted node-and-edge editing.

## Separate identity from membership

A shared Session Node has one historical identity but may have several Thread memberships.

Those memberships may each carry ordering information.

## Prefer understandable user actions

Use domain actions such as:

* Fulfil Beat
* Bank Beat
* Spawn Thread
* Add to Thread
* Change Ending

Avoid exposing database or graph terminology to users.

---

# Example Target Scenario

The completed model must support this sequence cleanly.

Initial planning:

```text
Thread: Kill the Ice Queen

Start: Kill the Ice Queen
→ Story Beat: Get the Amulet of Fire
→ End: Ice Queen Defeated
```

After one game session:

```text
Start: Kill the Ice Queen
→ Session Node: Met a wizard who knows where the Amulet of Fire is
→ Story Beat: Get the Amulet of Fire
→ End: Ice Queen Defeated
```

The same Session Node gives rise to another Thread:

```text
Thread: Return the Wizard's Hat

Origin:
Session Node — Met a wizard who asked for help

Start: Help the Wizard
→ End: Return the Wizard's Hat
```

Later, if the party obtains the amulet:

```text
Start: Kill the Ice Queen
→ Session Node: Met the wizard
→ Session Node: Recovered the Amulet of Fire
→ End: Ice Queen Defeated
```

The Story Beat has become historical reality.

Alternatively, if the party allies with a fire dragon:

```text
Start: Kill the Ice Queen
→ Session Node: Met the wizard
→ Session Node: Allied with a fire dragon
→ End: Ice Queen Defeated
```

The unused Story Beat:

```text
Get the Amulet of Fire
```

is removed from the Thread and placed in the Beat Bank.

It is not marked failed and does not remain as an active step.

---

# Output Expectations

Produce a technical plan, not implementation code.

The plan should be detailed enough that another coding agent can implement it without redefining the product model.

Use concrete references to the current repository throughout.

Clearly separate:

* confirmed observations from the repository;
* recommended changes;
* migration assumptions;
* unresolved decisions.

End with:

1. a proposed target entity model;
2. a phased implementation checklist;
3. a risk register;
4. a list of obsolete concepts that should be removed from the current Loom;
5. the recommended first implementation milestone.
