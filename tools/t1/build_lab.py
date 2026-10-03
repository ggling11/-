# 랩 lab4_t1.html 만들기: 테마 1 모듈(parts/t1_*.js) + 랩 드라이버를 한 파일로 (3단계 코드 없음)
import os
HERE = os.path.dirname(os.path.abspath(__file__)); PARTS = os.path.join(HERE, '..', 'build', 'parts')
ORDER = ['t1_data.js', 't1_fonts.js', 't1_portraits.js', 't1_render.js', 't1_model.js', 't1_chars.js', 't1_arena.js', 't1_fx.js', 't1_hud.js']
src = ''.join(open(os.path.join(PARTS, n), encoding='utf8').read() + '\n' for n in ORDER if os.path.exists(os.path.join(PARTS, n)))
drv = open(os.path.join(HERE, 'lab', 'lab_driver.js'), encoding='utf8').read()
html = f"""<!doctype html><html><head><meta charset="utf-8"><title>LAB4 T1 Anime Cel</title>
<style>html,body{{margin:0;background:#f7f3f3;overflow:hidden}}canvas{{display:block;position:absolute;left:0;top:0}}</style></head><body>
<canvas id="c"></canvas><canvas id="hud"></canvas>
<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
{src}
{drv}
</script></body></html>"""
out = os.path.join(HERE, '..', 'style', 'lab4_t1.html'); open(out, 'w', encoding='utf8').write(html); print('lab', out, len(html))
