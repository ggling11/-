// 4단계 T1 모션 · 판정 맞춤 게이트 (Node · 렌더 없음): node t1/gates.mjs [--json OUT]
//   M2: 세검 · 대검 1순위 공격마다 — 예비 구간(0..타격-1)에서 칼끝이 타격 방향 반대로 몸 키의 0.25 이상 · 타격 뒤 오버슈트(타격 방향으로 더 나감)
//   L1: 타격 프레임(히트 이벤트 프레임들)의 보이는 칼끝 ↔ 판정 부채꼴(중심 = 캐릭터, 반지름 reach, 반각 half) 거리 ≤ reach × 25%
//       워든 내려찍기: 충격 프레임의 보이는 오른 발톱 끝 ↔ SLAM_AT(숨은 리그가 잰 판정 지점) 거리 ≤ SLAM.r × 25%
//   숨은 리그 보존: 판정 리그를 레이어로 숨겼는지(.visible 그대로) · 새 자세 표를 쓰는 동작 목록
import { loadGame } from './load.mjs';
import { t1Gates } from './gates_core.mjs';
import fs from 'fs';
const A = process.argv.slice(2), out = A.includes('--json') ? A[A.indexOf('--json') + 1] : null;
const P = await loadGame();
const res = t1Gates(P);
console.log(JSON.stringify(res, null, 1));
console.log('M2', res.M2.every(r => r.ok), 'L1', res.L1.every(r => r.ok), 'M1', res.M1.every(r => Math.abs(r.wRatio - 1) <= 0.15 && Math.abs(r.hRatio - 1) <= 0.15));
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
