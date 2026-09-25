import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { LoomNode, LoomSession, LoomTapestry, LoomTapestryThread, LoomThread } from "../../api/types";
import { LoomBeatBankTray } from "./LoomBeatBankTray";
import { LoomBeatReorderDialog } from "./LoomBeatReorderDialog";
import { LoomErrorBanner } from "./LoomErrorBanner";
import { LoomLane } from "./LoomLane";
import { LoomNodeCard } from "./LoomNodeCard";
import { LoomNodeEditor } from "./LoomNodeEditor";
import { LoomPage } from "./LoomPage";
import { LoomRail } from "./LoomRail";
import { LoomSessionLogDialog } from "./LoomSessionLogDialog";
import { LoomSwimlanes } from "./LoomSwimlanes";
import { LoomThreadManager } from "./LoomThreadManager";
import { LoomWeaverPanel } from "./LoomWeaverPanel";

const meta = {
  title: "In Development/Application/The Loom",
  tags: ["status-in-development"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const thread: LoomTapestryThread = {
  id: 1,
  name: "The Lost Library",
  color: "thread-2",
  description: "Find the vanished archive.",
};
const session: LoomSession = {
  id: 1,
  ordinal: 1,
  name: "The first clue",
  played_on: null,
  notes: "A map points north.",
};
const nodes: LoomNode[] = [
  { id: 1, thread_id: 1, kind: "start", title: "A rumor in the tavern", position: 0, carried_count: 0 },
  { id: 2, thread_id: 1, kind: "beat", title: "Find the old map", body: "Ask the keeper about the hidden library.", position: 10, carried_count: 0 },
  { id: 3, thread_id: 1, kind: "session", session_id: 1, title: "The first clue", position: 20, carried_count: 0 },
  { id: 4, thread_id: 1, kind: "end", title: "Open the library gate", position: 30, carried_count: 0 },
  { id: 5, thread_id: null, kind: "beat", title: "Meet the lighthouse keeper", body: "Add this beat to a thread when it fits.", position: 0, carried_count: 0 },
];
const tapestry: LoomTapestry = { threads: [thread], sessions: [session], nodes };
const managedThread: LoomThread = thread;

export const LoomTapestryHome: Story = {
  name: "The Loom — campaign threads",
  render: () => <LoomPage />,
};

export const ThreadSwimlanes: Story = {
  name: "Swimlanes — planned beats and session history",
  render: () => <LoomSwimlanes threads={[thread]} nodes={nodes.filter((node) => node.kind !== "beat")} sessions={[session]} />,
};

export const ThreadLane: Story = {
  name: "Thread lane — selected story path",
  render: () => <LoomLane thread={thread} nodes={nodes.filter((node) => node.kind !== "beat")} sessions={[session]} selectedNodeId={1} />,
};

export const NodeCardCurrent: Story = {
  name: "Node card — current story beat",
  render: () => (
    <div style={{ maxWidth: 340 }}>
      <LoomNodeCard node={{ ...nodes[1], thread_id: null, fulfilled_at: "2026-01-01T00:00:00Z" }} isNow threadColor="thread-2" selected onClick={fn()} />
    </div>
  ),
};

export const NodeEditorCreate: Story = {
  name: "Node editor — add a planned beat",
  render: () => <LoomNodeEditor initialKind="beat" onClose={fn()} onSaved={fn()} />,
};

export const BeatBankContents: Story = {
  name: "Beat Bank — unplaced story beat",
  render: () => <LoomBeatBankTray nodes={[nodes[4]]} threads={[managedThread]} onSelectNode={fn()} onRestoreNode={fn()} onActivateNode={fn()} onManageThreads={fn()} />,
};

export const LoomRailSelection: Story = {
  name: "Inspector rail — selected story beat",
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <LoomRail
        selectedNode={nodes[1]}
        threads={[thread]}
        selectedThreadId={1}
        onEdit={fn()}
        onDeleteNode={fn()}
        onFulfilNode={fn()}
        onBankNode={fn()}
        onReplaceNode={fn()}
        onSpawnThread={fn()}
        onChangeEnding={fn()}
        onUndoFulfil={fn()}
        nodes={[nodes[4]]}
        onSelectNode={fn()}
        onRestoreNode={fn()}
        onManageThreads={fn()}
        onReorderThread={fn()}
      />
    </div>
  ),
};

export const WeaverInspector: Story = {
  name: "Weaver panel — selected beat details",
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <LoomWeaverPanel
        selectedNode={nodes[1]}
        threads={[managedThread]}
        onEdit={fn()}
        onDeleteNode={fn()}
        onFulfilNode={fn()}
        onBankNode={fn()}
        onReplaceNode={fn()}
        onSpawnThread={fn()}
        onChangeEnding={fn()}
        onUndoFulfil={fn()}
      />
    </div>
  ),
};

export const ThreadManagerOpen: Story = {
  name: "Thread manager — existing campaign thread",
  render: () => <LoomThreadManager threads={[managedThread]} onClose={fn()} onChanged={fn()} />,
};

export const SessionLogOpen: Story = {
  name: "Session log — record outcomes",
  render: () => <LoomSessionLogDialog tapestry={tapestry} onClose={fn()} onLogged={fn()} onError={fn()} />,
};

export const BeatReorderOpen: Story = {
  name: "Beat reorder — reorder planned beats",
  render: () => <LoomBeatReorderDialog thread={thread} nodes={nodes} onReordered={fn()} onError={fn()} onClose={fn()} />,
};

export const ErrorBannerVisible: Story = {
  name: "Error banner — dismissible save problem",
  render: () => <LoomErrorBanner message="The beat could not be saved." onDismiss={fn()} />,
};
