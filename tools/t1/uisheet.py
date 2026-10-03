# UI 화면 시트 [A | B] 5화면 (타이틀 · 전투 HUD · QTE · 메뉴 · 결과): python3 uisheet.py OUT.png DIR_A DIR_B "라벨A" "라벨B" [--blind]
#   --blind: 라벨 없이 'A' · 'B'만 (블라인드 패널용)
import sys, os
from PIL import Image, ImageDraw, ImageFont
out, A, B, la, lb = sys.argv[1:6]; blind = '--blind' in sys.argv
rows = [('title', 'TITLE 타이틀'), ('p1', 'BATTLE HUD 전투'), ('qte', 'QTE'), ('menu', 'ESC MENU 메뉴'), ('res', 'RESULTS 결과')]
W, H = 760, 428; G = Image.new('RGB', (W * 2 + 40, (H + 34) * len(rows) + 50), 'white'); d = ImageDraw.Draw(G)
try: F = ImageFont.truetype(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'design', '_ko.ttf'), 26)
except Exception: F = None
d.text((10, 10), 'A' if blind else la, fill='black', font=F); d.text((W + 30, 10), 'B' if blind else lb, fill='black', font=F)
for i, (n, lab) in enumerate(rows):
    y = 50 + i * (H + 34)
    if not blind: d.text((10, y), lab, fill='black', font=F)
    for j, D in enumerate([A, B]):
        im = Image.open(os.path.join(D, n + '.png')).convert('RGB').resize((W, H), Image.LANCZOS); G.paste(im, (10 + j * (W + 20), y + 30))
G.save(out); print(out, G.size)
