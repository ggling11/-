#!/bin/sh
# 2단계 경계(±3%p) 항목 추가 시드 20판 — 같은 빌드 · 다른 시드(201)로 다시 재서 accept2.sh 결과와 나란히 보고
#   sh extra2.sh [항목 ...]   항목: act (A13 보스 활동 · 합 봇 2쌍 × 10판) · spam (A11 연타 랠리 2 · 20판) · spamdk (A8 연타 합 끊기 · 보스 4 시작 20판)
#                              ignore (A2 무시 봇 · 2쌍 × 10판) · coop (A1 · 2쌍 × 10판)
#   결과: results/s2x/*.jsonl → node report2.mjs results/s2x (그 폴더에 있는 판만으로 같은 지표를 계산)
cd "$(dirname "$0")"
OUT=results/s2x; mkdir -p $OUT
W=${W:-2}
run() { name=$1; shift; node sim.mjs "$@" --max 2700 --workers $W --quiet --out $OUT/$name.jsonl > $OUT/$name.json; echo "$name $(head -c 160 $OUT/$name.json)"; }
for it in "$@"; do
  case $it in
    act)    run m_chain_shield --mode duo --bots coop,coop --runs 10 --seed 201 --chars chain,shield --equip cycle:2,0 --relic random
            run m_twin_great   --mode duo --bots coop,coop --runs 10 --seed 201 --chars twin,great   --equip cycle:0,0 --relic wave ;;
    coop)   run m_rapier_great --mode duo --bots coop,coop --runs 10 --seed 201 --chars rapier,great --equip cycle:1,2 --relic wave
            run m_twin_rapier  --mode duo --bots coop,coop --runs 10 --seed 201 --chars twin,rapier  --equip cycle:2,1 --relic random ;;
    spam)   run b_rapier_great_spam --mode duo --bots spam,spam --runs 10 --seed 201 --chars rapier,great --equip random --relic random
            run b_chain_shield_spam --mode duo --bots spam,spam --runs 10 --seed 201 --chars chain,shield --equip random --relic random ;;
    spamdk) run x_spam_dk --mode duo --bots spam,spam --runs 20 --seed 201 --boss 3 --chars rapier,great --equip random --relic random ;;
    ignore) run b_rapier_great_ignore --mode duo --bots ignore,ignore --runs 10 --seed 201 --chars rapier,great --equip random --relic random
            run b_chain_shield_ignore --mode duo --bots ignore,ignore --runs 10 --seed 201 --chars chain,shield --equip random --relic random ;;
  esac
done
