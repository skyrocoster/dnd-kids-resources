import json
with open('data/seeds/seed_loom_nodes.json') as f:
    nodes = json.load(f)

print('=== Warp beats (no session_id) ===')
warp = [n for n in nodes if n['session_id'] is None and n['kind'] == 'beat' and n['thread_id'] is not None]
for n in warp:
    print(f'  id={n["id"]:2d} thread={n["thread_id"]} pos={n["position"]:3d} title={n["title"]}')

print()
print('=== Banked beats (no thread_id) ===')
banked = [n for n in nodes if n['thread_id'] is None]
for n in banked:
    print(f'  id={n["id"]:2d} kind={n["kind"]:7s} title={n["title"]} banked_from_thread={n["banked_from_thread_id"]}')

print()
print('=== All threads summary ===')
threads = {}
for n in nodes:
    t = n['thread_id']
    if t is not None:
        if t not in threads:
            threads[t] = {'count': 0, 'kinds': set(), 'sessions': set(), 'beats': []}
        threads[t]['count'] += 1
        threads[t]['kinds'].add(n['kind'])
        if n['session_id'] is not None:
            threads[t]['sessions'].add(n['session_id'])
        if n['kind'] == 'beat' and n['session_id'] is None:
            threads[t]['beats'].append((n['id'], n['title'], n['position']))
for t in sorted(threads.keys()):
    info = threads[t]
    print(f'  Thread {t}: {info["count"]:2d} nodes, kinds={info["kinds"]}, sessions={sorted(info["sessions"])}, warp_beats={info["beats"]}')
