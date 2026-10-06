// [알파] 검수용 확대: node crop.mjs 입력.png 출력.png x y w h [배율]
import fs from 'fs';
const [, , inp, outp, x, y, w, h, sc = 2] = process.argv;
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: Math.round(w * sc), height: Math.round(h * sc) } });
await p.setContent(`<body style="margin:0;overflow:hidden"><img src="data:image/png;base64,${fs.readFileSync(inp).toString('base64')}" style="position:absolute;left:${-x * sc}px;top:${-y * sc}px;transform-origin:0 0;transform:scale(${sc});image-rendering:pixelated"></body>`);
await p.screenshot({ path: outp }); await b.close();
