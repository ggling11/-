#!/bin/sh
# 3단계 경계값 추가 시드 (프롬프트 규칙: 기준 ±3%p 안이면 다른 시드 20판 더 · 공식 결과는 처음 것)
#   A14 2인 전체 정지 · Q1 QTE 완주율 — 합 봇 2쌍 × 10판 (시드 501~)
cd "$(dirname "$0")"
OUT=results/s3/extra; mkdir -p $OUT
node sim.mjs --mode duo --bots coop,coop --runs 10 --seed 501 --chars rapier,great --equip random --relic random --max 2700 --workers 2 --quiet --out $OUT/e_rapier_great.jsonl > $OUT/e_rapier_great.json
node sim.mjs --mode duo --bots coop,coop --runs 10 --seed 501 --chars twin,shield --equip random --relic wave --max 2700 --workers 2 --quiet --out $OUT/e_twin_shield.jsonl > $OUT/e_twin_shield.json
node -e "
const fs=require('fs');const rows=['e_rapier_great','e_twin_shield'].flatMap(n=>fs.readFileSync('$OUT/'+n+'.jsonl','utf8').trim().split('\n').map(JSON.parse));
const avg=k=>rows.reduce((s,r)=>s+k(r),0)/rows.length; const q=rows.map(r=>r.stats.qte).filter(Boolean); const s=k=>q.reduce((a,x)=>a+(x[k]||0),0);
const bt=[0,1,2,3].map(i=>{const l=rows.map(r=>r.stats.bossT&&r.stats.bossT[i]).filter(v=>v>0);return +(l.reduce((a,b)=>a+b,0)/l.length/60).toFixed(2)});
const o={runs:rows.length, clear:rows.filter(r=>r.result==='won').length/rows.length, freeze:+avg(r=>r.stats.t?r.stats.freeze/r.stats.t:0).toFixed(4), bossActive:+avg(r=>r.stats.t?r.stats.bossActive/r.stats.t:0).toFixed(4),
  qteComplete:+(s('perfect')/s('n')).toFixed(3), qteN:s('n'), cellRate:+(s('ok')/s('cells')).toFixed(3), bossTmin:bt, uiMax:Math.max(...rows.map(r=>r.stats.ui?r.stats.ui.max:0)), errors:rows.reduce((a,r)=>a+r.errors,0)};
fs.writeFileSync('$OUT/extra.json',JSON.stringify(o,null,1)); console.log(JSON.stringify(o));"
