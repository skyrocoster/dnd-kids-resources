"""Campaign, session, encounter, dungeon, and map API contracts."""

from __future__ import annotations

from typing import Annotated, Any, Dict, List, Literal, Optional

from pydantic import BaseModel, StringConstraints

ThreadColor = Annotated[str, StringConstraints(pattern=r"^thread-[1-6]$")]

LoomNodeKind = Literal["start", "end", "beat", "session"]
LoomCreatableNodeKind = Literal["beat", "session"]


class LoomThread(BaseModel):
    id: int
    name: str
    color: ThreadColor
    description: Optional[str] = None
    origin_node_id: Optional[int] = None


class LoomThreadCreate(BaseModel):
    name: str
    color: ThreadColor = "thread-1"
    description: Optional[str] = None
    origin_node_id: Optional[int] = None
    start_title: Optional[str] = None
    end_title: Optional[str] = None


class LoomThreadUpdate(BaseModel):
    name: str
    color: ThreadColor = "thread-1"
    description: Optional[str] = None


class LoomSession(BaseModel):
    id: int
    ordinal: int
    name: str
    played_on: Optional[str] = None
    notes: Optional[str] = None


class LoomSessionCreate(BaseModel):
    ordinal: int
    name: str
    played_on: Optional[str] = None
    notes: Optional[str] = None


class LoomSessionUpdate(BaseModel):
    ordinal: int
    name: str
    played_on: Optional[str] = None
    notes: Optional[str] = None


class LoomThreadOutcome(BaseModel):
    outcome: Literal["happened", "fulfilled", "not_reached", "carried", "banked", "quiet"]
    title: Optional[str] = None


class LoomSessionLogRequest(BaseModel):
    ordinal: int
    name: str
    played_on: Optional[str] = None
    notes: Optional[str] = None
    outcomes: Dict[int, LoomThreadOutcome]


class LoomNode(BaseModel):
    id: int
    thread_id: Optional[int] = None
    kind: LoomNodeKind
    title: str
    body: Optional[str] = None
    session_id: Optional[int] = None
    position: int
    carried_count: int
    fulfilled_planned_title: Optional[str] = None
    fulfilled_at: Optional[str] = None
    banked_from_thread_id: Optional[int] = None


class LoomNodeCreate(BaseModel):
    thread_id: Optional[int] = None
    kind: LoomCreatableNodeKind
    title: str
    body: Optional[str] = None
    session_id: Optional[int] = None
    position: int = 0
    carried_count: int = 0


class LoomNodeUpdate(BaseModel):
    thread_id: Optional[int] = None
    kind: LoomNodeKind
    title: str
    body: Optional[str] = None
    session_id: Optional[int] = None
    position: int = 0
    carried_count: int = 0


class LoomNodeFulfil(BaseModel):
    title: Optional[str] = None


class LoomThreadItemCreate(BaseModel):
    node_id: int
    position: int


class LoomThreadItemPositionUpdate(BaseModel):
    position: int


class LoomTapestryThread(LoomThread):
    pass


class LoomNodeMove(BaseModel):
    target_thread_id: int
    position: int


class LoomThreadMoveResult(BaseModel):
    source: LoomTapestryThread
    target: LoomTapestryThread


class LoomTapestry(BaseModel):
    sessions: List[LoomSession]
    threads: List[LoomTapestryThread]
    nodes: List[LoomNode]


class Encounter(BaseModel):
    id: int
    title: str
    creatures: Optional[List[Dict[str, Any]]] = None
    active_index: Optional[int] = None


class EncounterCreate(BaseModel):
    title: str
    creatures: Optional[List[Dict[str, Any]]] = None
    active_index: Optional[int] = None


class EncounterUpdate(EncounterCreate):
    pass


class Dungeon(BaseModel):
    id: int
    title: str
    data: Dict[str, Any]


class DungeonCreate(BaseModel):
    title: str
    data: Dict[str, Any]


class DungeonUpdate(DungeonCreate):
    pass


class MapLayoutBlob(BaseModel):
    data: Dict[str, Any]


class IncomingGateway(BaseModel):
    dungeon_id: int
    dungeon_title: str
    portal_id: int
    title: Optional[str] = None
    z: int
    cell: List[int]


class MapSessionStateBlob(BaseModel):
    data: Dict[str, Any]


class RevealedCell(BaseModel):
    x: int
    y: int


class RevealedCellsBlob(BaseModel):
    cells: list[RevealedCell]


class AtTheTableResponse(BaseModel):
    dungeon_id: Optional[int] = None


class AtTheTableSet(BaseModel):
    dungeon_id: int
