# 4단계 T1 브라우저 도구 공용 (헤드리스 Chromium · SwiftShader — 프레임 시간은 실제 GPU가 아님)
import os, json
from playwright.sync_api import sync_playwright
BASE = os.environ.get('T1_URL', 'http://127.0.0.1:8766/')
EXE = os.environ.get('T1_CHROME', '/opt/pw-browsers/chromium')
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
def launch(p):
    return p.chromium.launch(executable_path=EXE, args=ARGS)
# 결정적 장면: Math.random을 시드 난수로 (봇 · 연출 입자) + PIPE가 생기는 순간 멈춤 (헤드리스는 rAF가 느려 실제 시간 프레임이 섞이면 장면이 매번 다름)
FREEZE = """(() => { let a = 12345; window.__seedRand = n => { a = n | 0; };
  Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let P; Object.defineProperty(window, 'PIPE', { configurable: true, get() { return P; }, set(v) { P = v; if (v) v.paused = true; } }); })()"""
def open_page(b, page='index.html', w=1440, h=810, query='', logs=None, init=None, freeze=True):
    pg = b.new_page(viewport={'width': w, 'height': h})
    L = logs if logs is not None else []
    pg.on('pageerror', lambda e: L.append('ERR ' + str(e)))
    pg.on('console', lambda m: L.append(m.type + ': ' + m.text) if m.type in ('error',) else None)
    if freeze: pg.add_init_script(FREEZE)
    if init: pg.add_init_script(init)
    pg.goto(BASE + page + query)
    pg.wait_for_function('window.PIPE !== undefined', timeout=120000)
    pg.logs = L
    return pg
# 장면 준비: 효과 타이머 0 (흑백 카드 · 글리치 · 배너) — 앞 장면 효과가 새지 않게
RESET_FX = """(() => { const P = window.PIPE; P.Game.bannerT = 0; P.Game.noteT = 0; if (P.Style) { P.Style.glitchT = 0; P.Style.monoT = 0; }
  if (P.t1 && P.t1.resetFx) P.t1.resetFx(); })()"""
