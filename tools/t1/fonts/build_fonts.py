# 테마 1 글꼴 (FONTS.t1): OFL 글꼴을 쓰는 글자만 잘라 base64로 → tools/build/parts/t1_fonts.js
#   영문 = Archivo Black (OFL 1.1) · 한글 본문 = Noto Sans KR 700 (OFL 1.1) · 한글 큰 글씨 = Black Han Sans (OFL 1.1)
#   한글 글자 범위 = parts/t1_*.js 안의 모든 한글 (데이터 표 · HUD 문자열) — 문자열을 바꾸면 이 스크립트를 다시 돌림
#   python3 tools/t1/fonts/build_fonts.py [fontsource node_modules 경로]
import sys, os, re, glob, base64, io, json
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.merge import Merger
HERE = os.path.dirname(os.path.abspath(__file__)); PARTS = os.path.join(HERE, '..', '..', 'build', 'parts')
FS = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-user--/08071676-353f-5c03-bc60-9c1cf4e58025/scratchpad/fonts/node_modules/@fontsource'
src = ''.join(open(f, encoding='utf8').read() for f in sorted(glob.glob(os.path.join(PARTS, 't1_*.js'))) if not f.endswith('t1_fonts.js'))
KO = sorted(set(ch for ch in src if '가' <= ch <= '힣'))
EN = ''.join(chr(c) for c in range(0x20, 0x7f)) + '—·×↑↓←→…'
KO_TXT = ''.join(KO) + ' ·0123456789%/:-+()!?.,='
def sub(path, text, flavor='woff2'):
    f = TTFont(path); o = subset.Options(); o.flavor = flavor; o.layout_features = ['*']; o.name_IDs = ['*']; o.notdef_outline = True
    s = subset.Subsetter(o); s.populate(text=text); s.subset(f); b = io.BytesIO(); f.flavor = flavor; f.save(b); return b.getvalue()
out = []
ab = sub(os.path.join(FS, 'archivo-black/files/archivo-black-latin-400-normal.woff2'), EN)
out.append({'family': 'T1 Archivo', 'weight': 400, 'src': 'Archivo Black (@fontsource/archivo-black 5.x)', 'license': 'OFL-1.1', 'glyphs': EN, 'bytes': len(ab), 'b64': base64.b64encode(ab).decode()})
nk = sub(os.path.join(FS, 'noto-sans-kr/files/noto-sans-kr-korean-700-normal.woff2'), KO_TXT)
out.append({'family': 'T1 Noto KR', 'weight': 700, 'src': 'Noto Sans KR 700 (@fontsource/noto-sans-kr 5.x)', 'license': 'OFL-1.1', 'glyphs': KO_TXT, 'bytes': len(nk), 'b64': base64.b64encode(nk).decode()})
# Black Han Sans: 글자 범위가 조각 파일로 나뉘어 있음 → 필요한 조각만 잘라 합침
css = open(os.path.join(FS, 'black-han-sans/index.css'), encoding='utf8').read()
need = set(KO_TXT); pieces = []
for m in re.finditer(r"src: url\(\./files/(black-han-sans-[^)]*?-400-normal\.woff2)\)[^;]*;\s*unicode-range: ([^;]+);", css):
    fn, rng = m.group(1), m.group(2); cps = set()
    for part in rng.split(','):
        part = part.strip()[2:]
        if '-' in part: a, b = part.split('-'); cps.update(range(int(a, 16), int(b, 16) + 1))
        else: cps.add(int(part, 16))
    hit = ''.join(ch for ch in need if ord(ch) in cps)
    if hit: pieces.append((fn, hit))
tmp = []
for i, (fn, hit) in enumerate(pieces):
    b = sub(os.path.join(FS, 'black-han-sans/files', fn), hit, None); p = os.path.join(HERE, f'_bhs{i}.ttf'); open(p, 'wb').write(b); tmp.append(p)
if tmp:
    merged = Merger().merge(tmp) if len(tmp) > 1 else TTFont(tmp[0])
    b = io.BytesIO(); merged.flavor = 'woff2'; merged.save(b); bh = b.getvalue()
    for p in tmp: os.remove(p)
    out.append({'family': 'T1 Black Han', 'weight': 400, 'src': 'Black Han Sans (@fontsource/black-han-sans 5.x)', 'license': 'OFL-1.1', 'glyphs': ''.join(sorted(set(''.join(h for _, h in pieces)))), 'bytes': len(bh), 'b64': base64.b64encode(bh).decode()})
js = ['/* =============================================================================\n * FONTS — 넣은 글꼴 · 라이선스 · 글자 범위 · 크기 (4단계 테마 1: FONTS.t1 · tools/t1/fonts/build_fonts.py가 만듦)\n'
      ' *   OFL-1.1 글꼴을 쓰는 글자만 잘라 base64(woff2)로 넣음. 3단계 F7 글꼴 데이터는 쓰지 않음\n * ========================================================================== */\n',
      "const FONTS = {};\n",
      'FONTS.t1 = ' + json.dumps([{k: v for k, v in f.items()} for f in out], ensure_ascii=False) + ';\n']
open(os.path.join(PARTS, 't1_fonts.js'), 'w', encoding='utf8').write(''.join(js))
print('fonts:', [(f['family'], f['bytes'], len(f['glyphs'])) for f in out], 'KO chars', len(KO))
