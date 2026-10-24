#!/usr/bin/env bash
# 합 시험판 검수 (지시서 3장의 통과 기준). 기준마다 PASS/FAIL 한 줄, 근거는 로그 파일에.
#
#   GODOT=<Godot 4.7.2 편집기> QA_DIR=<작업 폴더> tools/qa.sh [--skip-build]
#
# 필요한 것: xvfb-run, Mesa lavapipe(Vulkan) — 화면을 CPU로 그려서 느리다(720p 한 장에 1초 안팎).
# 여기서 잰 FPS는 소프트웨어 렌더링이라 의미가 없다. 형식과 동작만 본다.
# 내보내기 템플릿: ${XDG_DATA_HOME:-~/.local/share}/godot/export_templates/4.7.2.stable/
set -uo pipefail

PROJ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${GODOT:?GODOT 에 Godot 4.7.2 편집기 실행 파일 경로를 주세요}"
QA_DIR="${QA_DIR:-${TMPDIR:-/tmp}/hap_test_qa}"
BUILD_DIR="${BUILD_DIR:-$QA_DIR/build}"
LOGS="$QA_DIR/logs"
SHOTS="$QA_DIR/shots"
FLASH="$QA_DIR/flash"
SKIP_BUILD=0
[[ "${1:-}" == "--skip-build" ]] && SKIP_BUILD=1
mkdir -p "$LOGS" "$SHOTS" "$FLASH"
PY="python3 -I $PROJ/tools/qa_check.py"
XVFB=(xvfb-run -a -s "-screen 0 1280x720x24")
VK=(--rendering-driver vulkan --audio-driver Dummy)

SUMMARY=()
result() {  # 이름 통과여부(0=통과) 근거
  local tag="PASS"; [[ "$2" -ne 0 ]] && tag="FAIL"
  echo "$tag  $1 — $3"
  SUMMARY+=("$tag  $1")
}
errs() {  # 로그에서 오류·경고 줄 수 (ALSA 소리 장치 없음은 이 컨테이너 사정이라 뺀다)
  grep -E "ERROR|SCRIPT ERROR|WARNING|Parse Error|Failed to|Invalid " "$1" | grep -vc "ALSA" || true
}

echo "== 합 시험판 검수 $(date '+%F %T') =="
echo "프로젝트 $PROJ"
echo "작업 폴더 $QA_DIR"
"$GODOT" --version | sed 's/^/Godot /'

# 0) 준비: 효과음 합성 + 들여오기
python3 -I "$PROJ/tools/make_sfx.py" "$PROJ/assets/sfx" >"$LOGS/sfx.log" 2>&1
# 처음 받은 사본(.godot/ 없음)은 첫 들여오기에서 '프로젝트 글꼴을 아직 못 읽음' 오류를 찍으므로 두 번 들여오고 두 번째를 본다
"$GODOT" --headless --path "$PROJ" --import >"$LOGS/import_first.log" 2>&1
"$GODOT" --headless --path "$PROJ" --import >"$LOGS/import.log" 2>&1

# 1) 정적 검사: 모든 .gd / .gdshader 파싱 오류 0
"$GODOT" --headless --path "$PROJ" --script res://tools/check_scripts.gd >"$LOGS/check_scripts.log" 2>&1
rc=$?
line=$(grep "^CHECK" "$LOGS/check_scripts.log" | tail -1)
e=$(errs "$LOGS/check_scripts.log")
ei=$(errs "$LOGS/import.log")
result "정적 검사 (.gd 파싱 오류 0)" $(( rc != 0 || e != 0 || ei != 0 )) "$line · 로그 오류/경고 $e줄 · 들여오기(두 번째) 로그 오류/경고 $ei줄"

# 1b) 한글 글리프: 소스 문자열의 모든 글자가 묶은 글꼴에 있는지
"$GODOT" --headless --path "$PROJ" --script res://tools/check_glyphs.gd >"$LOGS/check_glyphs.log" 2>&1
rc=$?
result "한글 글리프 (묶은 글꼴에 모두 있음)" $rc "$(grep '^GLYPHS distinct' "$LOGS/check_glyphs.log" | cut -c1-120)"

# 2) headless 실행: 모든 화면을 한 번씩 거치고, 로그에 오류 0
"$GODOT" --headless --path "$PROJ" -- --smoke >"$LOGS/smoke_headless.log" 2>&1
rc=$?
e=$(errs "$LOGS/smoke_headless.log")
done_ok=$(grep -c "SMOKE DONE" "$LOGS/smoke_headless.log")
result "headless 실행 로그 오류 0" $(( rc != 0 || e != 0 || done_ok != 1 )) "종료 코드 $rc · 오류/경고 $e줄 · 타이틀→입력→자유→측정→결과→타이틀 완주=$done_ok"

