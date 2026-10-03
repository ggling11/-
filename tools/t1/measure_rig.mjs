// 판정용 숨은 리그 크기 (대기 첫 프레임): 화면 실루엣 폭 · 키 기준 (M1 ±15%) — 메쉬 경계 상자, 정점 기준
import { loadGame } from './load.mjs';
const P = await loadGame();
const THREE = await import('three');
P.setup({ mode: 'duo', bots: [null, null], seed: 1, boss: 1, chars: ['rapier', 'great'] });
const out = {};
const box = (root, facing) => { root.updateMatrixWorld(true); const b = new THREE.Box3(); const v = new THREE.Vector3();
  root.traverse(o => { if (!o.isMesh || !o.visible || !o.geometry || o.name === 'smear') return; const p = o.geometry.attributes.position; if (!p) return;
    let vis = true; for (let q = o; q; q = q.parent) if (!q.visible) { vis = false; break; } if (!vis) return;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); b.expandByPoint(v); } });
  return b; };
for (const f of P.fighters) {
  f.ch.place(0, 0, 0); f.ch.play('idle'); f.ch.update(0.0001, null);
  const b = box(f.ch.root); out[f.char] = { h: +(b.max.y - b.min.y).toFixed(3), wx: +(b.max.x - b.min.x).toFixed(3), wz: +(b.max.z - b.min.z).toFixed(3), minY: +b.min.y.toFixed(3), radius: f.ch.radius, scale: f.ch.root.scale.x };
}
const B = P.bossNow; B.place(0, 0, 0); B.play('idle'); B.update(0.0001, null);
const bb = box(B.root); out.warden = { h: +(bb.max.y - bb.min.y).toFixed(3), wx: +(bb.max.x - bb.min.x).toFixed(3), wz: +(bb.max.z - bb.min.z).toFixed(3), minY: +bb.min.y.toFixed(3), radius: B.radius, scale: B.root.scale.x, focus: B.focus };
out.REACH_H = P.FIGHT.REACH_H; out.SLAM = P.FIGHT.SLAM; out.SWEEP_r = P.FIGHT.SWEEP.r; out.SLAM_AT = P.SLAM_AT; out.SHOT_AT = P.SHOT_AT; out.GRAB = P.FIGHT.GRAB; out.BOSS_SCALE = P.FEEL.BOSS_SCALE;
out.cam = P.STYLE.cam; out.chr = P.STYLE.chr;
console.log(JSON.stringify(out, null, 1)); process.exit(0);
