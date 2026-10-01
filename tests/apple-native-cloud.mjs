// @ts-check
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const fixture = await mkdtemp(join(tmpdir(), 'allergy-cloud-source-'));
try {
    for (const name of ['js', 'assets', 'data', 'scripts', 'index.html', 'privacy.html', 'package.json', 'package-lock.json']) {
        await cp(resolve(name), join(fixture, name), { recursive: true });
    }
    await mkdir(join(fixture, 'mobile'), { recursive: true });
    for (const name of ['app.json', 'package.json', 'package-lock.json', 'plugins', 'cloud', 'index.js', 'App.js', 'metro.config.js', 'lifecycle.js', 'constants.js', 'parents.html']) {
        await cp(resolve('mobile', name), join(fixture, 'mobile', name), { recursive: true });
    }
    for (const name of ['android/gradlew', 'android/app/build.gradle', 'ios/Podfile', 'ios/Podfile.lock', 'ios/AllergyWheel.xcworkspace/contents.xcworkspacedata', 'generated/game.json', 'generated/parents.json', 'generated/analytics.json']) {
        await mkdir(dirname(join(fixture, 'mobile', name)), { recursive: true });
        await writeFile(join(fixture, 'mobile', name), 'prepared fixture');
    }
    const record = spawnSync(process.execPath, [resolve('scripts/record-native-preparation.mjs'), fixture], { encoding: 'utf8' });
    assert.equal(record.status, 0, record.stderr);
    const script = join(fixture, 'mobile/ios/ci_scripts/ci_post_clone.sh');
    assert.equal(await readFile(script, 'utf8'), await readFile(resolve('mobile/cloud/ci_post_clone.sh'), 'utf8'));
    const run = () => spawnSync('/bin/bash', ['-c', `
        brew() {
            if [[ "$*" == 'install node@24' ]]; then return 0; fi
            if [[ "$*" == '--prefix node@24' ]]; then printf '%s\\n' "$ALLERGY_TEST_NODE_PREFIX"; return 0; fi
            return 91
        }
        npm() {
            [[ "$PWD" == "$CI_PRIMARY_REPOSITORY_PATH/mobile" && "$*" == 'ci --include=dev --foreground-scripts' ]] || return 92
            printf 'locked dependencies installed\\n'
        }
        pod() {
            [[ "$PWD" == "$CI_PRIMARY_REPOSITORY_PATH/mobile/ios" && "$*" == 'install --deployment' ]] || return 93
            printf 'cloud dependencies ready\\n'
        }
        source "$1"
    `, 'cloud-fixture', script], {
        env: { ...process.env, CI_PRIMARY_REPOSITORY_PATH: fixture, ALLERGY_TEST_NODE_PREFIX: resolve(dirname(process.execPath), '..') }, encoding: 'utf8'
    });
    const valid = run();
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /Prepared game and native source match/);
    assert.match(valid.stdout, /cloud dependencies ready/);
    await writeFile(join(fixture, 'mobile/app.json'), '{}');
    const stale = run();
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /Stale native preparation: app\.json/);
    assert.doesNotMatch(stale.stdout, /locked dependencies installed/);
    console.info('Cloud dependency preparation rejects stale native source before installation.');
} finally {
    await rm(fixture, { recursive: true, force: true });
}
