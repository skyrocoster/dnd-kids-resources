/** Stable query-key factories shared by API readers and mutation invalidation. */
const collection = (name: string) => ({
  all: [name] as const,
  detail: (id: number) => [name, "detail", id] as const,
});

export const queryKeys = {
  abilities: ["abilities"] as const,
  conditions: ["conditions"] as const,
  damageTypes: ["damage-types"] as const,
  weaponProperties: ["weapon-properties"] as const,
  skills: ["skills"] as const,
  spellComponents: ["spell-components"] as const,
  spells: {
    ...collection("spells"),
    byTitle: (title: string) => ["spells", "by-title", title] as const,
    players: (spellId: number) => ["spells", "players", spellId] as const,
  },
  monsters: {
    ...collection("monsters"),
    byName: (name: string) => ["monsters", "by-name", name] as const,
  },
  weapons: {
    ...collection("weapons"),
    byName: (name: string) => ["weapons", "by-name", name] as const,
    players: (weaponId: number) => ["weapons", "players", weaponId] as const,
  },
  items: collection("items"),
  lootBundles: collection("loot-bundles"),
  players: {
    ...collection("players"),
    detail: (id: number) => ["players", "detail", id] as const,
    spells: (id: number) => ["players", "spells", id] as const,
    weapons: (id: number) => ["players", "weapons", id] as const,
    spellbook: ["players", "spellbook"] as const,
  },
  npcs: collection("npcs"),
  encounters: collection("encounters"),
  dungeons: {
    ...collection("dungeons"),
    layout: (id: number) => ["dungeons", id, "layout"] as const,
    incomingGateways: (id: number) => ["dungeons", id, "incoming-gateways"] as const,
    sessionState: (id: number) => ["dungeons", id, "session-state"] as const,
    revealedCells: (id: number) => ["dungeons", id, "revealed-cells"] as const,
  },
  atTheTable: ["at-the-table"] as const,
  loom: {
    tapestry: ["loom", "tapestry"] as const,
    threads: collection("loom-threads"),
    nodes: collection("loom-nodes"),
    sessions: collection("loom-sessions"),
  },
} as const;
