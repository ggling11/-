#!/bin/sh
# 4단계 T1 서빙 사본: three 경로만 로컬로 바꾼 사본 (index.html · v5.html(3단계 최종) · v4.html(2단계) · 랩)
# 사용: sh tools/t1/serve_copy.sh [폴더]  (기본 = $T1_SERVE 또는 /tmp/t1serve) · 서버: python3 -m http.server 8766 --bind 127.0.0.1 (그 폴더에서)
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../.." && pwd)
OUT=${1:-${T1_SERVE:-/tmp/t1serve}}; mkdir -p "$OUT"
CDN='https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'
cp "$ROOT/tools/node_modules/three/build/three.module.js" "$OUT/"; : > "$OUT/favicon.ico"
sed "s#$CDN#/three.module.js#" "$ROOT/index.html" > "$OUT/index.html"
sed "s#$CDN#/three.module.js#" "$ROOT/index_v5.html" > "$OUT/v5.html"
sed "s#$CDN#/three.module.js#" "$ROOT/index_v4.html" > "$OUT/v4.html"
[ -f "$ROOT/tools/style/lab4_t1.html" ] && sed "s#$CDN#/three.module.js#" "$ROOT/tools/style/lab4_t1.html" > "$OUT/lab4_t1.html"
# 같은지: 서빙 사본 = 최종 빌드에서 three 경로만 다름
sed "s#$CDN#/three.module.js#" "$ROOT/index.html" | cmp -s - "$OUT/index.html" && echo "serve copy OK $(md5sum "$ROOT/index.html" | cut -c1-8) → $OUT"
