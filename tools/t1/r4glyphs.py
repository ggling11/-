# R4: t1check.py가 모은 HUD · 메뉴 글자(문자열 + ctx.font)를 넣은 글꼴 서브셋(FONTS.t1, woff2)의 글리프와 대조 — 빈 네모(글리프 없음) 0개여야 통과
#   python3 r4glyphs.py OUTDIR/t1check.json
import sys, os, re, json, base64, io
from fontTools.ttLib import TTFont
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', 'build', 'parts', 't1_fonts.js'), encoding='utf8').read()
fams = {}
for m in re.finditer(r'"family":\s*"([^"]+)".*?"b64":\s*"([^"]+)"', src, re.S):
    f = TTFont(io.BytesIO(base64.b64decode(m.group(2)))); fams[m.group(1)] = set(f.getBestCmap().keys())
d = json.load(open(sys.argv[1], encoding='utf8'))
miss = {}; n = 0
for s, font in d.get('R4_strings', []):
    fam = re.findall(r"[\"']([^\"']+)[\"']", font); fam = fam[0] if fam else None
    if fam not in fams: miss.setdefault(f'(글꼴 밖: {font})', set()).add(s); continue
    n += 1
    for ch in s:
        if ch in ' \t' or ord(ch) in fams[fam]: continue
        miss.setdefault(fam, set()).add(ch)
out = {'fonts': {k: len(v) for k, v in fams.items()}, 'strings': n, 'missing': {k: sorted(v) for k, v in miss.items()}, 'ok': not miss}
print(json.dumps(out, ensure_ascii=False, indent=1))
d['R4'] = out; json.dump(d, open(sys.argv[1], 'w', encoding='utf8'), indent=1, ensure_ascii=False)
