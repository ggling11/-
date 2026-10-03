# 라운드 비교 시트: [레퍼런스 | 이전 | 이번] — python3 sheet.py OUT.png "제목" --ref a,b,c --prev x,y,z,w --cur p,q,r,s [--note "수치"]
import sys, os
from PIL import Image, ImageDraw, ImageFont
args = sys.argv[1:]; out, title = args[0], args[1]
def opt(k):
    return args[args.index(k) + 1].split(',') if k in args else []
REF, PREV, CUR = opt('--ref'), opt('--prev'), opt('--cur'); NOTE = args[args.index('--note') + 1] if '--note' in args else ''
LBL = args[args.index('--labels') + 1].split('|') if '--labels' in args else ['REFERENCE 레퍼런스', 'BEFORE 이전', 'THIS ROUND 이번']
TH = 300; FONT = None
for f in ['/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc']:
    if os.path.exists(f): FONT = f
FK = '/home/user/-/tools/t1/design/_ko.ttf'
def font(sz):
    for f in [FONT, FK]:
        try:
            if f: return ImageFont.truetype(f, sz)
        except Exception: pass
    return ImageFont.load_default()
rows = []
for name, files in ((LBL[0], REF), (LBL[1], PREV), (LBL[2], CUR)):
    if not files: continue
    ims = []
    for f in files:
        im = Image.open(f).convert('RGB'); im = im.resize((max(1, im.width * TH // im.height), TH), Image.LANCZOS); ims.append(im)
    W = sum(i.width for i in ims) + 10 * (len(ims) - 1); row = Image.new('RGB', (W, TH + 44), (254, 254, 254)); x = 0
    d = ImageDraw.Draw(row); d.text((4, 4), name, fill=(20, 17, 18), font=font(26))
    for i in ims: row.paste(i, (x, 44)); x += i.width + 10
    rows.append(row)
W = max(r.width for r in rows); Hh = sum(r.height + 16 for r in rows) + 70 + (40 if NOTE else 0)
sheet = Image.new('RGB', (W + 20, Hh), (254, 254, 254)); d = ImageDraw.Draw(sheet)
d.rectangle([0, 0, W + 20, 56], fill=(233, 228, 228)); d.text((14, 10), title, fill=(20, 17, 18), font=font(32))
y = 66
for r in rows: sheet.paste(r, (10, y)); y += r.height + 16
if NOTE: d.text((14, y), NOTE, fill=(20, 17, 18), font=font(22))
if sheet.width > 3000: sheet = sheet.resize((3000, sheet.height * 3000 // sheet.width), Image.LANCZOS)
sheet.save(out); print('sheet', out, sheet.size)
