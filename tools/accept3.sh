#!/bin/sh
# 3단계 합격 기준 테스트 (4체 러시 전체)
#   1) 쌍 매트릭스: 청×적 4쌍 + 쌍검×4명 = 8쌍 × 합 봇 10판 (장착은 cycle: 캐릭터마다 3가지 조합이 10판씩)
#   2) 5조건 배터리(합 · 무시 · 연타 · 혼합 · 태그) × 20판: 세검+대검 · 사슬낫+방패 (장착 무작위 · 유물은 판마다 무작위/규칙 반반 = 시드로)
#   3) 입력 기록 재생 2회 (보스 1~4 × 2인·태그, 쌍검 낀 판 포함)
#   node report3.mjs 가 결과 표(results/s3/accept/accept.json · accept.md)를 만든다
cd "$(dirname "$0")"
OUT=${OUT:-results/s3/accept}; mkdir -p $OUT
W=${W:-2}
run() { name=$1; shift; node sim.mjs "$@" --max 2700 --workers $W --quiet --out $OUT/$name.jsonl > $OUT/$name.json; echo "$name $(head -c 160 $OUT/$name.json)"; }
if [ "$1" != "battery" ] && [ "$1" != "replay" ]; then
  run m_rapier_great  --mode duo --bots coop,coop --runs 10 --seed 1 --chars rapier,great  --equip cycle:0,0 --relic random
  run m_rapier_shield --mode duo --bots coop,coop --runs 10 --seed 1 --chars rapier,shield --equip cycle:1,0 --relic wave
  run m_chain_great   --mode duo --bots coop,coop --runs 10 --seed 1 --chars chain,great   --equip cycle:0,1 --relic random
  run m_chain_shield  --mode duo --bots coop,coop --runs 10 --seed 1 --chars chain,shield  --equip cycle:1,1 --relic wave
  run m_twin_rapier   --mode duo --bots coop,coop --runs 10 --seed 1 --chars twin,rapier   --equip cycle:0,2 --relic random
  run m_twin_great    --mode duo --bots coop,coop --runs 10 --seed 1 --chars twin,great    --equip cycle:1,2 --relic wave
  run m_twin_chain    --mode duo --bots coop,coop --runs 10 --seed 1 --chars twin,chain    --equip cycle:2,2 --relic random
  run m_twin_shield   --mode duo --bots coop,coop --runs 10 --seed 1 --chars twin,shield   --equip cycle:0,2 --relic wave
fi
if [ "$1" != "matrix" ] && [ "$1" != "replay" ]; then
  for pc in rapier,great chain,shield; do
    p=$(echo $pc | tr ',' '_')
    run b_${p}_coop   --mode duo --bots coop,coop     --runs 20 --seed 101 --chars $pc --equip random --relic random
    run b_${p}_ignore --mode duo --bots ignore,ignore --runs 20 --seed 101 --chars $pc --equip random --relic random
    run b_${p}_spam   --mode duo --bots spam,spam     --runs 20 --seed 101 --chars $pc --equip random --relic random
    run b_${p}_mixed  --mode duo --bots coop,spam     --runs 20 --seed 101 --chars $pc --equip random --relic wave
    run b_${p}_tag    --mode tag --bots tag           --runs 20 --seed 101 --chars $pc --equip random --relic wave
  done
  run x_spam_dk --mode duo --bots spam,spam --runs 20 --seed 101 --boss 3 --chars rapier,great --equip random --relic random   # 연타 봇은 보스 1에서 지므로 합 끊기 연타 기준은 보스 4에서 시작해 잼
  run x_spam_b2 --mode duo --bots spam,spam --runs 20 --seed 101 --boss 1 --chars rapier,great --equip random --relic random   # 3단계 Q3: 연타 봇 QTE (보스 1엔 QTE 없음 → 보스 2에서 시작)
fi
if [ "$1" != "matrix" ] && [ "$1" != "battery" ]; then
  node sim.mjs --replay 7200 --replay2 1 > $OUT/replay.json; tail -c 400 $OUT/replay.json
fi
