# SVG/HTML → PNG (헤드리스 셸) — python3 shot_svg.py in.svg|in.html out.png [W H]
# file:// + 전체 페이지 캡처 + wait_for_timeout이 이 환경에서 멈춰서, 로컬 서버(T1_URL)에 복사해 화면 크기 그대로 찍는다
import sys, os, shutil, time
from playwright.sync_api import sync_playwright
SERVE = os.environ.get('T1_SERVE', '/tmp/claude-0/-home-user--/08071676-353f-5c03-bc60-9c1cf4e58025/scratchpad/serve')
URL = os.environ.get('T1_URL', 'http://127.0.0.1:8766/')
SHELL = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'
src, out = sys.argv[1], sys.argv[2]; W = int(sys.argv[3]) if len(sys.argv) > 3 else 1600; H = int(sys.argv[4]) if len(sys.argv) > 4 else 1000
name = '_shot_' + os.path.basename(src); shutil.copy(src, os.path.join(SERVE, name))
src_dir = os.path.dirname(os.path.abspath(src))
for f in os.listdir(src_dir):   # 같은 폴더의 그림 · 글꼴도 같이 (HTML 목업이 상대 경로로 부름)
    if f.lower().endswith(('.png', '.jpg', '.woff2', '.css', '.js')) and not f.startswith('_shot_'): shutil.copy(os.path.join(src_dir, f), os.path.join(SERVE, f))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=SHELL); pg = b.new_page(viewport={'width': W, 'height': H})
    pg.goto(URL + name); time.sleep(0.6); pg.screenshot(path=out, timeout=60000); b.close()
print('saved', out)
