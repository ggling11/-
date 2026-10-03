#!/bin/sh
# 1.5단계 합격 기준 테스트: 5가지 봇 조건 × 20판 (러시 전체) + 입력 기록 재생
cd "$(dirname "$0")"
mkdir -p results
: > results/summary.jsonl
for c in "duo coop,coop" "duo ignore,ignore" "duo spam,spam" "duo coop,spam" "tag tag"; do
  set -- $c
  name=$(echo "$1_$2" | tr ',' '_')
  node sim.mjs --mode $1 --bots $2 --runs 20 --seed 1 --max 1500 --workers 2 --out results/$name.jsonl --quiet | tee -a results/summary.jsonl
done
node sim.mjs --replay 7200 > results/replay.json
cat results/replay.json
