# 테마 1 UI 목업 시트 (D2): 타이틀 · 전투 HUD · QTE · Esc 메뉴 · 결과 — python3 mockup_ui.py N → mockup_ui_vN.html
#   디자인 언어(레퍼런스 s1_06 · s1_vid_f01): 흰 바탕 · 연회색 사선 빗금 띠 · 큰 굵은 기하 산세리프(영문) + 가는 한글 · 점/막대 장식 · 빨간 원 도장 · 여백 많이
#   글꼴: Archivo Black(영문) · Noto Sans KR(한글) — OFL (npm @fontsource)
import sys, math
from mass import *
import chars6 as C
import portraits as PT
V = int(sys.argv[1]) if len(sys.argv) > 1 else 1
W, H = 1920, 1080
EN = "font-family:'Archivo Black';"; KO = "font-family:'Noto Sans KR';"

def T(x, y, s, size, col=INK, anchor='start', font=EN, weight=400, extra=''):
    return f'<text x="{x}" y="{y}" style="{font}font-weight:{weight};font-size:{size}px" fill="{col}" text-anchor="{anchor}" {extra}>{s}</text>'
def hatch(x, y, w, h, op=1.0, skew=0):
    tf = f' transform="skewX({skew})"' if skew else ''
    return f'<g{tf} opacity="{op}"><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#ebe5e4"/><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#hh)"/></g>'
def dots(x, y, n, gap=22, r=4, vertical=True, col=INK):
    return ''.join(f'<circle cx="{x + (0 if vertical else i * gap)}" cy="{y + (i * gap if vertical else 0)}" r="{r}" fill="{col}"/>' for i in range(n))
def stamp(cx, cy, r, txt, size, sub=None):
    o = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{RED}"/>' + T(cx, cy + size * 0.36, txt, size, PAPER, 'middle')
    if sub: o += T(cx, cy + r + 30, sub, 22, INK, 'middle')
    return o
def portrait(name, x, y, sc, flip=False, frame=True, skew=-10):
    g = PT.svg_group(name, 0, 0, 1.0, flip)
    clip = f'pc{name}{int(x)}{int(y)}'
    o = f'<clipPath id="{clip}"><rect x="0" y="0" width="200" height="240"/></clipPath>'
    o += f'<g transform="translate({x},{y}) scale({sc}) skewX({skew})"><rect x="0" y="0" width="200" height="240" fill="#fefefe"/><g clip-path="url(#{clip})" transform="skewX({-skew})">{g}</g>'
    if frame: o += f'<rect x="0" y="0" width="200" height="240" fill="none" stroke="{INK}" stroke-width="4"/>'
    return o + '</g>'
def char_svg(fn, G, yaw, pitch, scale, cw, ch, ox, oy, x, y):
    F = MFig(Cam(yaw, pitch, scale, ox, oy), cw, ch, G); fn(F); return F.svg(x, y)

def brush(x, y, sc=1.0, seed=1, col=INK, n=7):
    """붓글씨 획 (의미 없는 획 패턴 · 끝이 가늘어지는 굵은 획 + 갈고리) — 레퍼런스 s1_01 오른쪽 위 손글씨 레터링의 '느낌'만"""
    import random; r = random.Random(seed); o = []
    for i in range(n):
        kind = r.choice(['h', 'v', 'v', 'hook', 'dot'])
        cx, cy = x + r.uniform(-60, 60) * sc, y + (i - n / 2) * 34 * sc + r.uniform(-8, 8) * sc
        L = r.uniform(70, 150) * sc; w = r.uniform(14, 24) * sc
        if kind == 'h':
            o.append(f'<path d="M{cx - L / 2},{cy} Q{cx},{cy - w * 0.6} {cx + L / 2},{cy - w * 0.2} L{cx + L / 2 + w * 0.4},{cy + w * 0.5} Q{cx},{cy + w * 0.5} {cx - L / 2 - w * 0.2},{cy + w * 0.35} Z" fill="{col}"/>')
        elif kind == 'v':
            o.append(f'<path d="M{cx - w / 2},{cy - L / 2} L{cx + w / 2},{cy - L / 2 - w * 0.3} Q{cx + w * 0.6},{cy} {cx + w * 0.15},{cy + L / 2} L{cx - w * 0.25},{cy + L / 2 - w} Q{cx - w * 0.4},{cy} {cx - w / 2},{cy - L / 2} Z" fill="{col}"/>')
        elif kind == 'hook':
            o.append(f'<path d="M{cx - L / 2},{cy - L / 4} L{cx + L / 3},{cy - L / 4 - w * 0.3} L{cx + L / 3 + w * 0.6},{cy + L / 3} L{cx + L / 3 - w * 1.2},{cy + L / 4} L{cx + L / 3 - w * 0.4},{cy - L / 4 + w * 0.8} L{cx - L / 2},{cy - L / 4 + w * 0.7} Z" fill="{col}"/>')
        else:
            o.append(f'<path d="M{cx},{cy} q{w},{-w * 0.4} {w * 1.4},{w * 0.9} q{-w * 0.6},{w * 0.6} {-w * 1.4},{-w * 0.1} Z" fill="{col}"/>')
    return ''.join(o)

