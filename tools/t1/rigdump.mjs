// 4단계 T1: 판정용 숨은 리그에서 '판정 · 동작 호환 데이터'만 뽑는다 (동작 이름 · 길이 · 판정/이벤트 프레임 · 이동 · 뼈 이름 · 판정 크기)
// 보이는 자세 값(관절 각도)은 뽑지 않는다 (앵커링 금지 2번).
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(HERE, '..', '..', 'index.html'), 'utf8');
const a = html.indexOf('<script type="module">'), b = html.indexOf('</script>', a);
let src = html.slice(a + '<script type="module">'.length, b).replace("import * as THREE from 'three';", "import * as THREE from './shim.mjs';");
const dir = path.join(HERE, '..', '.cache'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'shim.mjs'), `export * from 'three';
export class WebGLRenderer { constructor(){this.autoClear=true;this.info={render:{calls:0}};this.capabilities={isWebGL2:true};}
setPixelRatio(){} setSize(){} setRenderTarget(){} setClearColor(){} render(){} clear(){} compile(){} readRenderTargetPixels(){} getContext(){return {};} }\n`);
fs.writeFileSync(path.join(dir, 'dump.mjs'), src);
const noop = () => {}, ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
const el = () => ({ style: {}, width: 0, height: 0, getContext: () => ctx2d, remove: noop, textContent: '' });
const els = { game: el(), hud: el(), boot: el() };
globalThis.window = globalThis; globalThis.document = { getElementById: id => els[id] || el() };
globalThis.addEventListener = noop; globalThis.innerWidth = 1920; globalThis.innerHeight = 1080; globalThis.devicePixelRatio = 1; globalThis.requestAnimationFrame = noop;
await import(pathToFileURL(path.join(dir, 'dump.mjs')).href);
const P = globalThis.PIPE;
const out = { rigs: {} };
const clipInfo = ch => Object.fromEntries(Object.values(ch.clips).map(c => [c.name, { frames: c.frames, loop: !!c.loop, events: (c.events || []).map(e => ({ f: e.f, type: e.type || e.ev || e.name || Object.keys(e).filter(k => k !== 'f').join('/') })), smears: (c.smears || []).map(s => s.f), root: !!c.root }]));
const nodes = r => { const n = []; r.traverse(o => { if (o.name) n.push(o.name); }); return n; };
for (const f of P.fighters) {
  for (const id of ['rapier', 'great']) {
    P.assignChar(f, id);
    const ch = f.ch; ch.root.updateMatrixWorld(true);
    out.rigs[id] = out.rigs[id] || { clips: clipInfo(ch), remap: ch.remap || null, joints: Object.keys(ch.joints), named: nodes(ch.root), radius: ch.radius, focus: ch.focus };
  }
  break;
}
const B = P.bossNow;
out.rigs.boss = { clips: clipInfo(B), joints: Object.keys(B.joints), named: nodes(B.root), radius: B.radius, focus: B.focus, scale: B.root.scale.x };
out.SLAM_AT = P.SLAM_AT; out.SHOT_AT = P.SHOT_AT;
out.BOSS2 = P.BOSSES[1]; out.START_CHARS = P.START_CHARS; out.CHARS = { rapier: P.CHARS.rapier, great: P.CHARS.great };
out.FEEL_keys = Object.keys(P.FEEL);
fs.writeFileSync(path.join(HERE, 'rigdump.json'), JSON.stringify(out, null, 1));
console.log('ok', Object.keys(out.rigs).map(k => k + ':' + Object.keys(out.rigs[k].clips).length));
process.exit(0);
