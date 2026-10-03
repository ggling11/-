# 테마 1 글꼴 (FONTS.t1): OFL 글꼴을 쓰는 글자만 잘라 base64로 → tools/build/parts/t1_fonts.js
#   영문 = Archivo Black (OFL 1.1) · 한글 본문 = Noto Sans KR 700 · 한글 큰 글씨 = Noto Sans KR 900 (OFL 1.1)
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
# 한글 큰 글씨 = Noto Sans KR 900 (Black Han Sans 조각 합치기는 브라우저에서 일부 글자가 대체 글꼴로 빠져서 뺌 ★)
nb = sub(os.path.join(FS, 'noto-sans-kr/files/noto-sans-kr-korean-900-normal.woff2'), KO_TXT)
out.append({'family': 'T1 Noto KR Black', 'weight': 900, 'src': 'Noto Sans KR 900 (@fontsource/noto-sans-kr 5.x)', 'license': 'OFL-1.1', 'glyphs': KO_TXT, 'bytes': len(nb), 'b64': base64.b64encode(nb).decode()})
js = ['/* =============================================================================\n * FONTS — 넣은 글꼴 · 라이선스 · 글자 범위 · 크기 (4단계 테마 1: FONTS.t1 · tools/t1/fonts/build_fonts.py가 만듦)\n'
      ' *   OFL-1.1 글꼴을 쓰는 글자만 잘라 base64(woff2)로 넣음. 3단계 F7 글꼴 데이터는 쓰지 않음\n * ========================================================================== */\n',
      "const FONTS = {};\n",
      'FONTS.t1 = ' + json.dumps([{k: v for k, v in f.items()} for f in out], ensure_ascii=False) + ';\n']
open(os.path.join(PARTS, 't1_fonts.js'), 'w', encoding='utf8').write(''.join(js))
print('fonts:', [(f['family'], f['bytes'], len(f['glyphs'])) for f in out], 'KO chars', len(KO))
