// @ts-check
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const directory = await mkdtemp(join(tmpdir(), 'allergy-release-'));
const adapter = join(directory, 'scripts/build-store-artifact.mjs');
try {
    await mkdir(join(directory, 'scripts'));
    for (const file of ['build-store-artifact.mjs', 'repository-signing-file.mjs', 'native-build-process.mjs']) {
        await copyFile(resolve('scripts', file), join(directory, 'scripts', file));
    }
    await mkdir(join(directory, 'configs/signing'), { recursive: true });
    await writeFile(join(directory, 'configs/signing/android.p12'), 'fixture private keystore');
    const mobile = join(directory, 'mobile');
    await mkdir(mobile);
    await writeFile(join(mobile, 'app.json'), await readFile('mobile/app.json'));
    // The subprocess boundary represents the gateway; the application request stays real.
    await writeFile(join(mobile, 'mobile-build-operation'), `let body='';process.stdin.on('data',data=>body+=data);process.stdin.on('end',()=>{process.stdout.write(body);process.exit(Number(process.env.TEST_GATEWAY_EXIT||0));});`);
    const timestamp = '2026-09-07T20:00:00Z';
    const environment = { ...process.env, MPRLAB_GATEWAY_EXECUTABLE: process.execPath, MPRLAB_ARTIFACT_VERSION: 'v1.2.3', ALLERGY_WHEEL_ANDROID_KEYSTORE: join(directory, 'configs/signing/android.p12') };
    for (const [platform, extension] of [['android', 'aab']]) {
        const output = join(directory, `${platform}.${extension}`);
        const args = [adapter, '--mobile-dir', mobile, '--output', output, '--release-timestamp', timestamp];
        const run = spawnSync(process.execPath, args, { env: environment, encoding: 'utf8' });
        assert.equal(run.status, 0, run.stderr);
        const request = JSON.parse(run.stdout);
        assert.equal(request.application_identifier, 'com.mprlab.allergywheel');
        assert.equal(request.version, '1.2.3');
        assert.equal(request.build_number, String(Date.parse(timestamp) / 1000));
        assert.equal(request.source_root, mobile);
        assert.equal(request.output, output);
        assert.equal(request.preparation_manifest, 'native-preparation.json');
        assert.equal(request.verify_script, 'scripts/verify-native-release.mjs');
        const retry = spawnSync(process.execPath, args, { env: environment, encoding: 'utf8' });
        assert.equal(retry.stdout, run.stdout, 'An exact retry must retain the build identity');
        const failure = spawnSync(process.execPath, args, { env: { ...environment, TEST_GATEWAY_EXIT: '47' }, encoding: 'utf8' });
        assert.equal(failure.status, 47, 'Preserve the gateway failure status');
        const missingVersion = spawnSync(process.execPath, args, { env: { ...environment, MPRLAB_ARTIFACT_VERSION: '' }, encoding: 'utf8' });
        assert.notEqual(missingVersion.status, 0, 'Do not use the development version for a release');
    }
    console.info('The Android release adapter retains build identity and provider status.');
} finally {
    await rm(directory, { recursive: true, force: true });
}
