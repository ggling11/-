// Headless bot tests for the duo prototype.
// Runs the game script from ../index.html in Node (three@0.170, only WebGLRenderer stubbed), steps it with
// PIPE.step(1/60, false) and a fixed seed per run.
//
//   node tools/sim.mjs --mode duo --bots coop,coop --runs 20          # 20 fights, coop bots
//   node tools/sim.mjs --mode tag --bots tag --runs 20                # tag solo
//   node tools/sim.mjs --replay 3600                                  # record 60 s, replay twice, compare state hashes
//   node tools/sim.mjs --mode duo --bots coop,spam --runs 20          # 혼합 페어 (합 봇 1 + 연타 봇 1)
//   options: --seed 1 (first seed) --max 900 (seconds cap) --workers 2 --out res.jsonl --quiet
//            --boss 1 (러시를 보스 2부터 시작: 보스 하나만 따로 볼 때)
//            --art 1 (4단계: 아트 테마 N을 렌더 없이 적용한 채로 — 같은 시드 · 같은 입력이면 해시가 테마 0과 같아야 함)
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { fork } from 'child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), A = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { const k = argv[i].slice(2), v = argv[i + 1]; if (!v || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } }
const cfg = { mode: A.mode || 'duo', bots: (A.bots || 'coop,coop').split(',').map(s => (s === 'null' || s === '-' ? null : s)),
              runs: +(A.runs || 20), seed: +(A.seed || 1), max: +(A.max || 900), workers: +(A.workers || 2), boss: +(A.boss || 0),
              chars: A.chars && A.chars !== true ? A.chars.split(',') : null,          // 2단계: --chars rapier,great (태그: A,B) · 없으면 START_CHARS
              equip: A.equip && A.equip !== true ? A.equip : 'def',
              relic: A.relic && A.relic !== true ? A.relic : 'random' };                // 2단계: --relic random | wave (봇 유물 고르기: 무작위 · 파장 관련 먼저)                  // 2단계: --equip def | random (판마다 시드로 3개 중 2개 + 순서) | windThrust+thrust,earthSplit+launch
// the 8 finishers: status (who started it) × the receiver's skill slot
const FIN_KEYS = ['lift:1', 'lift:2', 'kneel:1', 'kneel:2', 'stagger:1', 'stagger:2', 'turn:1', 'turn:2'];

// ---- the game as a Node module
function prepModule() {
  const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  const a = html.indexOf('<script type="module">'), b = html.indexOf('</script>', a);
  let src = html.slice(a + '<script type="module">'.length, b);
  const imp = "import * as THREE from 'three';";
  if (src.split(imp).length !== 2) throw new Error('three import not found');
  src = src.replace(imp, "import * as THREE from './shim.mjs';");
  const dir = path.join(HERE, '.cache'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'shim.mjs'), `export * from 'three';
export class WebGLRenderer {
  constructor() { this.autoClear = true; this.outputColorSpace = ''; this.info = { render: { calls: 0 } }; this.capabilities = { isWebGL2: true }; }
  setPixelRatio() {} setSize() {} setRenderTarget() {} setClearColor() {} render() {} clear() {} compile() {}
  readRenderTargetPixels() {} getContext() { return {}; }
}\n`);
  fs.writeFileSync(path.join(dir, 'game.mjs'), src);
  return path.join(dir, 'game.mjs');
}
function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const errors = [];
async function loadGame(file) {
  const noop = () => {};
  const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
  const el = () => ({ style: {}, width: 0, height: 0, getContext: () => ctx2d, remove: noop, textContent: '' });
  const els = { game: el(), hud: el(), boot: el() };
  globalThis.window = globalThis;
  globalThis.document = { getElementById: id => els[id] || el() };
  globalThis.addEventListener = noop;
  globalThis.innerWidth = 1920; globalThis.innerHeight = 1080; globalThis.devicePixelRatio = 1;
  globalThis.requestAnimationFrame = noop;
  const ce = console.error.bind(console);
  console.error = (...a) => { errors.push(a.map(String).join(' ')); ce(...a); };
  process.on('uncaughtException', e => { errors.push('uncaught: ' + (e && e.stack || e)); });
  await import(pathToFileURL(file).href);
  const P = globalThis.PIPE;
  if (A.art && A.art !== true && +A.art && P.artSet) { P.ART.headless = true; P.artSet(+A.art, { noSave: true }); if (P.ART.cur !== +A.art) throw new Error('art theme not registered: ' + A.art); }   // 4단계: --art N = 렌더 없이 테마 N 데이터만 (판정 불변 확인)
  return P;
}

