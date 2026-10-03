# 테마 1 디자인 시트 v3+ (D1): 3D 관절 퍼펫(figure.py · chars.py)을 정면 3/4 · 측면 · 게임 카메라로 투영
#   python3 design_sheet3.py N → design_sheet_vN.svg
import sys, math
from figure import *
import chars
V = int(sys.argv[1]) if len(sys.argv) > 1 else 3

def draw(fn, yaw, pitch, scale, ox, oy, seed=3):
    F = Fig(Cam(yaw, pitch, scale, ox, oy), seed); fn(F); return F.svg()

def label(x, y, t, size=14, col=INK, anchor='start'):
    return f'<text x="{x}" y="{y}" font-family="Archivo Black, Arial Black, sans-serif" font-weight="900" font-size="{size}" fill="{col}" text-anchor="{anchor}">{t}</text>'
def klabel(x, y, t, size=12, col='#6a494e', anchor='start', w=400):
    return f'<text x="{x}" y="{y}" font-family="Noto Sans KR, sans-serif" font-weight="{w}" font-size="{size}" fill="{col}" text-anchor="{anchor}">{t}</text>'
def shadow(cx, cy, rx, ry): return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{SH2}"/>'

W, H = 1900, 1340
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
     '<defs><pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" stroke="#cdc6c6" stroke-width="3"/></pattern>'
     '<filter id="wob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter><filter id="hand" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter></defs>',
     f'<rect width="{W}" height="{H}" fill="#fefefe"/>',
     f'<rect x="0" y="34" width="{W}" height="54" fill="#e9e4e4"/><rect x="0" y="34" width="{W}" height="54" fill="url(#hatch)"/>',
     label(40, 74, 'CHARACTER SHEET', 32), klabel(400, 72, f'애니 셀 · 테마 1 · 실루엣 시트 v{V}', 16, INK),
     f'<circle cx="{W-70}" cy="61" r="21" fill="{RED}"/>', label(W - 70, 68, '01', 15, PAPER, 'middle')]
for i in range(6): o.append(f'<circle cx="{W-130-i*13}" cy="61" r="2.6" fill="{INK}"/>')
o.append(f'<rect x="{W-34}" y="140" width="4" height="60" fill="{INK}"/><rect x="{W-34}" y="210" width="4" height="12" fill="{INK}"/>')
o.append('<g filter="url(#hand)">')
CH = [('SEIGEOM', '세검 · 청 · 1P', chars.rapier, 120, ['검정 롱코트(소매 없음) · 하의 · 장갑 · 구두 = 순수 검정 덩어리', '흰 셔츠 · 넓은 소매 · 세운 깃 + 회보라 그림자 1단', '파랑 = 머리카락 브리지 · 허리 장식 끈 · 칼 술 · 눈가 선', '가는 세검 (흰 칼날 · 금 고리) · 검정 칼집 · 7.6등신']),
      ('DAEGEOM', '대검 · 적 · 2P', chars.great, 650, ['흰 긴 코트 (무게로 늘어진 천 · 넓은 소매) = 흰 면 넓게', '검정 속옷 · 넓은 하의 · 장갑 · 부츠 = 검정 덩어리', '빨강 = 허리띠 · 늘어진 끈 · 손잡이 · 술 · 눈가 선 · 꼬리머리 한 가닥', '어깨에 걸친 큰 검정 칼날 (대각선) + 흰 날 선 · 7.8등신'])]
for en, ko, fn, y0, notes in CH:
    base = y0 + 440
    o.append(shadow(150, base, 70, 12)); o.append(draw(fn, -0.32, 0.0, 215, 150, base))
    o.append(shadow(390, base, 60, 11)); o.append(draw(fn, math.pi / 2, 0.0, 215, 390, base))
    gy = base - 70; o.append(shadow(610, gy, 72, 30)); o.append(draw(fn, -0.55, 0.82, 215, 610, gy))
