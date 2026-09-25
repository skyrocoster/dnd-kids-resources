// Question: Can a small Tiled JSON import preserve MapLab's core grid entities?
// Hypothesis: Tiled object polygons and typed point objects map cleanly to MapLayout.
// Signal: exact cells, wall-side door, floor names, and stair endpoints pass below.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const map = JSON.parse(
  await readFile(new URL("../../fixtures/maplab-tiled-headline.tmj", import.meta.url), "utf8"),
);
assert.equal(map.orientation, "orthogonal");
assert.equal(map.tilewidth, map.tileheight);
const size = map.tilewidth;
const properties = (list = []) => Object.fromEntries(list.map(({ name, value }) => [name, value]));
const grid = (pixel) => {
  const cell = pixel / size;
  if (!Number.isInteger(cell)) throw new Error(`${pixel}px is not on the grid`);
  return cell;
};

function contains([x, y], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function roomShape(object) {
  const polygon = object.polygon.map(({ x, y }) => [object.x + x, object.y + y]);
  polygon.forEach(([x, y], i) => {
    grid(x);
    grid(y);
    const next = polygon[(i + 1) % polygon.length];
    if (x !== next[0] && y !== next[1]) throw new Error("Room edges must follow the grid");
  });
  if (object.rotation) throw new Error("Rotated rooms are outside this trial");

  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cells = [];
  for (let y = minY; y < maxY; y += size) {
    for (let x = minX; x < maxX; x += size) {
      if (contains([x + size / 2, y + size / 2], polygon)) {
        cells.push([x / size - minX / size, y / size - minY / size]);
      }
    }
  }
  return { origin: [minX / size, minY / size], cells };
}

const centerCell = (object) => [grid(object.x - size / 2), grid(object.y - size / 2)];
const flags = (p) => ({ hidden: p.hidden ?? false, locked: p.locked ?? false, trapped: p.trapped ?? false });
const layout = {
  meta: { cellSizeFt: properties(map.properties).cell_size_ft ?? 5, padding: { top: 3, right: 3, bottom: 3, left: 3 } },
  rooms: [], doors: [], stairs: [], floors: [], props: [], portals: [], features: [],
};
const floors = new Map();
const stairEnds = new Map();

for (const layer of map.layers.filter((candidate) => candidate.type === "objectgroup")) {
  const lp = properties(layer.properties);
  const z = lp.z;
  floors.set(z, { z, title: lp.floor_title ?? `Floor ${z}` });

  for (const object of layer.objects) {
    const p = properties(object.properties);
    switch (object.type) {
      case "room": {
        const shape = roomShape(object);
        layout.rooms.push({ room_id: object.id, z, origin: shape.origin, cells: shape.cells, title: object.name });
        break;
      }
      case "door": {
        const side = p.side;
        const offset = { N: [-size / 2, 0], E: [-size, -size / 2], S: [-size / 2, -size], W: [0, -size / 2] }[side];
        if (!object.point || !offset) throw new Error("Doors need a point and N/E/S/W side");
        layout.doors.push({ door_id: object.id, cell: [grid(object.x + offset[0]), grid(object.y + offset[1])], side, z, title: object.name, ...flags(p) });
        break;
      }
      case "prop":
        if (!object.point) throw new Error("Props need to be Tiled point objects");
        layout.props.push({ prop_id: object.id, kind: p.kind, cell: centerCell(object), z, ...flags(p) });
        break;
      case "stair-end": {
        const ends = stairEnds.get(p.stair_id) ?? {};
        if (ends[p.endpoint] || !["from", "to"].includes(p.endpoint)) throw new Error("Each stair needs one from and one to point");
        ends[p.endpoint] = { z, cell: centerCell(object) };
        stairEnds.set(p.stair_id, ends);
        break;
      }
      default:
        throw new Error(`Unsupported object type: ${object.type}`);
    }
  }
}

layout.floors = [...floors.values()].sort((a, b) => a.z - b.z);
layout.stairs = [...stairEnds].map(([stair_id, ends]) => {
  if (!ends.from || !ends.to) throw new Error(`Stair ${stair_id} is missing an endpoint`);
  return { stair_id, ...ends, ...flags({}) };
});
const nextId = (items, key) => Math.max(0, ...items.map((item) => item[key])) + 1;
layout.meta.nextDoorId = nextId(layout.doors, "door_id");
layout.meta.nextPropId = nextId(layout.props, "prop_id");
layout.meta.nextStairId = nextId(layout.stairs, "stair_id");
layout.meta.nextPortalId = 1;

assert.deepEqual(layout.rooms[0].cells, [[0, 0], [1, 0], [0, 1]]);
assert.deepEqual(layout.doors[0], {
  door_id: 2, cell: [1, 0], side: "E", z: 0, title: "Entry door", hidden: true, locked: false, trapped: false,
});
assert.deepEqual(layout.props[0].cell, [0, 0]);
assert.deepEqual(layout.stairs[0], {
  stair_id: 2, from: { z: 0, cell: [0, 1] }, to: { z: 1, cell: [0, 0] }, hidden: false, locked: false, trapped: false,
});
assert.deepEqual(layout.floors, [{ z: 0, title: "Lower Hall" }, { z: 1, title: "Upper Vault" }]);
console.log("PASS: Tiled JSON mapped an L-room, door, prop, and paired two-floor stair into MapLayout.");
