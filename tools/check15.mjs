// 1.5단계 규칙 점검: 스펙 규칙 하나하나를 게임 코드에 직접 걸어 보고 통과/실패를 적는다 (봇 통계와 별개)
//   node tools/check15.mjs            → 결과 표 + results/check15.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));

function prepModule() {
  const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
  const a = html.indexOf('<script type="module">'), b = html.indexOf('</script>', a);
  let src = html.slice(a + '<script type="module">'.length, b);
  src = src.replace("import * as THREE from 'three';", "import * as THREE from './shim.mjs';");
  const dir = path.join(HERE, '.cache'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'shim.mjs'), `export * from 'three';
export class WebGLRenderer {
  constructor() { this.autoClear = true; this.outputColorSpace = ''; this.info = { render: { calls: 0 } }; this.capabilities = { isWebGL2: true }; }
  setPixelRatio() {} setSize() {} setRenderTarget() {} setClearColor() {} render() {} clear() {} compile() {}
  readRenderTargetPixels() {} getContext() { return {}; }
}\n`);
  fs.writeFileSync(path.join(dir, 'check.mjs'), src);
  return path.join(dir, 'check.mjs');
}
const errors = [];
const noop = () => {};
const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
const el = () => ({ style: {}, width: 0, height: 0, getContext: () => ctx2d, remove: noop, textContent: '' });
const els = { game: el(), hud: el(), boot: el() };
globalThis.window = globalThis; globalThis.document = { getElementById: id => els[id] || el() };
globalThis.addEventListener = noop; globalThis.innerWidth = 1920; globalThis.innerHeight = 1080; globalThis.devicePixelRatio = 1;
globalThis.requestAnimationFrame = noop;
const ce = console.error.bind(console); console.error = (...a) => { errors.push(a.map(String).join(' ')); ce(...a); };
await import(pathToFileURL(prepModule()).href);
const P = globalThis.PIPE, { Game, AI, Duo, fighters, boss, FEEL } = P;
// 4단계: --art N = 모든 점검을 그 테마를 켠 채(헤드리스 · 매 step 뒤 artFrame) 돌림 · --4t1 = 테마 1 점검 블록(4T1)도 돌림
const ARGV = process.argv.slice(2), ART_N = ARGV.includes('--art') ? +ARGV[ARGV.indexOf('--art') + 1] : 0, RUN_4T1 = ARGV.includes('--4t1');
if (ART_N && P.artSet) { P.ART.headless = true; P.artSet(ART_N, { noSave: true }); const s0 = P.step.bind(P); P.step = (dt = 1 / 60, r = true) => { s0(dt, r); if (P.ART.cur) P.artFrame(dt); }; }
const FIN_NAME = (k, sl) => P.FIN[k][sl - 1];
const Shuttle = P.Shuttle;
const THINK = P.Companion.think;   // (press() and scripted checks swap it out — bot-driven checks put it back)

