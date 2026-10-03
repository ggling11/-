#!/bin/sh
# 2단계 렌더링 점검 전부: 대기 자세 5 · 새 스킬 시동 11 · 공통 호응 4 · 나머지 장면(render20.py)  — 서버 127.0.0.1:8766 필요
cd "$(dirname "$0")"
OUT=${1:-../results/s2/render}; mkdir -p $OUT
python3 clipshot.py $OUT/R01_idle5.png player:idle:0 player2:idleB:0 chain:idleC:0 shield:idleS:0 twin:idleT:0
python3 clipshot.py $OUT/R02_skills11.png player:sWind:4 player2:sEarth:6 chain:cSnatch:6 chain:cHook:8 chain:cWhirl:6 shield:hLift:6 shield:hSlam:6 shield:hCharge:5 twin:tCross:3 twin:tRise:6 twin:tDrop:9 --per 6
python3 finshot.py $OUT/R03_common4.png lift:1 kneel:1 stagger:1 turn:1 --times 0.5 --per 4 --nocut
python3 render20.py $OUT
