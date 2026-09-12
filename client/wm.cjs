const { chromium } = require('playwright');
const fs = require('fs');
const env = fs.readFileSync('../server/.env', 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1].trim().replace(/^["']|["']$/g, '');
const API = 'http://localhost:5000/api/v1', APP = 'http://localhost:5173';
const OUT = 'C:/Users/Noman/AppData/Local/Temp/claude/c--Projects-AnweLab/09ed5823-5c66-4c19-a618-8f7cd6625ff5/scratchpad/';
const j = async (r) => { try { return await r.json(); } catch { return {}; } };
(async () => {
  for (let i = 0; i < 60; i++) { try { await fetch(APP); await fetch(API.replace('/api/v1','')); break; } catch { await new Promise(r => setTimeout(r, 2000)); } }
  const login = await j(await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: get('ADMIN_EMAIL'), password: get('ADMIN_PASSWORD') }) }));
  const list = await j(await fetch(`${API}/invoices?limit=50`, { headers: { Authorization: login.data.accessToken } }));
  const sorted = (list.data || []).filter(r => !r.isCancelled).sort((a, b) => b.items.length - a.items.length);
  const targets = [['big', sorted[0]], ['small', sorted[sorted.length - 1]]];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${APP}/login`, { waitUntil: 'networkidle' });
  await p.fill('input[type=email]', get('ADMIN_EMAIL')); await p.fill('input[type=password]', get('ADMIN_PASSWORD'));
  await p.click('button[type=submit]'); await p.waitForURL(u => !u.pathname.includes('login'));
  for (const [label, row] of targets) {
    await p.goto(`${APP}/billing/${row._id}/print`, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
    await p.emulateMedia({ media: 'print' });
    const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
    fs.writeFileSync(OUT + `wm-${label}.pdf`, pdf);
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;
    const box = (pdf.toString('latin1').match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)/) || []);
    const mm = box[1] ? `${Math.round(box[1]/72*25.4)}x${Math.round(box[2]/72*25.4)}mm` : '?';
    console.log(`${label.padEnd(11)} ${row.invoiceNumber} tests=${row.items.length} copies=${await p.locator('section.copy').count()} pages=${pages} paper=${mm} errors=${errs.length}`);
    await p.emulateMedia({ media: 'screen' });
  }
  await b.close();
})();
