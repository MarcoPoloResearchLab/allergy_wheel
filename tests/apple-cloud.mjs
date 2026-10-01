// @ts-check
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const manifest = readFileSync('.mprlab/deploy/resources.yml', 'utf8');
const match = /build:\s*\n\s+android: [^\n]+\n\s+ios: ([^\n]+)/.exec(manifest);
assert.ok(match, 'The selected mobile resource must declare its Apple adapter.');
const adapter = resolve(match[1].trim());
const fixture = mkdtempSync(resolve(tmpdir(), 'allergy-cloud-'));
try {
    writeFileSync(resolve(fixture, 'apple-cloud-operation'), `
    printf '%s\\0' "$@"
    printf 'cloud provider diagnostic\\n' >&2
    exit 17
  `);
    const args = ['--config', resolve('.mprlab/apple-build.json'), '--target', 'ios', '--source-commit', 'b'.repeat(40), '--git-ref', 'refs/heads/master', '--version', '1.2.3', '--output', resolve(fixture, 'output'), '--plan'];
    const result = spawnSync("/bin/sh", [adapter, ...args], {
        cwd: fixture, env: { ...process.env, PATH: "", MPRLAB_GATEWAY_EXECUTABLE: "/bin/sh" }, encoding: 'utf8'
    });
    assert.equal(result.status, 17, result.stderr);
    assert.deepEqual(result.stdout.split("\0").slice(0, -1), args);
    assert.match(result.stderr, /cloud provider diagnostic/);
    console.info('The selected Apple adapter forwards the cloud request and provider result.');
} finally {
    rmSync(fixture, { recursive: true, force: true });
}