DEFS = ('<defs><pattern id="hh" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="#d3cccc" stroke-width="5"/></pattern>'
        '<pattern id="hk" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" fill="#fefefe"/><line x1="0" y1="0" x2="0" y2="16" stroke="#141112" stroke-width="6"/></pattern></defs>')

# --------------------------------------------------------------------------- 게임 화면 바탕 (목업용: 연회색 바닥 · 빗금 구역 · 검정 실루엣 소품 · 캐릭터 게임 카메라 그림)
def sfx(x, y, sc=1.0, seed=3, rot=-8):
    """손글씨 효과음 (붓 획 몇 개 + 짧은 꺾임) — 의미 없는 획"""
    return f'<g transform="translate({x},{y}) rotate({rot}) scale({sc})">' + brush(0, 0, 0.55, seed, INK, 4) + '</g>'
def game_bg(veil=0.0):
    o = [f'<rect width="{W}" height="{H}" fill="#fbf9f9"/>']
    o.append('<polygon points="0,700 1920,560 1920,640 0,780" fill="url(#hh)" opacity="0.9"/>')
    o.append(f'<ellipse cx="960" cy="590" rx="430" ry="150" fill="none" stroke="#c9bfc6" stroke-width="3"/>')
    o.append(f'<ellipse cx="760" cy="760" rx="110" ry="40" fill="#cfc4cc"/><ellipse cx="1180" cy="790" rx="110" ry="40" fill="#cfc4cc"/><ellipse cx="980" cy="610" rx="230" ry="80" fill="#cfc4cc"/>')
    o.append(f'<path d="M1920,0 L1920,420 C1840,380 1760,300 1700,160 C1680,100 1690,40 1700,0 Z" fill="{INK}"/>')
    o.append(char_svg(C.warden, C.WARDEN_G, -0.5, 0.82, 165, 700, 640, 350, 560, 630, 70))
    o.append(char_svg(C.rapier, C.RAPIER_G, -0.9, 0.82, 230, 320, 520, 160, 470, 600, 300))
    o.append(char_svg(C.great, C.GREAT_G, 0.6, 0.82, 230, 320, 520, 160, 470, 1020, 330))
    if veil: o.append(f'<rect width="{W}" height="{H}" fill="#fefefe" opacity="{veil}"/>')
    return ''.join(o)

