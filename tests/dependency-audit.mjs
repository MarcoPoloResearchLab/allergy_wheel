// @ts-check
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, cp, symlink, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import os from 'node:os';

const source = path.resolve('mobile');
const fixture = await mkdtemp(path.join(os.tmpdir(), 'allergy-audit-'));
const policyText = await readFile(path.join(source, 'config/dependency-audit.json'), 'utf8');
const policy = JSON.parse(policyText);
let boundary = 'known';
let requests = 0;
const server = createServer(async (request, response) => {
    requests++;
    for await (const chunk of request) { void chunk; }
    response.setHeader('content-type', 'application/json');
    if (boundary === 'malformed') return response.end('{');
    if (boundary === 'unavailable') { response.statusCode = 503; return response.end('{"error":"unavailable"}'); }
    if (request.url?.includes('/security/advisories/bulk')) {
        if (boundary === 'empty') return response.end('{}');
        const name = ['unknown', 'critical'].includes(boundary) ? 'expo' : 'node-forge';
        return response.end(JSON.stringify({ [name]: [{ id: 1240912,
            url: `https://github.com/advisories/${name === 'expo' ? 'GHSA-xxxx-yyyy-zzzz' : policy.remediations[0].advisory}`,
            title: 'Controlled dependency advisory', severity: boundary === 'critical' ? 'critical' : 'high',
            vulnerable_versions: '*', cwe: [], cvss: { score: 8.7, vectorString: null },
        }] }));
    }
    const name = decodeURIComponent(request.url?.slice(1) ?? '');
    const version = name === 'expo' ? '57.0.31' : '1.4.0';
    response.end(JSON.stringify({ name, 'dist-tags': { latest: version }, versions: { [version]: { name, version } } }));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
assert.ok(address && typeof address !== 'string');
let sequence = 0;
async function run(label, accepted, diagnostic) {
    const before = requests;
    const child = spawn(process.execPath, ['scripts/audit-dependencies.mjs'], { cwd: fixture,
        env: { ...process.env, npm_config_registry: `http://127.0.0.1:${address.port}`,
            npm_config_cache: path.join(fixture, `cache-${sequence++}`), npm_config_fetch_retries: '0', npm_config_fetch_timeout: '10000' },
        stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
    const status = await new Promise((done, reject) => { child.once('error', reject); child.once('close', done); });
    assert.equal(status === 0, accepted, `${label}: ${output}`);
    if (diagnostic) assert.match(output, diagnostic, label);
    if (accepted) assert.ok(requests > before, 'Real npm must contact the controlled registry');
    console.log(`dependency_audit.ok: ${label}`);
}
try {
    for (const name of ['scripts', 'config', 'vendor', 'package.json', 'package-lock.json']) {
        await cp(path.join(source, name), path.join(fixture, name), { recursive: true });
    }
    await mkdir(path.join(fixture, 'node_modules'));
    for (const name of await readdir(path.join(source, 'node_modules'))) {
        if (name !== 'node-forge') await symlink(path.join(source, 'node_modules', name), path.join(fixture, 'node_modules', name));
    }
    const installed = path.join(fixture, 'node_modules/node-forge');
    await symlink(path.join(fixture, 'vendor/node-forge'), installed);
    await run('known advisory with real local correction', true, /behavior-qualified/);
    boundary = 'empty';
    await run('empty feed retains known-advisory behavior qualification', true, /1 behavior-qualified local corrections with absent advisories/);
    for (const mode of ['unknown', 'critical', 'malformed', 'unavailable']) { boundary = mode; await run(`registry ${mode}`, false); }
    const config = path.join(fixture, 'config/dependency-audit.json');
    boundary = 'empty';
    for (const [label, mutate] of [
        ['missing known advisory', value => { value.remediations = []; }],
        ['expired review', value => { value.review_after = '2000-01-01'; }],
        ['unknown policy shape', value => { value.extra = true; }],
        ['missing installation', value => { value.remediations[0].installations = []; }],
        ['unselected path', value => { value.remediations[0].installations = ['../node-forge']; }],
        ['invalid provenance', value => { value.remediations[0].upstream.pull_request = 'invalid'; }],
    ]) {
        const value = JSON.parse(policyText); mutate(value); await writeFile(config, JSON.stringify(value)); await run(label, false);
    }
    await writeFile(config, policyText);
    const provenancePath = path.join(fixture, 'vendor/node-forge/PROVENANCE.json');
    const provenanceText = await readFile(provenancePath, 'utf8');
    await writeFile(provenancePath, JSON.stringify({ ...JSON.parse(provenanceText), review_after: '2099-01-01' }));
    await run('provenance review drift', false, /provenance differs/);
    await writeFile(provenancePath, provenanceText);
    const patchPath = path.join(fixture, policy.remediations[0].patch);
    const patchText = await readFile(patchPath, 'utf8');
    await writeFile(patchPath, patchText + '\n');
    await run('patch formatting is not readiness authority', true);
    await rm(patchPath);
    await run('required correction provenance patch missing', false, /ENOENT/);
    await writeFile(patchPath, patchText);
    const rsa = path.join(installed, 'lib/rsa.js');
    const original = await readFile(rsa, 'utf8');
    await writeFile(rsa, original + '\n// Harmless source formatting.\n');
    await run('formatting does not invalidate a qualified correction', true);
    await writeFile(rsa, original);
    const metadataPath = path.join(installed, 'package.json');
    const metadata = await readFile(metadataPath, 'utf8');
    await writeFile(metadataPath, JSON.stringify({ ...JSON.parse(metadata), version: '0.0.0' }));
    await run('installed version drift', false, /installed version differs/);
    await writeFile(metadataPath, metadata);
    const concealed = path.join(fixture, 'node_modules/concealed/node_modules');
    await mkdir(concealed, { recursive: true });
    await symlink(path.join(fixture, 'absent-package'), path.join(concealed, '0-dangling'));
    await cp(installed, path.join(concealed, 'node-forge'), { recursive: true, dereference: true });
    await run('dangling nested link cannot hide a later Forge copy', false, /ENOENT/);
    await rm(path.join(fixture, 'node_modules/concealed'), { recursive: true });
    const linkedParent = path.join(fixture, 'linked-parent');
    const linkedCopy = path.join(linkedParent, 'node_modules/node-forge');
    await mkdir(path.dirname(linkedCopy), { recursive: true });
    await cp(installed, linkedCopy, { recursive: true, dereference: true });
    await symlink(linkedParent, path.join(fixture, 'node_modules/linked-parent'));
    await run('linked parent cannot conceal an unselected installed copy', false, /installed copies differ/);
    const linkedLocation = 'node_modules/linked-parent/node_modules/node-forge';
    const linkedPolicy = JSON.parse(policyText); linkedPolicy.remediations[0].installations.push(linkedLocation);
    await writeFile(config, JSON.stringify(linkedPolicy));
    const linkedLockPath = path.join(fixture, 'package-lock.json');
    const originalLock = await readFile(linkedLockPath, 'utf8');
    const linkedLock = JSON.parse(originalLock); linkedLock.packages[linkedLocation] = { version: '1.4.0' };
    await writeFile(linkedLockPath, JSON.stringify(linkedLock));
    await run('selected copy below linked parent is qualified', true);
    await writeFile(path.join(linkedCopy, 'lib/index.js'), 'module.exports = {};\n');
    await run('broken selected linked-parent copy is rejected', false, /behavior failed/);
    await rm(linkedCopy, { recursive: true });
    await cp(installed, linkedCopy, { recursive: true, dereference: true });
    await symlink(linkedParent, path.join(linkedParent, 'node_modules/cycle'));
    await run('cyclic linked topology is rejected', false, /Cyclic linked dependency directory/);
    await writeFile(config, policyText); await writeFile(linkedLockPath, originalLock);
    await rm(path.join(fixture, 'node_modules/linked-parent'));
    await rm(linkedParent, { recursive: true });
    const nestedLocation = 'node_modules/extra/node_modules/node-forge';
    const nested = path.join(fixture, nestedLocation);
    await mkdir(path.dirname(nested), { recursive: true });
    await cp(installed, nested, { recursive: true, dereference: true });
    await run('unselected installed copy', false, /installed copies differ/);
    const selected = JSON.parse(policyText); selected.remediations[0].installations.push(nestedLocation);
    await writeFile(config, JSON.stringify(selected));
    const lockPath = path.join(fixture, 'package-lock.json');
    const lock = JSON.parse(await readFile(lockPath, 'utf8'));
    lock.packages[nestedLocation] = { version: '1.4.0' }; await writeFile(lockPath, JSON.stringify(lock));
    await run('selected nested copy', true);
    const nestedMetadata = path.join(nested, 'package.json');
    await writeFile(nestedMetadata, JSON.stringify({ ...JSON.parse(metadata), main: '../../../node-forge/lib/index.js' }));
    await run('nested entry cannot resolve to a qualified root copy', false, /entry must belong to the selected installation/);
    await writeFile(nestedMetadata, metadata);
    await writeFile(path.join(nested, 'lib/index.js'), "module.exports = {};\n");
    for (const mode of ['known', 'empty']) { boundary = mode; await run(`${mode} feed rejects broken nested behavior`, false, /behavior failed/); }
} finally {
    await new Promise(done => server.close(done)); await rm(fixture, { recursive: true, force: true });
}
