# 장면 png 여러 장 → 한 장 격자 (검토용): python3 grid.py OUT.png COLS W a.png b.png ...
import sys
from PIL import Image, ImageDraw
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); fs = sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in fs]; h = int(w * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols; G = Image.new('RGB', (cols * w, rows * (h + 18)), 'white'); d = ImageDraw.Draw(G)
for i, (im, f) in enumerate(zip(ims, fs)):
    x, y = (i % cols) * w, (i // cols) * (h + 18); G.paste(im.resize((w, h), Image.LANCZOS), (x, y + 18)); d.text((x + 4, y + 3), f.split('/')[-1], fill='black')
G.save(out)
