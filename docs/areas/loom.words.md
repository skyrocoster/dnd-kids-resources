# Loom Glossary

## Domain vocabulary

**The Loom**:
The campaign narrative tracker: a tapestry of ordered story threads and nodes.
_Avoid_: campaign_tracker, story_manager

**Tapestry**:
The complete snapshot of all threads and nodes in the Loom, delivered as a single read.
_Avoid_: snapshot, full_state

**Thread**:
One linear story arc with a start, ordered beats/sessions, and an end. Has a name, color, and optional origin.
_Avoid_: storyline, arc, plot_line

**Beat**:
A planned story beat: a future event that has not yet happened in-game. Thread-exclusive.
_Avoid_: event, planned_session, milestone

**Session**:
A record of a played game session. Can belong to many threads independently through per-thread session nodes in the same session column.
_Avoid_: play_session, game_session

**Session Tag**:
An optional label on a session node, such as date or session number.

**Fulfilled (Beat)**:
A beat that has been converted into a session, recording the original planned title and fulfillment time.
_Avoid_: completed_beat, realized_beat

**Banked (Beat)**:
A beat removed from a thread and placed in the vault/unplaced pool.
_Avoid_: archived_beat, orphaned_beat

**Bank / Vault**:
The pool of unplaced banked beats with zero thread membership.
_Avoid_: backlog, holding area

**Node**:
A point in a thread: one of start, end, beat, or session. Has title, body, canvas coordinates, and thread memberships.
_Avoid_: point, marker

**Thread Item**:
A membership row linking a node to a thread with an integer position for ordering.
_Avoid_: membership, link

**Position**:
Integer ordering of a node within a thread, ascending. The sole source of narrative order.
_Avoid_: order, index, sort_key

**Grid (Session grid)**:
Visual layout model: session columns across, thread rows down, with pinned labels and cell states (real/quiet/outside-life). Replaces the retired swimlane renderer.
_Avoid_: swimlane, lane, row

**Current Position**:
The node just before the first unfulfilled beat in a thread: the "you are here" marker.
_Avoid_: cursor, playback_head

**Thread Head**:
The latest realized node in a thread, meaning the last session or start before the first beat.
_Avoid_: latest_node, tip

**Next Beat**:
The first unfulfilled beat in a thread's ordered sequence.
_Avoid_: upcoming_beat, pending_beat

**Live Threads**:
Threads that still have unfulfilled beats remaining.
_Avoid_: active_threads, open_threads

**Stitch Layer (retired)**:
The former visual overlay connecting shared-session nodes across lanes. Retired with the session grid.
_Avoid_: connection_layer, edge_overlay
