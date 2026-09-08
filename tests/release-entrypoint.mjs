// @ts-check
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const signingNames = [
    'ALLERGY_WHEEL_ANDROID_KEYSTORE',
    'ALLERGY_WHEEL_ANDROID_STORE_PASSWORD',
    'ALLERGY_WHEEL_ANDROID_KEY_ALIAS',
    'ALLERGY_WHEEL_ANDROID_KEY_PASSWORD',
    'ALLERGY_WHEEL_APPLE_CERTIFICATE_PATH',
    'ALLERGY_WHEEL_APPLE_CERTIFICATE_PASSWORD',
    'ALLERGY_WHEEL_APPLE_PROFILE_PATH'
];
const fixtureRoot = await mkdtemp(join(tmpdir(), 'allergy-release-entrypoint-'));
try {
    const applicationRoot = join(fixtureRoot, 'application with spaces');
    const gatewayRoot = join(fixtureRoot, 'mprlab-gateway');
    const receiptPath = join(fixtureRoot, 'gateway.json');
    const inputPath = join(applicationRoot, 'configs/.env.allergy-wheel');
    await mkdir(join(applicationRoot, 'configs'), { recursive: true });
    await mkdir(gatewayRoot);
    await copyFile(resolve('Makefile'), join(applicationRoot, 'Makefile'));
    const initialized = spawnSync('git', ['init', '--quiet', applicationRoot], { encoding: 'utf8' });
    assert.equal(initialized.status, 0, initialized.stderr);

    // Capture the subprocess boundary; the application Make entry point stays real.
    await writeFile(join(gatewayRoot, 'Makefile'), [
        '.PHONY: app-release app-publish app-deploy',
        'app-release app-publish app-deploy:',
        '\t@node capture.mjs "$@" "$(MPRLAB_APP_ROOT)"',
        ''
    ].join('\n'));
    await writeFile(join(gatewayRoot, 'capture.mjs'), `
import { writeFileSync } from 'node:fs';
const names = ${JSON.stringify(signingNames)};
writeFileSync(process.env.TEST_GATEWAY_RECEIPT, JSON.stringify({
    target: process.argv[2],
    applicationRoot: process.argv[3],
    signing: Object.fromEntries(names.map(name => [name, process.env[name] ?? null]))
}));
process.exit(Number(process.env.TEST_GATEWAY_EXIT ?? 0));
`);
    const inheritedValues = Object.fromEntries(signingNames.map(name => [name, 'inherited-stale-value']));
    const environment = { ...process.env, ...inheritedValues, TEST_GATEWAY_RECEIPT: receiptPath };
    const signingValues = Object.fromEntries(signingNames.map(name => [name, `fixture ${name} $literal; "quoted"`]));
    const inputContents = signingNames.map(name => `${name}='${signingValues[name]}'`).join('\n') + '\n';
    await writeFile(inputPath, inputContents);

    /** Run the real application command against the local gateway boundary. */
    function runLifecycle(target, overrides = {}) {
        const result = spawnSync('make', ['--no-print-directory', target], {
            cwd: applicationRoot, env: { ...environment, ...overrides }, encoding: 'utf8'
        });
        if (result.error) throw result.error;
        return result;
    }

    const released = runLifecycle('release');
    assert.equal(released.status, 0, released.stderr);
    const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
    assert.equal(receipt.target, 'app-release');
    assert.equal(receipt.applicationRoot, applicationRoot);
    assert.deepEqual(receipt.signing, signingValues, 'Release must export signing inputs from the repository private file.');
    for (const value of Object.values(signingValues)) {
        assert.ok(!(released.stdout + released.stderr).includes(value), 'Signing values must stay out of command output.');
    }

    for (const omittedName of signingNames) {
        await writeFile(inputPath, inputContents.split('\n').filter(line => !line.startsWith(`${omittedName}=`)).join('\n'));
        const incomplete = runLifecycle('release');
        assert.equal(incomplete.status, 0, incomplete.stderr);
        const incompleteReceipt = JSON.parse(await readFile(receiptPath, 'utf8'));
        assert.equal(incompleteReceipt.signing[omittedName], null, `${omittedName} must not retain an inherited value.`);
    }

    await writeFile(inputPath, 'false\n');
    await rm(receiptPath);
    const invalid = runLifecycle('release');
    assert.notEqual(invalid.status, 0, 'A failed private input command must stop release.');
    await assert.rejects(readFile(receiptPath), { code: 'ENOENT' });

    await rm(inputPath);
    const missing = runLifecycle('release');
    assert.notEqual(missing.status, 0, 'A missing private input must stop release before gateway delegation.');
    await assert.rejects(readFile(receiptPath), { code: 'ENOENT' });
    for (const target of ['publish', 'deploy']) {
        const delegated = runLifecycle(target);
        assert.equal(delegated.status, 0, delegated.stderr);
        const delegatedReceipt = JSON.parse(await readFile(receiptPath, 'utf8'));
        assert.equal(delegatedReceipt.target, `app-${target}`);
        assert.deepEqual(delegatedReceipt.signing, inheritedValues);
    }

    await writeFile(inputPath, inputContents);
    const failure = runLifecycle('release', { TEST_GATEWAY_EXIT: '47' });
    assert.notEqual(failure.status, 0, 'A gateway failure must fail the application command.');
    assert.match(failure.stderr, /Error 47/);
    console.info('Release loads private signing inputs, clears stale values, and preserves lifecycle delegation and failures.');
} finally {
    await rm(fixtureRoot, { recursive: true, force: true });
}
