// @ts-check
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

if (process.argv[2] === '--captured-adapter') {
    for (const platform of ['android', 'ios']) await testCapturedAdapter(platform);
}
else await testMakeEntrypoints();

async function testMakeEntrypoints() {
const fixtureRoot = await mkdtemp(join(tmpdir(), 'allergy-release-entrypoint-'));
try {
    const applicationRoot = join(fixtureRoot, 'application with spaces');
    const receiptPath = join(fixtureRoot, 'gateway.json');
    await mkdir(join(applicationRoot, 'configs'), { recursive: true });
    await copyFile(resolve('Makefile'), join(applicationRoot, 'Makefile'));
    const initialized = spawnSync('git', ['init', '--quiet', applicationRoot], { encoding: 'utf8' });
    assert.equal(initialized.status, 0, initialized.stderr);
    // This file must never execute. The selected manifest owns private inputs.
    await writeFile(join(applicationRoot, 'configs/.env.allergy-wheel'), 'exit 79\n');
    for (const target of ['release', 'publish', 'deploy']) {
        await writeFile(join(applicationRoot, `app-${target}`), `
const fs = require('node:fs');
fs.writeFileSync(process.env.TEST_GATEWAY_RECEIPT, JSON.stringify({
    args: process.argv.slice(1), ci: process.env.CI,
    signing: process.env.ALLERGY_WHEEL_ANDROID_KEYSTORE,
    git: Object.fromEntries(Object.entries(process.env).filter(([name]) => name.startsWith('GIT_CONFIG_'))),
    stdin: fs.readFileSync(0, 'utf8')
}));
process.exit(Number(process.env.TEST_GATEWAY_EXIT || 0));
`);
        const result = spawnSync('make', ['--no-print-directory', target], {
            cwd: applicationRoot, input: 'operator input must not reach Gateway', encoding: 'utf8',
            env: { ...process.env, MPRLAB_GATEWAY_EXECUTABLE: process.execPath,
                TEST_GATEWAY_RECEIPT: receiptPath, ALLERGY_WHEEL_ANDROID_KEYSTORE: 'ambient input',
                GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'fixture.key', GIT_CONFIG_VALUE_0: 'operator value' }
        });
        assert.equal(result.status, 0, result.stderr);
        const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
        assert.deepEqual(receipt.args, [join(applicationRoot, `app-${target}`), '--app-root', applicationRoot]);
        assert.equal(receipt.ci, '1');
        assert.equal(receipt.stdin, '');
        assert.equal(receipt.signing, 'ambient input');
        assert.deepEqual(receipt.git, { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'fixture.key', GIT_CONFIG_VALUE_0: 'operator value' });
        const failed = spawnSync('make', ['--no-print-directory', target], {
            cwd: applicationRoot, encoding: 'utf8',
            env: { ...process.env, MPRLAB_GATEWAY_EXECUTABLE: process.execPath,
                TEST_GATEWAY_RECEIPT: receiptPath, TEST_GATEWAY_EXIT: '47' }
        });
        assert.notEqual(failed.status, 0);
        assert.match(failed.stderr, /Error 47/);
    }
    console.info('Lifecycle Make commands use the installed Gateway and preserve its input authority.');
} finally {
    await rm(fixtureRoot, { recursive: true, force: true });
}

}

