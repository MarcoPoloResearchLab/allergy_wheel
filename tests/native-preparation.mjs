// @ts-check
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const fixture = await mkdtemp(join(tmpdir(), 'allergy-preparation-'));
try {
    for (const name of ['js', 'assets', 'data', 'scripts', 'index.html', 'privacy.html', 'package.json', 'package-lock.json']) {
        await cp(resolve(name), join(fixture, name), { recursive: true });
    }
    await mkdir(join(fixture, 'mobile/scripts'), { recursive: true });
    for (const name of ['app.json', 'package.json', 'package-lock.json', 'plugins', 'index.js', 'App.js', 'metro.config.js', 'lifecycle.js', 'constants.js', 'parents.html']) {
        await cp(resolve('mobile', name), join(fixture, 'mobile', name), { recursive: true });
    }
    for (const path of ['android/gradlew', 'android/app/build.gradle', 'ios/Podfile', 'ios/Podfile.lock', 'ios/AllergyWheel.xcworkspace/contents.xcworkspacedata', 'generated/game.json', 'generated/parents.json', 'generated/analytics.json']) {
        await mkdir(join(fixture, 'mobile', path, '..'), { recursive: true });
        await writeFile(join(fixture, 'mobile', path), 'prepared fixture');
    }
    const recorder = resolve('scripts/record-native-preparation.mjs');
    let result = spawnSync(process.execPath, [recorder, fixture], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const record = JSON.parse(await readFile(join(fixture, 'mobile/native-preparation.json'), 'utf8'));
    const gradleHash = createHash('sha256').update('prepared fixture').digest('hex');
    assert.equal(record.files['android/app/build.gradle'], gradleHash);
    assert.ok(record.files['source-preparation.json']);
    assert.ok(record.files['scripts/verify-native-release.mjs']);
    const verifier = join(fixture, 'mobile/scripts/verify-native-release.mjs');
    result = spawnSync(process.execPath, [verifier], { cwd: join(fixture, 'mobile'), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    await writeFile(join(fixture, 'js/constants.js'), '// changed after preparation');
    result = spawnSync(process.execPath, [verifier], { cwd: join(fixture, 'mobile'), encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Stale game preparation: js\/constants.js/);
    console.info('Native preparation binds generated inputs and rejects changed game source.');
} finally {
    await rm(fixture, { recursive: true, force: true });
}