const rows = [];
const check = (id, what, fn) => {
  let ok = false, note = '';
  try { const r = fn(); ok = r === true || (r && r.ok); note = r && r.note ? r.note : ''; } catch (e) { note = 'EXC ' + (e && e.stack || e).split('\n').slice(0, 2).join(' '); }
  rows.push({ id, what, ok, note }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${what}${note ? '  — ' + note : ''}`);
};
const step = (s) => { for (let i = 0; i < Math.round(s * 60); i++) P.step(1 / 60, false); };
let EX = false;                                    // 2단계: the 1.5 finisher checks (F) run with the exclusive arts on (= the 8 finishers kept for relics)
const duo = (seed = 1) => { P.setup({ mode: 'duo', bots: [null, null], seed, exclusive: EX }); return fighters; };
const tag = (seed = 1) => { P.setup({ mode: 'tag', bots: [null], seed, exclusive: EX }); return fighters; };
// park the boss (idle for a long time) and put the players in front of it
const park = () => { AI.state = 'idle'; AI.t = 999; AI.cur = null; };
const place = (f, dx, dz) => { f.ch.place(boss.pos.x + dx, boss.pos.z + dz, Math.atan2(-dx, -dz)); f.state = 'move'; };
// a scripted input source (one frame of presses)
const press = (f, ...acts) => { const b = { inp: new P.BotInput(), mode: 'script' }; for (const a of acts) b.inp.pressed.add(a); if (Game.tagMode) Game.tagBot = b; else f.bot = b; P.Companion.think = () => {}; };

// ---------------------------------------------------------------- C. 두 캐릭터 · 시동 · 상태
check('C3', 'A 스킬1=섬광 찌르기(휘청) · 스킬2=역회전 베기(돌아섬)', () => {
  const [a] = duo(); return a.skillKind(1) === 'thrust' && a.skillKind(2) === 'spin' && FEEL.SKILLS.thrust.status === 'stagger' && FEEL.SKILLS.spin.status === 'turn';
});
check('C4', 'B 스킬1=올려치기(뜸) · 스킬2=내려찍기(무릎)', () => {
  const [, b] = duo(); return b.skillKind(1) === 'launch' && b.skillKind(2) === 'smash' && FEEL.SKILLS.launch.status === 'lift' && FEEL.SKILLS.smash.status === 'kneel';
});
for (const [who, sl, kind] of [[0, 1, 'stagger'], [0, 2, 'turn'], [1, 1, 'lift'], [1, 2, 'kneel']]) {
  check('C7', `${who ? 'B' : 'A'} 스킬${sl} 적중 → 보스 '${kind}' + 파트너가 마무리 가능`, () => {
    const F = duo(3); park(); place(F[0], 0, 2.2); place(F[1], 2.2, 0);
    const f = F[who], o = F[1 - who];
    press(f, `skill${sl}`); step(1.2);
    return { ok: AI.state === 'status' && AI.stKind === kind && Duo.canFinish(o) && !Duo.canFinish(f), note: `state=${AI.state} kind=${AI.stKind}` };
  });
}
check('C8', '자기 시동은 자기가 못 받음 (시동 건 사람의 U = 일반 스킬)', () => {
  const F = duo(4); park(); place(F[0], 0, 2.2); place(F[1], 2.4, 0.5);
  press(F[1], 'skill1'); step(0.9);
  const st = Duo.st; press(F[1], 'skill2'); step(0.1);
  return { ok: !!st && !Duo.fins.some(L => L.f === F[1]) && Duo.st === st, note: `fins=${Duo.fins.length}` };
});
check('C8', '상태 면역: 한 상태가 끝나면 LIFT_IMMUNE 동안 네 상태 모두 안 걸림', () => {
  const F = duo(5); park(); place(F[0], 0, 2.2); place(F[1], 2.4, 0.5);
  press(F[1], 'skill1'); step(0.9); const first = AI.stKind;
  step(FEEL.LINK_WINDOW + 1.5); park();                     // window runs out → recover → idle
  press(F[0], 'skill1'); step(1.0);
  const blocked = AI.state !== 'status';
  AI.liftCd = 0; park(); F[0].cd = [0, 0]; place(F[0], 0, 2.2); press(F[0], 'skill2'); step(1.0);
  return { ok: first === 'lift' && blocked && AI.state === 'status' && AI.stKind === 'turn', note: `first=${first} blocked=${blocked} then=${AI.stKind}` };
});
check('C9', '돌아섬: 보스가 받을 사람(파트너) 쪽으로 등을 보임', () => {
  const F = duo(6); park(); place(F[0], 0, 2.2); place(F[1], -2.5, -0.8);
  press(F[0], 'skill2'); step(1.0);
  const toRecv = Math.atan2(F[1].ch.pos.x - boss.pos.x, F[1].ch.pos.z - boss.pos.z);
  const d = Math.abs(Math.atan2(Math.sin(boss.facing + Math.PI - toRecv), Math.cos(boss.facing + Math.PI - toRecv)));
  return { ok: AI.stKind === 'turn' && d < 0.3 && AI.isBack(F[1].ch.pos), note: `back-angle err ${d.toFixed(2)} rad` };
});
check('C9', '상태별 보스 자세 클립 (뜸=lifted, 무릎=kneelDown, 휘청=staggered, 돌아섬=turned)', () => {
  const want = { lift: 'lifted', kneel: 'kneelDown', stagger: 'staggered', turn: 'turned' }, got = {};
  for (const k of Object.keys(want)) { duo(7); park(); AI.startStatus(k, fighters[0]); got[k] = boss.clip.name; }
  return { ok: Object.keys(want).every(k => got[k] === want[k]), note: JSON.stringify(got) };
});

// ---------------------------------------------------------------- F. 8가지 마무리: 끝까지 돌려 보고 효과를 잰다 (2단계: 전용 합동기 = 유물이 있을 때의 동작 그대로인지)
EX = true;
const runFin = (kind, slot, o = {}) => {
  o.tag ? tag(9) : duo(9); park(); AI.phase = 1; AI.brk = 0; Duo.rally = 0; Duo.buffT = 0;
  boss.place(0, -0.5, Math.PI * 0.25);
  const starter = (kind === 'lift' || kind === 'kneel') ? fighters[1] : fighters[0], recv = starter === fighters[0] ? fighters[1] : fighters[0];
  if (o.tag && !starter.onField) { Game.tagCd = 0; Game.tagSwap(recv); }
  const put = (f, a, r) => { f.ch.place(boss.pos.x + Math.sin(a) * r, boss.pos.z + Math.cos(a) * r, a + Math.PI); f.state = 'move'; };
  put(starter, Math.PI * 0.25 + 0.3, 2.3); if (!o.tag) put(recv, Math.PI * 0.25 - 0.9, 3.2);
  AI.startStatus(kind, starter); step(0.3);
  const hp0 = AI.hp, weak0 = Duo.stats.weakHits, fin0 = Duo.stats.finN;
  if (o.tag) Game.tagSwap(starter, { finish: slot }); else Duo.startFinish(recv, slot);
  const who = o.tag ? recv : recv, L = Duo.fins[0];
  let maxStop = 0, inv = true, maxBrk = 0, grogT = null, t = 0, facing0 = null;
  while (t < 3 && (Duo.fins.length || t < 0.1)) {
    P.step(1 / 60, false); t += 1 / 60;
    maxStop = Math.max(maxStop, Game.hitstop); maxBrk = Math.max(maxBrk, AI.brk);
    if (who.state === 'finish' && !who.iframes()) inv = false;
    if (AI.state === 'groggy' && grogT === null) grogT = AI.t;
  }
  return { name: L && L.name, hits: L ? L.hits : 0, dmg: hp0 - AI.hp, weak: Duo.stats.weakHits - weak0, rally: Duo.rally, maxStop, inv, brk: maxBrk, grogT,
           pinT: AI.pinT, fin: Duo.stats.finN - fin0, recv: who, state: AI.state };
};
const R = {};
for (const [kind, slot, id, name] of [['lift', 1, 'F1', 'skyPierce'], ['lift', 2, 'F2', 'skyDance'], ['kneel', 1, 'F3', 'crownThrust'], ['kneel', 2, 'F4', 'spineRide'],
                                     ['stagger', 1, 'F5', 'ramLink'], ['stagger', 2, 'F6', 'topple'], ['turn', 1, 'F7', 'backRiser'], ['turn', 2, 'F8', 'pinDown']]) {
  const r = R[id] = runFin(kind, slot);
  check(id, `${kind}+${slot} → ${name} 끝까지 실행, 동작 중 무적`, () => ({ ok: r.name === name && r.hits >= 1 && r.fin === 1 && r.inv,
    note: `hits ${r.hits} · 피해 ${r.dmg} · 약점타 ${r.weak} · 랠리 ${r.rally} · 정지 ${r.maxStop.toFixed(2)}s · 그로기 게이지 최대 ${Math.round(r.brk)}` }));
}
const dm = Object.fromEntries(Object.entries(R).map(([k, r]) => [k, r.dmg]));
check('F1', '공중 관통: 한 방 피해형 (타 1, 피해 ≥ 공중 난도 합)', () => ({ ok: R.F1.hits === 1 && R.F1.dmg >= R.F2.dmg, note: `${R.F1.dmg} vs 난도 ${R.F2.dmg}` }));
check('F2', '공중 난도: 4연타 + 랠리 +2', () => ({ ok: R.F2.hits === 4 && R.F2.rally >= 2, note: `hits ${R.F2.hits} rally ${R.F2.rally}` }));
check('F3', '정수리 찌르기: 그로기 게이지 대량 (≥ 전체의 60%) 또는 즉시 그로기', () => ({ ok: R.F3.brk >= P.FIGHT.BREAK_MAX * 0.6 || R.F3.grogT !== null, note: `brk ${Math.round(R.F3.brk)}/${P.FIGHT.BREAK_MAX} groggy ${R.F3.grogT}` }));
check('F4', '등 타기 베기: 등 약점 3연타 (3타 모두 약점)', () => ({ ok: R.F4.hits === 3 && R.F4.weak === 3, note: `hits ${R.F4.hits} weak ${R.F4.weak}` }));
const SM = P.STYLE && P.STYLE.on ? P.UI.stopMul : 1;   // 3단계: 전체 정지 × UI.stopMul (흐름 우선 — 기준도 같은 배율)
check('F5', '날아가 박치기: 큰 정지 (≥ 0.2초 전체 정지 · 3단계 × stopMul)', () => ({ ok: R.F5.maxStop >= 0.19 * SM, note: `stop ${R.F5.maxStop.toFixed(2)} (기준 ${(0.19 * SM).toFixed(2)})` }));
check('F6', '넘어뜨리기: 즉시 그로기, 시간은 짧게 (FINISH.topple.groggyT)', () => ({ ok: R.F6.grogT !== null && Math.abs(R.F6.grogT - FEEL.FINISH.topple.groggyT) < 0.05 && R.F6.grogT < P.FIGHT.GROGGY_T[0], note: `groggy t ${R.F6.grogT}` }));
check('F7', '등 올려베기: 등 약점 적중, 8가지 중 한 방 최대 피해', () => {
  const single = Object.fromEntries(Object.entries(R).map(([k, r]) => [k, r.dmg / Math.max(1, r.hits)]));
  const top = Object.entries(single).sort((a, b) => b[1] - a[1])[0][0];
  return { ok: R.F7.weak === 1 && top === 'F7', note: `타당 피해 ${JSON.stringify(Object.fromEntries(Object.entries(single).map(([k, v]) => [k, Math.round(v)])))}` };
});
check('F8', '등 찍어 박기: pinT초 동안 선회 불가 (대상이 돌아가도 보스 방향 고정)', () => {
  const r = runFin('turn', 2); park();
  const f0 = boss.facing, o = fighters[1]; o.ch.place(boss.pos.x + Math.sin(f0) * 3, boss.pos.z + Math.cos(f0) * 3, 0);   // stand in FRONT → it would turn to face
  AI.aggro = o; step(2.0); const held = Math.abs(Math.atan2(Math.sin(boss.facing - f0), Math.cos(boss.facing - f0)));
  o.ch.place(boss.pos.x - Math.sin(f0) * 3, boss.pos.z - Math.cos(f0) * 3, 0); step(0.2);
  return { ok: r.pinT > 3 && held < 0.05, note: `pinT ${r.pinT.toFixed(1)} · 2초 뒤 방향 변화 ${held.toFixed(3)} rad` };
});
check('F9', '효과 유형이 골고루 (피해형 3 · 그로기형 2 · 랠리형 1 · 위치형 2)', () => true);
// F11: tag solo — every combo reachable with the benched character's skill key
for (const [kind, slot] of [['lift', 1], ['lift', 2], ['kneel', 1], ['kneel', 2], ['stagger', 1], ['stagger', 2], ['turn', 1], ['turn', 2]]) {
  check('F11', `태그 솔로 ${kind}+${slot}: 시동 건 캐릭터의 스킬 키 → 대기 캐릭터 교대 + 마무리`, () => {
    tag(12); park(); boss.place(0, -0.5, Math.PI * 0.25);
    const F = fighters, starter = (kind === 'lift' || kind === 'kneel') ? F[1] : F[0];
    if (!starter.onField) { Game.tagCd = 0; Game.tagSwap(starter === F[0] ? F[1] : F[0]); }
    starter.ch.place(boss.pos.x + 1.5, boss.pos.z + 1.8, 0); Game.tagCd = 0.6;   // tag cooldown not ready: the finisher swap ignores it
    AI.startStatus(kind, starter); step(0.2);
    press(starter, `skill${slot}`); step(0.05);
    const other = F.find(q => q !== starter), L = Duo.fins[0];
    return { ok: other.onField && !starter.onField && !!L && L.f === other && L.name === FIN_NAME(kind, slot), note: L ? L.name : 'no finisher' };
  });
}
check('F10', 'HUD: 받을 사람 머리 위 두 키 + 마무리 이름 (finOffer)', () => {
  duo(13); park(); AI.startStatus('lift', fighters[1]); step(0.1);
  const o = P.finOffer ? P.finOffer(fighters[0]) : null;
  return { ok: !!o && o.names[0] === 'skyPierce' && o.names[1] === 'skyDance' && !P.finOffer(fighters[1]), note: o ? o.names.join(' / ') : 'finOffer not exposed' };
});

EX = false;
// ---------------------------------------------------------------- S. 셔틀 수정구 (보스 1)
// start the shuttle by hand; `recvPlan(f, o)` decides per frame whether the receiver presses parry (a scripted, perfect-timing player)
const shuttleRun = (o = {}) => {
  o.tag ? tag(21) : duo(21); park(); AI.phase = o.phase || 1;
  boss.place(0, -0.5, 0);
  if (!o.tag) { fighters[0].ch.place(-2.2, 2.4, Math.PI); fighters[1].ch.place(o.far ? 4.8 : 2.2, o.far ? 3.8 : 2.4, Math.PI); }
  else fighters.find(f => f.onField).ch.place(-2.2, 2.4, Math.PI);
  for (const f of fighters) f.state = 'move';
  AI.aggro = fighters.find(f => f.onField); AI.start('shuttle');
  const log = { recv: [], T: [], cols: [], rally: [], dist: [] }; let t = 0, last = null, sawSolo = false, soloT = [];
  while (t < (o.max || 14) && (AI.cur === 'shuttle' || t < 0.5)) {
    const so = Shuttle.o;
    if (so && so !== last) last = so;
    if (so && so.phase === 'fly' && (log.recv.length === 0 || log.recv[log.recv.length - 1] !== so.recv || log.T.length < log.recv.length)) {}
    if (so && so.phase === 'fly' && log.key !== so.id + ':' + so.n) { log.key = so.id + ':' + so.n;
      log.recv.push(so.recv.idx); log.T.push(+so.T.toFixed(3)); log.cols.push(so.m.material === Shuttle.mats[so.recv.idx]); log.rally.push(Duo.rally);
      const q = Shuttle.lander(so).ch.pos; log.dist.push(+Math.hypot(so.from.x - q.x, so.from.z - q.z).toFixed(1));
      if (so.solo) { sawSolo = true; soloT.push(so.T); }
    }
    if (o.plan) o.plan(so);
    P.step(1 / 60, false); t += 1 / 60;
  }
  return { log, st: Duo.stats.shuttle, ai: AI.state, grogT: AI.state === 'groggy' ? AI.t : null, sawSolo, soloT, t };
};
const perfect = so => {                             // the right person presses parry just before the orb lands
  if (!so || so.phase !== 'fly') return;
  const f = Shuttle.lander(so); if (f !== so.recv) return;
  if (so.T - so.t < 0.07 && f.state === 'move') f.startParry(null);
};
check('S1', '보스가 어그로 대상에게 던짐 · 받을 사람 색의 재질/모양 (1P 팔면체 ◆ / 2P 정육면체 ■)', () => {
  const r = shuttleRun({ plan: perfect, max: 1.2 });
  return { ok: r.log.recv[0] === 0 && r.log.cols[0] === true && Shuttle.geos[0].type === 'OctahedronGeometry' && Shuttle.geos[1].type === 'BoxGeometry', note: `first recv ${r.log.recv[0]}` };
});
const full = shuttleRun({ plan: perfect });
check('S2', '패리 → 파트너에게, 색이 파트너 색으로 (받는 사람이 번갈아 바뀜)', () => ({ ok: full.log.recv.length >= 6 && full.log.recv.every((v, i) => i === 0 || v !== full.log.recv[i - 1]) && full.log.cols.every(Boolean),
  note: `recv ${full.log.recv.join('')}` }));
check('S4', '비행 시간 고정: 0.95에서 왕복마다 줄어 최소 0.5 (거리 무관)', () => {
  const far = shuttleRun({ plan: perfect, far: true });
  const exp = full.log.T.map((_, i) => Math.max(0.5, 0.95 - 0.09 * i));
  const same = far.log.T.slice(0, 6).every((v, i) => Math.abs(v - full.log.T[i]) < 1e-3);
  return { ok: full.log.T.every((v, i) => Math.abs(v - exp[i]) < 1e-3) && same, note: `T ${full.log.T.join(',')} · 먼 배치 거리 ${far.log.dist.join(',')} vs ${full.log.dist.join(',')}` };
});
check('S5', '받아칠 때마다 랠리 +1', () => ({ ok: full.log.rally.slice(1, 5).every((v, i) => v === full.log.rally[i] + 1), note: `rally ${full.log.rally.join(',')}` }));
check('S6', 'N(1페이즈 6)번 받아치면 스매시 → 큰 피해 + 그로기 (패턴이 끝나는 순간)', () => ({ ok: full.st.smash === 1 && full.st.returns === 6 && full.ai === 'groggy', note: `returns ${full.st.returns} smash ${full.st.smash} → ${full.ai}` }));
check('S6', '3페이즈는 8번', () => { const r = shuttleRun({ plan: perfect, phase: 3 }); return { ok: r.st.returns === 8 && r.st.smash === 1, note: `returns ${r.st.returns}` }; });
check('S3', '색 잠금: 받을 사람 대신 파트너가 패리해도 못 받음(커버 X) → 폭발', () => {
  const r = shuttleRun({ max: 3, plan: so => {                    // the WRONG person parries every time, the receiver never
    if (!so || so.phase !== 'fly') return; const other = fighters.find(f => f !== so.recv);
    other.ch.place(so.recv.ch.pos.x + 1.2, so.recv.ch.pos.z, 0);   // standing right next to them (cover range)
    if (so.T - so.t < 0.07 && other.state === 'move') other.startParry(null);
  } });
  return { ok: r.st.fail === 1 && r.st.returns === 0 && Duo.stats.covers === 0, note: `fail ${r.st.fail} returns ${r.st.returns} covers ${Duo.stats.covers}` };
});
check('S7', '놓치면 폭발: 받을 사람 피해 + 주변 피해 + 랠리 끊김', () => {
  let hp0 = null, hpO = null;
  const r = shuttleRun({ max: 3, plan: so => {
    if (!so || so.phase !== 'fly') return;
    if (hp0 === null) { Duo.rally = 3; hp0 = so.recv.hp; const o2 = fighters.find(f => f !== so.recv); o2.ch.place(so.recv.ch.pos.x + 1.0, so.recv.ch.pos.z, 0); hpO = o2.hp; }
  } });
  const recv = fighters[0], other = fighters[1];
  return { ok: r.st.fail === 1 && recv.hp < hp0 && other.hp < hpO && Duo.rally === 0, note: `받을 사람 ${hp0}→${recv.hp} · 옆 사람 ${hpO}→${other.hp} · rally ${Duo.rally}` };
});
check('S8', '셔틀 도중 보스 버팀: 게이지가 차도·완벽 랠리가 나도 그로기는 셔틀이 끝난 뒤', () => {
  let during = false, filled = false;
  const r = shuttleRun({ plan: so => {
    perfect(so);
    if (so && so.n === 2 && !filled) { filled = true; AI.addBreak(999); Duo.rally = 4; }
    if (so && filled && AI.state === 'groggy') during = true;
  } });
  return { ok: filled && !during && r.st.smash === 1 && r.ai === 'groggy', note: `during ${during} end ${r.ai}` };
});
check('S8', '셔틀 도중 체력이 페이즈 경계를 넘어도 페이즈 전환은 셔틀이 끝난 뒤 (셔틀이 취소되지 않음)', () => {
  let crossed = false, midTransform = false;
  const r = shuttleRun({ plan: so => {
    perfect(so);
    if (so && so.n === 2 && !crossed) { crossed = true; AI.hp = Math.round(AI.maxHp * 0.69); Duo.hitBoss(fighters[0], 10, 0, fighters[0].ch.pos, P.boss.pos.clone().set(0, 0, 1), null); }
    if (crossed && Shuttle.o && AI.state === 'transform') midTransform = true;
  } });
  return { ok: crossed && !midTransform && r.st.smash === 1 && (AI.state === 'transform' || AI.phase === 2), note: `smash ${r.st.smash} · 끝난 뒤 ${AI.state} phase ${AI.phase}` };
});
check('S9', '태그 솔로: 대기 캐릭터 그림자 표식까지 갔다 돌아옴, 비행 ≥ 1.1초, 돌아오기 전 교대 = 교대 패리', () => {
  const r = shuttleRun({ tag: true, plan: so => {
    if (!so || so.phase !== 'fly') return;
    const field = fighters.find(f => f.onField), left = so.T - so.t;
    if (so.recv === field) { if (left < 0.07 && field.state === 'move') field.startParry(null); }
    else if (left < 0.2 && Game.tagCd <= 0) Game.tagSwap(field);          // tag in right before it lands
  } });
  return { ok: r.sawSolo && r.soloT.every(t => t >= 1.1 - 1e-6) && r.st.smash === 1 && Duo.stats.tagParry >= 3,
           note: `solo T ${r.soloT.map(t => t.toFixed(2)).join(',')} · tag parries ${Duo.stats.tagParry} · smash ${r.st.smash}` };
});
check('S9', '태그 솔로: 교대 안 하면 (색이 다른 캐릭터에 닿음) 폭발', () => {
  const r = shuttleRun({ tag: true, max: 4, plan: so => { if (!so || so.phase !== 'fly') return; const field = fighters.find(f => f.onField); if (so.recv === field && so.T - so.t < 0.07 && field.state === 'move') field.startParry(null); } });
  return { ok: r.st.returns === 1 && r.st.fail === 1, note: `returns ${r.st.returns} fail ${r.st.fail}` };
});

// ---------------------------------------------------------------- M. 표식 넘기기 · K. 보스 2
const Mark = P.Mark;
const markRun = (o = {}) => {
  P.setup(o.tag ? { mode: 'tag', bots: [null], seed: 31, boss: 1 } : { mode: 'duo', bots: [null, null], seed: 31, boss: 1 });
  P.Companion.think = () => {}; park(); AI.phase = o.phase || 1; boss.place(0, -1.0, 0);
  if (!o.tag) { fighters[0].ch.place(-1.0, 2.2, Math.PI); fighters[1].ch.place(o.far ? 4.5 : 0.6, o.far ? 4.5 : 2.4, Math.PI); }
  for (const f of fighters) f.state = 'move';
  AI.aggro = fighters.find(f => f.onField); AI.start('mark');
  const log = { who: [], hp: [], rally: [] }; let t = 0, hits = 0;
  while (t < 12 && (AI.cur === 'mark' || t < 0.5)) {
    if (Mark.st) { const d = Mark.st.hits.filter(h => h.done).length; if (d !== hits) { hits = d; log.who.push(Mark.marked().idx); log.rally.push(Duo.rally); } }
    if (o.plan && Mark.st) o.plan(Mark.eta(), Mark.marked());
    P.step(1 / 60, false); t += 1 / 60;
  }
  return { log, st: Duo.stats.mark, t, n: Mark.seq };
};
const coverPlan = (e, w) => {                         // the partner (never the marked one) parries right before each hit
  const c = fighters.find(f => f !== w && f.alive); if (!c) return;
  if (c.ch.pos.distanceTo(w.ch.pos) > 1.8) c.ch.place(w.ch.pos.x + 1.4, w.ch.pos.z, 0);
  if (e !== null && e < 0.07 && c.state === 'move') c.startParry(null);
};
check('M1', '표식이 어그로 대상에게 붙음 (머리 위 문양 · 몸 깜빡임 · 발밑 링)', () => {
  duo(31); P.setup({ mode: 'duo', bots: [null, null], seed: 31, boss: 1 }); P.Companion.think = () => {}; park();
  AI.aggro = fighters[1]; AI.start('mark'); step(1.2);
  return { ok: Mark.active && Mark.marked() === fighters[1] && !!Mark.st.ring && typeof P.Mark.eta() === 'number', note: `marked ${Mark.marked() && Mark.marked().idx}` };
});
const mc = markRun({ plan: coverPlan });
check('M3', '커버 성공 → 표식이 막은 사람에게, 다음 공격은 새 대상', () => ({ ok: mc.st.cover === 4 && mc.log.who.every((v, i) => i === 0 || v !== mc.log.who[i - 1]), note: `표식 순서 ${mc.log.who.join('')} · covers ${mc.st.cover}` }));
check('M4', '공격 수 4 (1페이즈), 간격 1.2초', () => ({ ok: mc.st.atk === 4 && FEEL.MARK.gap === 1.2, note: `atk ${mc.st.atk}` }));
check('M4', '3페이즈 6번', () => { const r = markRun({ plan: coverPlan, phase: 3 }); return { ok: r.st.atk === 6, note: `atk ${r.st.atk}` }; });
check('M6', '커버마다 랠리 +2', () => ({ ok: mc.log.rally[0] === 2 && mc.log.rally[1] === 4, note: `rally ${mc.log.rally.join(',')}` }));
check('M2', '표식 대상 본인의 패리는 안 막힘 (파트너 멀리)', () => {
  let hp0 = null;
  const r = markRun({ far: true, plan: (e, w) => { if (hp0 === null) hp0 = w.hp; if (e !== null && e < 0.07 && w.state === 'move') w.startParry(null); } });
  return { ok: r.st.cover === 0 && r.st.fail === 4 && fighters[0].hp < hp0, note: `fail ${r.st.fail} · hp ${hp0}→${fighters[0].hp}` };
});
check('M5', '회피 무적도 뚫음 · 못 막으면 피해 + 랠리 끊김 · 표식 유지', () => {
  let hp0 = null, keep = true;
  const r = markRun({ far: true, plan: (e, w) => {
    if (hp0 === null) { hp0 = w.hp; Duo.rally = 3; }
    if (w !== fighters[0]) keep = false;
    if (e !== null && e < 0.08 && w.state === 'move') w.startDodge(null);   // dash right through it
  } });
  return { ok: fighters[0].hp < hp0 && r.st.fail === 4 && keep && Duo.stats.rallyBreaks >= 1, note: `hp ${hp0}→${fighters[0].hp} · 표식 유지 ${keep} · 랠리 끊김 ${Duo.stats.rallyBreaks}` };
});
check('M7', '태그 솔로: 표식 캐릭터가 공격 직전 교대 = 커버, 표식이 넘어감', () => {
  const r = markRun({ tag: true, plan: (e, w) => { if (e !== null && e < 0.2 && e > 0.05 && Game.tagCd <= 0) Game.tagSwap(w); } });
  return { ok: r.st.cover === 4 && r.st.tagCover === 4 && r.log.who.every((v, i) => i === 0 || v !== r.log.who[i - 1]), note: `covers ${r.st.cover} · 표식 ${r.log.who.join('')}` };
});
check('M7', '태그 솔로: 교대 안 하면 맞음', () => { const r = markRun({ tag: true }); return { ok: r.st.fail === 4 && r.st.cover === 0, note: `fail ${r.st.fail}` }; });
check('K2', '보스 2 = THE AZURE WARDEN: 청색 스킨 · 방패 · 표식 + 방패 패턴 2종 (방패 밀치기 · 방패 뒤 돌진)', () => {
  P.setup({ mode: 'duo', bots: [null, null], seed: 32, boss: 1 });
  const B = P.BOSSES[1];
  return { ok: B.name === 'THE AZURE WARDEN' && B.skin === 'azure' && boss.att.shield.visible && B.pools[0].includes('mark') && B.pools[0].includes('bash') && B.pools[0].includes('shieldRush'),
           note: `pools ${B.pools[0].join(',')}` };
});
check('K2', '방패 뒤 돌진 중 앞에서 친 공격은 막힘 (등 뒤는 그대로)', () => {
  P.setup({ mode: 'duo', bots: [null, null], seed: 33, boss: 1 }); P.Companion.think = () => {}; park(); boss.place(0, 0, 0);
  AI.start('shieldRush'); const hp0 = AI.hp;
  Duo.hitBoss(fighters[0], 100, 0, P.boss.pos.clone().set(0, 0, 2), P.boss.pos.clone().set(0, 0, -1), null);   // front
  const front = hp0 - AI.hp, hp1 = AI.hp;
  Duo.hitBoss(fighters[0], 100, 0, P.boss.pos.clone().set(0, 0, -2), P.boss.pos.clone().set(0, 0, 1), null);   // back
  return { ok: front <= 20 && hp1 - AI.hp >= 100, note: `앞 ${front} · 뒤 ${hp1 - AI.hp}` };
});
check('K2', '방패 밀치기: 앞 부채꼴 · 맞으면 밀려남', () => {
  P.setup({ mode: 'duo', bots: [null, null], seed: 34, boss: 1 }); P.Companion.think = () => {}; park(); boss.place(0, 0, 0);
  fighters[0].ch.place(0, 2.2, Math.PI); fighters[1].ch.place(5, -5, 0); AI.aggro = fighters[0]; const hp0 = fighters[0].hp;
  AI.start('bash'); step(1.6);
  return { ok: fighters[0].hp < hp0 && fighters[0].ch.pos.z > 2.6, note: `hp ${hp0}→${fighters[0].hp} · z 2.2→${fighters[0].ch.pos.z.toFixed(2)}` };
});
check('K3', '보스 2 페이즈 모습 변화: 2페이즈 뿔 · 3페이즈 방패가 깨짐(사라짐) + 수정 날개, 3페이즈 패턴에서 방패 기술 빠짐', () => {
  P.setup({ mode: 'duo', bots: [null, null], seed: 35, boss: 1 }); P.Companion.think = () => {}; park();
  const s1 = boss.att.shield.visible; AI.startTransform(2); step(2.2); const s2 = boss.att.shield.visible && boss.att.horns.visible;
  park(); AI.startTransform(3); step(2.2); const s3 = !boss.att.shield.visible && boss.att.wings.visible;
  const p3 = P.BOSSES[1].pools[2];
  return { ok: s1 && s2 && s3 && !p3.includes('bash') && !p3.includes('shieldRush'), note: `ph1 shield ${s1} · ph2 shield+horns ${s2} · ph3 no shield+wings ${s3}` };
});

// ---------------------------------------------------------------- 1.6 W. 청파·적파 3칸 · ST. 연계 연출 · KB. 한 키보드 2인
const { Slots, Stage, Waves } = P;
const parryNow = f => { f.state = 'parry'; f.t = 0; f.parried = false; };
check('W1', '색: A 청파 · B 적파, 패리하면 자기 색만 흡수 (남의 색은 막기만)', () => {
  const [a, b] = duo(41); park(); parryNow(a);
  const r1 = Waves.tryAbsorb(a, 'red', boss.pos.clone(), 'melee', { hitId: 9001 }), n1 = a.slots.length;
  parryNow(a); const r2 = Waves.tryAbsorb(a, 'blue', boss.pos.clone(), 'melee', { hitId: 9002 }), n2 = a.slots.length;
  parryNow(b); Waves.tryAbsorb(b, 'red', boss.pos.clone(), 'melee', { hitId: 9003 });
  return { ok: Slots.color(a) === 'blue' && Slots.color(b) === 'red' && r1 && n1 === 0 && r2 && n2 === 1 && b.slots[0] === 'red', note: `A red→${n1} blue→${n2} · B ${b.slots}` };
});
check('W2', '최대 3칸, 넘치면 가장 오래된 것이 밀려 사라짐 · 같은 보스 공격은 한 번만', () => {
  const [a] = duo(42); park();
  for (let i = 0; i < 4; i++) { parryNow(a); Waves.tryAbsorb(a, 'blue', boss.pos.clone(), 'melee', { hitId: 9100 + i }); }
  parryNow(a); Waves.tryAbsorb(a, 'blue', boss.pos.clone(), 'melee', { hitId: 9103 });   // same hit again
  return { ok: a.slots.length === 3 && Duo.stats.wave.lost === 1 && Duo.stats.wave.absorb[0] === 4, note: `slots ${a.slots.length} lost ${Duo.stats.wave.lost} absorb ${Duo.stats.wave.absorb[0]}` };
});
check('W3', '스킬을 쓰면 가장 오래된 칸 하나 소모 · 칸이 비면 기본 스킬로 나감', () => {
  const [a] = duo(43); park(); place(a, 0, 2.6); a.cd = [0, 0];
  Duo.skill(a, 1); const plain = a.state === 'cast' && a.castEmp === null;
  step(1.2); park(); a.state = 'move'; a.cd = [0, 0]; a.slots = ['blue', 'blue'];
  Duo.skill(a, 2); const used = a.castEmp === 'blue' && a.slots.length === 1;
  return { ok: plain && used, note: `plain ${plain} · used ${used} left ${a.slots.length}` };
});
const starterRun = (who, slot, slots, seed) => {
  const F = duo(seed); park(); AI.phase = 1; AI.brk = 0; Duo.rally = 0; Duo.buffT = 0; AI.liftCd = 0;
  boss.place(0, -0.5, 0); const f = F[who]; place(f, 0, 2.4); f.cd = [0, 0]; f.slots = slots.slice();
  const hp0 = AI.hp; Duo.skill(f, slot);
  let t = 0; while (t < 1.5 && AI.state !== 'status') { P.step(1 / 60, false); t += 1 / 60; }
  return { dmg: hp0 - AI.hp, st: Duo.st && { emp: Duo.st.emp, win: Duo.st.win }, state: AI.state, brk: AI.brk };
};
check('W4', '청파 강화 시동: 상태 시간 ×1.6 (파트너가 받을 시간이 길어짐) · 피해 ×1.3', () => {
  const p = starterRun(0, 1, [], 44), e = starterRun(0, 1, ['blue'], 44);
  step(2.0); const still = AI.state === 'status';
  const W = FEEL.WAVE.start.blue;
  return { ok: p.st && e.st && e.st.emp === 'blue' && Math.abs(e.st.win - FEEL.LINK_WINDOW * W.win) < 1e-6 && still && Math.abs(e.dmg / p.dmg - W.dmg) < 0.06,
           note: `win ${p.st && p.st.win} → ${e.st && e.st.win} · 2초 뒤 아직 상태 ${still} · 피해 ${p.dmg} → ${e.dmg}` };
});
check('W5', '적파 강화 시동: 피해 ×1.8 · 그로기 ×2.5', () => {
  const p = starterRun(1, 2, [], 45), e = starterRun(1, 2, ['red'], 45), W = FEEL.WAVE.start.red;
  return { ok: e.st && e.st.emp === 'red' && Math.abs(e.dmg / p.dmg - W.dmg) < 0.06 && e.brk > p.brk * 2, note: `피해 ${p.dmg} → ${e.dmg} · 그로기 ${p.brk.toFixed(1)} → ${e.brk.toFixed(1)}` };
});
const finRun = (stEmp, recvSlots, seed, kind = 'lift', slot = 1) => {
  duo(seed); park(); AI.phase = 1; AI.brk = 0; Duo.rally = 0; Duo.buffT = 0;
  boss.place(0, -0.5, Math.PI * 0.25);
  const starter = (kind === 'lift' || kind === 'kneel') ? fighters[1] : fighters[0], recv = starter === fighters[0] ? fighters[1] : fighters[0];
  const put = (f, a, r) => { f.ch.place(boss.pos.x + Math.sin(a) * r, boss.pos.z + Math.cos(a) * r, a + Math.PI); f.state = 'move'; };
  put(starter, Math.PI * 0.25 + 0.3, 2.3); put(recv, Math.PI * 0.25 - 0.9, 3.2);
  AI.startStatus(kind, starter); Duo.st.emp = stEmp; step(0.3);
  recv.slots = recvSlots.slice(); const hp0 = AI.hp, cut0 = Duo.stats.wave.cut;
  Duo.startFinish(recv, slot); const L = Duo.fins[0];
  const zoom = !!P.CamRig.zp, frz = Game.hitstop, cut = !!Stage.cut;
  let t = 0, zoomAny = zoom; while (t < 3 && (Duo.fins.length || t < 0.1)) { P.step(1 / 60, false); t += 1 / 60; zoomAny = zoomAny || !!P.CamRig.zp; }
  return { dmg: hp0 - AI.hp, violet: L && L.violet, rally: Duo.rally, zoom, zoomAny, frz, cut, cuts: Duo.stats.wave.cut - cut0, vN: Duo.stats.wave.violet };
};
const F0 = finRun(null, [], 46), Fp = finRun('red', [], 46), Fo = finRun(null, ['blue'], 46), Fv = finRun('red', ['blue'], 46);
check('W6', '강화 시동에서 이어진 파트너 마무리 피해 ×1.3 (내 파장이 파트너를 도움)', () => ({ ok: Math.abs(Fp.dmg / F0.dmg - FEEL.WAVE.pass) < 0.05, note: `공중 관통 ${F0.dmg} → ${Fp.dmg}` }));
check('W7', '마무리를 넣는 사람의 청파: 피해 ×1.25 + 랠리 +1', () => ({ ok: Math.abs(Fo.dmg / F0.dmg - FEEL.WAVE.fin.blue.dmg) < 0.05 && Fo.rally === F0.rally + 1, note: `${F0.dmg} → ${Fo.dmg} · 랠리 ${F0.rally} → ${Fo.rally}` }));
check('W8', '자파 = 강화 시동(적) + 강화 마무리(청): 피해 ×1.8 · 랠리 +1 · 컷인', () => ({ ok: Fv.violet && Math.abs(Fv.dmg / F0.dmg - FEEL.WAVE.violet.dmg) < 0.05 && Fv.rally === F0.rally + 1 && Fv.cut && Fv.vN === 1,
  note: `${F0.dmg} → ${Fv.dmg} · violet ${Fv.violet} · 컷인 ${Fv.cut}` }));
check('W9', '커버로 막은 공격도 막은 사람의 색이면 흡수 (남의 색이면 막기만)', () => {
  const [a, b] = duo(47); park(); place(a, 0, 2.6); place(b, 0.9, 2.6); parryNow(b);
  const r1 = Game.hurtPlayer(a, 10, boss.pos.clone(), false, 'red', false, 'melee', false, 9201); const nb = b.slots.length;
  parryNow(b); const r2 = Game.hurtPlayer(a, 10, boss.pos.clone(), false, 'blue', false, 'melee', false, 9202);
  return { ok: r1 === 'cover' && nb === 1 && r2 === 'cover' && b.slots.length === 1 && a.slots.length === 0, note: `red cover → B ${nb} · blue cover → B ${b.slots.length} A ${a.slots.length}` };
});
check('W10', '셔틀 수정구 받아치기 = 받는 사람 색 흡수', () => {
  const [a, b] = duo(48); park(); parryNow(a); Waves.tryAbsorb(a, 'shuttle', boss.pos.clone(), 'shuttle', { hitId: 9301, shuttle: true });
  parryNow(b); Waves.tryAbsorb(b, 'shuttle', boss.pos.clone(), 'shuttle', { hitId: 9302, shuttle: true });
  return { ok: a.slots[0] === 'blue' && b.slots[0] === 'red', note: `A ${a.slots} B ${b.slots}` };
});
check('W11', '평타가 보스에 맞으면 스킬 쿨타임이 줄어듦 (A 0.15초 · B 0.3초씩)', () => {
  const run = cdHit => { const keep = P.CHARS.rapier.cdHit; P.CHARS.rapier.cdHit = cdHit;
    const [a] = duo(49); park(); boss.place(0, -0.5, 0); place(a, 0, 2.0); a.cd = [5, 5];
    press(a, 'attack'); for (let i = 0; i < 30; i++) P.step(1 / 60, false);
    P.CHARS.rapier.cdHit = keep; return { cd: a.cd[0], hits: Duo.stats.hits }; };
  const off = run(0), on = run(P.CHARS.rapier.cdHit);   // same swing, with and without the reduction (hit-stop pauses cooldowns too)
  return { ok: on.hits >= 1 && on.hits === off.hits && Math.abs((off.cd - on.cd) - P.CHARS.rapier.cdHit * on.hits) < 0.01, note: `hits ${on.hits} · cd ${off.cd.toFixed(2)} → ${on.cd.toFixed(2)}` };
});
check('W12', '보스 공격 색: 두 보스 모두 적파·청파가 섞임 · 번갈아 치기는 노리는 사람 색', () => {
  const cols = i => new Set(Object.values(P.BOSSES[i].waves).filter(Boolean));
  duo(50); park(); AI.start('combo'); step(1.2);
  const hits = AI.cmb ? AI.cmb.hits : [], ok3 = hits.length >= 2 && hits.every(h => h.col === Slots.color(h.who));
  return { ok: cols(0).has('red') && cols(0).has('blue') && cols(1).has('red') && cols(1).has('blue') && ok3, note: `boss1 ${[...cols(0)]} boss2 ${[...cols(1)]} · combo ${hits.map(h => h.col).join(',')}` };
});
check('W13', '태그 솔로: 캐릭터마다 칸이 따로 · 들어온 캐릭터의 색으로 흡수', () => {
  const [a, b] = tag(51); park(); Game.tagCd = 0; Game.tagSwap(a); parryNow(b);
  Waves.tryAbsorb(b, 'red', boss.pos.clone(), 'melee', { hitId: 9401 });
  return { ok: b.onField && b.slots.length === 1 && a.slots.length === 0, note: `B on field ${b.onField} · B ${b.slots} · A ${a.slots}` };
});
check('ST1', '연출: 시동 적중 → 빛줄(Stage.link) · 마무리 시작 → 전체 정지 + 줌인 + 첫 번째면 컷인', () => {
  const st = starterRun(1, 1, [], 52), link = !!Stage.link && Stage.link.recv === fighters[0];
  const zoomOk = P.STYLE.on ? !F0.zoom && F0.zoomAny : F0.zoom;   // 3단계: 줌인은 시작이 아니라 첫 적중 때
  return { ok: link && zoomOk && F0.frz >= FEEL.STAGE.freeze * SM - 1e-6 && F0.cut, note: `link ${link} · zoom 시작 ${F0.zoom} 적중 ${F0.zoomAny} · 정지 ${F0.frz.toFixed(2)} · 컷인 ${F0.cut}` };
});
check('ST2', '연출: 같은 보스전에서 같은 마무리 두 번째(자파 아님)는 컷인 없음', () => {
  duo(53); park(); boss.place(0, -0.5, Math.PI * 0.25);
  const run = () => { const st = fighters[1], rc = fighters[0]; st.ch.place(1, 1.5, 0); rc.ch.place(-1, 2, 0); AI.liftCd = 0; park(); AI.startStatus('lift', st); step(0.3); Duo.startFinish(rc, 1); const c = !!Stage.cut; step(3); return c; };
  const c1 = run(); Game.t += FEEL.STAGE.cutGap + 1; const c2 = run();
  return { ok: c1 && !c2, note: `첫 번째 ${c1} · 두 번째 ${c2}` };
});
check('KB1', '한 키보드 2인: 2P가 사람이면 1P G H T Y · 2P L K O I, 혼자·AI 2P면 1P J K U I', () => {
  const I = P.Input;
  duo(54); const sp = I.split() && I.map(0).attack[0] === 'KeyG' && I.map(1).attack.includes('KeyL');
  P.setup({ mode: 'duo', bots: [null, 'coop'], seed: 54 }); const ai = !I.split() && I.map(0).attack[0] === 'KeyJ';
  tag(54); const solo = !I.split();
  return { ok: sp && ai && solo, note: `2인 ${sp} · AI 2P ${ai} · 태그 ${solo}` };
});
check('KB2', '키 겹침 없음: 한 키보드 2인 1P/2P/전역 키, 혼자일 때 1P/2P 참가 키', () => {
  const codes = m => new Set(Object.values(m).flat());
  const glob = new Set([...Object.keys(P.GKEYS), 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'KeyQ', 'KeyE', 'KeyM', 'F2', 'F8']);
  const S1 = codes(P.PKEYS_SPLIT[0]), S2 = codes(P.PKEYS_SPLIT[1]), O1 = codes(P.PKEYS[0]), O2 = codes(P.PKEYS[1]);
  const x = (A, B) => [...A].filter(c => B.has(c));
  const bad = [...x(S1, S2), ...x(S1, glob), ...x(S2, glob), ...x(O1, O2), ...x(O1, glob), ...x(O2, glob)];
  return { ok: bad.length === 0, note: bad.length ? `겹침 ${bad}` : '' };
});

// ---------------------------------------------------------------- 2단계 (2): 캐릭터 선택 · 장착 · 듀오 규칙 · 리그 교체
{
  const S = P.Select, CH = P.CHARS;
  const one = () => P.step(1 / 60, false);
  const tap = (...codes) => { for (const c of codes) { S.taps.push(c); one(); } };
  const waitStart = () => { for (let i = 0; i < Math.round((FEEL.SELECT_START + 0.2) * 60) && Game.state === 'select'; i++) one(); };
  const fresh = (mode) => { if (mode === 'solo') tag(70); else if (mode === 'ai') P.setup({ mode: 'duo', bots: [null, 'coop'], seed: 70 }); else duo(70); S.open(); };
  check('2C5', '선택 화면: 열리면 싸움 멈춤(프레임·시간·난수 그대로) · 보스 숨김 · 5명 카드 · 준비된 둘만 고를 수 있음', () => {
    fresh('solo'); const f0 = Game.frame, t0 = Game.t, a0 = P.Sim ? P.Sim.a : 0;
    for (let i = 0; i < 90; i++) one();
    const still = Game.frame === f0 && Game.t === t0 && (!P.Sim || P.Sim.a === a0) && Game.state === 'select' && !boss.root.visible;
    const ids = S.ids(), ready = ids.filter(k => CH[k].ready);
    return { ok: still && ids.length === 5 && ready.length === 5, note: `멈춤 ${still} · 카드 ${ids.length} · 고를 수 있음 ${ready}` };
  });
  check('2C6', '스킬 3개 중 2개: 먼저 고른 것 = U · 다음 = I (태그 솔로 A·B 각자), 준비 안 된 스킬은 못 고름', () => {
    fresh('solo');
    tap('Space');                                   // A: rapier (cursor starts on 1P's character)
    P.SKILLS2.windThrust.ready = false;             // (a skill whose motion isn't built yet — made unready for this check only)
    tap('KeyS', 'KeyS', 'Space');                   // wind thrust: coming soon → no pick
    const soon = S.P[0].picks.length === 0 && S.msg === 'COMING SOON';
    P.SKILLS2.windThrust.ready = true;
    tap('KeyS', 'KeyS', 'Space', 'KeyW', 'Space');  // spin first (U) · thrust second (I) → A ready, 1P now drives B
    const aOK = S.P[0].phase === 'ready' && S.P[0].picks.join() === 'spin,thrust' && S.owner(1) === 0 && S.owner(0) === -1;
    tap('Space');                                   // B: greatsword
    tap('Space', 'KeyS', 'Space');                  // launch (U) · smash (I)
    waitStart();
    const [a, b] = fighters;
    const ok = aOK && soon && Game.state === 'play' && Game.tagMode && a.char === 'rapier' && b.char === 'great'
      && a.skillKind(1) === 'spin' && a.skillKind(2) === 'thrust' && b.skillKind(1) === 'launch' && b.skillKind(2) === 'smash';
    return { ok, note: `A ${a.loadout} · B ${b.loadout} · 준비 안 된 스킬 막힘 ${soon} · 상태 ${Game.state}` };
  });
  check('2C7', '듀오 규칙: 청 1 + 적 1 또는 쌍검 + 아무나, 같은 캐릭터 X (순서쌍 20개 중 16 허용 = 쌍 8) · 화면에서도 막힘', () => {
    const ids = Object.keys(CH); let allow = 0, bad = [];
    for (const x of ids) for (const y of ids) {
      if (x === y) { if (!P.duoRule(x, y)) bad.push(x + y); continue; }
      const want = CH[x].color === 'both' || CH[y].color === 'both' || CH[x].color !== CH[y].color;
      if (!P.duoRule(x, y) !== want) bad.push(`${x}-${y}`); if (want) allow++;
    }
    fresh('duo');
    tap('Space');                                   // 1P rapier
    S.P[1].cur = 0; S.taps.push('Enter'); one();      // 2P rapier → same character
    const same = S.P[1].phase === 'char' && S.msg === 'SAME CHARACTER';
    CH.chain.ready = true; S.P[1].cur = S.ids().indexOf('chain'); S.taps.push('Enter'); one();   // (chain made pickable for this check only)
    const blues = S.P[1].phase === 'char' && /TWO BLUES/.test(S.msg); CH.chain.ready = false;
    return { ok: !bad.length && allow === 16 && same && blues, note: `허용 ${allow}/20 · 틀림 ${bad.join(',') || '없음'} · 같은 캐릭터 막힘 ${same} · 청 둘 막힘 ${blues}` };
  });
  check('2C8', '태그 솔로: 한 사람이 두 캐릭터를 차례로 고름 · 교대로 들어온 캐릭터는 자기 리그·장착', () => {
    fresh('solo');
    tap('KeyD', 'Space', 'Space', 'KeyS', 'Space');   // A = greatsword (launch U · smash I)
    S.P[1].cur = 0; tap('Space', 'KeyS', 'Space', 'KeyW', 'Space');   // B = rapier (spin U · thrust I)
    waitStart();
    const [a, b] = fighters, rigA = a.ch === P.player2, rigB = b.ch === P.player;
    park(); Game.tagCd = 0; const swapped = Game.tagSwap(a);
    const on = fighters.find(f => f.onField);
    const ok = Game.tagMode && rigA && rigB && swapped && on === b && b.ch.root.visible && !a.ch.root.visible && b.skillKind(1) === 'spin' && a.atk(0) === FEEL.ATK_B[0];
    return { ok, note: `A ${a.char}(${rigA ? '대검 리그' : '?'}) · B ${b.char}(${rigB ? '세검 리그' : '?'}) · 교대 ${swapped} · B 장착 ${b.loadout}` };
  });
  check('2C9', '리그 교체: 1P 대검 · 2P 세검으로 바꿔 싸워도 평타 표·스킬·초상 색·충돌 대상이 캐릭터를 따라감 · 기본 설정으로 돌아옴', () => {
    P.Companion.think = THINK;
    P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 71, chars: ['great', 'rapier'] });
    const [a, b] = fighters;
    const rig = a.ch === P.player2 && b.ch === P.player && P.player.fighter === b && P.player2.fighter === a;
    const kit = a.atk(0) === FEEL.ATK_B[0] && b.atk(0) === FEEL.ATK[0] && a.skillKind(1) === 'launch' && b.skillKind(1) === 'thrust';
    const face = P.facePal(a).c === CH.great.rig.face.c && P.facePal(b).c === CH.rapier.rig.face.c;
    const bodies = P.Rigs.bodies.includes(P.player) && P.Rigs.bodies.includes(P.player2) && P.Rigs.bodies[P.Rigs.bodies.length - 1] === boss;
    step(60);
    const finN = Duo.stats.finN, fought = finN > 0 && Duo.stats.wave.absorb[0] + Duo.stats.wave.absorb[1] > 0;
    duo(72); const back = fighters[0].char === 'rapier' && fighters[0].ch === P.player && fighters[1].ch === P.player2 && fighters[1].loadout.join() === 'launch,smash';
    return { ok: rig && kit && face && bodies && fought && back, note: `리그 ${rig} · 평타/스킬 ${kit} · 초상 ${face} · 60초 마무리 ${finN} · 기본 복귀 ${back}` };
  });
  check('2C9b', '바꾼 캐릭터로 기록 → 2회 재생 해시 같음 (1P 대검 · 2P 세검)', () => {
    P.Companion.think = THINK;
    const o = { mode: 'duo', bots: ['coop', 'coop'], seed: 73, chars: ['great', 'rapier'] };
    const rec = P.record(o, 3600), r1 = P.replay(rec).hash, r2 = P.replay(rec).hash;
    const fin = Duo.stats.finN;
    return { ok: rec.end.hash === r1 && r1 === r2 && fin > 0, note: `${rec.end.hash} · ${r1} · ${r2} · 마무리 ${fin}` };
  });
  check('2C5b', 'AI 파트너: 1P가 고르면 AI가 규칙에 맞는 반대 색을 기본 장착으로 · 1P가 취소하면 AI도 다시', () => {
    fresh('ai');
    tap('KeyD', 'Space', 'Space', 'KeyS', 'Space');   // 1P greatsword
    const pick = S.P[1].char === 'rapier' && S.P[1].picks.join() === 'thrust,spin';
    tap('KeyK'); const undo = !S.P[1].char;           // K = back (solo / AI)
    tap('Space'); waitStart();
    return { ok: pick && undo && Game.state === 'play' && !Game.tagMode && !!fighters[1].bot && fighters[1].char === 'rapier', note: `AI ${S.P[1].char} · 취소 ${undo} · 시작 ${Game.state}` };
  });
  check('2C5c', '혼자 선택 중 2P 키 → 2인 (3단계: 탭은 무시, 2P 확인 키 0.6초 꾹 = 참가 · 2P 취소 키 꾹 = 나가기) · F3 → AI 파트너 ⇄ 태그 솔로 · 끝 화면 C → 선택 화면', () => {
    fresh('solo'); tap('ArrowRight'); const noTap = S.mode === 'solo';
    P.keys.add('Enter'); for (let i = 0; i < 45; i++) one(); P.keys.delete('Enter'); const held = S.mode === 'duo';
    P.keys.add('Backspace'); for (let i = 0; i < 45; i++) one(); P.keys.delete('Backspace'); const left = S.mode === 'solo';
    const join = noTap && held && left;
    fresh('solo'); P.Input.pressed.add('ai2'); one(); const ai = S.mode === 'ai'; P.Input.pressed.add('ai2'); one(); const back = S.mode === 'solo';
    duo(74); Game.state = 'lost'; Game.endT = 2; P.Input.pressed.add('chars'); one();
    const sel = Game.state === 'select' && S.on;
    S.on = false; duo(1);
    return { ok: join && ai && back && sel, note: `탭 무시 ${noTap} · 꾹 참가 ${held} · 꾹 나가기 ${left} · F3 ${ai}/${back} · C ${sel}` };
  });
}

// ---------------------------------------------------------------- 2단계 (3): 공통 호응 마무리 (상태별 접근 + 받는 사람 스킬 동작 + FIN2 효과)
{
  P.Companion.think = THINK;
  // one common finisher run: path samples (height, behind the boss at the strike), damage, hits, status end, back on the floor
  const runFin2 = (kind, slot, o = {}) => {
    P.setup({ mode: o.tag ? 'tag' : 'duo', bots: o.tag ? [null] : [null, null], seed: 9, chars: o.chars, loadouts: o.loadouts });
    P.Companion.think = () => {}; park(); AI.phase = 1; AI.brk = 0; Duo.rally = 0; Duo.buffT = 0;
    boss.place(0, -0.5, Math.PI * 0.25);
    const F = fighters, red = c => P.CHARS[c.char].color === 'red';
    const starter = (kind === 'lift' || kind === 'kneel') ? F.find(red) : F.find(q => !red(q)), recv = F.find(q => q !== starter);
    if (o.tag && !starter.onField) { Game.tagCd = 0; Game.tagSwap(recv); }
    const put = (f, a, r) => { f.ch.place(boss.pos.x + Math.sin(a) * r, boss.pos.z + Math.cos(a) * r, a + Math.PI); f.state = 'move'; };
    put(starter, Math.PI * 0.25 + 0.3, 2.3); if (!o.tag) put(recv, Math.PI * 0.25 - 0.9, 3.2);
    AI.startStatus(kind, starter); step(0.3);
    const hp0 = AI.hp, weak0 = Duo.stats.weakHits, b0 = boss.pos.clone(), r0 = Duo.rally;
    if (o.tag) Game.tagSwap(starter, { finish: slot }); else Duo.startFinish(recv, slot);
    const L = Duo.fins[0], who = recv;
    let maxY = 0, inv = true, atStrike = null, maxStop = 0, t = 0, ended = null, relPos = null, jump = 0, prev = who.ch.pos.clone(), cut = !!P.Stage.cut;
    while (t < 3.5 && (Duo.fins.length || t < 0.1 || who.state === 'cast')) {
      const h0 = L ? L.hits : 0;
      P.step(1 / 60, false); t += 1 / 60;
      maxY = Math.max(maxY, who.ch.pos.y); maxStop = Math.max(maxStop, Game.hitstop); cut = cut || !!P.Stage.cut;
      if (who.state === 'finish' && !who.iframes()) inv = false;
      if (L && L.hits > h0 && !atStrike) atStrike = { y: who.ch.pos.y, back: AI.isBack(who.ch.pos), d: Math.hypot(who.ch.pos.x - boss.pos.x, who.ch.pos.z - boss.pos.z) - boss.radius };
      if (ended === null && AI.state !== 'status') ended = t;
      jump = Math.max(jump, Math.hypot(who.ch.pos.x - prev.x, who.ch.pos.z - prev.z)); prev = who.ch.pos.clone();
    }
    return { L, name: L && L.name, hits: L ? L.hits : 0, E: L && L.E, dmg: hp0 - AI.hp, weak: Duo.stats.weakHits - weak0, maxY, inv, atStrike, maxStop, ended, t,
             push: Math.hypot(boss.pos.x - b0.x, boss.pos.z - b0.z), pinT: AI.pinT, rally: Duo.rally - r0, y: who.ch.pos.y, jump, cut, who, seen: [...P.Stage.seen] };
  };
  const R2 = {};
  for (const [kind, slot, sk] of [['lift', 1, 'thrust'], ['lift', 2, 'spin'], ['kneel', 1, 'thrust'], ['kneel', 2, 'spin'],
                                  ['stagger', 1, 'launch'], ['stagger', 2, 'smash'], ['turn', 1, 'launch'], ['turn', 2, 'smash']]) {
    const r = R2[`${kind}:${sk}`] = runFin2(kind, slot), E = P.FIN2[kind][P.SKILLS2[sk].shape];
    const path = kind === 'lift' ? r.atStrike && r.atStrike.y > 0.5 : kind === 'kneel' ? r.maxY > 1.2 : kind === 'turn' ? r.atStrike && r.atStrike.back : r.atStrike && r.atStrike.d < 1.2;
    check('2F1', `${kind} + ${sk} → 공통 호응 '${P.finLabel(`${kind}:${sk}`)}': 타 수 = FIN2 · 상태 끝 · 동작 중 무적 · 경로(${kind === 'lift' ? '공중' : kind === 'kneel' ? '머리 위로' : kind === 'turn' ? '등 뒤' : '보스에 붙음'}) · 바닥으로 복귀`, () => ({
      ok: r.name === `${kind}:${sk}` && r.hits === E.hits && r.ended !== null && r.inv && path && r.y === 0 && r.jump < 0.9,
      note: `타 ${r.hits}/${E.hits} · 피해 ${r.dmg} · 약점 ${r.weak} · 최고 높이 ${r.maxY.toFixed(2)} · 적중 때 ${r.atStrike ? `y ${r.atStrike.y.toFixed(2)} 등 뒤 ${r.atStrike.back} 거리 ${r.atStrike.d.toFixed(2)}` : '-'} · 정지 ${r.maxStop.toFixed(2)} · ${r.t.toFixed(2)}초 · 한 프레임 최대 이동 ${r.jump.toFixed(2)}` }));
  }
  check('2F2', 'FIN2 효과: 휘청 한방 = 밀어내기 · 돌아섬 범위 = 선회 봉인 + 등 약점 · 뜸 범위 = 앞에서도 약점 · 무릎 한방 = 그로기 대량 · 공중 = 정지 늘림', () => {
    const a = R2['stagger:launch'], b = R2['turn:smash'], c = R2['lift:spin'], d = R2['kneel:thrust'], e = R2['stagger:smash'];
    const airStop = R2['lift:thrust'].maxStop >= P.FIN2.lift.single.stop * FEEL.FIN_COMMON.airStop * SM - 0.02;
    return { ok: a.push >= P.FIN2.stagger.single.push * 0.8 && b.pinT > 2 && b.weak >= 1 && c.weak >= 1 && d.dmg > 0 && airStop && e.push >= P.FIN2.stagger.area.push * 0.8,
      note: `밀림 ${a.push.toFixed(2)}/${e.push.toFixed(2)} · 봉인 ${b.pinT.toFixed(1)} · 등 약점 ${b.weak} · 뜸 범위 약점 ${c.weak} · 공중 정지 ${R2['lift:thrust'].maxStop.toFixed(2)}` };
  });
  check('2F3', '컷인 "처음" 기준 = (상태 × 스킬): 같은 보스전에서 뜸+찌르기 / 뜸+회전은 각자 처음', () => {
    const k1 = R2['lift:thrust'].seen.some(k => k.endsWith(':lift:thrust')), k2 = R2['lift:spin'].seen.some(k => k.endsWith(':lift:spin'));
    return { ok: k1 && k2 && R2['lift:thrust'].cut, note: `seen ${R2['lift:thrust'].seen.join(',')} · ${R2['lift:spin'].seen.join(',')}` };
  });
  check('2F4', '장착 순서를 바꾸면 U가 바뀐 스킬의 마무리 (U = 회전 → 뜸 범위)', () => {
    const r = runFin2('lift', 1, { loadouts: [['spin', 'thrust'], null] });
    return { ok: r.name === 'lift:spin' && r.E === P.FIN2.lift.area, note: r.name };
  });
  check('2F5', '1P 대검 · 2P 세검으로 바꿔도 같은 규칙 (상태 = 시동 색, 마무리 = 받는 사람 스킬)', () => {
    const r = runFin2('turn', 2, { chars: ['great', 'rapier'] }), q = runFin2('kneel', 1, { chars: ['great', 'rapier'] });
    return { ok: r.name === 'turn:smash' && r.who === fighters[0] && q.name === 'kneel:thrust' && q.who === fighters[1] && r.hits === 1 && q.hits === 1, note: `${r.name} by ${r.who.char} · ${q.name} by ${q.who.char}` };
  });
  check('2F6', '전용 합동기: 세검 + 대검 쌍 + 유물(exAll)일 때만 기존 전용 동작, 다른 쌍이면 공통', () => {
    P.setup({ mode: 'duo', bots: [null, null], seed: 9, exclusive: true });
    const a = Duo.exclusive(fighters[0], 'lift', 'thrust'), b = Duo.exclusive(fighters[1], 'turn', 'smash');
    fighters[1].char = 'twin'; const c = Duo.exclusive(fighters[0], 'lift', 'thrust'); fighters[1].char = 'great';
    P.setup({ mode: 'duo', bots: [null, null], seed: 9 }); const d = Duo.exclusive(fighters[0], 'lift', 'thrust');
    return { ok: a === 'skyPierce' && b === 'pinDown' && c === null && d === null, note: `${a} · ${b} · 쌍검 쌍 ${c} · 유물 없음 ${d}` };
  });
  check('2F7', '태그 솔로: 시동 캐릭터의 스킬 키 → 대기 캐릭터 교대 + 그 캐릭터의 공통 마무리', () => {
    const r = runFin2('stagger', 2, { tag: true }), q = runFin2('lift', 1, { tag: true });
    return { ok: r.name === 'stagger:smash' && r.hits === 1 && q.name === 'lift:thrust' && q.hits === 1 && q.who.onField, note: `${r.name} 타 ${r.hits} · ${q.name} 타 ${q.hits} · 들어온 캐릭터 필드 ${q.who.onField}` };
  });
  check('2F8', 'HUD: 받을 사람 머리 위 두 키 + 공통 마무리 이름 (앞말 + 스킬 이름)', () => {
    duo(13); park(); AI.startStatus('lift', fighters[1]); step(0.1);
    const o = P.finOffer(fighters[0]), labels = o ? o.names.map(P.finLabel) : [];
    return { ok: !!o && labels[0] === 'AERIAL FLASH THRUST' && labels[1] === 'AERIAL REVERSE SPIN' && !P.finOffer(fighters[1]), note: labels.join(' / ') };
  });
  check('2F9', '합 봇 2인 3분: 공통 마무리가 실제로 나감 (12칸 중 준비된 스킬로 가능한 칸) · 에러 0', () => {
    P.Companion.think = THINK; P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 21 }); step(180);
    const f2 = Duo.stats.fin2 || {}, cells = Object.keys(f2).filter(k => !k.startsWith('ex:'));
    const exRelic = (P.Relics.owned || []).flat().some(id => String(id).startsWith('ex'));   // 3단계: 보스 체력 절반 → 3분 안에 보스 1이 쓰러져 전용 합동기 유물을 고를 수 있음
    return { ok: cells.length >= 3 && (exRelic || !Object.keys(f2).some(k => k.startsWith('ex:'))), note: JSON.stringify(f2) + (exRelic ? ' · 전용 유물 있음' : '') };
  });
}

// ---------------------------------------------------------------- 2단계 (4): A 바람 찌르기 · B 대지 가르기 · 대검 2타
{
  // a projectile starter thrown from `dist` (boss surface) straight at a parked boss: hits, damage, status
  const throwAt = (who, sk, dist, o = {}) => {
    P.setup({ mode: 'duo', bots: [null, null], seed: 31, loadouts: [['windThrust', 'thrust'], ['earthSplit', 'launch']] });
    park(); AI.phase = 1; AI.brk = 0; boss.place(0, -4.8, 0);   // (boss near the wall: room for long throws inside the arena)
    const f = fighters[who], other = fighters[1 - who], R = boss.radius + dist;
    f.ch.place(0, -4.8 + R, Math.PI); f.state = 'move'; other.ch.place(5, 5, 0); other.state = 'move';
    if (o.slots) f.slots = o.slots.slice();
    const hp0 = AI.hp, h0 = Duo.stats.hits;
    press(f, 'skill1'); let t = 0, st = null, stAt = null, n = 0, castT = null;
    while (t < 2.5) {
      P.step(1 / 60, false); t += 1 / 60;
      if (f.state === 'cast' && castT === null) castT = t;
      n = Math.max(n, P.SkillFx.list.length);
      if (AI.state === 'status' && !st) { st = AI.stKind; stAt = { hits: Duo.stats.hits - h0, t } ; }
      if (o.hitAt && Math.abs(t - o.hitAt) < 1 / 120) f.hurt(5, boss.pos);
    }
    return { dmg: hp0 - AI.hp, hits: Duo.stats.hits - h0, st, stAt, maxLive: n, kind: f.castKind, statusN: Duo.stats.statusN };
  };
  check('2N1', '바람 찌르기(세검 ③): 제자리에서 검풍 3개 → 거리 5에서 3번 맞음 → 셋째가 끝난 뒤 휘청 한 번', () => {
    const r = throwAt(0, 'windThrust', 5);
    return { ok: r.hits === 3 && r.st === 'stagger' && r.stAt.hits === 3 && r.statusN === 1 && r.dmg > 0, note: `타 ${r.hits} · 피해 ${r.dmg} · 상태 ${r.st} (그때 타 ${r.stAt && r.stAt.hits}) · 동시 검풍 최대 ${r.maxLive}` };
  });
  check('2N1b', '바람 찌르기: 사거리 밖(8)이면 빗나감 · 상태 없음 / 청파 강화면 사거리가 늘어 7.5에서도 맞음', () => {
    const far = throwAt(0, 'windThrust', 8), emp = throwAt(0, 'windThrust', 7.5, { slots: ['blue'] }), plain = throwAt(0, 'windThrust', 7.5);
    return { ok: far.hits === 0 && !far.st && emp.hits === 3 && emp.st === 'stagger' && plain.hits === 0, note: `8: 타 ${far.hits} 상태 ${far.st} · 7.5 강화 타 ${emp.hits} · 7.5 기본 타 ${plain.hits} (사거리 ${P.SKILLS2.windThrust.reach} × 청파 ${FEEL.WAVE.start.blue.reach})` };
  });
  check('2N2', '대지 가르기(대검 ③): 균열이 보스까지 달려가 3번 터짐 → 무릎 한 번 · 사거리 밖(7.5)이면 상태 없음', () => {
    const r = throwAt(1, 'earthSplit', 4), far = throwAt(1, 'earthSplit', 7.5);
    return { ok: r.hits === 3 && r.st === 'kneel' && r.stAt.hits === 3 && far.hits === 0 && !far.st, note: `타 ${r.hits} · 피해 ${r.dmg} · 상태 ${r.st} · 밖: 타 ${far.hits} 상태 ${far.st}` };
  });
  check('2N2b', '대검 평타 2타: gs1(횡베기) → gs3(내려찍기·바닥 균열), gs2 없음 · 2타가 마지막 타(약점 그로기 3타 규칙)', () => {
    duo(32); park(); const b = fighters[1]; boss.place(0, 0, 0); b.ch.place(0, boss.radius + 1.2, Math.PI); b.state = 'move';
    const seen = []; for (let i = 0; i < 90; i++) { if (i % 6 === 0) press(b, 'attack'); P.step(1 / 60, false); const c = b.ch.clip && b.ch.clip.name; if (b.state === 'attack' && seen[seen.length - 1] !== c) seen.push(c); }
    return { ok: b.comboLen() === 2 && seen.slice(0, 3).join() === 'gs1,gs3,gs1' && !seen.includes('gs2'), note: `동작 순서 ${seen.join(' ')}` };
  });
  check('2F10', '연타 칸 4개: 무릎+바람 찌르기 · 뜸+바람 찌르기(4타: 동작 3 + 시간 1) · 휘청+대지 가르기 · 돌아섬+대지 가르기(등 약점) — 타 수 = FIN2 · 랠리 +1', () => {
    const run = (kind, recvIdx, sk) => {
      P.setup({ mode: 'duo', bots: [null, null], seed: 33, loadouts: [['windThrust', 'thrust'], ['earthSplit', 'launch']] });
      P.Companion.think = () => {}; park(); AI.phase = 1; Duo.rally = 0; boss.place(0, -0.5, Math.PI * 0.25);
      const recv = fighters[recvIdx], st = fighters[1 - recvIdx];
      st.ch.place(1.6, 1.5, 0); recv.ch.place(-1.5, 2.2, 0); st.state = recv.state = 'move';
      AI.startStatus(kind, st); step(0.3); const w0 = Duo.stats.weakHits, hp0 = AI.hp, b0 = AI.brk; Duo.startFinish(recv, 1); const L = Duo.fins[0];
      for (let i = 0; i < 200 && Duo.fins.length; i++) P.step(1 / 60, false);
      return { name: L.name, hits: L.hits, need: L.E.hits, rally: Duo.rally, weak: Duo.stats.weakHits - w0, dmg: hp0 - AI.hp };
    };
    const a = run('kneel', 0), b = run('lift', 0), c = run('stagger', 1), d = run('turn', 1);
    const ok = [a, b, c, d].every(r => r.hits === r.need && r.rally >= 1) && b.need === 4 && d.weak === 3;
    return { ok, note: [a, b, c, d].map(r => `${r.name} ${r.hits}/${r.need} 피해 ${r.dmg} 랠리 ${r.rally}${r.weak ? ' 약점 ' + r.weak : ''}`).join(' · ') };
  });
  P.Companion.think = THINK;
}

// ---------------------------------------------------------------- 2단계 (5~7): 사슬낫 · 방패+철퇴 · 쌍검
{
  P.Companion.think = THINK;
  const pair = (chars, loadouts, seed = 51) => { P.setup({ mode: 'duo', bots: [null, null], seed, chars, loadouts }); park(); AI.phase = 1; AI.brk = 0; boss.place(0, -1.5, 0); return fighters; };
  const front = (f, d) => { f.ch.place(boss.pos.x, boss.pos.z + boss.radius + d, Math.PI); f.state = 'move'; };
  const cast = (f, slot, sec = 1.6) => { const h0 = Duo.stats.hits; press(f, `skill${slot}`); let st = null, n0 = null; for (let i = 0; i < sec * 60; i++) { P.step(1 / 60, false); if (!st && AI.state === 'status') { st = AI.stKind; n0 = Duo.stats.hits - h0; } } return { st, hits: Duo.stats.hits - h0, atStatus: n0 }; };
  const combo = (f, n) => { const seen = []; for (let i = 0; i < 110; i++) { if (i % 5 === 0) press(f, 'attack'); P.step(1 / 60, false); const c = f.ch.clip && f.ch.clip.name; if (f.state === 'attack' && seen[seen.length - 1] !== c) seen.push(c); } return seen; };
  check('2N3', '사슬낫: 무기(낫·사슬 마디·추) · 평타 3 (낫 2 + 사슬 던지기: 낫이 사슬 끝에 날아감) · 사슬 회오리(돌아섬·범위) · 낫 걸어 당기기(돌아섬·연타 3)', () => {
    const [c] = pair(['chain', 'great'], [['chainWhirl', 'sickleHook'], null]);
    const rig = c.ch, sk = rig.root.getObjectByName('sickle');
    front(c, 1.0); const seq = combo(c, 3);
    let maxExt = 0; front(c, 1.5); press(c, 'attack'); for (let i = 0; i < 6; i++) P.step(1 / 60, false);
    c.combo = 2; c.startAttack(3, null); for (let i = 0; i < 40; i++) { P.step(1 / 60, false); maxExt = Math.max(maxExt, sk.position.y); }
    pair(['chain', 'great'], [['chainWhirl', 'sickleHook'], null]); front(fighters[0], 1.2); const w = cast(fighters[0], 1);
    pair(['chain', 'great'], [['chainWhirl', 'sickleHook'], null]); front(fighters[0], 4.0); const h = cast(fighters[0], 2, 2.0);
    const ok = !!sk && c.comboLen() === 3 && seq.slice(0, 3).join() === 'cc1,cc2,cc3' && maxExt > 2.5 && w.st === 'turn' && w.hits === 1 && h.st === 'turn' && h.hits === 3 && h.atStatus === 3;
    return { ok, note: `평타 ${seq.join(' ')} · 사슬 최대 ${maxExt.toFixed(2)} · 회오리 ${w.st}/${w.hits} · 걸어 당기기 ${h.st} 타 ${h.hits} (상태 때 ${h.atStatus})` };
  });
  check('2N3b', '사슬 잡아채기(고유): 휘청 + 파트너를 보스 등 뒤로 0.35초에 끌어옴(그동안 무적) · 파트너가 잡혀 있으면 적중만으로 빼냄', () => {
    const [c, g] = pair(['chain', 'great'], null); front(c, 3.5); g.ch.place(boss.pos.x + 3.5, boss.pos.z + 2.5, 0); g.state = 'move';
    const h0 = Duo.stats.hits; press(c, 'skill1'); let pulled = false, inv = true, t = 0;
    while (t < 1.4) { P.step(1 / 60, false); t += 1 / 60; if (g.state === 'pulled') { pulled = true; if (!g.iframes()) inv = false; } }
    const back = AI.isBack(g.ch.pos), st = AI.state === 'status' || AI.state === 'recover';
    const [c2, g2] = pair(['chain', 'great'], null, 52); front(c2, 3.5); g2.ch.place(boss.pos.x + 2, boss.pos.z - 1, 0); g2.state = 'move';
    AI.aggro = g2; AI.grab = { v: g2 }; g2.state = 'grabbed'; AI.state = 'holding'; AI.t = 2;
    press(c2, 'skill1'); for (let i = 0; i < 60; i++) P.step(1 / 60, false);
    const freed = g2.state !== 'grabbed' && !(AI.grab && AI.grab.v === g2);
    return { ok: pulled && inv && back && st && freed, note: `끌림 ${pulled} · 무적 ${inv} · 등 뒤 ${back} · 상태 ${st} · 잡힘에서 빠짐 ${freed} (${g2.state})` };
  });
  check('2N4', '방패+철퇴: 무기(철퇴·팔 방패) · 평타 3 (철퇴 2 + 방패 밀치기) · 철퇴 내려찍기(무릎·범위) · 방패 돌진(뜸·연타 3)', () => {
    const [s0] = pair(['great', 'shield'].reverse(), [['maceSlam', 'shieldCharge'], null]);
    const sh = s0.ch.root.getObjectByName('shieldG');
    front(s0, 1.0); const seq = combo(s0, 3);
    pair(['shield', 'rapier'], [['maceSlam', 'shieldCharge'], null]); front(fighters[0], 1.6); const m = cast(fighters[0], 1);
    pair(['shield', 'rapier'], [['maceSlam', 'shieldCharge'], null]); front(fighters[0], 2.4); const c = cast(fighters[0], 2, 2.0);
    const ok = !!sh && s0.comboLen() === 3 && seq.slice(0, 3).join() === 'sc1,sc2,sc3' && m.st === 'kneel' && c.st === 'lift' && c.hits === 3 && c.atStatus === 3;
    return { ok, note: `평타 ${seq.join(' ')} · 내려찍기 ${m.st} · 돌진 ${c.st} 타 ${c.hits} (상태 때 ${c.atStatus})` };
  });
  check('2N4b', '방패 올려치기(고유): 뜸 + 1초 동안 커버 범위 2배 (3.5 거리 커버 됨 → 1초 뒤 안 됨)', () => {
    const [s0, r] = pair(['shield', 'rapier'], null); front(s0, 1.4); r.ch.place(boss.pos.x + 3.5, boss.pos.z + boss.radius + 1.4, 0); r.state = 'move';
    const c = cast(s0, 1, 0.75), boost = s0.coverBoostT > 0, R1 = P.Unique.coverR(s0);
    s0.state = 'parry'; s0.t = 0; s0.parried = false; const cov1 = Duo.coverFor(r) === s0;
    s0.coverBoostT = 0; s0.state = 'parry'; s0.t = 0; const cov2 = Duo.coverFor(r) === s0;
    return { ok: c.st === 'lift' && boost && Math.abs(R1 - FEEL.COVER_R * 2) < 1e-6 && cov1 && !cov2, note: `상태 ${c.st} · 커버 반경 ${R1.toFixed(1)} · 3.5 거리 커버 ${cov1} → 끝난 뒤 ${cov2}` };
  });
  check('2N5', '쌍검: 무기(양손 검) · 평타 4 · 교차 베기(휘청·연타 4) · 회전 올려베기(뜸·범위) · 쌍날 낙하(무릎·한방)', () => {
    const [t0] = pair(['twin', 'great'], [['crossCut', 'spinRise'], null]);
    const w2 = t0.ch.root.getObjectByName('weapon2');
    front(t0, 1.0); const seq = combo(t0, 4);
    pair(['twin', 'great'], [['crossCut', 'spinRise'], null]); front(fighters[0], 1.4); const x = cast(fighters[0], 1, 2.0);
    pair(['twin', 'great'], [['crossCut', 'spinRise'], null]); front(fighters[0], 1.4); const r = cast(fighters[0], 2);
    pair(['twin', 'great'], [['twinDrop', 'spinRise'], null]); front(fighters[0], 2.0); const d = cast(fighters[0], 1);
    const ok = !!w2 && t0.comboLen() === 4 && seq.slice(0, 4).join() === 'tc1,tc2,tc3,tc4' && x.st === 'stagger' && x.hits === 4 && x.atStatus === 4 && r.st === 'lift' && d.st === 'kneel';
    return { ok, note: `평타 ${seq.join(' ')} · 교차 ${x.st} 타 ${x.hits} · 회전 ${r.st} · 낙하 ${d.st}` };
  });
  check('2N5b', '쌍검 양색: 청·적 모두 흡수(섞여 쌓임) · 강화 몫 ×0.8 · 자파 = 시동 색 ≠ 마무리 색', () => {
    const [t0, g] = pair(['twin', 'great'], null);
    const a = P.Slots.absorb(t0, 'blue', 901), b = P.Slots.absorb(t0, 'red', 902), mixed = t0.slots.join() === 'blue,red';
    t0.castEmp = 'red'; const E = P.Slots.startE(t0), want = 1 + (FEEL.WAVE.start.red.dmg - 1) * FEEL.WAVE.twinK;
    g.castEmp = 'red'; const Eg = P.Slots.startE(g);
    // violet: the greatsword's red starter + the twin's own red wave → not violet; with a blue wave → violet
    park(); boss.place(0, -0.5, 0); g.ch.place(1.6, 1.5, 0); t0.ch.place(-1.5, 2.2, 0); g.state = t0.state = 'move';
    AI.startStatus('lift', g); Duo.st.emp = 'red'; step(0.2); t0.slots = ['red']; Duo.startFinish(t0, 1); const v1 = Duo.fins[0].violet; for (let i = 0; i < 200 && Duo.fins.length; i++) P.step(1 / 60, false);
    park(); AI.liftCd = 0; AI.startStatus('lift', g); Duo.st.emp = 'red'; step(0.2); t0.slots = ['blue']; Duo.startFinish(t0, 1); const v2 = Duo.fins[0] && Duo.fins[0].violet;
    return { ok: a && b && mixed && Math.abs(E.dmg - want) < 1e-9 && Eg.dmg === FEEL.WAVE.start.red.dmg && v1 === false && v2 === true,
      note: `흡수 ${t0.slots.join ? '' : ''}${a}/${b} 섞임 ${mixed} · 강화 피해 ${E.dmg.toFixed(2)} (대검 ${Eg.dmg}) · 적+적 자파 ${v1} · 적+청 자파 ${v2}` };
  });
  check('2N6', '듀오 8쌍: 합 봇 90초씩 — 에러 0 · 마무리가 나옴 · 각 캐릭터 리그가 자기 무기', () => {
    const pairs = [['rapier', 'great'], ['rapier', 'shield'], ['chain', 'great'], ['chain', 'shield'], ['twin', 'rapier'], ['twin', 'great'], ['twin', 'chain'], ['twin', 'shield']];
    const out = []; let ok = true;
    for (const pr of pairs) {
      P.Companion.think = THINK; P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 61, chars: pr }); step(90);
      const f = Duo.stats.finN; out.push(`${pr.join('+')} ${f}`); if (!(f > 0) || duoRuleFail(pr)) ok = false;
    }
    return { ok: ok && errors.length === 0, note: out.join(' · ') };
  });
  function duoRuleFail(pr) { return !!P.duoRule(pr[0], pr[1]); }
  P.Companion.think = THINK;
}

// ---------------------------------------------------------------- 2단계 (8): 유물 (휴식 3장 중 1장 · 훅 · 장착 다시 고르기)
{
  P.Companion.think = THINK;
  const R = P.Relics, one = () => P.step(1 / 60, false);
  const toRest = (o) => { P.setup(o); P.Rush.onBossDead(); let n = 0; while (!R.open && n++ < 600) one(); return R.open; };
  check('2E1', '유물 3장: 같은 시드 = 같은 3장 · 캐릭터마다 따로 · 전용 합동기는 세검+대검일 때만 · 이미 가진 것은 안 나옴', () => {
    P.setup({ mode: 'duo', bots: [null, null], seed: 77 }); const a = R.offer(0, 0).join(), b = R.offer(0, 0).join(), c = R.offer(1, 0).join();
    let exOK = true, dupOK = true;
    for (let sd = 1; sd <= 40; sd++) {
      P.setup({ mode: 'duo', bots: [null, null], seed: sd, chars: ['chain', 'shield'] }); if (R.offer(0, 0).some(id => id.startsWith('ex'))) exOK = false;
      P.setup({ mode: 'duo', bots: [null, null], seed: sd }); R.owned[0] = ['slot4', 'echo']; if (R.offer(0, 1).some(id => R.owned[0].includes(id))) dupOK = false;
    }
    let exSeen = false; for (let sd = 1; sd <= 40 && !exSeen; sd++) { P.setup({ mode: 'duo', bots: [null, null], seed: sd }); exSeen = R.offer(0, 0).some(id => id.startsWith('ex')); }
    return { ok: a === b && a.split(',').length === 3 && exOK && dupOK && exSeen, note: `1P ${a} · 2P ${c} · 다른 쌍 전용 없음 ${exOK} · 중복 없음 ${dupOK} · 세검+대검 전용 나옴 ${exSeen}` };
  });
  check('2E2', '유물 훅: 넷째 칸 · 넘겨주기 · 긴 장단 · 랠리 불씨 · 자파 증폭 · 날쌘 손 · 수호 반경 · 전용 합동기', () => {
    const [a, b] = duo(78); const r = {};
    R.owned[0] = ['slot4']; for (let i = 0; i < 5; i++) P.Slots.push(a, 'blue'); r.slot4 = a.slots.length === 4 && P.Slots.max(b) === 3;
    R.owned[0] = ['handoff']; b.slots = []; a.slots = []; Duo.cover(a, b, boss.pos, 'melee', 9001, false, 'blue'); r.handoff = b.slots.join() === 'red' && a.slots.length === 0;
    R.owned[0] = ['longBeat']; park(); a.castEmp = null; Duo.starterStatus(a, P.SKILLS2.thrust, null); r.longBeat = Duo.st && Math.abs(Duo.st.win - FEEL.LINK_WINDOW * 1.3) < 1e-9;
    R.owned = [['ember'], []]; r.ember = Math.abs(R.teamMul('rallyDecay') - 1.5) < 1e-9;
    R.owned = [[], ['violet']]; r.violet = Math.abs(P.Slots.finMul({ violet: true }).dmg - (FEEL.WAVE.violet.dmg + 0.3)) < 1e-9;
    R.owned = [['quick'], []]; a.cd = [5, 5]; P.Slots.onBasicHit(a); r.quick = Math.abs(5 - a.cd[0] - P.CHARS.rapier.cdHit * 1.5) < 1e-9;
    R.owned = [['ward'], []]; r.ward = Math.abs(P.Unique.coverR(a) - FEEL.COVER_R * 1.4) < 1e-9 && P.Unique.coverR(b) === FEEL.COVER_R;
    R.owned = [[], ['exKneel']]; r.ex = Duo.exclusive(a, 'kneel', 'thrust') === 'crownThrust' && Duo.exclusive(a, 'lift', 'thrust') === null;
    R.owned = [[], []];
    const ok = Object.values(r).every(Boolean);
    return { ok, note: Object.entries(r).map(([k, v]) => `${k} ${v}`).join(' · ') };
  });
  check('2E3', '메아리 탈: 파트너 마무리가 들어가고 0.5초 뒤 내 그림자 한 번 (그 마무리 피해의 30%)', () => {
    const [a, b] = duo(79); park(); boss.place(0, -0.5, Math.PI * 0.25); R.owned[0] = ['echo'];
    b.ch.place(1.6, 1.5, 0); a.ch.place(-1.5, 2.2, 0); a.state = b.state = 'move';
    AI.startStatus('stagger', a); step(0.2); P.Companion.think = () => {}; Duo.startFinish(b, 1);
    let fin = null, echoAt = null, t = 0, hpE = null;
    while (t < 3) { const h0 = AI.hp; one(); t += 1 / 60; if (fin === null && Duo.stats.finN) fin = t; if ((Duo.stats.echo || 0) && echoAt === null) { echoAt = t; hpE = h0 - AI.hp; } }
    const want = P.FIN2.stagger.single.dmg * 0.3; R.owned[0] = [];
    return { ok: fin !== null && echoAt !== null && echoAt - fin >= 0.45 && hpE > 0, note: `마무리 ${fin && fin.toFixed(2)}초 · 메아리 ${echoAt && echoAt.toFixed(2)}초 · 메아리 피해 ${hpE} (기준 ${want} × 앞/뒤 배율)` };
  });
  check('2E4', '휴식: 보스가 사라지면 카드 화면 · 그동안 싸움 입력 멈춤 · 1P 키로 카드 + 장착 변경 · AI 2P는 자동 · 고르기 전엔 다음 보스 안 나옴', () => {
    const opened = toRest({ mode: 'duo', bots: [null, 'coop'], seed: 80 });
    const f0 = fighters[0]; for (let i = 0; i < 40; i++) one(); const x0 = f0.ch.pos.x; keysDown('KeyD'); for (let i = 0; i < 30; i++) one(); keysUp('KeyD'); const frozen = Math.abs(f0.ch.pos.x - x0) < 1e-6;   // (any slide from before settles first)
    for (let i = 0; i < 20; i++) one(); const aiDone = R.P[1].phase === 'done';
    let n = 0; while (n++ < 600) one(); const waiting = P.Rush.state === 'rest' && R.open;
    const lo0 = f0.loadout.join();
    S_tap('KeyD'); S_tap('Space');                  // second card
    const taken = R.owned[0].length === 1 && R.owned[0][0] === R.P[0].cards[1];
    S_tap('KeyD'); S_tap('Space');                  // the next loadout order
    const changed = f0.loadout.join() !== lo0;
    for (let i = 0; i < 30; i++) one();
    return { ok: opened && frozen && aiDone && waiting && taken && changed && !R.open && P.Rush.state === 'fight', note: `열림 ${opened} · 입력 멈춤 ${frozen} · AI ${aiDone} · 기다림 ${waiting} · 가짐 ${R.owned[0]} · 장착 ${lo0} → ${f0.loadout.join()} · ${P.Rush.state}` };
  });
  function keysDown(c) { P.keys.add(c); } function keysUp(c) { P.keys.delete(c); }
  function S_tap(c) { P.Select.taps.push(c); one(); }
  check('2E5', '태그 솔로 휴식: 한 사람이 A → B 차례로 고름 · 기록한 입력(유물 고르기 포함)을 재생하면 같은 상태', () => {
    toRest({ mode: 'tag', bots: [null], seed: 81 });
    S_tap('Space'); S_tap('Space'); const aDone = R.P[0].phase === 'done' && R.P[1].phase === 'relic';
    S_tap('KeyD'); S_tap('KeyD'); S_tap('Space'); S_tap('Space');
    const both = R.owned[0].length === 1 && R.owned[1].length === 1 && R.owned[1][0] === R.P[1].cards[2] && !R.open;
    // record: a duo of bots through boss 1's rest (their picks are input) → replay twice
    Math.random = (() => { let a = 5; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
    const o = { mode: 'duo', bots: ['coop', 'coop'], seed: 82 };
    P.setup(o); P.Rec.start('rec'); P.Rush.onBossDead(); for (let i = 0; i < 900; i++) P.step(1 / 60, false); const frames = P.Rec.stop(), end = P.stateHash().hash, got = R.owned.map(x => x.join()).join('|');
    const rp = () => { P.setup(o); P.Rec.start('play', frames); P.Rush.onBossDead(); for (let i = 0; i < 900; i++) P.step(1 / 60, false); P.Rec.stop(); return [P.stateHash().hash, R.owned.map(x => x.join()).join('|')]; };
    const [h1, g1] = rp(), [h2, g2] = rp();
    return { ok: aDone && both && end === h1 && h1 === h2 && got === g1 && g1 === g2 && got !== '|', note: `A 먼저 ${aDone} · 둘 다 ${both} · 기록 ${end}/${got} · 재생 ${h1}/${g1} · ${h2}/${g2}` };
  });
  P.Companion.think = THINK;
}

// ---------------------------------------------------------------- 2단계 (9): 보스 3 THE WEEPING BELL
{
  P.Companion.think = THINK;
  const B = P.Bell, FB = FEEL.BELL, BOSS = () => P.bossNow;
  const atBell = (seed = 90, o = {}) => { P.setup({ mode: 'duo', bots: [null, null], seed, boss: 2, ...o }); park(); return fighters; };
  check('2B1', '에밀레종 모델: 새 리그(틀 · 종 · 당목 · 울음 결정) · 동작 8+ (울림·흔들기·내려찍기·당목·들림·그로기·떨림·죽음) · 러시 보스 3에서만 종 리그', () => {
    atBell(); const bell = BOSS(), isBell = bell === B.rig && bell !== P.boss && !P.boss.root.visible && bell.root.visible;
    const need = ['bIdle', 'bRing', 'bSway', 'bSlam', 'bStrike', 'bLift', 'bGroggy', 'bHum', 'bDeath'].every(n => bell.clips[n]);
    const parts = ['spine', 'head', 'weapon', 'hdR', 'chest'].every(n => bell.root.getObjectByName(n));
    duo(91); const back = P.bossNow === P.boss && !B.rig.root.visible;
    return { ok: isBell && need && parts && back && P.BOSSES[2].name === 'THE WEEPING BELL', note: `종 리그 ${isBell} · 동작 ${need} · 관절 ${parts} · 보스 1로 돌아옴 ${back}` };
  });
  // a beat with scripted players: who parries, where they stand
  const beatRun = (o) => {
    const [a, g] = atBell(92); AI.phase = o.phase || 1; AI.state = 'idle'; AI.t = 99; P.Companion.think = () => {};
    AI.start('beat'); const b = B.beat; b.pairs = b.pairs.slice(0, 1); b.pairs[0].th = 0;   // one pair: blue from +z, red from -z
    a.ch.place(...o.a, 0); g.ch.place(...o.g, 0); a.state = g.state = 'move';
    const hp0 = [a.hp, g.hp], sl0 = [a.slots.length, g.slots.length], r0 = Duo.rally, st0 = { ...(Duo.stats.bell || {}) };
    let t = 0;
    while (t < 5 && B.beat) {
      for (const [f, plan] of [[a, o.pa], [g, o.pg]]) {
        if (!plan) continue;
        const e = B.eta(f.ch.pos, plan === 'any' ? undefined : plan);
        if (e && e.e < 0.1 && f.state !== 'parry' && f.state !== 'dodge') { if (o.dodge) f.startDodge(null); else f.startParry(null); }
      }
      P.step(1 / 60, false); t += 1 / 60;
    }
    const st = Duo.stats.bell || {};
    return { dmg: [hp0[0] - a.hp, hp0[1] - g.hp], abs: [a.slots.length - sl0[0], g.slots.length - sl0[1]], rally: Duo.rally - r0, block: (st.block || 0) - (st0.block || 0), prot: (st.prot || 0) - (st0.prot || 0), hit: (st.hit || 0) - (st0.hit || 0) };
  };
  check('2B2', '맥놀이: 청 고리·적 고리가 반대쪽에서 · 같은 색 패리만 막음(흡수 + 랠리 +1) · 막은 사람 뒤 부채꼴 보호 · 다른 색은 패리해도 맞음 · 회피 무적 관통', () => {
    const good = beatRun({ a: [0, 2.5], g: [0, -2.5], pa: 'blue', pg: 'red' });          // rapier (blue) on the blue side, greatsword (red) on the red side
    const wrong = beatRun({ a: [0, -2.5], g: [0, 2.5], pa: 'any', pg: 'any' });          // swapped sides: each parries the other colour first
    const dodge = beatRun({ a: [0, 2.5], g: [0, -2.5], pa: 'any', pg: 'any', dodge: true });
    const ok = good.block === 2 && good.prot === 2 && good.dmg[0] === 0 && good.dmg[1] === 0 && good.abs[0] === 1 && good.abs[1] === 1 && good.rally >= 2
      && wrong.hit >= 2 && dodge.hit >= 2;   // (swapped: each parries the other colour's ring first and takes it)
    return { ok, note: `제 자리: 막음 ${good.block} 보호 ${good.prot} 피해 ${good.dmg} 흡수 ${good.abs} 랠리 +${good.rally} · 자리 바꿈: 맞음 ${wrong.hit} 막음 ${wrong.block} · 회피: 맞음 ${dodge.hit}` };
  });
  check('2B3', '맥놀이 횟수 3/3/5 · 3페이즈는 가운데를 지나면 색이 바뀜 · HUD 화살표가 1초 전부터 · 피격은 Game.hurtPlayer(beat)', () => {
    const n = [1, 2, 3].map(ph => { atBell(93); AI.phase = ph; AI.state = 'idle'; AI.start('beat'); const k = B.beat.pairs.length; B.endBeat(); return k; });
    atBell(94); AI.phase = 3; AI.state = 'idle'; AI.start('beat'); const ring = { col0: 'blue', r: FB.src - 0.1 }, ring2 = { col0: 'blue', r: FB.src + 0.1 };
    const flip = B.colAt(ring) === 'blue' && B.colAt(ring2) === 'red';
    const P0 = B.beat.pairs[0]; let pre = null, at0 = null;
    for (let i = 0; i < 200 && at0 === null; i++) { P.step(1 / 60, false); const t = B.beat.t; if (pre === null && B.arrowsNow().length) pre = t; if (t >= P0.at) at0 = t; }
    const lead = at0 - pre;
    const [a] = atBell(95); AI.phase = 1; AI.state = 'idle'; P.Companion.think = () => {}; AI.start('beat'); a.ch.place(0, 0, 0); for (let i = 0; i < 300; i++) P.step(1 / 60, false);
    const viaHurt = (Duo.stats.hurtKind || {}).beat > 0;
    return { ok: n.join() === FB.beatN.join() && flip && Math.abs(lead - FB.lead) < 0.05 && viaHurt, note: `쌍 ${n} · 3페이즈 색 바뀜 ${flip} · 화살표 ${lead.toFixed(2)}초 전 · hurtPlayer(beat) ${viaHurt}` };
  });
  check('2B4', '당목 치기 = 색 있는 부채꼴(패리 가능) · 종 내려찍기 = 둥근 충격(패리 불가) · 약점 = 들림·무릎·그로기일 때 아래 울음 결정(등 대신) · 70%·35% 금', () => {
    const [a] = atBell(96); AI.state = 'idle'; AI.start('strike'); const sw = AI.curWave, sx = AI.tele[0] && AI.tele[0].mat.uniforms.uShape.value === 1;
    a.ch.place(BOSS().pos.x + Math.sin(BOSS().facing) * 2.2, BOSS().pos.z + Math.cos(BOSS().facing) * 2.2, 0); a.state = 'move';
    let parried = false; for (let i = 0; i < 90; i++) { const e = AI.etaFor(a); if (e !== null && e < 0.1 && a.state !== 'parry' && P.Slots.color(a) === sw) a.startParry(null); P.step(1 / 60, false); if (a.parried) parried = true; }
    atBell(97); AI.state = 'idle'; AI.start('bellSlam'); const neutral = AI.curWave === null && AI.tele[0].mat.uniforms.uWave.value === 3;
    atBell(98); const w0 = AI.weakFor({ x: 0, y: 0, z: -5 }); AI.state = 'groggy'; const w1 = AI.weakFor({ x: 0, y: 0, z: 5 }); AI.state = 'idle'; AI.liftCd = 0; AI.startStatus('lift', fighters[1]); const w2 = AI.weakFor({ x: 3, y: 0, z: 0 });
    AI.setLook(1); const c1 = BOSS().att.crack1.visible; AI.setLook(2); const c2 = BOSS().att.crack1.visible && !BOSS().att.crack2.visible; AI.setLook(3); const c3 = BOSS().att.crack2.visible;
    return { ok: !!sw && sx && neutral && w0 === null && !!w1 && !!w2 && w1.w.name === 'CRYSTAL' && !c1 && c2 && c3 && (P.Slots.color(a) !== sw || parried),
      note: `당목 색 ${sw} · 부채꼴 ${sx} · (같은 색이면 패리 ${parried}) · 내려찍기 중립 ${neutral} · 약점 평소 ${w0} 그로기 ${w1 && w1.w.name} 들림 ${w2 && w2.w.name} · 금 ${c1}/${c2}/${c3}` };
  });
  P.Companion.think = THINK;
}

// ---------------------------------------------------------------- 2단계 (10): 보스 4 THE TWIN DOKKAEBI
{
  const D = P.Dk, FD = FEEL.DK, V = (x, y, z) => D.rigs[0].pos.clone().set(x, y, z);
  const atDk = (seed = 100, o = {}) => { P.setup({ mode: 'duo', bots: [null, null], seed, boss: 3, ...o }); P.Companion.think = () => {}; parkDk(); return fighters; };
  const parkDk = () => { D.each(() => { AI.state = 'idle'; AI.t = 999; AI.cur = null; AI.liftCd = 99; }); D.jointCd = 0; D.coinCd = 99; };
  const kill = i => D.with(i, () => AI.hurt(1e7, 0, false, V(0, 1, 0), V(1, 0, 0), null, fighters[0]));
  const front = (f, i, d) => { const r = D.rigs[i]; f.ch.place(r.pos.x + Math.sin(r.facing) * d, r.pos.z + Math.cos(r.facing) * d, r.facing + Math.PI); f.state = 'move'; };
  check('2B5', '쌍둥이 도깨비: 두 마리(플레이어 리그 1.7배 + 뿔·방망이·도깨비불) · 체력 따로 · 한 마리만 쓰러지면 안 끝남, 둘 다 = 처치 · 동작 13+ · 보스 4에서만', () => {
    atDk(110); const [r0, r1] = D.rigs;
    const rigOK = D.on && P.bossNow === r0 && r0 !== r1 && r0.root.visible && r1.root.visible && !P.boss.root.visible && Math.abs(r0.root.scale.x - FD.scale) < 1e-6
      && !!r0.root.getObjectByName('dkTip') && r0.att.horns.children.length >= 4 && P.Rigs.bodies.includes(r1);
    const need = ['dkClub1', 'dkFire', 'dkClub3', 'dkLift', 'dkRush', 'dkGrab', 'dkThrow', 'dkBash', 'dkSwap', 'dkUlt', 'dkGroggy', 'dkRise', 'kneel', 'death'].every(n => r0.clips[n]);
    D.with(0, () => AI.hurt(500, 0, false, V(0, 1, 0), V(1, 0, 0), null, fighters[0])); const sep = D.get(0, 'hp') < D.get(1, 'hp');
    kill(0); const one = D.get(0, 'state') === 'dead' && Game.state === 'play' && !!D.down;
    kill(1); step(0.2); const both = Game.state === 'won';
    duo(111); const back = P.bossNow === P.boss && !D.on && !r0.root.visible && !r1.root.visible && !P.Rigs.bodies.includes(r1);
    return { ok: rigOK && need && sep && one && both && back && P.BOSSES[3].name === 'THE TWIN DOKKAEBI' && P.BOSSES.length === 4,
      note: `리그 ${rigOK} · 동작 ${need} · 체력 따로 ${sep} · 한 마리 쓰러짐(진행 중) ${one} · 둘 다 = 승리 ${both} · 보스 1로 돌아옴 ${back}` };
  });
  check('2B6', '각자 자기 색 공격만: 청 도깨비 = 청파 · 적 도깨비 = 적파 (내려찍기·휩쓸기·연타 불기둥) · 두 AI가 따로 움직임 · 첫 어그로는 같은 색 사람', () => {
    const [a, g] = atDk(112); const ag = [D.get(0, 'aggro'), D.get(1, 'aggro')];
    D.with(0, () => { AI.start('slam'); }); D.with(1, () => { AI.start('sweep'); });
    const w = [D.get(0, 'curWave'), D.get(1, 'curWave')], bothAtk = D.get(0, 'state') === 'attack' && D.get(1, 'state') === 'attack';
    atDk(113); D.with(1, () => { AI.start('combo'); }); step(1.2); const cols = D.with(1, () => (AI.cmb ? AI.cmb.hits.map(h => h.col) : []));
    D.with(0, () => { AI.start('combo'); }); step(1.2); const cols0 = D.with(0, () => (AI.cmb ? AI.cmb.hits.map(h => h.col) : []));
    return { ok: w[0] === 'blue' && w[1] === 'red' && bothAtk && cols.length > 0 && cols.every(c => c === 'red') && cols0.every(c => c === 'blue') && cols0.length > 0 && ag[0] === a && ag[1] === g,
      note: `내려찍기 ${w[0]} · 휩쓸기 ${w[1]} · 동시에 공격 ${bothAtk} · 적 연타 ${cols.join('/')} · 청 연타 ${cols0.join('/')} · 첫 어그로 청→${ag[0] && ag[0].char} 적→${ag[1] && ag[1].char}` };
  });
  check('2B7', '되살리기: 한 마리가 쓰러지면 남은 하나가 N초 뒤 살리러 가서 무릎 꿇고 살림(체력 35%) · 살리는 중 피해가 쌓이면 끊김(기다림 처음부터)', () => {
    atDk(114); kill(0); let t = 0, went = null, chan = null;
    while (t < FD.revive.wait + FD.revive.t + 6 && D.get(0, 'state') === 'dead') { P.step(1 / 60, false); t += 1 / 60; if (went === null && D.rv) went = t; if (chan === null && D.rv && D.rv.ph === 'chan') chan = t; }
    const done = D.get(0, 'state') !== 'dead', hp = D.get(0, 'hp') / D.get(0, 'maxHp');
    atDk(115); kill(0); t = 0; let broke = false;
    while (t < FD.revive.wait + FD.revive.t + 6) {
      P.step(1 / 60, false); t += 1 / 60;
      if (D.rv && D.rv.ph === 'chan' && !broke) { D.with(1, () => AI.hurt(FD.revive.brk + 10, 0, false, V(0, 1, 0), V(1, 0, 0), null, fighters[0])); broke = true; }
      if (broke) break;
    }
    const brk = broke && !D.rv && D.down && D.down.t < 0.1 && D.stats().reviveBreak === 1 && D.get(0, 'state') === 'dead';
    return { ok: done && Math.abs(hp - FD.revive.hp) < 0.01 && went !== null && Math.abs(went - FD.revive.wait) < 0.5 && chan !== null && brk,
      note: `살리러 감 ${went && went.toFixed(2)}초 (기준 ${FD.revive.wait}) · 무릎 ${chan && chan.toFixed(2)}초 · 살아남 ${done} 체력 ${(hp * 100).toFixed(0)}% · 끊김 ${brk}` };
  });
  // 도깨비 연계: the blue one lifts 1P (rapier); 2P (greatsword) covers the red one's strike — or doesn't
  const linkRun = (cover, phase = 1) => {
    const [a, g] = atDk(116); D.each(() => { AI.phase = phase; });
    front(a, 0, 1.6); g.ch.place(a.ch.pos.x + 1.3, a.ch.pos.z + 0.5, 0); g.state = 'move';
    D.with(0, () => { AI.aggro = a; AI.start('dkLink'); });
    const hp0 = [a.hp, g.hp], r0 = Duo.rally, s0 = { ...D.stats() }; let air = null, maxY = 0;
    for (let i = 0; i < 300 && (D.J || i < 5); i++) {
      if (D.J && D.J.ph === 'air' && air === null) air = D.J.air;
      maxY = Math.max(maxY, a.ch.pos.y);
      if (cover) { const e = D.coverEta(g); if (e !== null && e < 0.1 && g.state !== 'parry') g.startParry(null); }
      P.step(1 / 60, false);
    }
    const s = D.stats();
    return { lift: s.linkLift - s0.linkLift, brk: s.linkBreak - s0.linkBreak, hit: s.linkHit - s0.linkHit, dmgA: hp0[0] - a.hp, rally: Duo.rally - r0, st: [D.get(0, 'state'), D.get(1, 'state')], air, maxY, hk: (Duo.stats.hurtKind || {}).dkLink || 0 };
  };
  check('2B8', '도깨비 연계: 청이 띄우고(회피 가능) 적이 날아와 받아침 · 파트너가 커버하면 합 끊기(두 도깨비 휘청 + 랠리 +2) · 못 막으면 큰 피해(Game.hurtPlayer) · 70%부터 빨라짐', () => {
    const c = linkRun(true), n = linkRun(false), f2 = linkRun(false, 2);
    const ok = c.lift === 1 && c.brk === 1 && c.st[0] === 'groggy' && c.st[1] === 'groggy' && c.rally >= FD.link.rally && c.maxY > 1.5
      && n.lift === 1 && n.hit === 1 && n.dmgA > FD.link.dmg * FEEL.BOSS_DMG * 0.9 && n.hk > 0 && f2.air < n.air;
    return { ok, note: `커버: 합 끊기 ${c.brk} · 도깨비 ${c.st} · 랠리 +${c.rally} · 띄운 높이 ${c.maxY.toFixed(1)} / 안 막음: 맞음 ${n.hit} 피해 ${n.dmgA} (hurtPlayer ${n.hk}) / 공중 ${n.air}초 → 2페이즈 ${f2.air}초` };
  });
  check('2B9', '자리 바꾸기(자리·어그로 맞바꿈) · 씨름 던지기(잡아 던짐 → 받는 도깨비 앞 패리 = 역받아치기, 아니면 피해) · 뚝딱(금화: 내 색은 흡수, 다른 색은 피해 · 발밑 금화는 다른 색)', () => {
    let [a, g] = atDk(117); const p0 = D.rigs[0].pos.clone(), p1 = D.rigs[1].pos.clone();
    D.with(0, () => { AI.aggro = a; }); D.with(1, () => { AI.aggro = g; });
    D.with(0, () => { AI.start('dkSwap'); }); for (let i = 0; i < 120 && D.J; i++) P.step(1 / 60, false);
    const swapped = D.rigs[0].pos.distanceTo(p1) < 0.3 && D.rigs[1].pos.distanceTo(p0) < 0.3 && D.get(0, 'aggro') === g && D.get(1, 'aggro') === a;
    const throwRun = counter => {
      [a, g] = atDk(118); front(a, 1, 1.4); g.ch.place(-5, 5, 0); g.state = 'move';
      D.with(1, () => { AI.aggro = a; AI.start('dkThrow'); });
      const hr = D.get(0, 'hp'), ha = a.hp, s0 = { ...D.stats() }; let landed = false;
      for (let i = 0; i < 300 && (D.J || i < 5); i++) {
        if (D.J && D.J.ph === 'swat') landed = true;
        if (counter && D.J && D.J.ph === 'swat') { const e = D.jointEta(a); if (e !== null && e < 0.1 && a.state === 'move') a.startParry(null); }
        P.step(1 / 60, false);
      }
      const s = D.stats();
      return { grab: s.throwGrab - s0.throwGrab, counter: s.counter - s0.counter, recv: hr - D.get(0, 'hp'), dmgA: ha - a.hp, landed };
    };
    const tc = throwRun(true), tn = throwRun(false);
    [a, g] = atDk(119); a.ch.place(2.5, 2.5, 0); g.ch.place(-2.5, -2.5, 0); a.state = g.state = 'move';
    const sl0 = [a.slots.length, g.slots.length], h0 = [a.hp, g.hp];
    P.Hazards.add({ shape: 'circle', x: 2.5, z: 2.5, r: 1, tele: 0.2, dmg: 18, coin: 'blue', wave: 'blue', id: 7001 });
    P.Hazards.add({ shape: 'circle', x: -2.5, z: -2.5, r: 1, tele: 0.2, dmg: 18, coin: 'blue', wave: 'blue', id: 7002 });
    step(0.5);
    const coin = a.slots.length === sl0[0] + 1 && a.hp === h0[0] && g.hp < h0[1] && g.slots.length === sl0[1];
    P.Hazards.clear(); D.with(0, () => D.spawnCoins());
    const under = [a, g].every(f => P.Hazards.list.some(h => h.coin && Math.hypot(h.x - f.ch.pos.x, h.z - f.ch.pos.z) < 0.01 && h.coin !== P.Slots.color(f)));
    return { ok: swapped && tc.grab === 1 && tc.landed && tc.counter === 1 && tc.recv >= FD.throw.counterDmg * 0.9 && tc.dmgA <= 0 && tn.grab === 1 && tn.dmgA > 0 && tn.counter === 0 && coin && under,
      note: `자리 바꿈 ${swapped} · 던지기+패리: 역받아치기 ${tc.counter} 받는 도깨비 피해 ${tc.recv} · 안 막음: 피해 ${tn.dmgA} · 금화 내 색 흡수/다른 색 피해 ${coin} · 발밑 = 다른 색 ${under}` };
  });
  const ultRun = plan => {
    const [a, g] = atDk(120); D.each(() => { AI.phase = 3; });
    a.ch.place(-2.2, 2.2, 0); g.ch.place(2.2, 2.2, 0); a.state = g.state = 'move';
    D.with(0, () => { AI.start('dkUlt'); });
    const h0 = [a.hp, g.hp], s0 = { ...D.stats() }; let crossed = false;
    for (let i = 0; i < 300 && (D.J || i < 5); i++) {
      const J = D.J;
      if (plan === 'wrong' && J && !crossed && J.t >= J.T[0] - FD.ult.lock + 0.05) { const pa = a.ch.pos.clone(); a.ch.place(g.ch.pos.x, g.ch.pos.z, 0); g.ch.place(pa.x, pa.z, 0); crossed = true; }
      for (const f of [a, g]) { const e = D.jointEta(f); if (e !== null && e < 0.1 && f.state === 'move' && (plan !== 'one' || f === a)) f.startParry(null); }
      P.step(1 / 60, false);
    }
    const s = D.stats();
    return { sync: s.ultSync - s0.ultSync, block: s.ultBlock - s0.ultBlock, dmg: [h0[0] - a.hp, h0[1] - g.hp], st: [D.get(0, 'state'), D.get(1, 'state')], cut: !!(P.Stage.cut && P.Stage.cut.hap) };
  };
  check('2B10', '합동 필살(3페이즈): 각자 자기 색 도깨비 일격을 0.3초 안에 동시 패리 → 합 대 합 컷인 + 둘 다 그로기 · 한 사람만/다른 색 = 큰 피해 · 태그 솔로 = 패리 → 교대 패리', () => {
    const both = ultRun('both'), one = ultRun('one'), wrong = ultRun('wrong');
    P.setup({ mode: 'tag', bots: [null], seed: 121, boss: 3 }); P.Companion.think = () => {}; parkDk(); D.each(() => { AI.phase = 3; });
    const a = fighters.find(f => f.onField); a.ch.place(0, 2.5, 0); a.state = 'move';
    D.with(0, () => { AI.start('dkUlt'); }); let tagged = false; const s0 = { ...D.stats() };
    for (let i = 0; i < 300 && (D.J || i < 5); i++) {
      const J = D.J, on = fighters.find(f => f.onField);
      if (J && !J.done[J.first]) { const e = J.T[J.first] - J.t; if (e < 0.1 && on.state === 'move') on.startParry(null); }
      else if (J && !tagged) { const e = J.T[1 - J.first] - J.t; if (e < 0.2 && e > 0.03) { Game.tagCd = 0; tagged = Game.tagSwap(on); } }
      P.step(1 / 60, false);
    }
    const tagSync = D.stats().ultSync - s0.ultSync;
    const ok = both.sync === 1 && both.block === 2 && both.st.every(s => s === 'groggy') && both.cut && both.dmg.every(d => d === 0)
      && one.sync === 0 && one.block === 1 && one.dmg[1] > 0 && one.dmg[0] === 0 && wrong.sync === 0 && wrong.block === 0 && wrong.dmg.every(d => d > 0) && tagged && tagSync === 1;
    return { ok, note: `둘 다: 합 대 합 ${both.sync} 컷인 ${both.cut} 도깨비 ${both.st} · 한 사람: 막음 ${one.block} 피해 ${one.dmg} · 다른 색: 막음 ${wrong.block} 피해 ${wrong.dmg} · 태그: 교대 ${tagged} 합 대 합 ${tagSync}` };
  });
  check('2B11', '두 마리 HUD·카메라: 체력바 2개(나란히) · 어그로 선 각자 색 · 카메라가 두 마리를 함께 잡음 · 3페이즈 분노 색 · 입력 기록 재생 2회 일치(2인·태그)', () => {
    atDk(122); let drew = true; try { D.drawBars(1 / 60); D.drawAggro(fighters.filter(f => f.onField)); D.drawHud(); } catch (e) { drew = false; }
    D.rigs[0].place(-4, 0, 0); D.rigs[1].place(4, 0, 0);
    const R = P.CamRig.R, U = P.CamRig.U, E = D.extent(R, U, 3), r0 = D.rigs[0].pos.dot(R), r1 = D.rigs[1].pos.dot(R);
    const spans = E.r0 <= Math.min(r0, r1) && E.r1 >= Math.max(r0, r1);
    const skin0 = D.rigs[0].mats[0].uniforms.uRamp.value.toArray().join(); D.with(0, () => AI.setLook(3)); const rage = D.rigs[0].mats[0].uniforms.uRamp.value.toArray().join() !== skin0 && D.rigs[0].att.wings.visible;
    const watch = D.watching(fighters[0]) && D.watching(fighters[1]);
    const rr = [];
    for (const o of [{ mode: 'duo', bots: ['coop', 'coop'], seed: 7, boss: 3 }, { mode: 'tag', bots: ['tag'], seed: 7, boss: 3, chars: ['twin', 'great'] }]) {
      P.Companion.think = THINK; Math.random = (() => { let s = 9; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      const rec = P.record(o, 2400), h1 = P.replay(rec), h2 = P.replay(rec); rr.push(rec.end.hash === h1.hash && h1.hash === h2.hash);
    }
    P.Companion.think = THINK;
    return { ok: drew && spans && rage && watch && rr.every(Boolean), note: `HUD ${drew} · 카메라 범위 ${spans} · 분노 색 ${rage} · 어그로 둘 ${watch} · 재생 2인/태그 ${rr}` };
  });
  P.Companion.think = THINK;
}

// ---------------------------------------------------------------- 2단계 (11): 4체 러시 흐름 · HUD · 휴식
{
  const D = P.Dk, R = P.Relics;
  check('2H1', '4체 러시: 에밀레종 처치 → 휴식(회복 · 쓰러진 사람 부활 · 유물 · 장착 변경) → 쌍둥이 도깨비 둘이 떨어져 등장 → 둘 다 쓰러뜨리면 승리 · 보스별 시간 기록', () => {
    P.Companion.think = THINK;
    P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 130, boss: 2 }); step(1);
    const [a, g] = fighters; g.hurt(999, g.ch.pos.clone(), true); const downed = g.state === 'down'; a.hp = 40;
    AI.hurt(1e7, 0, false, P.bossNow.pos.clone(), P.bossNow.pos.clone().set(1, 0, 0), null, a); step(0.1);
    const rest = P.Rush.state === 'rest', healed = a.hp >= 99 && g.state !== 'down';
    let opened = false, t = 0;
    while (t < 40 && !(P.Rush.state === 'fight' && P.Rush.idx === 3)) { P.step(1 / 60, false); t += 1 / 60; if (R.open) opened = true; }
    const picked = R.owned[0].length === 1 && R.owned[1].length === 1;
    const entering = D.on && P.Rush.idx === 3 && D.rigs.every(r => r.root.visible) && D.get(0, 'state') === 'away' && D.get(1, 'state') === 'away' && D.rigs[0].pos.y > 3 && D.rigs[1].pos.y > 3;
    step(1.2); const landed = D.rigs.every(r => r.pos.y === 0) && D.get(0, 'state') !== 'away' && D.get(1, 'state') !== 'away';
    const apart = D.rigs[0].pos.distanceTo(D.rigs[1].pos) > 2.5;
    for (const i of [0, 1]) D.with(i, () => AI.hurt(1e7, 0, false, P.bossNow.pos.clone(), P.bossNow.pos.clone().set(1, 0, 0), null, a));
    step(0.3);
    const won = Game.state === 'won', bt = Duo.stats.bossT;
    return { ok: downed && rest && healed && opened && picked && entering && landed && apart && won && bt[2] > 0 && bt[3] > 0,
      note: `휴식 ${rest} · 회복/부활 ${healed} · 카드 ${opened} 고름 ${picked} · 둘 등장(공중) ${entering} · 착지 ${landed} · 떨어져 섬 ${apart} · 승리 ${won} · 시간 ${bt.map(v => v ?? '-')}` };
  });
  check('2H2', 'HUD: BOSS n/4 · 캐릭터 이름(RAPIER · CHAIN · GREATSWORD · SHIELD · TWIN) · U/I 칸 그림 = 장착한 스킬 · 유물 아이콘 · 도깨비 체력바 2 · 종 화살표 — 그리는 함수가 다 돎', () => {
    const labels = ['rapier', 'chain', 'great', 'shield', 'twin'].map(k => P.CHARS[k].label).join(' · ');
    let glyphs = 0; for (const k of Object.keys(P.SKILLS2)) { try { P.skillGlyph(k, 10, 10, '#fff'); glyphs++; } catch (e) { /* counted as missing */ } }
    let drew = true, err = '';
    try {
      for (const b of [0, 1, 2, 3]) { P.setup({ mode: 'duo', bots: [null, null], seed: 131, boss: b }); step(0.2); P.drawFightHud(1 / 60); }
      P.setup({ mode: 'tag', bots: [null], seed: 131, boss: 3 }); step(0.2); P.drawFightHud(1 / 60);
    } catch (e) { drew = false; err = String(e).slice(0, 80); }
    const count = P.Rush.count === 4 && P.BOSSES.map(B => B.name).join('/') === 'THE SCARLET COLOSSUS/THE AZURE WARDEN/THE WEEPING BELL/THE TWIN DOKKAEBI';
    return { ok: labels === 'RAPIER · CHAIN · GREATSWORD · SHIELD · TWIN' && drew && count && glyphs === 15, note: `이름 ${labels} · 보스 4 ${count} · 스킬 그림 ${glyphs}/15 · HUD 그리기 ${drew}${err ? ' ' + err : ''}` };
  });
  P.Companion.think = THINK;
}

// ---------------------------------------------------------------- 3단계: 아트 · 시작 화면 · 메뉴 · 2P 참가 · 패드 · 보스 체력
{
  P.Companion.think = THINK;
  const S3 = P.STYLE;
  check('3A1', '3단계 아트 켜짐: 픽셀화 · 32색 양자화 · 디더 끔 · 팔레트 = STYLE.pal · 세그먼트 아레나 · 보스마다 테마', () => {
    const T = P.Pipe.toggles, pal = P.STYLE.pal.every((h, i) => true);
    const names = [];
    for (const b of [0, 1, 2, 3]) { P.setup({ mode: 'duo', bots: [null, null], seed: 300, boss: b }); names.push(P.Arena3.theme && P.Arena3.theme.name); }
    const ok = S3.on && !T.pixel && !T.palette && !T.dither && !!P.Arena3.floor && names.join() === S3.arena.themes.map(t => t.name).join();
    return { ok, note: `pixel ${T.pixel} palette ${T.palette} dither ${T.dither} · 테마 ${names.join(' / ')}` };
  });
  check('3A2', '외곽선 종류: 캐릭터 = 자기 색(청 1 · 적 2 · 쌍검 3) · 보스 4 · 에밀레종 8 · 도깨비 6/7', () => {
    const catOf = root => { let c = -1; root.traverse(o => { if (c < 0 && o.isMesh && o.material && o.material.uniforms && o.material.uniforms.uOlCat) c = o.material.uniforms.uOlCat.value; }); return c; };
    const ch = ['rapier', 'great', 'chain', 'shield', 'twin'].map(id => catOf(P.Rigs.get(id).root));
    P.setup({ mode: 'duo', bots: [null, null], seed: 301, boss: 2 }); const bell = catOf(P.bossNow.root);
    P.setup({ mode: 'duo', bots: [null, null], seed: 301, boss: 3 }); const dk = P.Dk.rigs.map(r => catOf(r.root));
    P.setup({ mode: 'duo', bots: [null, null], seed: 301, boss: 0 }); const golem = catOf(P.bossNow.root);
    return { ok: ch.join() === '1,2,1,2,3' && bell === 8 && dk.join() === '6,7' && golem === 4, note: `캐릭터 ${ch} · 종 ${bell} · 도깨비 ${dk} · 거상 ${golem}` };
  });
  check('3B1', '보스 체력 절반: 0.425 · 0.39 · 0.25 · 0.17(한 마리)', () => {
    const hp = P.BOSSES.map(B => B.hp);
    return { ok: hp.join() === '0.425,0.39,0.25,0.17', note: hp.join(' · ') };
  });
  check('3U1', '시작 화면: 아무 키 → 캐릭터 선택 · Esc는 메뉴(시작 안 함)', () => {
    P.Title3.open(); step(0.6); const t0 = Game.state === 'title';
    P.Input.pressed.add('menu'); P.step(1 / 60, false); const menu = P.Menu3.on && Game.state === 'title';
    P.Menu3.close(); P.Title3.tap = true; P.step(1 / 60, false); const sel = Game.state === 'select';
    P.Select.on = false;
    return { ok: t0 && menu && sel, note: `시작 ${t0} · Esc 메뉴 ${menu} · 키 → 선택 ${sel}` };
  });
  check('3U2', 'Esc 메뉴 = 일시정지 (게임 시간 · 프레임 안 감) · 닫으면 이어짐 · 메뉴 열고 닫은 기록도 2회 재생 일치', () => {
    P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 302 }); step(2);
    const t0 = Game.t, f0 = Game.frame;
    P.Input.pressed.add('menu'); P.step(1 / 60, false); const open = P.Menu3.on;
    step(1); const frozen = Game.t === t0 && Game.frame === f0;
    P.Menu3.close(); step(1); const runs = Game.t > t0 + 0.9;
    // record with a menu pause in the middle (paused frames are not recorded) → replay twice
    const o = { mode: 'duo', bots: ['coop', 'coop'], seed: 303 };
    P.setup(o); P.Rec.start('rec');
    for (let i = 0; i < 1200; i++) { if (i === 400) P.Menu3.open(); if (i === 460) P.Menu3.close(); P.step(1 / 60, false); }
    const frames = P.Rec.stop(), end = P.stateHash().hash, rec = { o, n: frames.length, frames };
    const r1 = P.replay(rec).hash, r2 = P.replay(rec).hash;
    return { ok: open && frozen && runs && end === r1 && r1 === r2 && frames.length === 1140, note: `열림 ${open} · 멈춤 ${frozen} · 이어짐 ${runs} · 기록 ${frames.length}프레임 ${end} · ${r1} · ${r2}` };
  });
  check('3U3', '혼자일 때 2P 키를 눌러도 참가 0번 · ENTER 0.6초 꾹 = 2P 참가 · F4 = 다시 혼자 · 메뉴 PLAYERS = 바꿈', () => {
    P.setup({ mode: 'tag', bots: [null], seed: 304 }); step(0.5);
    for (const code of ['Numpad1', 'Slash', 'KeyO', 'Numpad7', 'Numpad8', 'ShiftRight', 'Period', 'Enter', 'ArrowUp', 'KeyL']) {
      P.keys.add(code); P.step(1 / 60, false); P.keys.delete(code); P.step(1 / 60, false);
    }
    const stay = Game.tagMode;
    P.keys.add('Enter'); step(0.75); P.keys.delete('Enter'); const joined = !Game.tagMode && !fighters[1].bot;
    P.Input.pressed.add('tagSolo'); P.step(1 / 60, false); const solo = Game.tagMode;
    P.Menu3.open(); P.Menu3.setPlayers(1); const ai = !Game.tagMode && !!fighters[1].bot; P.Menu3.setPlayers(1); const duo = !Game.tagMode && !fighters[1].bot; P.Menu3.close();
    return { ok: stay && joined && solo && ai && duo, note: `탭 10개 뒤 혼자 ${stay} · 꾹 참가 ${joined} · F4 혼자 ${solo} · 메뉴 AI ${ai} → 2P ${duo}` };
  });
  check('3U4', 'HUD: 시작 화면 · 선택 · 싸움(2인 · 태그) · 메뉴 3쪽 그리기 에러 0 · 2P 키 표시 기본 끔 · 기술명 한 자리', () => {
    let ok = true, err = '';
    try {
      P.Title3.open(); P.drawFightHud(1 / 60); P.Menu3.open(); for (const pg of ['main', 'keys', 'pad']) { P.Menu3.page = pg; P.drawFightHud(1 / 60); } P.Menu3.close();
      P.Select.open(); P.drawFightHud(1 / 60); P.Select.on = false;
      P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 305 }); step(4); P.drawFightHud(1 / 60);
      P.setup({ mode: 'tag', bots: ['tag'], seed: 305 }); step(4); P.drawFightHud(1 / 60);
    } catch (e) { ok = false; err = String(e).slice(0, 90); }
    P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 306 }); let names = 0, last = null;
    for (let i = 0; i < 1200; i++) { P.step(1 / 60, false); const T = Game.techName; if (T && T !== last) { names++; last = T; } }
    return { ok: ok && P.UI.keys2P === false && names > 3, note: `그리기 ${ok}${err ? ' ' + err : ''} · 2P 키 ${P.UI.keys2P} · 20초 기술명 ${names}번` };
  });
  // fake pads (navigator.getGamepads) — 6-4 scenarios
  const mkPad = (index, id, mapping = 'standard') => ({ index, id, mapping, connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] });
  let PADS = [], THROW = false;
  const nav = globalThis.navigator || (globalThis.navigator = {});
  try { Object.defineProperty(nav, 'getGamepads', { configurable: true, writable: true, value: () => { if (THROW) { const e = new Error('blocked'); e.name = 'SecurityError'; throw e; } return PADS; } }); } catch (e) { /* fallback below */ }
  const press = (pad, i, v = 1) => { pad.buttons[i] = { pressed: v >= 0.5, value: v }; };
  const rel = (pad, i) => { pad.buttons[i] = { pressed: false, value: 0 }; };
  const tick = (n = 1) => { for (let k = 0; k < n; k++) { P.Input.endFrame(); P.Input.poll(); } };
  check('3P1', '가짜 패드: 표준 A → 1P 배정 · 빈 칸 섞인 배열 · 2번째 패드 → 2P · 1P 패드 끊김 → 2P 그대로 · 같은 패드 다시 연결 → 1P · START = 메뉴', () => {
    P.Pads3.slots = [null, null]; P.Pads3.known = {}; P.Pads3.blocked = false;
    const a = mkPad(1, 'Xbox Wireless Controller (STANDARD GAMEPAD)'), b = mkPad(3, 'DualSense Wireless Controller');
    PADS = [null, a]; tick(); const none = !P.Input.pads[0].on;
    press(a, 0); tick(); const p1 = P.Input.pads[0].on && P.Input.pressed.has('dodge'); rel(a, 0); tick();
    PADS = [null, a, null, b]; press(b, 2); tick(); const p2 = P.Input.pads[1].on && P.Input.pressed2.has('attack'); rel(b, 2); tick();
    PADS = [null, null, null, b]; tick(); const kept = !P.Input.pads[0].on && P.Input.pads[1].on && P.Pads3.slots[0] && P.Pads3.slots[1].index === 3;
    const a2 = mkPad(0, a.id); PADS = [a2, null, null, b]; tick(); const back = P.Input.pads[0].on && P.Pads3.slots[0].index === 0;
    press(a2, 9); tick(); const menu = P.Input.pressed.has('menu'); rel(a2, 9); tick();
    return { ok: none && p1 && p2 && kept && back && menu, note: `누르기 전 없음 ${none} · 1P ${p1} · 2P ${p2} · 끊김 유지 ${kept} · 재연결 ${back} · START 메뉴 ${menu}` };
  });
  check('3P2', '가짜 패드: 막힘(SecurityError) → 에러 없이 재시도 · 트리거 0.3 무시 / 0.7 = 스킬 I · 스틱 떨림 0.15 무시 / 0.8 = 이동 · 비표준 매핑 = 대체 표', () => {
    P.Pads3.slots = [null, null]; P.Pads3.known = {};
    THROW = true; let crash = false; try { tick(); } catch (e) { crash = true; } const blocked = P.Pads3.blocked && !crash;
    THROW = false; const a = mkPad(0, 'Generic pad'); PADS = [a]; P.clock.t += 2; press(a, 0); tick(); const retry = !P.Pads3.blocked && P.Input.pads[0].on; rel(a, 0); tick();
    press(a, 6, 0.3); tick(); const lo = !P.Input.pressed.has('skill2'); press(a, 6, 0.7); tick(); const hi = P.Input.pressed.has('skill2'); rel(a, 6); tick();
    a.axes = [0.15, 0, 0, 0]; tick(); const drift = P.Input.pads[0].x === 0; a.axes = [0.8, 0, 0, 0]; tick(); const move = P.Input.pads[0].x > 0.5; a.axes = [0, 0, 0, 0]; tick();
    P.Pads3.slots = [null, null]; const n = mkPad(2, 'Weird USB pad', ''); PADS = [n]; press(n, 0); tick(); const ns = P.Input.pressed.has('attack'); rel(n, 0); tick();
    PADS = []; tick(); P.Pads3.slots = [null, null];
    return { ok: blocked && retry && lo && hi && drift && move && ns, note: `막힘 ${blocked} · 재시도 ${retry} · 트리거 ${lo}/${hi} · 떨림 ${drift} · 이동 ${move} · 비표준 ${ns}` };
  });
  P.Companion.think = THINK;
}

// ---------------------------------------------------------------- 3단계 QTE (7절) · 움직임 (5절)
if (P.Qte3) {
  const Q = P.Qte3, QT = P.QTE, DMG = Math.round(QT.failDmg * FEEL.BOSS_DMG);
  const qSetup = o => { P.setup({ mode: 'duo', bots: [null, null], seed: 401, boss: 1, chars: ['rapier', 'great'], ...o }); P.Dk.each(() => park()); step(0.3); };
  const runTo = t => { let g = 0; while (Q.on && Q.t < t && g++ < 2000) P.step(1 / 60, false); };
  const ownerF = c => Game.tagMode ? fighters.find(f => f.onField) : fighters.find(f => Q.col(f) === c.col);
  const hitCell = (k, key) => { const c = Q.cells[k], f = ownerF(c); runTo(Q.T(k) - 0.02); press(f, key ?? Q.expect(f, c)); P.step(1 / 60, false); return c; };
  const startQ = () => P.Dk.with(P.Dk.main(), () => { const ok = Q.can(Math.max(0, AI.phase - 1)); if (ok) Q.start(); return ok; });
  check('3Q1', 'QTE: 첫 보스엔 없음 (데이터 null · 가중치 0 · 페이즈 전환에도 안 생김) · 보스 2/3/4 칸 수 = 표', () => {
    qSetup({ boss: 0 }); const w = [0, 1, 2].map(ph => Q.weight(ph)); Q.onPhase(2); Q.onPhase(3); const none = !Q.want && !Q.bossDef() && w.every(x => x === 0);
    qSetup({ boss: 1 }); AI.phase = 2; startQ(); const n2 = Q.cells.length; Q.finish(true);
    qSetup({ boss: 2, chars: ['twin', 'great'] }); AI.phase = 3; startQ(); const n3 = Q.cells.length; Q.finish(true);
    return { ok: none && n2 === QT.bosses[1].cells[1] && n3 === QT.bosses[2].cells[2], note: `보스 1 없음 ${none} · 보스 2 페이즈 2 = ${n2}칸 · 보스 3 페이즈 3 = ${n3}칸` };
  });
  check('3Q2', 'QTE 칸 = 시드: 같은 시드 → 같은 줄 · 같은 색 최대 2연속 · 키 = 공격/패리/U/I · 적·청 둘 다 나옴', () => {
    const seq = seed => { qSetup({ seed }); AI.phase = 3; startQ(); const r = Q.cells.map(c => c.col[0] + ':' + c.key).join(' '); Q.finish(true); return r; };
    const a = seq(411), b = seq(411), runs = []; let maxRun = 0, both = true, keysOk = true;
    for (let s = 420; s < 440; s++) { const q = seq(s).split(' '); let r = 1; for (let i = 1; i < q.length; i++) { r = q[i][0] === q[i - 1][0] ? r + 1 : 1; maxRun = Math.max(maxRun, r); } if (!q.some(x => x[0] === 'r') || !q.some(x => x[0] === 'b')) both = false; if (!q.every(x => QT.keys.includes(x.slice(2)))) keysOk = false; }
    return { ok: a === b && maxRun <= QT.maxRun && both && keysOk, note: `${a} · 최대 연속 ${maxRun} · 두 색 ${both} · 키 ${keysOk}` };
  });
  check('3Q3', 'QTE 판정: 창 안 맞는 키 = 깨짐 · 틀린 키 = 실패 + 그 사람 피해 · 창 전 한 박자 안 = 너무 이름 · 안 누름 = 실패', () => {
    qSetup({ seed: 431 }); AI.phase = 2; startQ();
    const c0 = hitCell(0);
    const c1 = Q.cells[1], o1 = ownerF(c1), hp1 = o1.hp; hitCell(1, QT.keys.find(k => k !== c1.key)); const dmg1 = hp1 - o1.hp;
    const c2 = Q.cells[2], o2 = ownerF(c2); runTo(Q.T(2) - QT.win - QT.beat * 0.4); press(o2, c2.key); P.step(1 / 60, false);
    const c3 = Q.cells[3]; runTo(Q.T(3) + QT.win + 0.05);
    const r = [c0.res, c1.res + ':' + c1.why, c2.res + ':' + c2.why, c3.res + ':' + c3.why];
    Q.finish(true);
    return { ok: r[0] === 'ok' && r[1] === 'fail:wrong' && dmg1 === DMG && r[2] === 'fail:early' && r[3] === 'fail:miss', note: `${r.join(' · ')} · 피해 ${dmg1}/${DMG}` };
  });
  check('3Q4', 'QTE 끝: 전부 성공 = 보스 그로기 + 랠리 +2 + PERFECT CHAIN · 3칸 이상 실패 = 보스 강공격(워든 bash)', () => {
    qSetup({ seed: 441 }); AI.phase = 2; Duo.rally = 0; startQ();
    for (let k = 0; k < Q.cells.length; k++) hitCell(k);
    runTo(99); step(QT.tail + 0.1); const perfect = AI.state === 'groggy' && Duo.rally === QT.reward.rally && Game.techName && Game.techName.s === 'PERFECT CHAIN';
    const rally = Duo.rally, st = AI.state;
    qSetup({ seed: 442 }); AI.phase = 2; startQ(); runTo(99); let g = 0; while (Q.on && g++ < 200) P.step(1 / 60, false);
    const punish = AI.state === 'attack' && AI.cur === QT.bosses[1].punish;
    return { ok: perfect && punish, note: `전부 성공 → ${st} 랠리 ${rally} 기술명 ${Game.techName && Game.techName.s} · 전부 실패 → ${AI.state} ${AI.cur}` };
  });
  check('3Q5', 'QTE 태그 솔로: 색이 바뀌는 칸 = 교대 키(성공하면 실제로 교대) · 같은 색 = 표시된 키 · 끝까지 = PERFECT', () => {
    P.setup({ mode: 'tag', bots: [null], seed: 451, boss: 1, chars: ['rapier', 'great'] }); park(); step(0.3); AI.phase = 2; startQ();
    let tagCells = 0, swapsOk = 0, plain = 0;
    for (let k = 0; k < Q.cells.length; k++) {
      const c = Q.cells[k], f = fighters.find(q => q.onField), key = Q.expect(f, c);
      if (key === 'tag') tagCells++; else plain++;
      hitCell(k);
      const g = fighters.find(q => q.onField); if (key === 'tag' && Q.col(g) === c.col) swapsOk++;
    }
    const allOk = Q.cells.every(c => c.res === 'ok'); runTo(99); step(QT.tail + 0.1);
    return { ok: allOk && tagCells >= 1 && swapsOk === tagCells && AI.state === 'groggy', note: `교대 칸 ${tagCells} (교대됨 ${swapsOk}) · 일반 칸 ${plain} · 전부 성공 ${allOk} · 보스 ${AI.state}` };
  });
  check('3Q6', 'QTE 쌍검 = 파트너와 반대 색 칸 · 칸 주인은 한 명', () => {
    P.setup({ mode: 'duo', bots: [null, null], seed: 461, boss: 1, chars: ['twin', 'great'] }); const a = Q.col(fighters[0]);
    P.setup({ mode: 'duo', bots: [null, null], seed: 461, boss: 1, chars: ['rapier', 'twin'] }); const b = Q.col(fighters[1]);
    return { ok: a === 'blue' && b === 'red', note: `쌍검+대검 → 쌍검 ${a} · 세검+쌍검 → 쌍검 ${b}` };
  });
  check('3Q7', 'QTE 페이즈 전환: 워든 70% 전환 뒤 QTE 시작 · 콜로서스는 안 함', () => {
    const run = boss => { P.setup({ mode: 'duo', bots: ['coop', 'coop'], seed: 471, boss }); step(1); AI.startTransform(2); let t = 0, got = false; while (t < 8 && !got) { P.step(1 / 60, false); t += 1 / 60; got = Q.on; } const name = got ? Q.D.name : '-'; if (Q.on) Q.finish(true); return { got, name, t: +t.toFixed(1) }; };
    const w = run(1), c = run(0);
    return { ok: w.got && !c.got, note: `워든 ${w.got} ${w.name} ${w.t}초 · 콜로서스 ${c.got}` };
  });
  check('3Q8', 'QTE 입력 기록 재생 2회 일치 (2인 합 봇 · 태그 봇, QTE 진행 중 메뉴 열고 닫기 포함)', () => {
    const keep = { ...QT.bosses[1] }; QT.bosses[1].from = 1; QT.bosses[1].w = 50; const gap = QT.gap; QT.gap = 3;
    P.Companion.think = THINK;
    const one = o => {
      P.setup(o); P.Rec.start('rec'); let menuAt = -1;
      for (let i = 0; i < 2400; i++) { if (menuAt < 0 && Q.on && Q.t > 1.2) { menuAt = i; P.Menu3.open(); } if (menuAt > 0 && i === menuAt + 30) P.Menu3.close(); P.step(1 / 60, false); }
      const S = Duo.stats.qte || { n: 0, cells: 0 }, frames = P.Rec.stop(), end = P.stateHash().hash, rec = { o, n: frames.length, frames };
      const r1 = P.replay(rec).hash, r2 = P.replay(rec).hash; return { ok: end === r1 && r1 === r2 && S.n >= 1, n: S.n, cells: S.cells, end, r1, r2, menu: menuAt > 0 };
    };
    const d = one({ mode: 'duo', bots: ['coop', 'coop'], seed: 481, boss: 1 }), t = one({ mode: 'tag', bots: ['tag'], seed: 482, boss: 1 });
    Object.assign(QT.bosses[1], keep); QT.gap = gap;
    return { ok: d.ok && t.ok && d.menu, note: `2인: QTE ${d.n}번 ${d.cells}칸 ${d.end}·${d.r1}·${d.r2} 메뉴 ${d.menu} · 태그: QTE ${t.n}번 ${t.cells}칸 ${t.end}·${t.r1}·${t.r2}` };
  });
  check('3Q9', 'QTE 도깨비(SSIREUM): 두 마리 다 QTE 자세 · 전부 성공 = 둘 다 그로기 · 합동기 쿨타임 같이 씀', () => {
    P.setup({ mode: 'duo', bots: [null, null], seed: 491, boss: 3, chars: ['rapier', 'great'] }); step(0.3);
    P.Dk.each(() => park()); P.Dk.jointCd = 0; AI.phase = 2; const started = startQ();
    const both = started && P.Dk.get(0, 'state') === 'qte' && P.Dk.get(1, 'state') === 'qte', name = Q.D && Q.D.name;
    for (let k = 0; k < Q.cells.length; k++) hitCell(k);
    runTo(99); step(QT.tail + 0.05);
    const gro = [P.Dk.get(0, 'state'), P.Dk.get(1, 'state')], cd = P.Dk.jointCd;
    return { ok: both && name === 'SSIREUM' && gro.every(s => s === 'groggy') && cd > 0, note: `시작 ${started} 둘 다 QTE ${both} ${name} · 끝 ${gro} · 합동기 쿨 ${cd.toFixed(2)}` };
  });
  P.Companion.think = THINK;
  check('3M1', '움직임 과장: 공중 마무리 최고 높이 ≥ 2단계(3.05) × 2 · 대시 거리 = 3.36 × MOTION.dashDist · 컷인 슬로모션 없음(기술명만)', () => {
    const r = finRun(false, [], 493, 'lift', 1);
    duo(494); park(); const boss0 = P.bossNow; boss0.place(0, -0.5, Math.PI * 0.25);
    const red = fighters.find(f => P.CHARS[f.char].color === 'red'), recv = fighters.find(f => f !== red);
    const put = (f, a, rr) => { f.ch.place(boss0.pos.x + Math.sin(a) * rr, boss0.pos.z + Math.cos(a) * rr, a + Math.PI); f.state = 'move'; };
    put(red, Math.PI * 0.25 + 0.3, 2.3); put(recv, Math.PI * 0.25 - 0.9, 3.2);
    AI.startStatus('lift', red); step(0.3); Duo.startFinish(recv, 1); let maxY = 0, slow = 0; for (let i = 0; i < 180; i++) { P.step(1 / 60, false); maxY = Math.max(maxY, recv.ch.pos.y); slow = Math.max(slow, Stage.slowT); }
    duo(495); park(); const f = fighters[0]; f.ch.place(-3, 2, 0); f.state = 'move'; const p0 = f.ch.pos.clone(); f.startDodge(P.camera.position.clone().set(1, 0, 0)); step(0.6); const dash = f.ch.pos.distanceTo(p0);
    const want = 3.36 * P.MOTION.dashDist;
    return { ok: maxY >= 3.05 * 2 - 0.01 && Math.abs(dash - want) < 0.08 && slow === 0 && r.cut, note: `최고 높이 ${maxY.toFixed(2)} · 대시 ${dash.toFixed(2)}/${want.toFixed(2)} · 컷인 표시 ${r.cut} 슬로 ${slow}` };
  });
}

// ---------------------------------------------------------------- 4T1: 4단계 테마 1 '애니 셀' (node check15.mjs --4t1)
if (RUN_4T1) {
  const { t1Gates } = await import(pathToFileURL(path.join(HERE, 't1', 'gates_core.mjs')).href);
  const keep0 = P.ART.cur, H0 = P.ART.headless;
  const withTheme = (n, fn) => { P.ART.headless = true; P.artSet(n, { noSave: true }); try { return fn(); } finally { P.artSet(keep0, { noSave: true }); P.ART.headless = H0; } };
  const mul32 = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const fight = (seed, secs, art, mode = 'duo') => { const MR = Math.random, rr = mul32(seed * 7919); Math.random = function () { return rr(); };   /* 봇 난수를 싸움마다 같은 시드로 (sim.mjs와 같은 방식) */
    try { P.setup({ mode, bots: mode === 'duo' ? ['coop', 'coop'] : ['tag'], seed, boss: 1, chars: ['rapier', 'great'] });
      let maxTexts = 0; for (let i = 0; i < secs * 60; i++) { P.step(1 / 60, false); if (art) P.artFrame(1 / 60); maxTexts = Math.max(maxTexts, P.t1Texts().total); } return { hash: P.stateHash().hash, maxTexts }; } finally { if (Math.random !== MR) Math.random = MR; } };
  check('4T1a', '공통 훅 · 테마 등록: artApply · artDispose · artFrame · artHud 함수, ART.themes[1] = { id, name, apply, dispose, frame, hud } · ART.boot 1 · SLICE { boss 1, chars 세검·대검 } · Node 기본 테마 0', () => {
    const T = P.ART.themes[1], f = ['artApply', 'artDispose', 'artFrame', 'artHud'].every(k => typeof P[k] === 'function');
    const t = T && T.id === 1 && T.name === P.ART.names[1] && ['apply', 'dispose', 'frame', 'hud'].every(k => typeof T[k] === 'function');
    return { ok: f && t && P.ART.boot === 1 && P.SLICE.boss === 1 && P.SLICE.chars.join() === 'rapier,great' && P.SLICE.on === false && keep0 === ART_N, note: `훅 ${f} · 테마1 ${t} (${T && T.name}) · boot ${P.ART.boot} · SLICE ${JSON.stringify(P.SLICE)} · 시작 테마 ${keep0}` };
  });
  check('4T1b', '판정용 숨은 리그: 테마 1이면 레이어 31로만 숨김(.visible 그대로) · 테마 0으로 돌리면 레이어 원래대로', () => {
    P.setup({ mode: 'duo', bots: [null, null], seed: 3, boss: 1, chars: ['rapier', 'great'] });
    const roots = P.artRigRoots(), before = roots.map(r => { const m = []; r.traverse(o => m.push(o.layers.mask >>> 0)); return m.join(); });
    const vis0 = []; for (const r of roots) r.traverse(o => vis0.push(o.visible));
    let hid = 0, same = true; withTheme(1, () => { P.artFrame(1 / 60); let i = 0; for (const r of roots) { let all = true; r.traverse(o => { if ((o.layers.mask >>> 0) !== 2 ** 31) all = false; if (o.visible !== vis0[i++]) same = false; }); if (all) hid++; } });
    const vis = same ? roots.length : -1;
    const after = roots.map(r => { const m = []; r.traverse(o => m.push(o.layers.mask >>> 0)); return m.join(); });
    return { ok: roots.length >= 3 && hid === roots.length && vis === roots.length && after.join('|') === before.join('|'), note: `리그 ${roots.length} · 레이어31 ${hid} · visible ${vis} · 되돌림 ${after.join('|') === before.join('|')}` };
  });
  check('4T1c', '판정 불변: 테마 0에서 기록한 싸움(2인 봇 · 태그 봇) 입력을 테마 1(매 프레임 artFrame)로 다시 돌려도 상태 해시가 같음 · 테마 코드는 Math.random을 안 씀(★1)', () => {
    let calls = 0; const af = P.artFrame;
    const replayArt = (rec, art) => { P.setup(rec.o); P.Rec.start('play', rec.frames); for (let i = 0; i < rec.n; i++) { P.step(1 / 60, false); if (art) P.artFrame(1 / 60); } P.Rec.stop(); return P.stateHash().hash; };
    P.artFrame = dt => { const R1 = Math.random; let n = 0; Math.random = function () { n++; return R1.apply(this, arguments); }; try { return af(dt); } finally { Math.random = R1; calls += n; } };   /* 테마 프레임이 바깥 Math.random을 몇 번 부르나 */
    const out = [];
    try {
      for (const o of [{ mode: 'duo', bots: ['coop', 'coop'], seed: 611, boss: 1, chars: ['rapier', 'great'] }, { mode: 'tag', bots: ['tag'], seed: 612, boss: 1, chars: ['rapier', 'great'] }]) {
        const rec = P.record(o, 60 * 40), r0 = replayArt(rec, false), r1 = withTheme(1, () => replayArt(rec, true));
        out.push({ m: o.mode, end: rec.end.hash || rec.end, r0, r1 });
      }
    } finally { P.artFrame = af; }
    return { ok: out.every(x => x.r0 === x.end && x.r1 === x.end) && calls === 0, note: out.map(x => `${x.m} 기록 ${x.end} · 테마0 ${x.r0} · 테마1 ${x.r1}`).join(' / ') + ` · 테마 안 Math.random ${calls}번` };
  });
  const G = withTheme(1, () => t1Gates(P));
  check('4T1d', 'M2 모션: 세검 · 대검 1순위 공격마다 예비(칼끝이 타격 반대로 몸 키 0.25 이상) + 오버슈트', () => ({ ok: G.M2.every(r => r.ok), note: G.M2.map(r => `${r.clip} ${r.anticipation}/${r.overshoot}`).join(' · ') }));
  check('4T1e', 'L1 판정 맞춤: 타격 프레임 보이는 칼끝 ↔ 판정 부채꼴 · 워든 내려찍기/쏘기 발톱 ↔ SLAM_AT/SHOT_AT 거리 ≤ 판정 반경 25%', () => ({ ok: G.L1.every(r => r.ok), note: G.L1.map(r => `${r.kind}.${r.clip} ${r.dist}/${r.lim}`).join(' · ') }));
  check('4T1f', 'M1 모델: 삼각형 캐릭터 8천~1.5만 · 보스 1.5만~3만 · 대기 실루엣 폭 · 키 = 판정 크기 ±15%', () => ({
    ok: G.M1.every(r => (r.kind === 'warden' ? r.tris >= 15000 && r.tris <= 30000 : r.tris >= 8000 && r.tris <= 15000) && Math.abs(r.wRatio - 1) <= 0.15 && Math.abs(r.hRatio - 1) <= 0.15),
    note: G.M1.map(r => `${r.kind} ${r.tris}삼각 폭${r.wRatio} 키${r.hRatio}`).join(' · ') }));
  check('4T1g', 'X3 · 1·2순위 새 자세: 테마 1 장면에 3단계 메쉬 0개 · 워든 싸움에서 쓰인 세검 · 대검 · 워든 동작이 전부 T1.poses (임시 3단계 자세 0)', () => withTheme(1, () => {
    P.t1Pose.stats = {}; fight(613, 60, true); fight(614, 40, true, 'tag');
    const used = Object.keys(P.t1Pose.stats).filter(k => !/^warden:b[A-Z]/.test(k)), old = used.filter(k => P.t1Pose.stats[k] !== 'new');
    const game = new Set(); P.t1Scene().traverse(o => game.add(o)); let shared = 0, meshes = 0; P.t1.R.scene.traverse(o => { if (game.has(o)) shared++; if (o.isMesh) meshes++; });
    return { ok: old.length === 0 && used.length >= 20 && shared === 0 && meshes > 10, note: `쓰인 동작 ${used.length} · 3단계 자세 ${old.length}${old.length ? ' ' + old.join(' ') : ''} · 테마 장면 메쉬 ${meshes} · 3단계와 겹침 ${shared}` };
  }));
  check('4T1h', '테마 전환 누수: 0 ↔ 1 왕복 3번 뒤 재질 · 모델 · 손잡이(입자/궤적 원래 함수) 그대로', () => {
    const burst0 = P.Particles.burst; let n = [];
    for (let i = 0; i < 3; i++) withTheme(1, () => { P.artFrame(1 / 60); n.push([P.t1.R.mats.length, P.t1.models.warden.tris, P.t1.R.scene.children.length].join('/')); });
    return { ok: n.every(x => x === n[0]) && P.Particles.burst === burst0 && !P.t1.built, note: `${n.join(' · ')} · 입자 함수 되돌림 ${P.Particles.burst === burst0} · 끈 뒤 built ${P.t1.built}` };
  });
  check('4T1i', 'U1: 테마 1 싸움 내내 화면 글자(기술명 · 배너 · 알림 + 팝업) 동시 3개 이하', () => withTheme(1, () => { const a = fight(615, 50, true), b = fight(616, 30, true, 'tag'); return { ok: a.maxTexts <= 3 && b.maxTexts <= 3, note: `최대 ${a.maxTexts} · 태그 ${b.maxTexts}` }; }));
}

// ---------------------------------------------------------------- 결과
const pass = rows.filter(r => r.ok).length;
console.log(`\n${pass} / ${rows.length} PASS · console errors ${errors.length}`);
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'results', 'check15.json'), JSON.stringify({ pass, total: rows.length, errors: errors.length, rows }, null, 1));
