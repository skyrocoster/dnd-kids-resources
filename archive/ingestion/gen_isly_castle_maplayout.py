"""Generate the new-format Isly Castle MapLayout from the old seed + hand-traced geometry.

Semantic data (titles, descriptions, door state, connectivity, stairs, floors) comes
straight from data/seeds/seed_dungeons.json (dungeon id 4). Geometry (grid rectangles)
is hand-authored below from the two /data/maps castle images -- rectangular approximations
of each room, positioned to match the images. Doors are auto-placed on the wall of one
connected room facing the other.
"""
import json, re, sys

SX, SY = 48, 50  # grid resolution (image is 3536x3688 ~ square)

# Hand-traced fractional bounding boxes (fx0, fy0, fx1, fy1) as fraction of each floor image,
# plus floor z. Ground floor = "blank castle.png", First floor = "Castle Second Floor.png".
# Both floors share the same building footprint -> same grid coordinate frame.
BOXES = {
    # ---- GROUND FLOOR (z=0) ----
    1:  (0.20, 0.650, 0.375, 0.790, 0),  # Outside (front approach)
    2:  (0.25, 0.585, 0.365, 0.650, 0),  # Entrance Hall
    3:  (0.255, 0.415, 0.365, 0.585, 0), # Portal Room
    4:  (0.365, 0.600, 0.55, 0.790, 0),  # Large Corridor
    5:  (0.365, 0.415, 0.605, 0.600, 0), # Great Hall
    6:  (0.42, 0.790, 0.575, 0.950, 0),  # Divination Classroom (round)
    7:  (0.135, 0.610, 0.205, 0.665, 0), # Servant Corridor
    8:  (0.02, 0.665, 0.21, 0.800, 0),   # Servant Common Room & Canteen
    9:  (0.02, 0.610, 0.135, 0.665, 0),  # Servant Kitchen
    10: (0.02, 0.355, 0.135, 0.610, 0),  # Servant Dorms
    11: (0.755, 0.415, 0.85, 0.630, 0),  # Forbidden Section (Library)
    12: (0.63, 0.460, 0.755, 0.630, 0),  # Library
    13: (0.775, 0.640, 0.855, 0.700, 0), # Librarian Office
    14: (0.85, 0.605, 0.945, 0.715, 0),  # Cabinet of Curiosities (round)
    15: (0.63, 0.795, 0.735, 0.905, 0),  # Headmaster's Office (round)
    16: (0.395, 0.335, 0.605, 0.415, 0), # Chapel
    17: (0.145, 0.235, 0.39, 0.360, 0),  # Combat Training Hall
    18: (0.115, 0.185, 0.165, 0.215, 0), # Combat Training Office
    19: (0.135, 0.105, 0.215, 0.185, 0), # Room of Bigly Trials
    20: (0.605, 0.320, 0.70, 0.455, 0),  # Back Corridors
    21: (0.55, 0.665, 0.635, 0.790, 0),  # Headmaster's Quarters
    22: (0.02, 0.270, 0.12, 0.335, 0),   # Kennels
    23: (0.02, 0.185, 0.085, 0.230, 0),  # Armoury
    24: (0.02, 0.233, 0.07, 0.265, 0),   # Sports Storage
    25: (0.27, 0.040, 0.41, 0.170, 0),   # Stables
    26: (0.29, 0.205, 0.42, 0.245, 0),   # Outside (Back) corridor
    27: (0.185, 0.520, 0.26, 0.610, 0),  # Laundry Room
    28: (0.185, 0.355, 0.26, 0.520, 0),  # Kitchens
    29: (0.775, 0.340, 0.85, 0.410, 0),  # History Classroom
    30: (0.715, 0.300, 0.770, 0.355, 0), # Languages Classroom
    31: (0.42, 0.200, 0.70, 0.245, 0),   # Music & Drama Room
    32: (0.655, 0.245, 0.715, 0.315, 0), # Back Stairwell (stairs)
    # ---- FIRST FLOOR (z=1) ----
    33: (0.655, 0.250, 0.72, 0.300, 1),  # First Floor Landing (stairs, aligns over r32)
    35: (0.645, 0.305, 0.795, 0.375, 1), # Abjuration Classroom
    36: (0.235, 0.185, 0.645, 0.355, 1), # First Floor Main Corridor
    37: (0.645, 0.380, 0.73, 0.435, 1),  # Conjuration Classroom
    38: (0.63, 0.665, 0.745, 0.785, 1),  # Owlery (round)
    39: (0.735, 0.380, 0.805, 0.435, 1), # Enchantment Classroom
    40: (0.655, 0.205, 0.72, 0.245, 1),  # Junk Storage
    41: (0.645, 0.445, 0.75, 0.510, 1),  # Staff Room
    42: (0.755, 0.445, 0.83, 0.510, 1),  # Staff Office
    43: (0.13, 0.630, 0.205, 0.720, 1),  # Cleaning Storage (unlabeled -> best guess)
    44: (0.75, 0.555, 0.83, 0.650, 1),   # Potions Classroom
    45: (0.755, 0.515, 0.83, 0.550, 1),  # Potion Storage
    46: (0.02, 0.630, 0.13, 0.800, 1),   # Gallery (unlabeled -> best guess)
    47: (0.02, 0.185, 0.205, 0.630, 1),  # Upstairs Front Corridor (far-left tall corridor)
    48: (0.13, 0.720, 0.205, 0.800, 1),  # Costume & Props (unlabeled -> best guess)
    49: (0.35, 0.360, 0.57, 0.550, 1),   # Greenhouse (hollow square)
}


