// @ts-check
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, cp, readFile, rm, mkdir, writeFile, symlink, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const prepared = await mkdtemp(join(tmpdir(), 'allergy-native-'));
try {
    const autolinking = JSON.parse(execFileSync(process.execPath, [resolve('mobile/node_modules/expo-modules-autolinking/bin/expo-modules-autolinking'), 'resolve', '--json', '--platform', 'ios', '--project-root', resolve('mobile')], { encoding: 'utf8' }));
    assert.deepEqual(autolinking.configuration?.buildFromSource, ['expo-modules-core'], 'ExpoModulesCore must use source so its podspec checksum does not depend on the checkout path.');
    for (const name of ['app.json', 'package.json', 'package-lock.json', 'plugins', 'assets', 'scripts']) {
        await cp(resolve('mobile', name), join(prepared, name), { recursive: true });
    }
    const configPath = join(prepared, 'app.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const sourceVersion = '3.2.1';
    config.expo.version = sourceVersion;
    await writeFile(configPath, JSON.stringify(config));
    // Use the real Expo generator and application plugins with installed container dependencies.
    execFileSync('npm', ['run', 'prepare:native'], {
        cwd: prepared, env: { ...process.env, PATH: resolve('mobile/node_modules/.bin') + ':' + process.env.PATH, NODE_PATH: resolve('mobile/node_modules'), CI: '1' }, stdio: 'inherit'
    });
    const gradle = await readFile(join(prepared, 'android/app/build.gradle'), 'utf8');
    const plist = await readFile(join(prepared, 'ios/AllergyWheel/Info.plist'), 'utf8');
    const xcode = await readFile(join(prepared, 'ios/AllergyWheel.xcodeproj/project.pbxproj'), 'utf8');
    const appDelegate = await readFile(join(prepared, 'ios/AllergyWheel/AppDelegate.swift'), 'utf8');
    assert.match(plist, /<key>UIApplicationSceneManifest<\/key>/, 'Generated iOS application must adopt the scene lifecycle.');
    assert.match(plist, /<key>UISceneDelegateClassName<\/key>\s*<string>EXExpoAppSceneDelegate<\/string>/);
    assert.match(appDelegate, /class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider/);
    assert.doesNotMatch(appDelegate, /UIWindow\(frame: UIScreen\.main\.bounds\)|factory\.startReactNative\(/);
    const properties = JSON.parse(await readFile(join(prepared, 'ios/Podfile.properties.json'), 'utf8'));
    assert.equal(properties['ios.buildReactNativeFromSource'], 'true');
    assert.equal(properties.EXPO_USE_PRECOMPILED_MODULES, 'false');
    const tools = join(prepared, 'controlled-java');
    await mkdir(tools);
    const java = join(tools, 'java'), javaLog = join(prepared, 'java-arguments.json');
    await copyFile(process.execPath, java);
    await writeFile(java, `#!${process.execPath}
require('node:fs').writeFileSync(${JSON.stringify(javaLog)}, JSON.stringify(process.argv.slice(2)));
`);
    const callerArguments = ['--no-daemon', ':app:bundleRelease', '--max-workers=2', '--parallel', '-PreactNativeArchitectures=arm64-v8a', '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=1g'];
    for (const pass of [1, 2]) {
        if (pass === 2) {
            const policyProperties = join(prepared, 'android/gradle.properties');
            let seeded = await readFile(policyProperties, 'utf8');
            seeded = seeded.replace(/^org\.gradle\.jvmargs=.*$/m, 'org.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=512m');
            seeded += '\norg.gradle.workers.max=7\n';
            await writeFile(policyProperties, seeded);
            execFileSync(process.execPath, [join(prepared, 'scripts/prepare-android-build-policy.mjs')], { cwd: prepared });
            assert.match(await readFile(policyProperties, 'utf8'), /^org\.gradle\.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1g$/m);
            assert.match(await readFile(policyProperties, 'utf8'), /^org\.gradle\.workers\.max=7$/m);
        }
        execFileSync('/bin/sh', [join(prepared, 'android/gradlew'), ...callerArguments], {
            cwd: join(prepared, 'android'), env: { PATH: tools + ':/usr/bin:/bin', JAVA_HOME: '' },
        });
        const javaArguments = JSON.parse(await readFile(javaLog, 'utf8'));
        assert.deepEqual(javaArguments.slice(javaArguments.indexOf('-jar') + 2), ['-Pkotlin.compiler.execution.strategy=in-process', ...callerArguments], 'Generated launcher must supply one compiler strategy and preserve caller arguments.');
        assert.match(await readFile(join(prepared, 'android/gradle.properties'), 'utf8'), /-XX:MaxMetaspaceSize=1g/);
    }


    const require = createRequire(resolve('mobile/package.json'));
    const project = require('xcode').project(join(prepared, 'ios/AllergyWheel.xcodeproj/project.pbxproj'));
    project.parseSync();
    const targets = project.pbxNativeTargetSection();
    const scheme = await readFile(join(prepared, 'ios/AllergyWheel.xcodeproj/xcshareddata/xcschemes/AllergyWheel.xcscheme'), 'utf8');
    for (const reference of scheme.matchAll(/BlueprintIdentifier\s*=\s*"([^"]+)"/g)) {
        assert.ok(targets[reference[1]], `Shared scheme references absent native target ${reference[1]}`);
    }
    assert.equal((xcode.match(/CODE_SIGN_STYLE = Automatic;/g) ?? []).length, 2, 'The application must declare automatic signing for both configurations.');
    const bundlePhase = [...xcode.matchAll(/shellScript = ("[^\n]+");/g)]
        .map(match => JSON.parse(match[1]))
        .find(script => script.includes('react-native-xcode.sh'));
    assert.ok(bundlePhase, 'The generated project must contain the native bundle phase.');
    const alias = join(prepared, 'project-alias');
    await symlink(prepared, alias);
    const bundleScripts = join(prepared, 'node_modules/react-native/scripts');
    await mkdir(bundleScripts, { recursive: true });
    // Capture the native bundler boundary after the real generated shell phase resolves its paths.
    await writeFile(join(bundleScripts, 'react-native-xcode.sh'), 'printf "%s\\n" "$PROJECT_ROOT" "$ENTRY_FILE" "$CLI_PATH"\n');
    const bundlePaths = execFileSync('/bin/sh', ['-c', bundlePhase], {
        env: { ...process.env, PROJECT_DIR: join(alias, 'ios'), PROJECT_ROOT: '', ENTRY_FILE: 'inherited-entry.js' },
        encoding: 'utf8'
    }).trim().split('\n');
    assert.deepEqual(bundlePaths, [prepared, join(prepared, 'index.js'), join(bundleScripts, 'bundle.js')], 'The native bundle phase must use the physical project path through a symlinked Xcode directory.');
    const release = gradle.split('buildTypes {')[1].split('release {')[1].split('packagingOptions {')[0];
    assert.match(release, /signingConfig signingConfigs\.release/, 'Release must use its own signing configuration');
    assert.doesNotMatch(release, /signingConfigs\.debug/, 'Release must never use the development key');
    for (const name of ['ALLERGY_WHEEL_ANDROID_KEYSTORE', 'ALLERGY_WHEEL_ANDROID_STORE_PASSWORD', 'ALLERGY_WHEEL_ANDROID_KEY_ALIAS', 'ALLERGY_WHEEL_ANDROID_KEY_PASSWORD', 'MPRLAB_MOBILE_VERSION_NAME', 'MPRLAB_MOBILE_VERSION_CODE']) {
        assert.ok(gradle.includes(name), `Missing gateway input ${name}`);
    }
    assert.match(release, /minifyEnabled true/, 'Release must produce the required mapping');
    assert.match(plist, /<key>CFBundleShortVersionString<\/key>\s*<string>\$\(MARKETING_VERSION\)<\/string>/);
    assert.match(plist, /<key>CFBundleVersion<\/key>\s*<string>\$\(CURRENT_PROJECT_VERSION\)<\/string>/);
    assert.deepEqual([...xcode.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(match => match[1]), [sourceVersion, sourceVersion], 'Both Apple configurations must retain the Expo application version');
    assert.ok(gradle.includes(`versionName = (System.getenv("MPRLAB_MOBILE_VERSION_NAME") ?: "${sourceVersion}")`), 'Android development builds must retain the Expo application version');
    console.info('Generated native release signing and version contracts passed.');
} finally {
    await rm(prepared, { recursive: true, force: true });
}
