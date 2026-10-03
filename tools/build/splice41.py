# 4단계 테마 1 '애니 셀' — splice40.py 끝에서 실행. 이 세션 파일만: splice41.py · parts/t1_*.js · 데이터 표 T1 · FONTS.t1 · PIPE 키 t1…
# 문자열 기준으로만 끼운다. splice 문자열 안 JS 주석은 /* */ 만.
T1_DATA_PARTS = ['t1_data.js', 't1_poses.js', 't1_fonts.js', 't1_portraits.js']          # 데이터: 1b BOSS RUSH DATA 앞 (공통 0d 다음)
T1_CODE_PARTS = ['t1_render.js', 't1_model.js', 't1_chars.js', 't1_arena.js', 't1_fx.js',
                 't1_hud.js', 't1_pose.js', 't1_theme.js', 't1_ui.js']     # 코드: PIPE 바로 앞 (공통 훅 다음 · ART.themes[1] 등록)
data = ''.join(part(n) for n in T1_DATA_PARTS)
rep("""/* =============================================================================
 * 1b. BOSS RUSH DATA""", data + """
/* =============================================================================
 * 1b. BOSS RUSH DATA""")
code = ''.join(part(n) for n in T1_CODE_PARTS)
rep("const PIPE = window.PIPE = {           // dev hook", code + "\nconst PIPE = window.PIPE = {           // dev hook")
rep("  ART, SLICE, artApply, artDispose, artFrame, artHud, artSet, artCycle, artBoot, artHideRig, artRigRoots, sliceStart, sliceEndFrame,   /* 4단계 공통 (키는 추가만) */\n",
    "  ART, SLICE, artApply, artDispose, artFrame, artHud, artSet, artCycle, artBoot, artHideRig, artRigRoots, sliceStart, sliceEndFrame,   /* 4단계 공통 (키는 추가만) */\n"
    "  t1: T1T, t1Data: T1, t1Render: T1R, t1Model: T1M, t1Chars: T1C, t1Arena: T1A, t1Fx: T1F, t1Hud: T1H, t1Pose: T1P,   /* 4단계 테마 1 */\n  t1Scene: () => scene, t1SetHud: v => { hudVisible = !!v; }, t1Texts: () => uiTexts3(),   /* 4단계 테마 1 점검 도구용 (게임 장면 · HUD 끄기) */\n")