// 2단계: which two skills each character equips this run ('random': its own seeded draw, separate from the bots' Math.random)
function loadoutsFor(P, c, seed) {
  const chars = c.chars || P.START_CHARS;
  if (c.equip === 'def') return { chars, loadouts: null };
  if (c.equip.startsWith('cycle:')) {           // 2단계 매트릭스: 캐릭터마다 3가지 조합을 판(시드)마다 돌려 씀 — 오프셋을 쌍마다 달리 주면 캐릭터별로 조합마다 같은 판 수
    const off = c.equip.slice(6).split(',').map(Number);
    return { chars, loadouts: chars.map((id, i) => { const k = P.CHARS[id].skills.filter(q => P.SKILLS2[q].ready), pairs = [[k[0], k[1]], [k[0], k[2]], [k[1], k[2]]];
      const pr = pairs[(seed + (off[i] || 0)) % 3]; return Math.floor(seed / 3) % 2 ? [pr[1], pr[0]] : pr.slice(); }) };
  }
  if (c.equip === 'random') {
    const r = mulberry32(seed * 31 + 7);
    return { chars, loadouts: chars.map(id => { const k = P.CHARS[id].skills.filter(q => P.SKILLS2[q].ready); for (let i = k.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; } return k.slice(0, 2); }) };
  }
  return { chars, loadouts: c.equip.split(',').map(x => x.split('+')) };
}
function runOne(P, c, seed) {
  Math.random = mulberry32(seed * 7919 + 13);          // the bots' choices (input side) — the game itself uses its seeded Sim RNG
  const eq = loadoutsFor(P, c, seed);
  P.setup({ mode: c.mode, bots: c.bots, seed, boss: c.boss, chars: eq.chars, loadouts: eq.loadouts, relicBot: c.relic });
  const maxF = c.max * 60, e0 = errors.length;
  let f = 0, err = null;
  try { while (f < maxF && P.Game.state === 'play') { P.step(1 / 60, false); f++; } }
  catch (e) { err = String(e && e.stack || e); errors.push(err); }
  const S = P.Duo.stats, G = P.Game;
  const clone = o => JSON.parse(JSON.stringify(o));
  return { mode: c.mode, bots: c.bots.join(','), seed, result: err ? 'error' : G.state === 'won' ? 'won' : G.state === 'lost' ? 'lost' : 'timeout',
           t: +G.t.toFixed(2), boss: P.Rush ? P.Rush.idx : 0, phase: P.AI.phase, bossHp: +(P.AI.hp / P.AI.maxHp).toFixed(3), maxHp: P.AI.maxHp,
           hp: P.fighters.map(q => Math.round(q.hp)), stats: clone(S), errors: errors.length - e0, err,
           chars: P.fighters.map(q => q.char), loadouts: P.fighters.map(q => q.loadout.join('+')), relics: P.Relics.owned.map(o => o.slice()),
           dkHp: P.Dk && P.Dk.on ? [0, 1].map(i => +(P.Dk.get(i, 'hp') / P.Dk.get(i, 'maxHp')).toFixed(3)) : null };
}

