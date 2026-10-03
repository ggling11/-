# 레퍼런스 묶음 시트 (블라인드 패널용, 이름 없이): python3 refsheet.py OUT.png
import sys, glob, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, '..', 'style', 'ref4', 's1_anime_cel')
fs = sorted(glob.glob(D + '/s1_0*.jpg')) + [D + '/s1_vid_f01.png']
cw, ch, cols = 480, 360, 5; rows = (len(fs) + cols - 1) // cols
G = Image.new('RGB', (cols * cw, rows * ch), 'white')
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB'); im.thumbnail((cw - 8, ch - 8), Image.LANCZOS)
    G.paste(im, ((i % cols) * cw + (cw - im.width) // 2, (i // cols) * ch + (ch - im.height) // 2))
G.save(sys.argv[1]); print(sys.argv[1], G.size)
