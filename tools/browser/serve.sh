#!/bin/sh
# 로컬 서버: ../../index.html 을 tools/node_modules 의 three.js 로 바꿔 127.0.0.1:8766 에 띄움 (브라우저 점검 스크립트용)
cd "$(dirname "$0")"
W=../.cache/web; mkdir -p $W
cp ../node_modules/three/build/three.module.js $W/three.module.js
sed 's#https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js#/three.module.js#' ../../index.html > $W/index.html
cd $W && exec python3 -m http.server 8766 --bind 127.0.0.1
