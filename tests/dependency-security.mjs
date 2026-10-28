// @ts-check
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Use both actual installers. The native SDK intentionally disables install scripts.
for (const flags of [[], ['--include=dev', '--ignore-scripts']]) {
    const fixture = mkdtempSync(join(tmpdir(), 'allergy-forge-install-'));
    try {
        for (const name of ['package.json', 'package-lock.json', 'vendor', 'scripts', 'config']) {
            cpSync(resolve('mobile', name), join(fixture, name), { recursive: true });
        }
        const installed = spawnSync('npm', ['ci', ...flags], {
            cwd: fixture, env: { ...process.env, CI: '1', EXPO_NO_DOTENV: '1' },
            stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
        });
        assert.equal(installed.status, 0, installed.stdout + installed.stderr);
        const verified = spawnSync(process.execPath, ['scripts/dependency-security-probes.mjs'], {
            cwd: fixture, input: '', encoding: 'utf8',
        });
        assert.equal(verified.status, 0, verified.stdout + verified.stderr);
        assert.match(verified.stdout, /mobile_node_forge_security.ok/);
        assert.match(verified.stdout, /mobile_deepmerge_security.ok/);
        console.log(`dependency_install.ok: npm ci ${flags.join(' ')}`);
    } finally { rmSync(fixture, { recursive: true, force: true }); }
}
