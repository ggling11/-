# R1 · R2 · R3 판독성 (Oklab): python3 r123.py OUT.json p1.png tele.png qte.png
#   R1: 두 플레이어 대표색(청 · 적) Oklab 색차 ≥ 0.15 — 팔레트 값 + 전투 화면에서 실제로 보이는 픽셀(가장 가까운 색) 평균
#   R2: 바닥 위험 표시(예고 장판) ↔ 바닥 밝기 차(Oklab L) ≥ 0.25 — 예고 캡처에서 장판 안쪽 상자 vs 바닥 상자 (상자는 장판 거울 위치를 화면에 투영해 고름)
#   R3: QTE 칸 — 성공(빨강) · 지금(검정) · 대기(흰) 칸 배경과 글자색의 L 차 · 칸끼리 색차
import sys, json, numpy as np
from PIL import Image
def lin(c): c = np.asarray(c, float) / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def oklab(rgb):
    r, g, b = np.moveaxis(lin(rgb), -1, 0)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b; m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b; s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], -1)
hexrgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]
if __name__ == '__main__':
    out, p1, tele, qte = sys.argv[1:5]
    BLUE, RED, INK, PAPER = '#2350b8', '#c8102e', '#141112', '#fdfbfb'
    res = {}
    d = float(np.linalg.norm(oklab(hexrgb(BLUE)) - oklab(hexrgb(RED))))
    im = np.asarray(Image.open(p1).convert('RGB')).reshape(-1, 3); lab = oklab(im)
    near = lambda h: np.linalg.norm(lab - oklab(hexrgb(h)), axis=1) < 0.08
    bp, rp = lab[near(BLUE)], lab[near(RED)]
    dm = float(np.linalg.norm(bp.mean(0) - rp.mean(0))) if len(bp) and len(rp) else 0
    res['R1'] = {'palette_dE': round(d, 3), 'screen_dE': round(dm, 3), 'blue_px': int(len(bp)), 'red_px': int(len(rp)), 'ok': d >= 0.15 and dm >= 0.15}
    # R3: QTE 칸 (팔레트): 성공 = 빨강 칸 + 흰 글자 · 지금 = 검정 칸 + 흰 글자 · 대기 = 흰 칸 + 먹 글자 · 실패 = 흰 칸 + 회색 글자 + 검정 X
    L = lambda h: float(oklab(hexrgb(h))[0]); E = lambda a, b: float(np.linalg.norm(oklab(hexrgb(a)) - oklab(hexrgb(b))))
    cells = {'ok': (RED, PAPER), 'now': (INK, PAPER), 'wait': (PAPER, INK), 'fail': (PAPER, '#b0a3a5')}
    res['R3'] = {'text_dL': {k: round(abs(L(a) - L(b)), 3) for k, (a, b) in cells.items()}, 'cell_dE': {'ok-now': round(E(RED, INK), 3), 'ok-wait': round(E(RED, PAPER), 3), 'now-wait': round(E(INK, PAPER), 3)},
      'note': '판정 칸 색 · 키 글자 대비 (실패 칸은 글자 대신 검정 X가 판독 기호). 캡처: R4_*_qte.png (3해상도) · 반쯤 깨진 순간 = 5칸 중 2칸 완료'}
    res['R3']['ok'] = min(v for k, v in res['R3']['text_dL'].items() if k != 'fail') >= 0.4 and min(res['R3']['cell_dE'].values()) >= 0.25
    json.dump(res, open(out, 'w'), indent=1); print(json.dumps(res))
