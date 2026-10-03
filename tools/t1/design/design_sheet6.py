# 테마 1 디자인 시트 v6 (D1 3회째): 덩어리 렌더러 — python3 design_sheet6.py → design_sheet_v6.svg
import math
from mass import *
import chars6 as C

def swap(groups, a, b):
    g = [x[0] for x in groups]; i, j = g.index(a), g.index(b); out = list(groups); out[i], out[j] = out[j], out[i]; return out

def draw(fn, groups, yaw, pitch, scale, W, H, ox, oy, x, y, side=False):
    G = groups
    if side:   # 측면(오른쪽을 봄): 캐릭터 오른쪽 팔이 앞으로
        for a, b in (('armR', 'armL'), ('glvR', 'glvL')):
            if a in [q[0] for q in G] and b in [q[0] for q in G]: G = swap(G, a, b)
    F = MFig(Cam(yaw, pitch, scale, ox, oy), W, H, G); fn(F); return F.svg(x, y)

def label(x, y, t, size=14, col=INK, anchor='start'):
    return f'<text x="{x}" y="{y}" font-family="Archivo Black, Arial Black, sans-serif" font-weight="900" font-size="{size}" fill="{col}" text-anchor="{anchor}">{t}</text>'
def klabel(x, y, t, size=12, col='#6a494e', anchor='start', w=400):
    return f'<text x="{x}" y="{y}" font-family="Noto Sans KR, sans-serif" font-weight="{w}" font-size="{size}" fill="{col}" text-anchor="{anchor}">{t}</text>'
def shadow(cx, cy, rx, ry): return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{SH2}"/>'

W, H = 1900, 1340
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
     '<defs><pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" stroke="#cdc6c6" stroke-width="3"/></pattern></defs>',
     f'<rect width="{W}" height="{H}" fill="#fefefe"/>',
     f'<rect x="0" y="34" width="{W}" height="54" fill="#e9e4e4"/><rect x="0" y="34" width="{W}" height="54" fill="url(#hatch)"/>',
     label(40, 74, 'CHARACTER SHEET', 32), klabel(400, 72, '애니 셀 · 테마 1 · 실루엣 시트 v6', 16, INK),
     f'<circle cx="{W-70}" cy="61" r="21" fill="{RED}"/>', label(W - 70, 68, '01', 15, PAPER, 'middle')]
for i in range(6): o.append(f'<circle cx="{W-130-i*13}" cy="61" r="2.6" fill="{INK}"/>')
o.append(f'<rect x="{W-34}" y="140" width="4" height="60" fill="{INK}"/><rect x="{W-34}" y="210" width="4" height="12" fill="{INK}"/>')
CH = [('SEIGEOM', '세검 · 청 · 1P', C.rapier, C.RAPIER_G, 110, ['머리카락 = 등까지 흘러내리는 검정 한 덩어리 · 끝만 가닥', '코트 = 무릎까지 검정 한 덩어리 (뾰족한 끝 3개) · 검정 하의', '흰 셔츠 · 넓은 소매 · 세운 깃 + 회보라 그림자 1단', '파랑 = 머리카락 브리지 · 허리 장식 끈 · 눈가 선 / 금 = 세검 고리', '7.6등신 · 좁은 어깨 · 잘록한 허리 · 오른다리에 무게']),
      ('DAEGEOM', '대검 · 적 · 2P', C.great, C.GREAT_G, 640, ['흰 긴 코트 = 빨강 허리띠로 조이고 아래가 갈라져 다리가 보임', '검정 속옷 · 넓은 하의 · 장갑 · 부츠 = 검정 덩어리', '빨강 = 허리띠 · 늘어진 끝 · 손잡이 · 눈가 선 · 꼬리머리 한 가닥', '대검 = 곧은 큰 검정 날 + 흰 날 선 + 금 코등이 (어깨에 걸쳐 대각선)', '7.8등신 · 높게 묶은 꼬리머리'])]