o.append('</g>')
for en, ko, fn, y0, notes in CH:
    o.append(f'<rect x="34" y="{y0 - 16}" width="170" height="58" fill="#fefefe" opacity="0.92"/>'); o.append(label(40, y0 + 12, en, 26)); o.append(klabel(40, y0 + 34, ko, 14, INK))
    for k, t in enumerate(['FRONT 3/4 정면', 'SIDE 측면', 'GAME CAM 47°']): o.append(klabel(90 + k * 235, y0 + 480, t, 12))
    for k, n in enumerate(notes): o.append(klabel(760, y0 + 140 + k * 28, '— ' + n, 14, INK))
# 워든 (캐릭터와 같은 축척 기준 0.7배로 줄여 그림 → 실제로는 캐릭터의 약 1.6배 키)
o.append(label(1180, 132, 'AZURE WARDEN', 26)); o.append(klabel(1180, 154, '애저 워든 · 선 흰 담비형 수호자 · 보스 2 (캐릭터의 약 1.6배 키)', 14, INK))
o.append('<g filter="url(#hand)">')
o.append(shadow(1330, 760, 130, 20)); o.append(draw(chars.warden, -0.75, 0.0, 200, 1340, 760))
o.append(shadow(1700, 760, 90, 16)); o.append(draw(chars.warden, math.pi / 2, 0.0, 140, 1690, 760))
o.append(shadow(1690, 1120, 120, 44)); o.append(draw(chars.warden, -0.6, 0.82, 120, 1690, 1120))
o.append('</g>')
for t, x, y in (('FRONT 3/4 정면', 1260, 800), ('SIDE 측면', 1620, 800), ('GAME CAM 47°', 1640, 1160)): o.append(klabel(x, y, t, 12))
wn = ['흰 털 S자 몸 (넓은 엉덩이 → 배 → 긴 목 앞으로) · 털 끝 불규칙 실루엣', '작은 머리 · 긴 주둥이 · 작은 둥근 귀 · 붉은 실눈', '검정 = 망토(찢긴 끝) · 꼬리 끝 · 발톱 · 방패', '검정 타원 방패 + 빨강 원 도장 + 흰 붓 획 · 붓글씨 문신 획', '긴 꼬리 (땅을 짚고 휘어 오름 · 2차 움직임)']
for k, n in enumerate(wn): o.append(klabel(1180, 880 + k * 28, '— ' + n, 14, INK))
o.append(f'<rect x="0" y="1190" width="{W}" height="3" fill="#e2dcdc"/>')
sw = [(INK, '검정 #141112'), (PAPER, '흰 #fdfbfb'), (SH, '흰 면 그림자 #b0a3a5'), (SH2, '연회색'), (SKIN, '피부'), (SKSH, '피부 그림자'), (BLUE, '청 강조'), (RED, '적 강조'), (GOLD, '금 (보조)')]
for k, (c, n) in enumerate(sw): o.append(f'<rect x="{40 + k * 165}" y="1212" width="16" height="16" fill="{c}" stroke="{INK}"/>' + klabel(62 + k * 165, 1225, n, 11, INK))
o.append(klabel(40, 1275, '규칙: 셀 1단 · 경계 딱 끊김 · 굵기가 변하는 얇은 검정 선 · 안쪽 선은 정해진 자리(소매 · 코트 꺾임)만 · 강조색 화면 비중 2% 안팎 · 얼굴 세부는 초상(UI)에서', 14, INK))
o.append(klabel(40, 1302, '게임 카메라(원근 · 47° · 서 있는 키 화면 15%)에서는 얼굴이 안 보임 → 머리카락 덩어리 · 코트 자락 · 무기 대각선 · 흑백 면 배치로 읽히게', 14, INK))
o.append('</svg>')
open(f'design_sheet_v{V}.svg', 'w').write(''.join(o)); print('wrote', f'design_sheet_v{V}.svg')
