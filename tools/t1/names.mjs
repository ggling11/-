import { loadGame } from './load.mjs';
const P = await loadGame();
const out = new Set();
for (const k in P.SKILLS2) out.add(P.SKILLS2[k].name);
const walk = (o, d = 0) => { if (!o || d > 4) return; if (typeof o === 'object') for (const k in o) { if (k === 'name' && typeof o[k] === 'string') out.add(o[k]); else walk(o[k], d + 1); } };
walk(P.FIN2); walk(P.FIN); walk(P.QTE.bosses); walk(P.BOSSES);
console.log(JSON.stringify([...out])); process.exit(0);
