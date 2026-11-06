// @ts-check
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { cp, copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const mobileRoot = resolve('mobile');
const mobileRequire = createRequire(join(mobileRoot, 'package.json'));
const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'));
const { createFingerprintAsync, diffFingerprintChangesAsync } = expoRequire('@expo/fingerprint');
const fingerprintMetadata = expoRequire('@expo/fingerprint/package.json');
const fingerprintRequire = createRequire(expoRequire.resolve('@expo/fingerprint/package.json'));
const selectedPackages = mobileRequire('./package.json').overrides[`${fingerprintMetadata.name}@${fingerprintMetadata.version}`];
for (const [name, version] of Object.entries(selectedPackages)) {
    assert.equal(fingerprintRequire(`${name}/package.json`).version, version, `Fingerprint must load the selected patched ${name} version.`);
}
const fixture = await mkdtemp(join(tmpdir(), 'allergy-expo-fingerprint-'));
const options = { hashAlgorithm: 'sha256', silent: true };

try {
    for (const name of ['package.json', 'package-lock.json', 'app.json', 'plugins', 'assets', 'vendor']) {
        await cp(join(mobileRoot, name), join(fixture, name), { recursive: true });
    }
    await symlink(join(mobileRoot, 'node_modules'), join(fixture, 'node_modules'), 'dir');
    for (const name of ['android/app/build.gradle', 'android/app/src/main/AndroidManifest.xml', 'ios/AllergyWheel.xcodeproj/project.pbxproj']) {
        await mkdir(dirname(join(fixture, name)), { recursive: true });
        await copyFile(join(mobileRoot, name), join(fixture, name));
    }
    const first = await createFingerprintAsync(fixture, options);
    assert.match(first.hash, /^[a-f0-9]{64}$/);
    for (const platform of ['android', 'ios']) {
        assert.ok(first.sources.some((source) => source.type === 'dir' && source.filePath === platform && source.hash),
            `Fingerprint must include the prepared ${platform} project.`);
    }
    assert.deepEqual(await diffFingerprintChangesAsync(first, fixture, options), [], 'Unchanged native inputs must have a stable fingerprint.');

    const androidBuild = join(fixture, 'android/app/build.gradle');
    const originalBuild = await readFile(androidBuild, 'utf8');
    await writeFile(androidBuild, `${originalBuild}\n// Fingerprint source change.\n`);
    const changed = await createFingerprintAsync(fixture, options);
    assert.notEqual(changed.hash, first.hash, 'A native source change must update the fingerprint.');

    await writeFile(join(fixture, 'android/.gitignore'), 'app/\n');
    const ignored = await createFingerprintAsync(fixture, options);
    await writeFile(androidBuild, `${originalBuild}\n// Ignored source change.\n`);
    const ignoredChange = await createFingerprintAsync(fixture, options);
    assert.equal(ignoredChange.hash, ignored.hash, 'Nested ignore rules must exclude ignored Android source changes.');
    assert.ok(ignored.sources.some((source) => source.type === 'dir' && source.filePath === 'ios' && source.hash),
        'Android ignore rules must preserve the iOS project.');
    console.info('Expo fingerprint passed native source inclusion, repeatability, and nested ignore rules.');
} finally {
    await rm(fixture, { recursive: true, force: true });
}
