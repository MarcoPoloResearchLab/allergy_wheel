// @ts-check
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const fixture = await mkdtemp(join(tmpdir(), 'allergy-semantic-preparation-'));
try {
    for (const name of ['js', 'assets', 'data', 'scripts', 'index.html', 'privacy.html', 'package.json', 'package-lock.json']) {
        await cp(resolve(name), join(fixture, name), { recursive: true });
    }
    await mkdir(join(fixture, 'mobile/scripts'), { recursive: true });
    for (const name of ['app.json', 'package.json', 'package-lock.json', 'plugins', 'index.js', 'App.js', 'metro.config.js', 'lifecycle.js', 'constants.js', 'parents.html', 'android', 'ios']) {
        await cp(resolve('mobile', name), join(fixture, 'mobile', name), { recursive: true, filter: path => !/(?:^|\/)(?:Pods|build|node_modules|\.gradle)(?:\/|$)/.test(path) });
    }
    // Native dependency installation belongs to the SDK. Use its real installed package for this public verification fixture.
    const { symlink } = await import('node:fs/promises');
    await symlink(resolve('mobile/node_modules'), join(fixture, 'mobile/node_modules'), 'dir');
    await mkdir(join(fixture, 'mobile/generated'), { recursive: true });
    for (const name of ['game', 'parents', 'analytics']) await writeFile(join(fixture, 'mobile/generated', name + '.json'), JSON.stringify({html: 'old prepared product'}));
    const record = () => spawnSync(process.execPath, [resolve('scripts/record-native-preparation.mjs'), fixture], { encoding: 'utf8' });
    const verify = () => spawnSync(process.execPath, [join(fixture, 'mobile/scripts/verify-native-release.mjs')], { cwd: join(fixture, 'mobile'), encoding: 'utf8' });
    let result = record(); assert.equal(result.status, 0, result.stderr);
    const recorded = JSON.parse(await readFile(join(fixture, 'mobile/native-preparation.json'), 'utf8'));
    assert.equal(recorded.schema_version, 2);
    assert.equal(Object.hasOwn(recorded, 'files'), false);
    const app = join(fixture, 'mobile/app.json');
    await writeFile(app, JSON.stringify(JSON.parse(await readFile(app, 'utf8')), null, 4));
    const podLock = join(fixture, 'mobile/ios/Podfile.lock');
    await writeFile(podLock, await readFile(podLock, 'utf8') + '\n# native metadata can regenerate\n');
    const game = join(fixture, 'js/constants.js');
    await writeFile(game, (await readFile(game, 'utf8')).replace('Spinning Allergy Wheel', 'Current Captured Allergy Game'));
    const initial = await readFile(join(fixture, 'index.html'), 'utf8');
    await writeFile(join(fixture, 'index.html'), initial.replace('</head>', '<meta name="current-product-source" content="captured">\n</head>'));
    result = verify(); assert.equal(result.status, 0, result.stderr);
    const packaged = JSON.parse(await readFile(join(fixture, 'mobile/generated/game.json'), 'utf8'));
    assert.match(packaged.html, /current-product-source/);
    assert.doesNotMatch(await readFile(join(fixture, 'mobile/generated/resources.json'), 'utf8'), /sha256/i);
    console.info('Native preparation accepts metadata changes and packages current captured game source.');
    const original = JSON.parse(await readFile(app, 'utf8'));
    const wrong = structuredClone(original); wrong.expo.ios.bundleIdentifier = 'com.public.invalid';
    await writeFile(app, JSON.stringify(wrong));
    result = verify(); assert.notEqual(result.status, 0); assert.match(result.stderr, /identifier|configuration|application/i);
    await writeFile(app, JSON.stringify(original));
    const gradle = join(fixture, 'mobile/android/app/build.gradle');
    const originalGradle = await readFile(gradle, 'utf8');
    await writeFile(gradle, originalGradle.replace("applicationId 'com.mprlab.allergywheel'", "// applicationId 'com.mprlab.allergywheel'\n        applicationId 'com.public.invalid'"));
    result = verify(); assert.notEqual(result.status, 0); assert.match(result.stderr, /identifier|configuration|application/i);
    await writeFile(gradle, originalGradle);
    const preparation = join(fixture, 'mobile/native-preparation.json');
    await writeFile(preparation, JSON.stringify({ schema_version: 1, files: { 'app.json': 'obsolete' } }));
    result = verify(); assert.notEqual(result.status, 0); assert.match(result.stderr, /obsolete native preparation/);
    await writeFile(preparation, JSON.stringify(recorded));
    const packageFile = join(fixture, 'mobile/package.json');
    const packageMetadata = JSON.parse(await readFile(packageFile, 'utf8'));
    packageMetadata.dependencies['react-native-webview'] = '13.16.2';
    await writeFile(packageFile, JSON.stringify(packageMetadata));
    result = verify(); assert.notEqual(result.status, 0); assert.match(result.stderr, /dependencies differ/);
    packageMetadata.dependencies['react-native-webview'] = recorded.dependencies.dependencies['react-native-webview'].declared;
    await writeFile(packageFile, JSON.stringify(packageMetadata));
    await rm(join(fixture, 'mobile/ios/Podfile'));
    result = verify(); assert.notEqual(result.status, 0); assert.match(result.stderr, /missing native input/);
    console.info('Native preparation rejects identity, native config, obsolete records, changed dependencies, and missing native inputs.');
} finally { await rm(fixture, { recursive: true, force: true }); }
