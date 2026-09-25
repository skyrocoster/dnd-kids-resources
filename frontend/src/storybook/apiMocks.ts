import { createEmptyMapLayout } from "../model/maplabModel";

/**
 * Keep stories for API-backed screens deterministic and independent of Docker
 * or a local campaign database. Shared views default to empty collections;
 * the map routes get a small, read-only map fixture.
 */
function fixtureFor(path: string): unknown {
  if (path.endsWith("/api/health")) return { status: "ok" };
  if (path.endsWith("/api/conditions")) {
    return [{ id: 1, name: "Poisoned" }, { id: 2, name: "Prone" }];
  }
  if (path.endsWith("/api/at-the-table")) return { dungeon_id: null };
  if (path.endsWith("/api/players/spellbook")) return [];
  if (/\/api\/encounters\/\d+$/.test(path)) {
    return {
      id: 1,
      title: "Goblin Ambush",
      active_index: 0,
      creatures: [
        {
          creature_id: 1,
          source_kind: "monster",
          original_name: "Goblin Scout",
          name: "Goblin Scout",
          hp_current: 7,
          hp_max: 7,
          ac: 15,
          status: "alive",
          conditions: [],
        },
      ],
    };
  }
  if (/\/api\/dungeons\/\d+$/.test(path)) {
    return {
      id: 1,
      title: "Storybook Dungeon",
      data: { general_info: { title: "The Old Library", illumination: "Dim" }, rooms: [] },
    };
  }
  if (/\/api\/dungeons\/\d+\/layout$/.test(path)) {
    const layout = createEmptyMapLayout("Storybook dungeon");
    layout.rooms.push({
      room_id: 1,
      z: 0,
      origin: [1, 1],
      cells: [[0, 0], [1, 0], [0, 1]],
      title: "Storybook Room",
    });
    layout.doors.push({
      door_id: 1,
      cell: [1, 1],
      side: "N",
      z: 0,
      hidden: false,
      locked: true,
      trapped: false,
    });
    layout.props.push({
      prop_id: 1,
      kind: "chest",
      cell: [2, 2],
      z: 0,
      hidden: false,
      locked: false,
      trapped: false,
    });
    return { data: layout };
  }
  if (/\/api\/dungeons\/\d+\/session-state$/.test(path)) {
    return { data: { doors: {}, stairs: {}, props: {}, portals: {}, partyRoomId: null } };
  }
  if (path.endsWith("/api/loom/tapestry")) {
    return { threads: [], nodes: [], sessions: [] };
  }
  return [];
}

if (typeof window !== "undefined") {
  const fetchFromStorybook = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const requestUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(requestUrl, window.location.origin);
    if (!url.pathname.startsWith("/api/")) return fetchFromStorybook(input, init);

    return Promise.resolve(
      new Response(JSON.stringify(fixtureFor(url.pathname)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
}
