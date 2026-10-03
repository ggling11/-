# 4단계 테마 1 '애니 셀' — splice40.py 끝에서 실행. 이 세션 파일만: splice41.py · parts/t1_*.js · 데이터 표 T1 · FONTS.t1 · PIPE 키 t1…
# 문자열 기준으로만 끼운다. splice 문자열 안 JS 주석은 /* */ 만.
T1_PARTS = []   # 순서대로 끼울 parts/t1_*.js (데이터 → 코드)
T1_DATA = part('t1_data.js') if os.path.exists(os.path.join(HERE, 'parts', 't1_data.js')) else ''
if T1_DATA:
    rep("""/* =============================================================================
 * 1b. BOSS RUSH DATA""", T1_DATA + """
/* =============================================================================
 * 1b. BOSS RUSH DATA""")
code = ''.join(part(n) for n in T1_PARTS if os.path.exists(os.path.join(HERE, 'parts', n)))
rep("const PIPE = window.PIPE = {           // dev hook", code + "\nconst PIPE = window.PIPE = {           // dev hook")
