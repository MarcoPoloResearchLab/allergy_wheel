// @ts-check
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { chromium } from 'playwright';

const output = resolve(process.argv[2] ?? 'artifacts/store-artwork');
const wheel = await readFile('assets/icons/spinning-wheel.svg', 'utf8');
const listing = JSON.parse(await readFile('mobile/store/listing.json', 'utf8'));
const escapeText = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
    for (const [name, width, height, content] of [
        ['icon.png', 1024, 1024, `<div class="icon">${wheel}</div>`],
        ['google-icon.png', 512, 512, `<div class="icon">${wheel}</div>`],
        ['google-feature.png', 1024, 500, `<div class="feature"><div class="wheel">${wheel}</div><h1>${escapeText(listing.name)}</h1></div>`]
    ]) {
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
        await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:#fff5e9}body{color:#182657;font-family:Arial,sans-serif}.icon{width:76%;height:76%;position:absolute;inset:12%}.icon svg,.wheel svg{width:100%;height:100%}.feature{height:100%;display:flex;align-items:center;gap:52px;padding:0 64px}.wheel{width:330px;flex-shrink:0}h1{font-size:92px;line-height:1.03;letter-spacing:-4px;margin:0;font-weight:900}</style>${content}`);
        await page.screenshot({ path: join(output, name), type: 'png' });
        await page.close();
    }
} finally {
    await browser.close();
}
console.info('Prepared native icon and Google Play graphics from the game wheel.');