# 3) 입력 자동 시험 (headless, 가짜 입력 이벤트)
"$GODOT" --headless --path "$PROJ" -- --autotest-input >"$LOGS/autotest_input.log" 2>&1
rc=$?
np=$(grep -c "^PASS" "$LOGS/autotest_input.log")
nf=$(grep -c "^FAIL" "$LOGS/autotest_input.log")
seven=0
for n in 1 2 3 4 5 6 7; do grep -q "^PASS  $n " "$LOGS/autotest_input.log" && seven=$((seven + 1)); done
e=$(errs "$LOGS/autotest_input.log")
result "입력 자동 시험 (7가지 + 추가)" $(( rc != 0 || seven != 7 || nf != 0 || e != 0 )) "지시서 7가지 중 $seven 통과 · 전체 PASS $np / FAIL $nf · 종료 코드 $rc · 로그 오류 $e"

# 4) 성능 측정 빠른 실행 (Xvfb + lavapipe Vulkan)
rm -f "$QA_DIR/hap_test_result.txt"
"${XVFB[@]}" "$GODOT" "${VK[@]}" --path "$PROJ" -- --bench-quick --result-file="$QA_DIR/hap_test_result.txt" >"$LOGS/bench_quick.log" 2>&1
rc=$?
$PY result "$QA_DIR/hap_test_result.txt" >"$LOGS/bench_quick_format.log" 2>&1
fmt=$?
e=$(errs "$LOGS/bench_quick.log")
drv=$(grep -m1 "^Vulkan" "$LOGS/bench_quick.log" | cut -c1-70)
result "성능 측정 빠른 실행 (끝까지·파일·형식)" $(( rc != 0 || fmt != 0 )) "종료 코드 $rc · 결과 파일 형식 $( [[ $fmt -eq 0 ]] && echo 맞음 || echo 틀림) · $drv"
result "Vulkan 실행 로그 오류 0 (측정)" $(( e != 0 )) "오류/경고 $e줄 ($LOGS/bench_quick.log)"

