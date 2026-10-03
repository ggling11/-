# 재생 해시를 3단계 기준(results/s3/accept/replay.json)과 비교 — 사용: node sim.mjs --replay 7200 --replay2 1 [--art 1] > out.txt; python3 t1/replay_cmp.py out.txt
import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
t = open(sys.argv[1], encoding='utf8').read(); d = json.loads(t[t.index('{'):])
ref = json.load(open(os.path.join(HERE, '..', 'results', 's3', 'accept', 'replay.json'), encoding='utf8'))['replay']
rows = [(a['mode'], a['boss'], a['record'], b['record'], a['same'], a['record'] == b['record']) for a, b in zip(d['replay'], ref)]
ok = len(d['replay']) == len(ref) and all(r[4] and r[5] for r in rows) and d.get('errors', 0) == 0
for r in rows: print(*r)
print('MATCH_STAGE3', ok, len(rows), 'rows · errors', d.get('errors'))
sys.exit(0 if ok else 1)
