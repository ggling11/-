// [알파] 전후 비교판: node compare.mjs 전.png 후.png 출력.png
import fs from 'fs';
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const [a, b, o] = process.argv.slice(2);
const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1280, height: 380 } });
const u = f => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
await p.setContent(`<body style="margin:0;display:flex;gap:4px;background:#000;color:#fff;font:14px sans-serif"><figure style="margin:0"><img src="${u(a)}" style="width:636px"><figcaption>전</figcaption></figure><figure style="margin:0"><img src="${u(b)}" style="width:636px"><figcaption>후</figcaption></figure></body>`);
await p.screenshot({ path: o }); await br.close();