/** Qualify the actual adapter with the installed runtime and a real input capture. */
async function testCapturedAdapter(platform) {
    const root = await mkdtemp(join(tmpdir(), 'allergy-captured-adapter-'));
    try {
        const gateway = process.env.MPRLAB_GATEWAY_EXECUTABLE;
        assert.ok(gateway, 'Select the physical installed Gateway executable.');
        await mkdir(join(root, '.mprlab/deploy'), { recursive: true });
        await mkdir(join(root, 'configs/signing'), { recursive: true });
        await mkdir(join(root, 'scripts'));
        for (const name of ['build-store-artifact.mjs', 'repository-signing-file.mjs', 'native-build-process.mjs']) {
            await copyFile(resolve('scripts', name), join(root, 'scripts', name));
        }
        await mkdir(join(root, 'mobile'));
        await copyFile(resolve('mobile/app.json'), join(root, 'mobile/app.json'));
        for (const name of ['package.json', 'package-lock.json', 'scripts/verify-native-release.mjs', 'android/gradlew', 'android/app/build.gradle',
            'ios/Podfile', 'ios/Podfile.lock', 'index.js', 'ios/AllergyWheel.xcworkspace/contents.xcworkspacedata']) {
            const path = join(root, 'mobile', name);
            await mkdir(resolve(path, '..'), { recursive: true });
            await writeFile(path, name.endsWith('.json') ? '{"type":"module"}\n' : 'native request decoder fixture');
        }
        const selected = join(root, '.mprlab/deploy/.env');
        const signing = join(root, 'configs/signing/selected.keystore');
        await writeFile(signing, 'synthetic signing boundary');
        const names = ['ALLERGY_WHEEL_ANDROID_KEYSTORE', 'ALLERGY_WHEEL_ANDROID_KEY_ALIAS',
            'ALLERGY_WHEEL_ANDROID_KEY_PASSWORD', 'ALLERGY_WHEEL_ANDROID_STORE_PASSWORD',
            'ALLERGY_WHEEL_APPLE_TEAM', 'ALLERGY_WHEEL_APPLE_PROFILE', 'ALLERGY_WHEEL_APPLE_IDENTITY',
            'ALLERGY_WHEEL_APPLE_CERTIFICATE', 'ALLERGY_WHEEL_APPLE_CERTIFICATE_PASSWORD',
            'APP_STORE_CONNECT_API_KEY_ID', 'APP_STORE_CONNECT_API_ISSUER_ID', 'APP_STORE_CONNECT_API_KEY_PATH'];
        await writeFile(selected, names.map(name => `${name}=${name === 'ALLERGY_WHEEL_ANDROID_KEYSTORE' ? signing : 'synthetic-input'}\n`).join(''));
        await writeFile(join(root, '.mprlab/deploy/resources.yml'), `mprlab_resources:
  owner: allergy-capture-fixture
  environment_file: .mprlab/deploy/.env
  inputs:
${names.map(name => `    ${name}: ${'${'}${name}}\n`).join('')}  ci:
    enabled: false
  release:
    scheme: semver
  defaults:
    timeouts:
      startup: 30s
      completion: 1m
      readiness: 30s
      request: 30s
      shutdown: 30s
  resources:
    private:
      kind: private_values
      bindings:
        signing: ALLERGY_WHEEL_ANDROID_KEYSTORE
`);
        const runner = join(root, 'run.mjs');
        await writeFile(runner, `
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
writeFileSync(${JSON.stringify(selected)}, 'ALLERGY_WHEEL_ANDROID_KEYSTORE=changed-file-value\\n');
const result = spawnSync(process.execPath, [${JSON.stringify(join(root, 'scripts/build-store-artifact.mjs'))},
    '--mobile-dir', ${JSON.stringify(join(root, 'mobile'))}, '--output', ${JSON.stringify(join(root, platform === 'android' ? 'android.aab' : 'ios.ipa'))},
    '--release-timestamp', '2026-09-07T20:00:00Z'], {
    env: { ...process.env, ALLERGY_WHEEL_ANDROID_KEYSTORE: '/changed-process-value',
        MPRLAB_ARTIFACT_VERSION: 'v1.2.3', MPRLAB_MOBILE_BUILD_INTENT: 'invalid-relative-intent',
        MPRLAB_APPLICATION_LIFECYCLE_LOCK: 'exclusive', MPRLAB_LIFECYCLE_OPERATION: 'release' },
    input: '', encoding: 'utf8'
});
process.stdout.write(result.stdout); process.stderr.write(result.stderr); process.exit(result.status ?? 1);
`);
        const result = spawnSync(gateway, ['bootstrap-run', '--repo-root', root, '--operation', 'app-release', '--', process.execPath, runner], {
            cwd: root, input: '', encoding: 'utf8', env: { ...process.env, MPRLAB_GATEWAY_EXECUTABLE: gateway }
        });
        assert.equal(result.status, 2, result.stderr);
        assert.match(result.stderr, /mobile build requires an absolute MPRLAB_MOBILE_BUILD_INTENT/);
        assert.doesNotMatch(result.stderr, /changed-file-value|changed-process-value|Signing input/);
        console.info(`Actual ${platform} adapter passes the installed native request decoder after file and ambient changes.`);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
}
