// @ts-check
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

for (const path of ['index.html', 'privacy.html', 'CNAME', 'robots.txt', 'sitemap.xml', 'js/core/app.js', 'data/mobile-stores.json', 'assets/css/main.css']) {
    assert.deepEqual(await readFile(`/publication/${path}`), await readFile(path), `Publication source differs: ${path}`);
}
for (const forbidden of ['mobile', 'tests', '.env', 'package.json', 'node_modules']) {
    await assert.rejects(access(`/publication/${forbidden}`), { code: 'ENOENT' });
}
console.info('Pages artifact contains the current game and excludes development inputs.');
