// @ts-check
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'allergy-lifecycle-'));
try {
    const application = join(directory, 'application');
    await mkdir(application);
    const makefile = join(application, 'Makefile');
    await copyFile('Makefile', makefile);
    for (const target of ['release', 'publish', 'deploy']) {
        const result = spawnSync('make', ['--no-print-directory', '--file', makefile, target,
            'MPRLAB_GATEWAY_EXECUTABLE=/bin/echo'], { cwd: directory, encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.trim(), `${target} --app-root ${resolve(application)}`,
            `${target} must use the current Gateway command and the selected Makefile root.`);
        const failure = spawnSync('make', ['--no-print-directory', '--file', makefile, target,
            'MPRLAB_GATEWAY_EXECUTABLE=/bin/false'], { cwd: directory, encoding: 'utf8' });
        assert.notEqual(failure.status, 0, `${target} must report a Gateway failure.`);
    }
    console.info('Lifecycle targets passed command names, explicit application roots, executable override, and failure reporting.');
} finally {
    await rm(directory, { recursive: true, force: true });
}
