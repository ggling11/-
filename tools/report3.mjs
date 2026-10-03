// 3단계 합격 기준 표: accept3.sh 결과(results/s3/accept/*.jsonl · replay.json) + 규칙 점검(check15.json) + 움직임 · 아트 측정을 읽어 지표 · 기준 · 통과(경계 ±3%p 표시)
//   node tools/report3.mjs [dir]   → dir/accept.json · dir/accept.md
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.argv[2] || path.join(HERE, 'results', 's3', 'accept');
const load = n => { const f = path.join(DIR, n + '.jsonl'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : []; };
const PAIRS = ['rapier_great', 'rapier_shield', 'chain_great', 'chain_shield', 'twin_rapier', 'twin_great', 'twin_chain', 'twin_shield'];
const BAT = ['rapier_great', 'chain_shield'];
const M = Object.fromEntries(PAIRS.map(p => [p, load('m_' + p)]));
const B = c => BAT.flatMap(p => load(`b_${p}_${c}`));
const Bp = (p, c) => load(`b_${p}_${c}`);
const matrix = PAIRS.flatMap(p => M[p]);
const coopAll = [...matrix, ...B('coop')];
const won = rows => rows.filter(r => r.result === 'won');
const rate = rows => (rows.length ? won(rows).length / rows.length : null);
const avg = (rows, k) => (rows.length ? rows.reduce((s, r) => s + k(r), 0) / rows.length : null);
const sumK = (rows, k) => rows.reduce((s, r) => s + (k(r) || 0), 0);
const merge = (rows, k) => rows.reduce((o, r) => { for (const [a, v] of Object.entries(r.stats[k] || {})) o[a] = (o[a] || 0) + v; return o; }, {});
const pct = v => (v === null || v === undefined || Number.isNaN(v) ? '-' : (v * 100).toFixed(1) + '%');
const out = [];
// status: pass / fail, borderline when within 3 %p (rates) / 3 % (other numbers) of a limit
const row = (id, what, val, shown, limit, ok, near) => out.push({ id, what, val, shown, limit, ok: !!ok, near: !!near });
const nearR = (v, lim) => v !== null && Math.abs(v - lim) <= 0.03;

// A1 coop clear per pair
const pc = PAIRS.map(p => ({ p, n: M[p].length, c: rate(M[p]), t: avg(won(M[p]), r => r.t) }));
const meanC = avg(pc.filter(x => x.n), x => x.c), minC = Math.min(...pc.filter(x => x.n).map(x => x.c));
row('A1', '합 봇 4체 러시 클리어율 (8쌍 × 10판)', [meanC, minC], `평균 ${pct(meanC)} · 최저 ${pct(minC)} (${pc.find(x => x.c === minC)?.p})`, '평균 80% 이상 · 어떤 쌍도 60% 미만 없음',
    meanC >= 0.8 && minC >= 0.6, nearR(meanC, 0.8) || nearR(minC, 0.6));
// A2 ignore clear (both battery pairs)
const ig = BAT.map(p => ({ p, c: rate(Bp(p, 'ignore')), n: Bp(p, 'ignore').length }));
row('A2', '무시 봇 클리어율 (세검+대검 · 사슬낫+방패)', ig.map(x => x.c), ig.map(x => `${x.p} ${pct(x.c)}`).join(' · '), '30~70%',
    ig.every(x => x.c !== null && x.c >= 0.3 && x.c <= 0.7), ig.some(x => nearR(x.c, 0.3) || nearR(x.c, 0.7)));
// A3 coop ÷ ignore clear time (battery pairs, cleared runs)
const tC = avg(won(B('coop')), r => r.t), tI = avg(won(B('ignore')), r => r.t), q = tC && tI ? tC / tI : null;
row('A3', '합 봇 ÷ 무시 봇 클리어 시간', q, q === null ? `합 ${tC && tC.toFixed(0)}초 · 무시 클리어 없음` : `${q.toFixed(3)} (합 ${tC.toFixed(0)}초 · 무시 ${tI.toFixed(0)}초)`, '0.65 이하',
    q !== null && q <= 0.65, q !== null && Math.abs(q - 0.65) <= 0.02);
// A4 the 12 finisher cells (status × shape) over the matrix
const fin2 = merge(matrix, 'fin2'), cells = ['lift', 'kneel', 'stagger', 'turn'].flatMap(s => ['single', 'multi', 'area'].map(sh => `${s}:${sh}`));
const cmin = Math.min(...cells.map(k => fin2[k] || 0));
row('A4', '마무리 12칸 사용 (8쌍 합계)', cmin, `최소 ${cmin}회 (${cells.filter(k => (fin2[k] || 0) === cmin).join(', ')}) · 전용 ${Object.keys(fin2).filter(k => k.startsWith('ex:')).map(k => k + ' ' + fin2[k]).join(' ') || '없음'}`, '칸마다 20회 이상',
    cmin >= 20, Math.abs(cmin - 20) <= 1);
// A6 shuttle / mark (1.5 rules) on the battery
const sh = rows => { const s = sumK(rows, r => r.stats.shuttle && r.stats.shuttle.start), k = sumK(rows, r => r.stats.shuttle && r.stats.shuttle.smash); return s ? k / s : null; };
const mk = rows => { const a = sumK(rows, r => r.stats.mark && r.stats.mark.atk), c = sumK(rows, r => r.stats.mark && r.stats.mark.cover); return a ? c / a : null; };
const s6 = { shC: sh(B('coop')), shM: sh(B('mixed')), shS: sh(B('spam')), mkC: mk(B('coop')), mkI: mk(B('ignore')) };
row('A6', '셔틀 · 표식 (1.5 기준)', s6, `셔틀 합 ${pct(s6.shC)} · 혼합 ${pct(s6.shM)} · 연타 ${pct(s6.shS)} / 표식 합 ${pct(s6.mkC)} · 무시 ${pct(s6.mkI)}`, '셔틀 합 70%↑ · 혼합 20%↓ · 연타 10%↓ · 표식 합 70%↑ · 무시 10%↓',
    s6.shC >= 0.7 && s6.shM <= 0.2 && s6.shS <= 0.1 && s6.mkC >= 0.7 && s6.mkI <= 0.1,
    nearR(s6.shC, 0.7) || nearR(s6.shM, 0.2) || nearR(s6.shS, 0.1) || nearR(s6.mkC, 0.7) || nearR(s6.mkI, 0.1));
// A7 bell beat block rate (right colour)
const bell = rows => { const m = merge(rows, 'bell'); return m.match ? m.block / m.match : null; };
const b7 = { c: bell(coopAll), i: bell(B('ignore')) };
row('A7', '맥놀이 막음률 (맞는 색이 막음)', b7, `합 ${pct(b7.c)} · 무시 ${pct(b7.i)}`, '합 70% 이상 · 무시 20% 이하', b7.c >= 0.7 && (b7.i === null || b7.i <= 0.2), nearR(b7.c, 0.7) || nearR(b7.i, 0.2));
// A8 dokkaebi link break (cover)
const lk = rows => { const m = merge(rows, 'dk'); return m.linkLift ? { r: m.linkBreak / m.linkLift, n: m.linkLift } : { r: null, n: 0 }; };
const l8 = { c: lk(coopAll), s: lk([...B('spam'), ...load('x_spam_dk')]) };   // (연타 봇은 보스 1에서 져서 도깨비까지 못 감 → 보스 4에서 시작한 20판을 더함)
row('A8', '도깨비 합 끊기 (커버 성공)', l8, `합 ${pct(l8.c.r)} (${l8.c.n}번) · 연타 ${pct(l8.s.r)} (${l8.s.n}번, 보스 4 시작 20판 포함)`, '합 60% 이상 · 연타 10% 이하',
    l8.c.r >= 0.6 && (l8.s.r === null || l8.s.r <= 0.1), nearR(l8.c.r, 0.6) || nearR(l8.s.r, 0.1));
// A9 twin strike simultaneous parry
const ul = rows => { const m = merge(rows, 'dk'); return m.ult ? { r: m.ultSync / m.ult, n: m.ult } : { r: null, n: 0 }; };
const u9 = ul(coopAll);
row('A9', '합동 필살 동시 패리', u9, `합 ${pct(u9.r)} (${u9.n}번)`, '합 50% 이상', u9.r >= 0.5, nearR(u9.r, 0.5));
// A12 coop time per boss (cleared bosses, matrix)
const bt = [0, 1, 2, 3].map(i => avg(matrix.filter(r => r.stats.bossT && r.stats.bossT[i] > 0), r => r.stats.bossT[i]));
row('A12', '합 봇 보스당 처치 시간', bt, bt.map((v, i) => `보스${i + 1} ${v ? (v / 60).toFixed(2) + '분' : '-'}`).join(' · '), '1.5~3분',
    bt.every(v => v && v >= 90 && v <= 180), bt.some(v => v && (Math.abs(v - 90) <= 2.7 || Math.abs(v - 180) <= 5.4)));
// A13 / A14 boss activity · global freeze (matrix)
const act = avg(matrix, r => (r.stats.t ? r.stats.bossActive / r.stats.t : 0)), frz = avg(matrix, r => (r.stats.t ? r.stats.freeze / r.stats.t : 0));
row('A13', '보스 활동 비중', act, pct(act), '55% 이상', act >= 0.55, nearR(act, 0.55));
row('A14', '2인 전체 정지 비중', frz, pct(frz), '4% 이하', frz <= 0.04, nearR(frz, 0.04));
// A15 replays · A16 console errors
let rep = null; try { const t = fs.readFileSync(path.join(DIR, 'replay.json'), 'utf8'); rep = JSON.parse(t.slice(t.indexOf('{'))); } catch (e) { rep = null; }
const same = rep ? rep.replay.filter(r => r.same).length : 0, tot = rep ? rep.replay.length : 0;
let CK = null; try { CK = JSON.parse(fs.readFileSync(path.join(HERE, 'results', 'check15.json'), 'utf8')); } catch (e) { CK = null; }
const ck = id => !!(CK && CK.rows.filter(r => r.id === id).length && CK.rows.filter(r => r.id === id).every(r => r.ok));
const ckNote = id => (CK && CK.rows.find(r => r.id === id) || {}).note || '-';
row('A15', '입력 기록 재생 2회 (보스 1~4 × 2인·태그 + QTE · 메뉴 열고 닫기)', [same, tot], `봇 재생 ${same}/${tot} 일치 · 메뉴 포함 ${ck('3U2') ? '일치' : 'X'} · QTE+메뉴 ${ck('3Q8') ? '일치' : 'X'}`, '전부 일치', rep && same === tot && tot >= 8 && ck('3U2') && ck('3Q8'), false);
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.jsonl'));
const errs = files.reduce((s, f) => s + load(f.slice(0, -6)).reduce((a, r) => a + (r.errors || 0) + (r.result === 'error' ? 1 : 0), 0), 0) + (rep ? rep.errors : 0);
row('A16', '콘솔 에러', errs, String(errs), '0', errs === 0, false);
// ---- 3단계 새 기준: QTE · 패드 · 2P 참가 · 화면 글자 · 키 표시 · 움직임 · 아트 · 드로우콜
const qte = rows => { const qs = rows.map(r => r.stats.qte).filter(Boolean), s = k => qs.reduce((a, q) => a + (q[k] || 0), 0); return { n: s('n'), perfect: s('perfect'), cells: s('cells'), ok: s('ok'), c: s('n') ? s('perfect') / s('n') : null, r: s('cells') ? s('ok') / s('cells') : null }; };
const qC = qte(coopAll), qS = qte([...B('spam'), ...load('x_spam_b2'), ...load('x_spam_dk')]), qT = qte(B('tag'));
row('Q1', 'QTE 완주율 (합 봇)', qC.c, `${pct(qC.c)} (${qC.perfect}/${qC.n})`, '50~85%', qC.c !== null && qC.c >= 0.5 && qC.c <= 0.85, nearR(qC.c, 0.5) || nearR(qC.c, 0.85));
row('Q2', 'QTE 칸 성공률 (합 봇)', qC.r, `${pct(qC.r)} (${qC.ok}/${qC.cells})`, '85% 이상', qC.r !== null && qC.r >= 0.85, nearR(qC.r, 0.85));
row('Q3', 'QTE 완주율 (연타 봇)', qS.c, `${pct(qS.c)} (${qS.perfect}/${qS.n}, 보스 2 · 4 시작 판 포함)`, '5% 이하', qS.c !== null && qS.c <= 0.05, nearR(qS.c, 0.05));
row('Q4', 'QTE 완주율 (태그 봇)', qT.c, `${pct(qT.c)} (${qT.perfect}/${qT.n})`, '40% 이상', qT.c !== null && qT.c >= 0.4, nearR(qT.c, 0.4));
row('P1', '가짜 패드 시나리오 (6-4)', ck('3P1') && ck('3P2'), `${ck('3P1') ? 'O' : 'X'} ${ckNote('3P1')} / ${ck('3P2') ? 'O' : 'X'} ${ckNote('3P2')}`, '전부 통과', ck('3P1') && ck('3P2'), false);
row('P2', '혼자일 때 2P 키 전부 눌러도 참가 0번 · 꾹 참가 · 메뉴 · F4', ck('3U3'), ckNote('3U3'), '전부 통과', ck('3U3'), false);
const all = files.flatMap(f => load(f.slice(0, -6))), us = all.map(r => r.stats.ui).filter(Boolean), uMax = us.length ? Math.max(...us.map(u => u.max)) : null;
row('U1', '화면 글자 동시 표시 (봇 판 전부, 매 프레임)', uMax, `최대 ${uMax} (${us.reduce((a, u) => a + u.frames, 0)}프레임)`, '3개 이하', uMax !== null && uMax <= 3, false);
row('U2', '싸우는 화면 기본 키 표시', ck('3U4'), ckNote('3U4'), '1P만', ck('3U4'), false);
let MO = null; try { MO = JSON.parse(fs.readFileSync(path.join(HERE, 'results', 's3', 'motion', 'motion.json'), 'utf8')); } catch (e) { MO = null; }
const apx = MO ? MO.new.apex.apexY / MO.old.apex.apexY : null, stand = MO ? MO.new.stand.standPct : null;
row('M1', '위로 뜨는 동작 최고 높이 · 화면 속 플레이어 키', [apx, stand], MO ? `최고 높이 ${MO.old.apex.apexY} → ${MO.new.apex.apexY} (×${apx.toFixed(2)}) · 서 있는 키 ${MO.old.stand.standPct}% → ${stand}%` : '-', '2배 이상 · 12% 이상', apx >= 2 && stand >= 12, false);
let ART = null; try { ART = JSON.parse(fs.readFileSync(path.join(HERE, 'results', 's3', 'art', 'gate.json'), 'utf8')); } catch (e) { ART = null; }
row('S1', '아트 차이 게이트 (색 거리 · 처음 보는 에이전트)', ART && ART.ok, ART ? ART.note : '-', '전부 통과', ART && ART.ok, false);
let SH = null; try { SH = JSON.parse(fs.readFileSync(path.join(HERE, 'results', 's3', 'art', 'shots.json'), 'utf8')); } catch (e) { SH = null; }
const calls = SH ? Math.max(...Object.values(SH).map(v => v.info.calls)) : null;
row('S2', '드로우콜 (보스 4체 장면 최대)', calls, SH ? Object.entries(SH).map(([k, v]) => `${k.split('_')[0]} ${v.info.calls}`).join(' · ') : '-', '600 이하', calls !== null && calls <= 600, false);

// extra tables for the report: pair matrix · finishers · relics · loadouts · per-boss results
const extra = {
  pairs: pc.map(x => ({ pair: x.p, runs: x.n, clear: x.c, time: x.t, violet: avg(M[x.p], r => (r.stats.wave && r.stats.wave.violet) || 0) })),
  fin2, relics: [...coopAll, ...B('ignore'), ...B('mixed'), ...B('tag')].reduce((o, r) => { for (const l of r.relics || []) for (const id of l) o[id] = (o[id] || 0) + 1; return o; }, {}),
  bell: { coop: merge(coopAll, 'bell'), ignore: merge(B('ignore'), 'bell') }, dk: { coop: merge(coopAll, 'dk'), spam: merge(B('spam'), 'dk') },
  battery: Object.fromEntries(BAT.flatMap(p => ['coop', 'ignore', 'spam', 'mixed', 'tag'].map(c => { const rs = Bp(p, c); return [`${p}:${c}`, { runs: rs.length, clear: rate(rs), time: avg(won(rs), r => r.t), reached: avg(rs, r => r.boss + 1) }]; }))),
  bossTimes: bt, starts: merge(matrix, 'startBy'), finSk: merge(matrix, 'finSk'), proj: merge(matrix, 'proj'),
  qte: { coop: qC, spam: qS, tag: qT, byBoss: (() => { const o = {}; for (const r of coopAll) for (const [b, v] of Object.entries((r.stats.qte && r.stats.qte.byBoss) || {})) { const x = o[b] || (o[b] = { n: 0, perfect: 0, cells: 0, ok: 0 }); for (const k of Object.keys(x)) x[k] += v[k] || 0; } return o; })(),
         perRun: avg(coopAll, r => (r.stats.qte && r.stats.qte.n) || 0) },
  ui: { hist: us.reduce((h, u) => h.map((v, i) => v + (u.hist[i] || 0)), [0, 0, 0, 0, 0, 0]) },
};
const pass = out.filter(r => r.ok).length;
fs.writeFileSync(path.join(DIR, 'accept.json'), JSON.stringify({ pass, total: out.length, rows: out, extra }, null, 1));
const md = [`# 3단계 합격 기준 — ${pass}/${out.length} 통과 (⚠ = 경계 ±3%p)`, '', '| # | 지표 | 결과 | 기준 | 통과 |', '| --- | --- | --- | --- | --- |',
  ...out.map(r => `| ${r.id} | ${r.what} | ${r.shown} | ${r.limit} | ${r.ok ? 'O' : 'X'}${r.near ? ' ⚠' : ''} |`)].join('\n');
fs.writeFileSync(path.join(DIR, 'accept.md'), md + '\n');
console.log(md);