# --------------------------------------------------------------------------- 1. 타이틀
def title():
    o = [f'<rect width="{W}" height="{H}" fill="#fefefe"/>', hatch(-40, 380, 2000, 300)]
    o.append(brush(1560, 640, 1.4, 11, INK, 6))
    o.append(f'<polygon points="0,1080 0,760 520,1080" fill="{INK}"/>')
    o.append(T(80, 330, 'CRIMSON', 250)); o.append(T(80, 600, 'ARENA', 250))
    o.append(char_svg(C.warden, C.WARDEN_G, -0.55, 0.05, 260, 900, 900, 450, 820, 980, 120))
    o.append(char_svg(C.rapier, C.RAPIER_G, -0.25, 0.04, 330, 420, 700, 210, 640, 760, 380))
    o.append(char_svg(C.great, C.GREAT_G, 0.35, 0.04, 330, 420, 700, 210, 640, 1180, 400))
    o.append(stamp(1720, 210, 96, 'DUO', 74))
    o.append(T(86, 664, '크림슨 아레나 · 듀오 보스러시', 36, INK, font=KO, weight=700))
    o.append(dots(44, 120, 4) + f'<circle cx="44" cy="232" r="13" fill="{INK}"/>' + dots(44, 268, 5, 20, 3.5))
    o.append(f'<rect x="38" y="430" width="12" height="70" fill="{INK}"/><rect x="38" y="510" width="12" height="16" fill="{INK}"/>')
    o.append(T(1870, 400, 'AZURE WARDEN · BOSS 02 · 애저 워든', 18, '#b0a3a5', font=KO, weight=700, extra='writing-mode="vertical-rl"'))
    o.append(f'<polygon points="60,868 640,868 620,948 40,948" fill="{PAPER}" stroke="{INK}" stroke-width="5"/>' + T(84, 926, 'PRESS ANY KEY', 54) + T(500, 1000, '아무 키나 누르세요', 26, PAPER, font=KO, weight=700))
    o.append(T(1240, 1046, 'PAD 1 READY', 20, '#6a494e')); o.append(f'<rect x="1640" y="1018" width="70" height="36" fill="{INK}"/>' + T(1675, 1044, 'ESC', 22, PAPER, 'middle') + T(1726, 1045, 'SETTINGS', 24))
    return ''.join(o)

# --------------------------------------------------------------------------- 2. 전투 HUD
def wave_rings(x, y, col, n_full):
    return ''.join((f'<circle cx="{x + i * 40}" cy="{y}" r="14" fill="{col if i < n_full else "#fefefe"}" stroke="{INK}" stroke-width="3"/>'
                    + (f'<path d="M{x + i * 40 - 8},{y} q4,-7 8,0 t8,0" fill="none" stroke="{PAPER if i < n_full else INK}" stroke-width="2.5"/>')) for i in range(3))
def skill_tile(x, y, key, glyph, cd=0.0):
    o = f'<g transform="translate({x},{y}) skewX(-10)"><rect width="78" height="78" fill="#fefefe" stroke="{INK}" stroke-width="4"/>{glyph}'
    if cd: o += f'<rect y="{78 * (1 - cd)}" width="78" height="{78 * cd}" fill="url(#hk)" opacity="0.55"/>'
    if key: o += f'<rect x="54" y="-12" width="34" height="34" fill="{INK}"/>' + T(71, 13, key, 22, PAPER, 'middle')
    return o + '</g>'
GLY_THRUST = f'<path d="M14,64 L60,18 M52,16 L62,16 L62,26" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="square"/>'
GLY_SPIN = f'<path d="M58,40 A20,20 0 1,1 40,20" stroke="{INK}" stroke-width="7" fill="none"/><path d="M36,10 L46,20 L34,28 Z" fill="{INK}"/>'
GLY_LAUNCH = f'<path d="M20,62 L40,22 L60,62" stroke="{INK}" stroke-width="7" fill="none"/><path d="M40,12 L50,26 L30,26 Z" fill="{INK}"/>'
GLY_SMASH = f'<path d="M40,12 L40,50" stroke="{INK}" stroke-width="8"/><path d="M16,62 L64,62" stroke="{INK}" stroke-width="7"/><path d="M28,50 L52,50 L40,60 Z" fill="{INK}"/>'
def player_panel(x, y, name, ko, por, col, waves, hp, keys, right=False, glyphs=(GLY_THRUST, GLY_SPIN)):
    o = [f'<g transform="translate({x},{y})">']
    o.append(f'<polygon points="30,0 560,0 530,170 0,170" fill="#fefefe" stroke="{INK}" stroke-width="4"/>')
    o.append('<polygon points="30,0 560,0 555,26 25,26" fill="url(#hh)"/>' + f'<rect x="{560 - 150}" y="0" width="120" height="8" fill="{col}"/>')
    o.append(portrait(por, 26, 30, 0.55, right))
    o.append(f'<polygon points="168,36 352,36 346,72 162,72" fill="{INK}"/>' + T(176, 66, name, 28, PAPER) + T(172, 96, ko, 18, INK, font=KO, weight=700))
    o.append(f'<rect x="170" y="112" width="190" height="16" fill="#fefefe" stroke="{INK}" stroke-width="3"/><rect x="172" y="114" width="{186 * hp}" height="12" fill="{INK}"/>')
    o.append(wave_rings(190, 150, col, waves))
    o.append(skill_tile(436, 40, keys[0] if keys else None, glyphs[0], 0.0) + skill_tile(436 + 0, 40, None, '', 0) if False else skill_tile(372, 52, keys[0] if keys else None, glyphs[0]) + skill_tile(462, 52, keys[1] if keys else None, glyphs[1], 0.45))
    o.append('</g>')
    return ''.join(o)
