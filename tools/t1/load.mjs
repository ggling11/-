// 4단계 T1 도구 공용: index.html 게임 스크립트를 Node에서 모듈로 불러 PIPE를 돌려준다 (sim.mjs와 같은 방식 · WebGLRenderer만 빈 클래스)
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export async function loadGame(file = path.join(HERE, '..', '..', 'index.html'), tag = 'g') {
  const html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf('<script type="module">'), b = html.indexOf('</script>', a);
  const src = html.slice(a + '<script type="module">'.length, b).replace("import * as THREE from 'three';", "import * as THREE from './shim.mjs';");
  const dir = path.join(HERE, '..', '.cache'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'shim.mjs'), `export * from 'three';
export class WebGLRenderer { constructor(){this.autoClear=true;this.outputColorSpace='';this.info={render:{calls:0}};this.capabilities={isWebGL2:true};}
setPixelRatio(){} setSize(){} setRenderTarget(){} setClearColor(){} render(){} clear(){} compile(){} readRenderTargetPixels(){} getContext(){return {};} }\n`);
  const out = path.join(dir, `t1_${tag}.mjs`); fs.writeFileSync(out, src);
  const noop = () => {}, ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => { o[k] = v; return true; } });
  const el = () => ({ style: {}, width: 0, height: 0, getContext: () => ctx2d, remove: noop, textContent: '' });
  const els = { game: el(), hud: el(), boot: el() };
  globalThis.window = globalThis; globalThis.document = { getElementById: id => els[id] || el(), createElement: () => el() };
  globalThis.addEventListener = noop; globalThis.innerWidth = 1920; globalThis.innerHeight = 1080; globalThis.devicePixelRatio = 1; globalThis.requestAnimationFrame = noop;
  globalThis.__errors = [];
  const ce = console.error.bind(console); console.error = (...x) => { globalThis.__errors.push(x.map(String).join(' ')); ce(...x); };
  await import(pathToFileURL(out).href);
  return globalThis.PIPE;
}