def to_rect(frac):
    fx0, fy0, fx1, fy1, z = frac
    x0 = round(fx0 * SX); y0 = round(fy0 * SY)
    x1 = round(fx1 * SX); y1 = round(fy1 * SY)
    w = max(1, x1 - x0); h = max(1, y1 - y0)
    return x0, y0, w, h, z


def rects():
    return {rid: to_rect(f) for rid, f in BOXES.items()}


def check_overlaps(R):
    ids = sorted(R)
    bad = []
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            a, b = ids[i], ids[j]
            ax, ay, aw, ah, az = R[a]
            bx, by, bw, bh, bz = R[b]
            if az != bz:
                continue
            if ax < bx + bw and bx < ax + aw and ay < by + bh and by < ay + ah:
                bad.append((a, b))
    return bad


def load_seed():
    data = json.load(open('data/seeds/seed_dungeons.json', encoding='utf-8'))
    return [d for d in data if d.get('id') == 4][0]['data']


def room_desc(room):
    parts = []
    for e in room.get('entries', []):
        if e.get('entry_type') == 'feature' and e.get('content'):
            parts.append(e['content'])
    return ' '.join(parts) or None


def parse_door_flags(door):
    """Derive PassageFlags from old-seed door fields."""
    mech = (door.get('door_mechanics') or '')
    is_hidden = bool(door.get('is_hidden'))
    hidden_dc = door.get('hidden_dc')
    locked = False
    trapped = False
    breakDc = pickDc = hiddenDc = None
    m = re.search(r'DC\s*(\d+)\s*to break', mech)
    if m:
        locked = True; breakDc = int(m.group(1))
    m = re.search(r'DC\s*(\d+)\s*to pick', mech)
    if m:
        locked = True; pickDc = int(m.group(1))
    m = re.search(r'DC\s*(\d+)\s*to find', mech)
    if m:
        is_hidden = True; hiddenDc = int(m.group(1))
    if hidden_dc:
        is_hidden = True; hiddenDc = int(hidden_dc)
    return dict(hidden=is_hidden, locked=locked, trapped=trapped,
               breakDc=breakDc, pickDc=pickDc, hiddenDc=hiddenDc)


def wall_cell_side(R, a, b):
    """Place a door on room a's wall facing room b. Returns (cell[x,y], side, z)."""
    ax, ay, aw, ah, az = R[a]
    bx, by, bw, bh, bz = R[b]
    acx, acy = ax + aw / 2, ay + ah / 2
    bcx, bcy = bx + bw / 2, by + bh / 2
    dx, dy = bcx - acx, bcy - acy
    if abs(dx) >= abs(dy):
        side = 'E' if dx > 0 else 'W'
    else:
        side = 'S' if dy > 0 else 'N'
    # target row/col nearest b
    if side in ('E', 'W'):
        cx = ax + aw - 1 if side == 'E' else ax
        cy = min(max(int(round(bcy - 0.5)), ay), ay + ah - 1)
        return [cx, cy], side, az
    else:
        cy = ay + ah - 1 if side == 'S' else ay
        cx = min(max(int(round(bcx - 0.5)), ax), ax + aw - 1)
        return [cx, cy], side, az


def build():
    seed = load_seed()
    R = rects()
    bad = check_overlaps(R)
    if bad:
        print('OVERLAPS:', bad, file=sys.stderr)

    room_by_id = {r['room_id']: r for r in seed['rooms']}
    rooms = []
    for rid in sorted(R):
        r = room_by_id.get(rid, {'title': f'Room {rid}'})
        x, y, w, h, z = R[rid]
        cells = [[cx, cy] for cy in range(h) for cx in range(w)]
        rooms.append(dict(room_id=rid, z=z, title=r.get('title'),
                          description=room_desc(r), origin=[x, y], cells=cells))

    doors = []
    for d in seed['doors']:
        lt = d.get('leads_to') or []
        if len(lt) != 2:
            continue
        a, b = lt
        # place on whichever of the pair has a box; prefer the lower id for stability
        host, other = (a, b) if a in R else (b, a)
        if host not in R:
            continue
        if other not in R:
            other = host  # self-facing fallback
        cell, side, z = wall_cell_side(R, host, other)
        flags = parse_door_flags(d)
        doors.append(dict(door_id=d['door_id'], cell=cell, side=side, z=z,
                          title=d.get('title'), **flags))

    stairs = []
    for s in seed['stairs']:
        rmpair = s.get('leads_to_rooms') or []
        if len(rmpair) == 2 and rmpair[0] in R and rmpair[1] in R:
            r0 = R[rmpair[0]]; r1 = R[rmpair[1]]
            frm = dict(z=r0[4], cell=[r0[0], r0[1]])
            to = dict(z=r1[4], cell=[r1[0], r1[1]])
        else:
            frm = dict(z=0, cell=[0, 0]); to = dict(z=1, cell=[0, 0])
        stairs.append(dict(stair_id=s['stair_id'], **{'from': frm}, to=to,
                          title=s.get('title'), hidden=False, locked=False, trapped=False))

    floors = [dict(z=0, title='Ground Floor'), dict(z=1, title='First Floor')]
    layout = dict(meta=dict(cellSizeFt=5, padding=3),
                  rooms=rooms, doors=doors, stairs=stairs,
                  floors=floors, props=[], portals=[])
    return layout