def hud():
    o = [game_bg()]
    o.append(f'<polygon points="700,22 1240,22 1222,86 682,86" fill="{INK}"/>' + T(960, 72, 'AZURE WARDEN', 46, PAPER, 'middle') + T(1262, 72, '애저 워든', 22, INK, 'start', KO, 700))
    o.append(f'<rect x="510" y="118" width="900" height="22" fill="#fefefe" stroke="{INK}" stroke-width="4"/><rect x="514" y="122" width="560" height="14" fill="{INK}"/><rect x="1074" y="122" width="60" height="14" fill="{RED}"/>')
    o.append(f'<rect x="510" y="146" width="320" height="6" fill="url(#hk)"/>')
    o.append(''.join(f'<rect x="{1428 + i * 24}" y="120" width="14" height="18" fill="{INK if i < 2 else "#fefefe"}" stroke="{INK}" stroke-width="3" transform="skewX(-10)"/>' for i in range(3)))
    o.append(T(960, 236, 'WIND THRUST', 78, INK, 'middle') + f'<rect x="760" y="250" width="400" height="8" fill="{BLUE}"/>' + T(960, 290, '바람 찌르기', 26, INK, 'middle', KO, 700))
    o.append(stamp(1560, 250, 58, '3', 70) + T(1560, 340, 'RALLY', 26, INK, 'middle'))
    o.append(sfx(820, 470, 1.0, 7, -12))
    o.append(player_panel(36, 880, 'SEIGEOM', '세검 · 1P', 'rapier', BLUE, 2, 0.72, ('U', 'I')))
    o.append(player_panel(1324, 880, 'DAEGEOM', '대검 · 2P', 'great', RED, 3, 0.55, None, True, (GLY_LAUNCH, GLY_SMASH)))
    return ''.join(o)

# --------------------------------------------------------------------------- 3. QTE
def qte():
    o = [game_bg(0.0)]
    o.append(f'<polygon points="0,790 1920,760 1920,1000 0,1030" fill="#fefefe"/><polygon points="0,790 1920,760 1920,1000 0,1030" fill="url(#hh)" opacity="0.6"/>')
    o.append(f'<polygon points="0,780 1920,750 1920,764 0,794" fill="{INK}"/>')
    o.append(f'<polygon points="60,96 900,96 884,196 44,196" fill="{INK}"/>' + T(90, 176, 'SHIELD CLASH', 84, PAPER) + T(64, 244, '방패 맞부딪침 · 번갈아 누르기', 30, INK, font=KO, weight=700))
    o.append(portrait('rapier', 40, 770, 1.0, False) + portrait('great', 1690, 740, 1.0, True))
    cells = [('H', BLUE, 'ok'), ('G', RED, 'ok'), ('U', BLUE, 'fail'), ('T', RED, 'now'), ('Y', BLUE, ''), ('G', RED, '')]
    for i, (k, col, st) in enumerate(cells):
        cx, cy = 400 + i * 190, 892 - i * 3; s_ = 1.3 if st == 'now' else 1.0; w = 118 * s_
        g = f'<g transform="translate({cx},{cy}) skewX(-8)">'
        if st == 'ok': g += f'<rect x="{-w / 2}" y="{-w / 2}" width="{w}" height="{w}" fill="{RED}" stroke="{INK}" stroke-width="5"/>' + T(0, 26, k, 76, PAPER, 'middle')
        elif st == 'fail': g += f'<rect x="{-w / 2}" y="{-w / 2}" width="{w}" height="{w}" fill="#fefefe" stroke="{INK}" stroke-width="5"/>' + T(0, 26, k, 76, '#b0a3a5', 'middle')
        elif st == 'now': g += f'<rect x="{-w / 2}" y="{-w / 2}" width="{w}" height="{w}" fill="{INK}"/>' + T(0, 34, k, 100, PAPER, 'middle') + f'<rect x="{-w / 2}" y="{w / 2 - 14}" width="{w}" height="14" fill="{col}"/>'
        else: g += f'<rect x="{-w / 2}" y="{-w / 2}" width="{w}" height="{w}" fill="#fefefe" stroke="{INK}" stroke-width="5"/>' + T(0, 26, k, 76, INK, 'middle') + f'<rect x="{-w / 2 + 8}" y="{w / 2 - 16}" width="{w - 16}" height="8" fill="{col}"/>'
        o.append(g + '</g>')
        if st == 'fail': o.append(f'<path d="M{cx - 54},{cy - 54} L{cx + 54},{cy + 54} M{cx + 54},{cy - 54} L{cx - 54},{cy + 54}" stroke="{INK}" stroke-width="16"/>')
    o.append(T(330, 990, '2 / 6', 30) + T(420, 990, '칸 아래 색 = 누를 사람 (파랑 1P · 빨강 2P)', 22, INK, font=KO, weight=700))
    o.append(sfx(1500, 420, 1.2, 9, 6))
    return ''.join(o)

