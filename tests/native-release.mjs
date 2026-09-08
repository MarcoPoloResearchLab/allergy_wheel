// @ts-check
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const prepared = await mkdtemp(join(tmpdir(), 'allergy-native-'));
try {
    for (const name of ['app.json', 'package.json', 'package-lock.json', 'plugins', 'assets']) {
        await cp(resolve('mobile', name), join(prepared, name), { recursive: true });
    }
    // Use the real Expo generator and application plugins with installed container dependencies.
    execFileSync(process.execPath, [resolve('mobile/node_modules/expo/bin/cli'), 'prebuild', '--no-install', '--platform', 'all'], {
        cwd: prepared, env: { ...process.env, NODE_PATH: resolve('mobile/node_modules'), CI: '1' }, stdio: 'inherit'
    });
    const gradle = await readFile(join(prepared, 'android/app/build.gradle'), 'utf8');
    const plist = await readFile(join(prepared, 'ios/AllergyWheel/Info.plist'), 'utf8');
    const xcode = await readFile(join(prepared, 'ios/AllergyWheel.xcodeproj/project.pbxproj'), 'utf8');
    const release = gradle.split('buildTypes {')[1].split('release {')[1].split('packagingOptions {')[0];
    assert.match(release, /signingConfig signingConfigs\.release/, 'Release must use its own signing configuration');
    assert.doesNotMatch(release, /signingConfigs\.debug/, 'Release must never use the development key');
    for (const name of ['ALLERGY_WHEEL_ANDROID_KEYSTORE', 'ALLERGY_WHEEL_ANDROID_STORE_PASSWORD', 'ALLERGY_WHEEL_ANDROID_KEY_ALIAS', 'ALLERGY_WHEEL_ANDROID_KEY_PASSWORD', 'MPRLAB_MOBILE_VERSION_NAME', 'MPRLAB_MOBILE_VERSION_CODE']) {
        assert.ok(gradle.includes(name), `Missing gateway input ${name}`);
    }
    assert.match(release, /minifyEnabled true/, 'Release must produce the required mapping');
    assert.match(plist, /<key>CFBundleShortVersionString<\/key>\s*<string>\$\(MARKETING_VERSION\)<\/string>/);
    assert.match(plist, /<key>CFBundleVersion<\/key>\s*<string>\$\(CURRENT_PROJECT_VERSION\)<\/string>/);
    assert.match(xcode, /MARKETING_VERSION = 1\.0\.0;/, 'Development builds must retain the Expo application version');
    console.info('Generated native release signing and version contracts passed.');
} finally {
    await rm(prepared, { recursive: true, force: true });
}
