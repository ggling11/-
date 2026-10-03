// 세검 + 대검 vs 애저 워든: 어떤 동작이 화면에 얼마나 오래 나오는지 (모션 우선순위 근거)
import { loadGame, mulberry32 } from './load.mjs';
const P = await loadGame();
const use = { f0: {}, f1: {}, boss: {} }, st = { f0: {}, f1: {}, boss: {} };
for (let seed = 1; seed <= 4; seed++) {
  Math.random = mulberry32(seed * 7919 + 13);
  P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed, boss: 1, chars: ['rapier', 'great'] });
  for (let i = 0; i < 60 * 150 && P.Game.state === 'play'; i++) {
    P.step(1 / 60, false);
    P.fighters.forEach((f, k) => { const n = f.ch.clip && f.ch.clip.name; use['f' + k][n] = (use['f' + k][n] || 0) + 1; st['f' + k][f.state] = (st['f' + k][f.state] || 0) + 1; });
    const b = P.bossNow, n = b.clip && b.clip.name; use.boss[n] = (use.boss[n] || 0) + 1; st.boss[P.AI.state] = (st.boss[P.AI.state] || 0) + 1;
  }
  console.log('seed', seed, P.Game.state, P.Game.t.toFixed(1), 'loadouts', P.fighters.map(f => f.char + ':' + f.loadout.join('+')).join(' '));
}
const fmt = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' ');
for (const k in use) console.log(k, 'clips', fmt(use[k]), '\n   states', fmt(st[k]));
console.log('errors', globalThis.__errors.length);
process.exit(0);