if (A.worker) {
  const P = await loadGame(A.file);
  const seeds = A.seeds.split(',').map(Number);
  for (const s of seeds) process.send({ row: runOne(P, cfg, s) });
  process.send({ done: true });
} else if (A.replay) {
  // online prep check: same input record → same final state, twice
  const P = await loadGame(prepModule());
  const n = +A.replay, out = [];
  // boss 1 (shuttle) and boss 2 (mark), duo and tag solo — each recorded once and replayed twice
  // 2단계: + new characters / third skills (twin blades in both a duo and tag solo, chain + shield) — extra rows after the 1.6 four
  const extra = A.replay2 ? [['duo', ['coop', 'coop'], 0, ['twin', 'chain'], [['crossCut', 'twinDrop'], ['chainSnatch', 'chainWhirl']]],
                             ['tag', ['tag'], 1, ['shield', 'twin'], [['shieldLift', 'shieldCharge'], ['spinRise', 'crossCut']]],
                             ['duo', ['coop', 'coop'], 1, ['rapier', 'great'], [['windThrust', 'spin'], ['earthSplit', 'launch']]],
                             ['duo', ['coop', 'coop'], 2, ['chain', 'shield'], null], ['tag', ['tag'], 2, ['twin', 'great'], null],   // 2단계 보스 3 (맥놀이 · 쌍검 낀 태그)
                             ['duo', ['coop', 'coop'], 3, ['twin', 'shield'], null], ['tag', ['tag'], 3, ['chain', 'rapier'], null]] : [];   // 2단계 보스 4 (쌍둥이 도깨비)
  for (const [mode, bots, boss, chars, loadouts] of [['duo', ['coop', 'coop'], 0], ['tag', ['tag'], 0], ['duo', ['coop', 'coop'], 1], ['tag', ['tag'], 1], ...extra]) {
    Math.random = mulberry32(99);
    const rec = P.record({ mode, bots, seed: 7, boss, chars, loadouts }, n);
    const S = P.Duo.stats, seen = { shuttle: S.shuttle.start, mark: S.mark.start, finishers: S.finN, covers: S.covers };
    const h1 = P.replay(rec), h2 = P.replay(rec);
    const same = h1.hash === h2.hash && h1.hash === rec.end.hash;
    out.push({ mode, boss: boss + 1, chars: chars || null, frames: n, record: rec.end.hash, replay1: h1.hash, replay2: h2.hash, same, seen });
    if (!same) console.log('MISMATCH', mode, '\n rec ', rec.end.state, '\n rp1 ', h1.state, '\n rp2 ', h2.state);
  }
  console.log(JSON.stringify({ replay: out, errors: errors.length }, null, 1));
} else {
  const file = prepModule();
  const seeds = Array.from({ length: cfg.runs }, (_, i) => cfg.seed + i);
  const W = Math.max(1, Math.min(cfg.workers, seeds.length)), rows = [];
  const t0 = Date.now();
  await Promise.all(Array.from({ length: W }, (_, w) => new Promise(res => {
    const mine = seeds.filter((_, i) => i % W === w);
    const child = fork(fileURLToPath(import.meta.url), ['--worker', '1', '--file', file, '--seeds', mine.join(','), '--mode', cfg.mode,
      '--bots', cfg.bots.map(b => b || '-').join(','), '--max', String(cfg.max), '--boss', String(cfg.boss),
      ...(cfg.chars ? ['--chars', cfg.chars.join(',')] : []), '--equip', cfg.equip, '--relic', cfg.relic, ...(A.art && A.art !== true ? ['--art', String(A.art)] : [])], { stdio: ['ignore', A.quiet ? 'ignore' : 'inherit', 'inherit', 'ipc'] });
    child.on('message', m => { if (m.row) { rows.push(m.row); if (!A.quiet) process.stderr.write(`  seed ${m.row.seed}: ${m.row.result} ${m.row.t}s\n`); } if (m.done) child.kill(); });
    child.on('exit', res);
  })));
  rows.sort((a, b) => a.seed - b.seed);
  if (A.out) fs.writeFileSync(A.out, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  const won = rows.filter(r => r.result === 'won'), avg = (k, list = rows) => list.length ? list.reduce((s, r) => s + k(r), 0) / list.length : 0;
  const sum = {
    cfg: `${cfg.mode} ${cfg.bots.join(',')}`, runs: rows.length, clear: +(won.length / rows.length).toFixed(3),
    lost: rows.filter(r => r.result === 'lost').length, timeout: rows.filter(r => r.result === 'timeout').length, error: rows.filter(r => r.result === 'error').length,
    clearTime: +avg(r => r.t, won).toFixed(1), clearTimeMin: won.length ? Math.min(...won.map(r => r.t)) : null, clearTimeMax: won.length ? Math.max(...won.map(r => r.t)) : null,
    links: +avg(r => r.stats.linkHits).toFixed(2), covers: +avg(r => r.stats.covers).toFixed(2), fullRally: +avg(r => r.stats.fullRally).toFixed(2),
    rally2: +avg(r => r.stats.rally2).toFixed(2), rallyMax: +avg(r => r.stats.rallyMax).toFixed(2), tagParry: +avg(r => r.stats.tagParry).toFixed(2),
    tagLink: +avg(r => r.stats.tagLink).toFixed(2), tagRescue: +avg(r => r.stats.tagRescue).toFixed(2),
    parry: +avg(r => r.stats.parry).toFixed(1), perfect: +avg(r => r.stats.perfect).toFixed(1), launches: +avg(r => r.stats.launches).toFixed(1),
    launchHits: +avg(r => r.stats.launchHits).toFixed(1), lifts: +avg(r => r.stats.lifts).toFixed(1), grabs: +avg(r => r.stats.grabs).toFixed(2),
    grabFrees: +avg(r => r.stats.grabFrees).toFixed(2), grabSlams: +avg(r => r.stats.grabSlams).toFixed(2), splitOK: +avg(r => r.stats.splitOK).toFixed(2),
    splitFail: +avg(r => r.stats.splitFail).toFixed(2), backShare: +avg(r => r.stats.hits ? r.stats.backHits / r.stats.hits : 0).toFixed(3),
    aggroSwaps: +avg(r => r.stats.aggroSwaps).toFixed(1), groggy: +avg(r => r.stats.groggyN).toFixed(1), downs: +avg(r => r.stats.downs).toFixed(2),
    dmgTaken: +avg(r => r.stats.dmgTaken).toFixed(0), rallyBreaks: +avg(r => r.stats.rallyBreaks).toFixed(1),
    bossActive: +avg(r => r.stats.t ? r.stats.bossActive / r.stats.t : 0).toFixed(3), bossAttack: +avg(r => r.stats.t ? r.stats.bossAttack / r.stats.t : 0).toFixed(3),
    freeze: +avg(r => r.stats.t ? r.stats.freeze / r.stats.t : 0).toFixed(3), phaseReached: +avg(r => r.phase).toFixed(2),
    errors: rows.reduce((s, r) => s + r.errors, 0), wall: +((Date.now() - t0) / 1000).toFixed(0),
  };
  // ---- 1.5단계 지표: 8가지 연계(20판 합계) · 셔틀 · 표식 · 보스별 처치 시간 · 러시 진행
  const tot = k => rows.reduce((s, r) => s + (k(r) || 0), 0);
  sum.fin = Object.fromEntries(FIN_KEYS.map(k => [k, tot(r => r.stats.fin && r.stats.fin[k])]));
  sum.finMin = Math.min(...FIN_KEYS.map(k => sum.fin[k]));
  // 2단계: 마무리 12칸(상태 × 모양) · 상태 × 스킬 · 전용 합동기 · 날아가는 시동 · 장착 조합
  const merge = k => rows.reduce((o, r) => { for (const [a, v] of Object.entries((r.stats[k]) || {})) o[a] = (o[a] || 0) + v; return o; }, {});
  sum.fin2 = merge('fin2'); sum.finSk = merge('finSk'); sum.proj = merge('proj');
  sum.bell = merge('bell'); if (sum.bell.match) sum.bell.blockRate = +(sum.bell.block / sum.bell.match).toFixed(3);   // 2단계 보스 3 맥놀이: 맞는 색이 막은 비율
  sum.loadouts = rows.reduce((o, r) => { (r.loadouts || []).forEach((l, i) => { const k = `${r.chars[i]}:${l}`; o[k] = (o[k] || 0) + 1; }); return o; }, {});
  sum.starters = tot(r => r.stats.starts); sum.statusN = tot(r => r.stats.statusN);
  const shS = tot(r => r.stats.shuttle && r.stats.shuttle.start), shOK = tot(r => r.stats.shuttle && r.stats.shuttle.smash);
  sum.shuttle = { start: shS, smash: shOK, fail: tot(r => r.stats.shuttle && r.stats.shuttle.fail), returns: tot(r => r.stats.shuttle && r.stats.shuttle.returns),
                  rate: shS ? +(shOK / shS).toFixed(3) : null };
  const mkA = tot(r => r.stats.mark && r.stats.mark.atk), mkC = tot(r => r.stats.mark && r.stats.mark.cover);
  sum.mark = { start: tot(r => r.stats.mark && r.stats.mark.start), atk: mkA, cover: mkC, fail: tot(r => r.stats.mark && r.stats.mark.fail),
               rate: mkA ? +(mkC / mkA).toFixed(3) : null };
  const bt = i => rows.map(r => r.stats.bossT && r.stats.bossT[i]).filter(v => v > 0);
  const avgL = l => (l.length ? +(l.reduce((a, b) => a + b, 0) / l.length).toFixed(1) : null);
  const NB = 4;                                     // 2단계: 4체 러시
  sum.bossT = [...Array(NB).keys()].map(i => avgL(bt(i))); sum.bossTmin = [...Array(NB).keys()].map(i => (bt(i).length ? Math.min(...bt(i)) : null));
  sum.bossTmax = [...Array(NB).keys()].map(i => (bt(i).length ? Math.max(...bt(i)) : null));
  sum.bossReached = +avg(r => r.boss).toFixed(2);
  // ---- 1.6 청파·적파: 사람별 흡수·사용(20판 합계) · 넘쳐서 밀려남 · 강화 시동/마무리 · 자파 · 컷인 (판당 평균)
  const wv = k => tot(r => r.stats.wave && k(r.stats.wave));
  sum.wave = { absorbA: wv(w => w.absorb[0]), absorbB: wv(w => w.absorb[1]), usedA: wv(w => w.used[0]), usedB: wv(w => w.used[1]), lost: wv(w => w.lost),
               empStart: wv(w => w.empStart), empFin: wv(w => w.empFin), violet: wv(w => w.violet), cut: wv(w => w.cut),
               violetPerRun: +(wv(w => w.violet) / rows.length).toFixed(2), cutPerRun: +(wv(w => w.cut) / rows.length).toFixed(2) };
  // ---- 2단계 새 지표: 도깨비 합동기 · 쌍검 흡수 독점 · 유물 선택 분포 · 클리어한 판의 보스별 시간
  sum.dk = merge('dk');
  if (sum.dk.linkLift) sum.dk.linkBreakRate = +(sum.dk.linkBreak / sum.dk.linkLift).toFixed(3);
  if (sum.dk.ult) sum.dk.ultSyncRate = +(sum.dk.ultSync / sum.dk.ult).toFixed(3);
  const tw = rows.filter(r => (r.chars || []).includes('twin') && r.mode === 'duo');
  if (tw.length) {
    const a = tw.reduce((s, r) => { const i = r.chars.indexOf('twin'); return s + ((r.stats.wave && r.stats.wave.absorb[i]) || 0); }, 0);
    const b = tw.reduce((s, r) => { const i = 1 - r.chars.indexOf('twin'); return s + ((r.stats.wave && r.stats.wave.absorb[i]) || 0); }, 0);
    sum.twin = { absorbTwin: a, absorbPartner: b, ratio: b ? +(a / b).toFixed(3) : null };
  }
  sum.relics = rows.reduce((o, r) => { for (const l of r.relics || []) for (const id of l) o[id] = (o[id] || 0) + 1; return o; }, {});
  sum.rally2PerRun = +avg(r => r.stats.rally2).toFixed(2);
  // ---- 3단계: QTE (완주율 = 전부 성공한 QTE / 시작한 QTE · 칸 성공률 = 깨진 칸 / 판정한 칸) · 화면 글자 동시 표시 (U1)
  const qs = rows.map(r => r.stats.qte).filter(Boolean), qt = k => qs.reduce((a, q) => a + (q[k] || 0), 0);
  const byB = {}; for (const q of qs) for (const [b, v] of Object.entries(q.byBoss || {})) { const o = byB[b] || (byB[b] = { n: 0, perfect: 0, cells: 0, ok: 0 }); for (const k of Object.keys(o)) o[k] += v[k] || 0; }
  for (const o of Object.values(byB)) { o.complete = o.n ? +(o.perfect / o.n).toFixed(3) : null; o.cellRate = o.cells ? +(o.ok / o.cells).toFixed(3) : null; }
  sum.qte = { n: qt('n'), perfect: qt('perfect'), cells: qt('cells'), ok: qt('ok'), miss: qt('miss'), wrong: qt('wrong'), early: qt('early'), punish: qt('punish'), abort: qt('abort'), tagSwap: qt('tagSwap'),
              complete: qt('n') ? +(qt('perfect') / qt('n')).toFixed(3) : null, cellRate: qt('cells') ? +(qt('ok') / qt('cells')).toFixed(3) : null, perRun: +(qt('n') / rows.length).toFixed(2), byBoss: byB };
  const us = rows.map(r => r.stats.ui).filter(Boolean);
  sum.ui = { max: us.length ? Math.max(...us.map(u => u.max)) : null, over: us.reduce((a, u) => a + u.over, 0), frames: us.reduce((a, u) => a + u.frames, 0),
             hist: us.reduce((h, u) => h.map((v, i) => v + (u.hist[i] || 0)), [0, 0, 0, 0, 0, 0]) };
  console.log(JSON.stringify(sum));
}