# --------------------------------------------------------------------------- 4. Esc 메뉴
def menu():
    o = [game_bg(0.45)]
    o.append(f'<polygon points="0,0 900,0 760,1080 0,1080" fill="{INK}"/>')
    o.append(f'<polygon points="0,0 900,0 893,46 0,46" fill="url(#hh)" opacity="0.35"/>')
    o.append(T(70, 200, 'PAUSED', 140, PAPER) + T(76, 250, '일시 정지 · 게임이 멈춰 있어요', 26, PAPER, font=KO, weight=700))
    o.append(brush(820, 560, 0.9, 5, '#3a3335', 5))
    big = [('RESUME', ''), ('PLAYERS', 'ALONE (TAG SOLO)')]
    small = [('CONTROLS', ''), ('GAMEPAD', 'PAD 1 READY'), ('RENDER SCALE', 'AUTO 100%'), ('ART THEME', '1 ANIME CEL'), ('EFFECTS', 'NAME ONLY'), ('SHAKE', '100%'), ('2P KEYS ON HUD', 'OFF'), ('SOUND', 'ON')]
    y = 350
    for k, v in big:
        o.append(T(80, y, k, 52, PAPER) + (T(700, y, v, 24, PAPER, 'end', KO, 700) if v else '')); y += 72
    o.append(T(80, y - 6, 'SETTINGS', 20, '#b0a3a5') + f'<rect x="210" y="{y - 14}" width="460" height="3" fill="#6a6264"/>'); y += 40
    for i, (k, v) in enumerate(small):
        sel = k == 'ART THEME'; xo = -int((y - 350) * 0.13)
        if sel: o.append(f'<polygon points="{40 + xo},{y - 34} {740 + xo},{y - 34} {734 + xo},{y + 12} {34 + xo},{y + 12}" fill="{RED}"/>')
        o.append(T(80 + xo, y, k, 30, PAPER) + (T(700 + xo, y, v, 22, PAPER, 'end', KO, 700) if v else '')); y += 52
    o.append(T(80, y + 30, 'RESTART', 52, PAPER))
    o.append(T(70, 1040, '↑↓ SELECT   ←→ CHANGE   ESC BACK', 20, '#b0a3a5'))
    o.append(dots(960, 120, 6, 24) + f'<rect x="954" y="290" width="12" height="80" fill="{INK}"/>')
    return ''.join(o)

