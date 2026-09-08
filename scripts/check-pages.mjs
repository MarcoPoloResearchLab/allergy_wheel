// @ts-check
import assert from 'node:assert/strict';
import { parse } from 'yaml';
import { readFile, lstat } from 'node:fs/promises';

// Match the gateway repository contract at the selected manifest boundary.
const manifest = parse(await readFile('.mprlab/deploy/resources.yml', 'utf8'));
const websites = manifest.mprlab_resources.resources.filter((resource) => resource.kind === 'github_pages');
assert.equal(websites.length, 1, 'The game must declare one Pages resource.');
const website = websites[0];
assert.match(website.repository, /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/, 'Pages repository must use a canonical lowercase owner/repository identifier.');
assert.equal(website.branch, 'gh-pages');
assert.equal(website.domain, (await readFile('CNAME', 'utf8')).trim(), 'Pages domain differs from the source CNAME.');
assert.equal(website.url, `https://${website.domain}/`);
console.info('Pages manifest passed canonical repository, publication branch, and domain checks.');

for (const path of ['index.html', 'privacy.html', 'robots.txt', 'sitemap.xml', 'js/core/app.js', 'data/mobile-stores.json', 'assets/css/main.css']) {
    assert.deepEqual(await readFile(`/publication/${path}`), await readFile(path), `Publication source differs: ${path}`);
}
for (const forbidden of ['.git', '.nojekyll', 'CNAME', website.verification.path.slice(1), 'mobile', 'tests', '.mprlab', '.env', 'package.json', 'node_modules']) {
    await assert.rejects(lstat(`/publication/${forbidden}`), { code: 'ENOENT' }, `Publication artifact must exclude ${forbidden}.`);
}
console.info('Pages artifact contains the current game and excludes development inputs.');