# 5) 스크린샷 (Xvfb + lavapipe, 1280x720): 비어 있지 않음 (휘도 표준편차 >= 8)
rm -f "$SHOTS"/*.png
"${XVFB[@]}" "$GODOT" "${VK[@]}" --path "$PROJ" --fixed-fps 60 -- --shots="$SHOTS" >"$LOGS/shots.log" 2>&1
rc=$?
$PY png "$SHOTS"/*.png >"$LOGS/shots_luma.log" 2>&1
pngrc=$?
n=$(ls "$SHOTS"/*.png 2>/dev/null | wc -l)
need=0
for f in 01_title 02_bench_low 03_bench_max 04_results 05_input_two_players; do [[ -f "$SHOTS/$f.png" ]] && need=$((need + 1)); done
e=$(errs "$LOGS/shots.log")
result "스크린샷 비어 있지 않음 (std>=8)" $(( rc != 0 || pngrc != 0 || need != 5 )) "필수 5장 중 $need · 전체 $n장 · $(tr '\n' ' ' < "$LOGS/shots_luma.log" | sed 's/OK  //g' | cut -c1-200)"
result "Vulkan 실행 로그 오류 0 (스크린샷)" $(( e != 0 )) "오류/경고 $e줄 ($LOGS/shots.log)"
echo "      한글이 깨지지 않는지는 눈으로 확인: $SHOTS/*.png"

# 6) 섬광: 고정 60fps 연속 프레임의 화면 평균 휘도. 같은 장면을 섬광 조명만 끄고 한 번 더 찍어 차이(=섬광 성분)를 본다
rm -rf "$FLASH"; mkdir -p "$FLASH/light" "$FLASH/nolight"
"${XVFB[@]}" "$GODOT" "${VK[@]}" --path "$PROJ" --fixed-fps 60 -- --flash-test="$FLASH/light" >"$LOGS/flash_light.log" 2>&1
rc=$?
"${XVFB[@]}" "$GODOT" "${VK[@]}" --path "$PROJ" --fixed-fps 60 -- --flash-test="$FLASH/nolight" --flash-variant=nolight >"$LOGS/flash_nolight.log" 2>&1
rcb=$?
$PY flash "$FLASH/light" "$FLASH/nolight" >"$LOGS/flash_check.log" 2>&1
rc2=$?
e=$(( $(errs "$LOGS/flash_light.log") + $(errs "$LOGS/flash_nolight.log") ))
result "섬광 0.1초 안에 가라앉음" $(( rc != 0 || rcb != 0 || rc2 != 0 )) "$(grep '^FLASH base' "$LOGS/flash_light.log" | cut -c7-) · $(tail -1 "$LOGS/flash_check.log") · 로그 오류 $e"

# 7) 내보내기 + 묶음
if [[ $SKIP_BUILD -eq 0 ]]; then
  BUILD_DIR="$BUILD_DIR" GODOT="$GODOT" "$PROJ/tools/build.sh" >"$LOGS/build.log" 2>&1
  brc=$?
else
  brc=0
fi
ST="$BUILD_DIR/stage"
have=0
for f in hap_test.exe hap_test.console.exe hap_test.pck; do [[ -s "$ST/$f" ]] && have=$((have + 1)); done
result "내보내기 (exe · 콘솔 exe · pck)" $(( brc != 0 || have != 3 )) "build.sh 종료 코드 $brc · 3개 중 $have개 · $(ls -l "$ST"/hap_test.* 2>/dev/null | awk '{printf "%s=%s ", $9, $5}' | sed "s#$ST/##g")"
$PY pe "$ST/hap_test.exe" gui >"$LOGS/pe.log" 2>&1; r1=$?
$PY pe "$ST/hap_test.console.exe" console >>"$LOGS/pe.log" 2>&1; r2=$?
result "PE32+ GUI (콘솔 래퍼는 콘솔)" $(( r1 != 0 || r2 != 0 )) "$(head -1 "$LOGS/pe.log" | cut -c1-160)"
$PY pck "$ST/hap_test.pck" >"$LOGS/pck.log" 2>&1
rc=$?
result "pck에 Vulkan 셰이더 캐시" $rc "$(head -1 "$LOGS/pck.log")"
ZIP="$BUILD_DIR/hap_test_v0.1.zip"
zsize=$(stat -c %s "$ZIP" 2>/dev/null || echo 0)
$PY zip "$ZIP" hap_test.exe hap_test.console.exe hap_test.pck run_console.bat run_d3d12.bat run_opengl.bat \
  읽어주세요.txt ASSET_CREDITS.txt OFL_BlackHanSans.txt OFL_IBMPlexSansKR.txt GODOT_LICENSE.txt >"$LOGS/zip_listing.log" 2>&1
zrc=$?
result "zip 묶음 (지시서 2.5 목록)" $(( zsize == 0 || zrc != 0 )) "$ZIP ${zsize}바이트 ($(( zsize / 1048576 ))MB) · $(grep -c '문제:' "$LOGS/zip_listing.log")개 문제 · $(grep -o 'utf8_flag=True  .*' "$LOGS/zip_listing.log" | tr '\n' ' ')"

# 8) (추가) 내보낸 빌드가 실제로 도는지: Windows exe는 여기서 못 돌리므로, 같은 프로젝트를 Linux 템플릿으로
#    내보내 그 실행 파일로 빠른 측정(headless)과 한 장 찍기(Xvfb+Vulkan)를 해 본다. 결과 파일이 실행 파일 옆에 생겨야 한다.
LX="$QA_DIR/linux_proxy"
rm -rf "$LX"; mkdir -p "$LX/proj" "$LX/out"
(cd "$PROJ" && tar --exclude=./.godot -cf - .) | (cd "$LX/proj" && tar -xf -)
cat >>"$LX/proj/export_presets.cfg" <<'CFG'

[preset.1]

name="Linux"
platform="Linux"
runnable=true
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter="tools/*"
export_path=""
encryption_include_filters=""
encryption_exclude_filters=""
encrypt_pck=false
encrypt_directory=false
script_export_mode=2

[preset.1.options]

custom_template/debug=""
custom_template/release=""
debug/export_console_wrapper=0
binary_format/embed_pck=false
texture_format/s3tc_bptc=true
texture_format/etc2_astc=false
binary_format/architecture="x86_64"
ssh_remote_deploy/enabled=false
CFG
"$GODOT" --headless --path "$LX/proj" --import >"$LOGS/linux_proxy_import_first.log" 2>&1
"$GODOT" --headless --path "$LX/proj" --import >"$LOGS/linux_proxy_import.log" 2>&1
"$GODOT" --headless --path "$LX/proj" --export-release "Linux" "$LX/out/hap_test.x86_64" >"$LOGS/linux_proxy_export.log" 2>&1
erc=$?
(cd "$LX/out" && ./hap_test.x86_64 --headless -- --bench-quick --bench-seconds=0.3 --bench-warmup=0.1) >"$LOGS/linux_proxy_run.log" 2>&1
rrc=$?
(cd "$LX/out" && "${XVFB[@]}" ./hap_test.x86_64 "${VK[@]}" --fixed-fps 60 -- --snap="$LX/exported_free.png" --snap-screen=free --windowed) >"$LOGS/linux_proxy_snap.log" 2>&1
src=$?
$PY png "$LX/exported_free.png" >"$LOGS/linux_proxy_png.log" 2>&1
prc=$?
e=$(( $(errs "$LOGS/linux_proxy_run.log") + $(errs "$LOGS/linux_proxy_snap.log") ))
result "(추가) 내보낸 빌드 실행 (Linux 대리)" $(( erc != 0 || rrc != 0 || src != 0 || prc != 0 || e != 0 )) "내보내기 $erc · 빠른 측정 $rrc ($(grep -o 'BENCH-QUICK [A-Z]* path=[^ ]*' "$LOGS/linux_proxy_run.log" | sed "s#$LX/##")) · 한 장 $src ($(cut -c6- "$LOGS/linux_proxy_png.log")) · 로그 오류 $e"

echo
echo "== 요약 =="
fail=0
for l in "${SUMMARY[@]}"; do
  echo "$l"
  [[ "$l" == FAIL* ]] && fail=$((fail + 1))
done
echo "FAIL $fail 개"
exit $(( fail > 0 ))