def s(v):
    return 'undefined' if v is None else json.dumps(v)


def to_ts(layout):
    out = []
    out.append('/* Isly Castle -- the full-castle Map Lab test fixture.')
    out.append(' *')
    out.append(' * GENERATED from data/seeds/seed_dungeons.json (dungeon id 4, "Isly Castle") + hand-traced')
    out.append(' * geometry read off the two /data/maps castle floor-plan images. Regenerate with')
    out.append(' * archive/ingestion/gen_isly_castle_maplayout.py (run from the repo root) rather than by hand.')
    out.append(' *')
    out.append(' * Semantic data (room titles/descriptions, door state + DCs, connectivity, stairs, floors) is')
    out.append(' * exact from the seed. Geometry is a rectangular approximation of each room positioned to match')
    out.append(' * the floor plans (round/irregular rooms become rectangles). Doors are auto-placed on the wall of')
    out.append(' * one connected room facing the other. The first floor is sparsely doored because the source seed')
    out.append(' * only authored one first-floor door (door 27) -- the rest of its door boxes were never captured.')
    out.append(' */')
    out.append("import type { MapLayout } from './maplabModel'")
    out.append('')
    out.append('export const islyCastleLayout: MapLayout = {')
    out.append('  meta: { cellSizeFt: 5, padding: 3 },')
    out.append('  rooms: [')
    for r in layout['rooms']:
        cells = ', '.join(f'[{c[0]}, {c[1]}]' for c in r['cells'])
        line = (f"    {{ room_id: {r['room_id']}, z: {r['z']}, title: {s(r['title'])}, "
                f"description: {s(r['description'])}, origin: [{r['origin'][0]}, {r['origin'][1]}], "
                f"cells: [{cells}] }},")
        out.append(line)
    out.append('  ],')
    out.append('  doors: [')
    for d in layout['doors']:
        parts = [f"door_id: {d['door_id']}", f"cell: [{d['cell'][0]}, {d['cell'][1]}]",
                 f"side: {json.dumps(d['side'])}", f"z: {d['z']}", f"title: {s(d['title'])}",
                 f"hidden: {str(d['hidden']).lower()}", f"locked: {str(d['locked']).lower()}",
                 f"trapped: {str(d['trapped']).lower()}"]
        if d.get('breakDc') is not None: parts.append(f"breakDc: {d['breakDc']}")
        if d.get('pickDc') is not None: parts.append(f"pickDc: {d['pickDc']}")
        if d.get('hiddenDc') is not None: parts.append(f"hiddenDc: {d['hiddenDc']}")
        out.append('    { ' + ', '.join(parts) + ' },')
    out.append('  ],')
    out.append('  stairs: [')
    for st in layout['stairs']:
        fr = st['from']; to = st['to']
        out.append(f"    {{ stair_id: {st['stair_id']}, from: {{ z: {fr['z']}, cell: [{fr['cell'][0]}, {fr['cell'][1]}] }}, "
                   f"to: {{ z: {to['z']}, cell: [{to['cell'][0]}, {to['cell'][1]}] }}, title: {s(st['title'])}, "
                   f"hidden: false, locked: false, trapped: false }},")
    out.append('  ],')
    out.append('  floors: [')
    for f in layout['floors']:
        out.append(f"    {{ z: {f['z']}, title: {json.dumps(f['title'])} }},")
    out.append('  ],')
    out.append('  props: [],')
    out.append('  portals: [],')
    out.append('}')
    out.append('')
    return '\n'.join(out)


# Destination for the generated TypeScript fixture (relative to the repo root).
TS_OUT = 'frontend/src/features/dungeons/maplab/islyCastleData.ts'

if __name__ == '__main__':
    layout = build()
    mode = sys.argv[1] if len(sys.argv) > 1 else 'json'
    if mode == 'ts':
        # Write UTF-8 directly (not via stdout) so Windows' cp1252 console never mangles it.
        with open(TS_OUT, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(to_ts(layout))
        print(f'wrote {TS_OUT}')
    else:
        print(json.dumps(layout, indent=2))