# --------------------------------------------------------------------------- 5. 결과
def result():
    o = [f'<rect width="{W}" height="{H}" fill="#fefefe"/>', hatch(-40, 200, 2000, 330)]
    o.append(T(70, 470, 'VICTORY', 300)); o.append(stamp(1640, 300, 120, '格', 120) if False else stamp(1660, 330, 120, 'WIN', 78))
    o.append(T(80, 584, '애저 워든 격파 · 듀오 보스러시', 32, INK, font=KO, weight=700))
    o.append(brush(1820, 760, 1.0, 21, INK, 6))
    o.append(portrait('rapier', 80, 640, 1.5) + portrait('great', 420, 640, 1.5, True) + portrait('warden', 1580, 560, 1.1))
    o.append(f'<path d="M1590,580 L1790,820 M1790,580 L1590,820" stroke="{RED}" stroke-width="16"/>')
    stats = [('TIME', '2:18.4'), ('PERFECT PARRY', '12'), ('RALLY MAX', '5'), ('FINISHERS', '7'), ('QTE', '6 / 6')]
    for i, (k, v) in enumerate(stats):
        y = 700 + i * 60; o.append(f'<rect x="820" y="{y - 32}" width="12" height="38" fill="{INK}"/>' + T(850, y, k, 30) + T(1440, y, v, 40, INK, 'end'))
        o.append(f'<line x1="850" y1="{y + 14}" x2="1440" y2="{y + 14}" stroke="#d3cccc" stroke-width="2"/>')
    o.append(f'<polygon points="820,996 1540,996 1528,1056 808,1056" fill="{INK}"/>' + T(844, 1040, 'PRESS ANY KEY — RESTART', 36, PAPER) + T(1560, 1040, '아무 키 = 다시', 24, INK, font=KO, weight=700))
    return ''.join(o)

screens = [('01 TITLE', '타이틀', title()), ('02 BATTLE HUD', '전투 HUD', hud()), ('03 QTE', 'QTE (번갈아 누르기)', qte()), ('04 MENU', 'Esc 메뉴 (멈춤)', menu()), ('05 RESULT', '결과', result())]
css = ("@font-face{font-family:'Archivo Black';src:url(archivo-black-latin-400-normal.woff2) format('woff2')}"
       "@font-face{font-family:'Noto Sans KR';font-weight:400;src:url(noto-sans-kr-korean-400-normal.woff2) format('woff2'),url(noto-sans-kr-latin-400-normal.woff2) format('woff2')}"
       "@font-face{font-family:'Noto Sans KR';font-weight:700;src:url(noto-sans-kr-korean-700-normal.woff2) format('woff2'),url(noto-sans-kr-latin-700-normal.woff2) format('woff2')}"
       "body{margin:0;background:#fefefe;width:1940px}.g{display:grid;grid-template-columns:960px 960px;gap:20px;padding:0 0 20px 0}.c{width:960px}.c svg{width:960px;height:540px;display:block;outline:2px solid #141112}"
       ".h{font-family:'Archivo Black';font-size:20px;margin:14px 0 6px}.h span{font-family:'Noto Sans KR';font-size:14px;color:#6a494e;margin-left:10px}"
       ".top{height:70px;background:repeating-linear-gradient(45deg,#ebe5e4 0 9px,#d3cccc 9px 13px);display:flex;align-items:center;padding-left:24px;font-family:'Archivo Black';font-size:30px;margin-bottom:6px}"
       ".note{font-family:'Noto Sans KR';font-size:15px;line-height:1.7;padding:6px 4px}")
html = [f"<!doctype html><html><head><meta charset='utf-8'><style>{css}</style></head><body><div class='top'>UI MOCKUP · 애니 셀 v{V}</div><div class='g'>"]
for name, ko, svg in screens:
    html.append(f"<div class='c'><div class='h'>{name}<span>{ko}</span></div><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {H}'>{DEFS}{svg}</svg></div>")
html.append("<div class='c note'><b>UI 움직임</b><br>— 패널: 사선으로 미끄러져 들어옴 (0.18초)<br>— 기술명: 굵은 글자가 '탁' 찍히듯 (0.1초, 0.8초 표시 안에서만)<br>— PERFECT · 랠리: 빨간 원 도장이 찍힘<br>— 화면 전환: 사선 빗금 와이프<br>— 피격: 체력 막대가 짧게 흑백 반전<br>— QTE: 지금 칸이 커지고 검은 틀 · 성공 = 빨간 도장 · 실패 = 검정 X<br><b>규칙</b> 화면 글자 동시 3개 이하 · 싸우는 화면에는 1P 키만 · 기술명은 늘 같은 자리(위 가운데)</div>")
html.append('</div></body></html>')
open(f'mockup_ui_v{V}.html', 'w').write(''.join(html)); print('wrote', f'mockup_ui_v{V}.html')