for en, ko, fn, G, y0, notes in CH:
    base = y0 + 450
    o.append(shadow(150, base, 72, 12)); o.append(draw(fn, G, -0.32, 0.0, 225, 320, 520, 160, 470, -10, base - 470))
    o.append(shadow(395, base, 60, 11)); o.append(draw(fn, G, math.pi / 2, 0.0, 225, 320, 520, 160, 470, 235, base - 470, side=True))
    gy = base - 70; o.append(shadow(625, gy, 74, 30)); o.append(draw(fn, G, -0.55, 0.82, 225, 320, 520, 160, 470, 465, gy - 470))
    o.append(f'<rect x="34" y="{y0 - 16}" width="200" height="58" fill="#fefefe" opacity="0.92"/>'); o.append(label(40, y0 + 12, en, 26)); o.append(klabel(40, y0 + 34, ko, 14, INK))
    for k, t in enumerate(['FRONT 3/4 정면', 'SIDE 측면', 'GAME CAM 47°']): o.append(klabel(100 + k * 240, y0 + 490, t, 12))
    for k, n in enumerate(notes): o.append(klabel(800, y0 + 130 + k * 28, '— ' + n, 14, INK))
o.append(label(1220, 132, 'AZURE WARDEN', 26)); o.append(klabel(1220, 154, '애저 워든 · 흰 페럿형 수호자 · 보스 2 (캐릭터의 약 1.6배 키)', 14, INK))
o.append(shadow(1400, 760, 150, 22)); o.append(draw(C.warden, C.WARDEN_G, -0.6, 0.0, 215, 560, 700, 280, 630, 1120, 130))
o.append(shadow(1740, 760, 110, 18)); o.append(draw(C.warden, C.WARDEN_G, math.pi / 2, 0.0, 150, 420, 560, 200, 500, 1560, 260, side=True))
o.append(shadow(1700, 1110, 120, 44)); o.append(draw(C.warden, C.WARDEN_G, -0.6, 0.82, 130, 420, 520, 200, 460, 1500, 650))
for t, x, y in (('FRONT 3/4 정면', 1330, 800), ('SIDE 측면', 1690, 800), ('GAME CAM 47°', 1640, 1160)): o.append(klabel(x, y, t, 12))
wn = ['몸 = 크고 둥근 흰 털 덩어리 (서 있는 페럿) · 굵은 S자 목 · 작은 머리', '털 = 실루엣의 큰 뭉치 몇 개 · 회보라 그림자 경계는 털뭉치 모양', '검정 = 어깨 망토 (끝 3개) · 꼬리 끝 · 발톱 · 방패', '붉은 실눈 · 작은 둥근 귀 · 짧은 주둥이 / 몸 일부에 붓글씨 획', '검정 타원 방패 + 빨강 원 도장 + 흰 붓 획']
for k, n in enumerate(wn): o.append(klabel(1220, 860 + k * 28, '— ' + n, 14, INK))
o.append(f'<rect x="0" y="1190" width="{W}" height="3" fill="#e2dcdc"/>')
sw = [(INK, '검정 #141112'), (PAPER, '흰 #fdfbfb'), (SH, '흰 면 그림자 #b0a3a5'), (SH2, '연회색'), (SKIN, '피부'), (SKSH, '피부 그림자'), (BLUE, '청 강조'), (RED, '적 강조'), (GOLD, '금 (보조)')]
for k, (c, n) in enumerate(sw): o.append(f'<rect x="{40 + k * 165}" y="1212" width="16" height="16" fill="{c}" stroke="{INK}"/>' + klabel(62 + k * 165, 1225, n, 11, INK))
o.append(klabel(40, 1275, '규칙: 셀 1단 · 경계 딱 끊김 · 확신 있는 얇은 검정 선 · 큰 덩어리 하나 + 뾰족한 끝 몇 개 · 안쪽 선은 정해진 자리만 · 강조색 2% 안팎 · 얼굴 세부는 초상(UI)', 14, INK))
o.append(klabel(40, 1302, '게임 카메라(원근 · 47° · 서 있는 키 화면 15%) → 머리카락 덩어리 · 코트 끝 · 무기 대각선 · 흑백 면 배치로 읽히게', 14, INK))
o.append('</svg>')
open('design_sheet_v6.svg', 'w').write(''.join(o)); print('wrote design_sheet_v6.svg')
