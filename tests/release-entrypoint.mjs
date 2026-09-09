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
    'APP_STORE_CONNECT_API_KEY_ID',
    'APP_STORE_CONNECT_API_ISSUER_ID',
    'APP_STORE_CONNECT_API_KEY_PATH',
    'GH_TOKEN'
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
    signing: Object.fromEntries(names.map(name => [name, process.env[name] ?? null])),
    git: Object.fromEntries(Object.entries(process.env).filter(([name]) => name.startsWith('GIT_CONFIG_'))),
    githubFallback: process.env.GITHUB_TOKEN ?? null
}));
process.exit(Number(process.env.TEST_GATEWAY_EXIT ?? 0));
`);
    const inheritedValues = Object.fromEntries(signingNames.map(name => [name, 'inherited-stale-value']));
    const environment = { ...process.env, ...inheritedValues, GITHUB_TOKEN: 'stale alternate token', TEST_GATEWAY_RECEIPT: receiptPath };
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
    assert.equal(receipt.git.GIT_CONFIG_KEY_0, 'url.https://github.com/.insteadOf');
    assert.equal(receipt.git.GIT_CONFIG_VALUE_0, 'git@github.com:');
    assert.equal(receipt.git.GIT_CONFIG_VALUE_2, '');
    assert.equal(receipt.git.GIT_CONFIG_VALUE_3, '!gh auth git-credential');
    assert.equal(receipt.githubFallback, null);
    for (const address of ['git@github.com:example/fixture.git', 'ssh://git@github.com/example/fixture.git']) {
        const configured = spawnSync('git', ['remote', 'add', 'portable-test', address], { cwd: applicationRoot, encoding: 'utf8' });
        assert.equal(configured.status, 0, configured.stderr);
        const remote = spawnSync('git', ['remote', 'get-url', 'portable-test'], { cwd: applicationRoot, env: { ...process.env, ...receipt.git }, encoding: 'utf8' });
        assert.equal(remote.status, 0, remote.stderr);
        assert.equal(remote.stdout.trim(), 'https://github.com/example/fixture.git');
        assert.equal(spawnSync('git', ['remote', 'remove', 'portable-test'], { cwd: applicationRoot }).status, 0);
    }
    assert.deepEqual(receipt.signing, signingValues, 'Release must export signing inputs from the repository private file.');
    for (const value of Object.values(signingValues)) {
        assert.ok(!(released.stdout + released.stderr).includes(value), 'Signing values must stay out of command output.');
    }

    for (const omittedName of signingNames) {
        await writeFile(inputPath, inputContents.split('\n').filter(line => !line.startsWith(`${omittedName}=`)).join('\n'));
        const incomplete = runLifecycle('release');
        if (omittedName === 'GH_TOKEN') {
            assert.notEqual(incomplete.status, 0, 'Missing repository GitHub input must stop before saved-login lookup');
            continue;
        }
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
        assert.notEqual(delegated.status, 0, 'Each lifecycle phase requires the repository environment file');
        await assert.rejects(readFile(receiptPath), { code: 'ENOENT' });
        await writeFile(inputPath, inputContents);
        const loaded = runLifecycle(target);
        assert.equal(loaded.status, 0, loaded.stderr);
        const delegatedReceipt = JSON.parse(await readFile(receiptPath, 'utf8'));
        assert.equal(delegatedReceipt.target, `app-${target}`);
        assert.deepEqual(delegatedReceipt.signing, signingValues);
        await rm(inputPath);
        await rm(receiptPath);
    }

    await writeFile(inputPath, inputContents);
    const failure = runLifecycle('release', { TEST_GATEWAY_EXIT: '47' });
    assert.notEqual(failure.status, 0, 'A gateway failure must fail the application command.');
    assert.match(failure.stderr, /Error 47/);
    console.info('Lifecycle commands load repository credentials and use temporary HTTPS Git authentication settings.');
} finally {
    await rm(fixtureRoot, { recursive: true, force: true });
}
