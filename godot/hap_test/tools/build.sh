#!/usr/bin/env bash
# 합 시험판 빌드: 효과음 합성 → 들여오기 → Windows Desktop x86_64 내보내기 → zip 묶기
#
#   GODOT=<Godot 4.7.2 편집기 실행 파일> BUILD_DIR=<출력 폴더> tools/build.sh
#
# 내보내기는 반드시 Xvfb + Vulkan(lavapipe) 아래에서 한다: 그래야 셰이더 미리 굽기(shader baker)가
# Vulkan 셰이더 캐시를 실제로 만들어 pck에 넣는다. --headless 로 내보내면 아무것도 굽지 않고 경고도 없다.
# 내보내기 템플릿은 ${XDG_DATA_HOME:-~/.local/share}/godot/export_templates/4.7.2.stable/ 에 있어야 한다.
set -euo pipefail

PROJ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${GODOT:?GODOT 에 Godot 4.7.2 편집기 실행 파일 경로를 주세요}"
BUILD_DIR="${BUILD_DIR:-${TMPDIR:-/tmp}/hap_test_build}"
ZIP_NAME="hap_test_v0.1.zip"
STAGE="$BUILD_DIR/stage"
LOGS="$BUILD_DIR/logs"
TPL="${XDG_DATA_HOME:-$HOME/.local/share}/godot/export_templates/4.7.2.stable"

for f in windows_release_x86_64.exe windows_release_x86_64_console.exe; do
  [[ -f "$TPL/$f" ]] || { echo "내보내기 템플릿 없음: $TPL/$f" >&2; exit 2; }
done
command -v xvfb-run >/dev/null || { echo "xvfb-run 이 필요합니다" >&2; exit 2; }

rm -rf "$STAGE"
mkdir -p "$STAGE" "$LOGS"

echo "[1/5] 효과음 합성"
python3 -I "$PROJ/tools/make_sfx.py" "$PROJ/assets/sfx"

echo "[2/5] 들여오기 (import)"
# 처음 받은 사본(.godot/ 없음)에서는 첫 들여오기가 '프로젝트 글꼴을 아직 못 읽음' 오류를 찍는다 (글꼴이 들여오기 전이라).
# 그래서 두 번 들여오고, 두 번째 로그에 오류가 없어야 한다.
"$GODOT" --headless --path "$PROJ" --import >"$LOGS/import_first.log" 2>&1 || true
"$GODOT" --headless --path "$PROJ" --import >"$LOGS/import.log" 2>&1
! grep -qE "ERROR|SCRIPT ERROR" "$LOGS/import.log" || { echo "들여오기 오류 — $LOGS/import.log" >&2; exit 1; }

echo "[3/5] Windows 내보내기 (Xvfb + Vulkan, 셰이더 미리 굽기)"
xvfb-run -a -s "-screen 0 1280x720x24" "$GODOT" --rendering-driver vulkan --audio-driver Dummy \
  --path "$PROJ" --export-release "Windows Desktop" "$STAGE/hap_test.exe" >"$LOGS/export.log" 2>&1 || {
  echo "내보내기 실패 — $LOGS/export.log" >&2; tail -30 "$LOGS/export.log" >&2; exit 1; }
for f in hap_test.exe hap_test.console.exe hap_test.pck; do
  [[ -s "$STAGE/$f" ]] || { echo "내보내기 결과 없음: $f" >&2; exit 1; }
done
grep -c "vulkan.cache" "$LOGS/export.log" | sed 's/^/  pck에 넣은 Vulkan 셰이더 캐시 파일 수(로그 기준): /'

echo "[4/5] 묶음 파일 (bat · 읽어주세요 · 출처 · 라이선스)"
cp "$PROJ/dist/run_console.bat" "$PROJ/dist/run_d3d12.bat" "$PROJ/dist/run_opengl.bat" "$STAGE/"
python3 -I - "$PROJ/dist" "$STAGE" <<'PY'
import sys, os
src, dst = sys.argv[1], sys.argv[2]
# 원본 dist/README.txt → 묶음에서는 지시서 2.5 이름 그대로 '읽어주세요.txt'
for name, out in (("README.txt", "읽어주세요.txt"), ("ASSET_CREDITS.txt", "ASSET_CREDITS.txt")):
    t = open(os.path.join(src, name), encoding="utf-8").read().replace("\r\n", "\n").replace("\n", "\r\n")
    # 메모장에서 한글이 깨지지 않게 UTF-8 BOM + CRLF
    open(os.path.join(dst, out), "w", encoding="utf-8-sig", newline="").write(t)
PY
for f in OFL_BlackHanSans.txt OFL_IBMPlexSansKR.txt; do
  python3 -I -c 'import sys; t=open(sys.argv[1],encoding="utf-8").read().replace("\r\n","\n").replace("\n","\r\n"); open(sys.argv[2],"w",encoding="utf-8",newline="").write(t)' \
    "$PROJ/assets/fonts/$f" "$STAGE/$f"
done
"$GODOT" --headless --path "$PROJ" --script res://tools/print_license.gd -- "$STAGE/GODOT_LICENSE.txt" >"$LOGS/license.log" 2>&1
python3 -I -c 'import sys; p=sys.argv[1]; t=open(p,encoding="utf-8").read().replace("\r\n","\n").replace("\n","\r\n"); open(p,"w",encoding="utf-8",newline="").write(t)' "$STAGE/GODOT_LICENSE.txt"

echo "[5/5] zip"
# Info-ZIP zip 은 한글 파일 이름을 UTF-8 표시(일반 목적 비트 11) 없이 넣어서 Windows에서 이름이 깨질 수 있다.
# 파이썬 zipfile 은 ASCII가 아닌 이름에 그 표시(0x800)를 붙인다.
rm -f "$BUILD_DIR/$ZIP_NAME"
python3 -I - "$STAGE" "$BUILD_DIR/$ZIP_NAME" <<'PY'
import sys, os, zipfile
stage, out = sys.argv[1], sys.argv[2]
names = ["hap_test.exe", "hap_test.console.exe", "hap_test.pck", "run_console.bat", "run_d3d12.bat", "run_opengl.bat",
         "읽어주세요.txt", "ASSET_CREDITS.txt", "OFL_BlackHanSans.txt", "OFL_IBMPlexSansKR.txt", "GODOT_LICENSE.txt"]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for n in names:
        z.write(os.path.join(stage, n), n)
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    for i in z.infolist():
        print(f"  {i.file_size:>11} {i.compress_size:>11}  utf8_flag={bool(i.flag_bits & 0x800)!s:<5}  {i.filename}")
PY
echo "ZIP $BUILD_DIR/$ZIP_NAME $(stat -c %s "$BUILD_DIR/$ZIP_NAME") bytes"
