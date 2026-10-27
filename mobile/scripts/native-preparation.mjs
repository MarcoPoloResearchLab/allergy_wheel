// @ts-check
import assert from 'node:assert/strict';
import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

/** @param {string} root @param {string} name */
function required(root, name) {
  assert.ok(!isAbsolute(name) && !name.split(/[\\/]/).includes('..'), 'invalid native preparation path: ' + name);
  let current = resolve(root);
  const parts = name.split('/');
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    let entry;
    try { entry = lstatSync(current); } catch { throw new Error('missing native input: ' + name); }
    assert.ok(!entry.isSymbolicLink(), 'native input has a symbolic link component: ' + name);
    assert.ok(index < parts.length - 1 ? entry.isDirectory() : entry.isFile(), 'missing native input: ' + name);
  }
  return current;
}
/** @param {string} root @param {string} name */
function text(root, name) { return readFileSync(required(root, name), 'utf8'); }
/** @param {string} root @param {string} name */
function json(root, name) { return JSON.parse(text(root, name)); }
/** @param {string} value */
function escaped(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
/** @param {string} source @param {string} name */
function field(source, name) { return source.match(new RegExp(`(?:^|[;\\n])\\s*${escaped(name)}\\s*=\\s*([^;\\n]+);`))?.[1].trim().replace(/^"|"$/g, ''); }
/** @param {string} source @param {string} name */
function block(source, name) {
  const match = new RegExp(`\\b${escaped(name)}\\s*\\{`).exec(source);
  assert.ok(match, 'native configuration block missing: ' + name);
  let depth = 1;
  for (let index = match.index + match[0].length; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}' && --depth === 0) return source.slice(match.index + match[0].length, index);
  }
  throw new Error('incomplete native configuration block: ' + name);
}
/** @param {string} source @param {string|undefined} id */
function object(source, id) {
  assert.ok(id, 'native project object reference is missing');
  const values = [];
  for (const match of source.matchAll(new RegExp(`^\\s*${escaped(id)}\\s*=\\s*\\{`, 'gm'))) {
    let depth = 1;
    for (let index = match.index + match[0].length; index < source.length; index++) {
      if (source[index] === '{') depth++;
      if (source[index] === '}' && --depth === 0) {
        const body = source.slice(match.index + match[0].length, index);
        if (field(body, 'isa')) values.push(body);
        break;
      }
    }
  }
  assert.equal(values.length, 1, 'native project object is missing or ambiguous: ' + id);
  return values[0];
}
/** @param {string} source @param {string} name */
function attribute(source, name) { return source.match(new RegExp(`\\b${escaped(name)}\\s*=\\s*"([^"]*)"`))?.[1]; }
/** @param {string} source @param {string} name */
function plistString(source, name) {
  const matches = [...source.matchAll(new RegExp(`<key>${escaped(name)}</key>\\s*<string>([^<]*)</string>`, 'g'))];
  assert.equal(matches.length, 1, 'native Info.plist field missing or ambiguous: ' + name);
  return matches[0][1];
}

/** Read selected semantic facts from the public native project.
 * @param {string} mobile
 */
export function preparationFacts(mobile) {
  const config = json(mobile, 'app.json').expo;
  assert.equal(config.name, 'Allergy Wheel', 'native application name differs');
  assert.equal(config.ios.bundleIdentifier, 'com.mprlab.allergywheel', 'native iOS identifier differs');
  assert.equal(config.android.package, 'com.mprlab.allergywheel', 'native Android identifier differs');
  assert.match(config.version, /^\d+\.\d+\.\d+$/, 'native application version is invalid');
  const metadata = json(mobile, 'package.json'), lock = json(mobile, 'package-lock.json');
  assert.equal(metadata.main, 'index.js', 'native application entry differs');
  const dependencies = {};
  for (const section of ['dependencies', 'devDependencies']) {
    dependencies[section] = {};
    for (const [name, declared] of Object.entries(metadata[section] ?? {})) {
      const entry = lock.packages?.['node_modules/' + name];
      const resolved = entry?.link ? lock.packages?.[entry.resolved]?.version : entry?.version;
      assert.ok(typeof resolved === 'string' && resolved, 'native dependency version missing: ' + name);
      dependencies[section][name] = { declared, resolved };
    }
  }
  dependencies.overrides = metadata.overrides ?? {};
  const project = text(mobile, 'ios/AllergyWheel.xcodeproj/project.pbxproj').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
  const ids = [...new Set([...project.matchAll(/^\s*([A-F0-9]{24})\s*=\s*\{/gm)].map(match => match[1]))];
  const targets = ids.map(id => ({ id, body: object(project, id) })).filter(item => field(item.body, 'isa') === 'PBXNativeTarget' && field(item.body, 'name') === 'AllergyWheel');
  assert.equal(targets.length, 1, 'native application target missing or ambiguous');
  const target = targets[0];
  assert.equal(field(target.body, 'productType'), 'com.apple.product-type.application', 'native target must be an application');
  const list = object(project, field(target.body, 'buildConfigurationList'));
  const references = list.match(/\bbuildConfigurations\s*=\s*\(([\s\S]*?)\);/)?.[1].split(',').map(value => value.trim()).filter(Boolean) ?? [];
  const releases = references.map(id => object(project, id)).filter(value => field(value, 'name') === 'Release');
  assert.equal(releases.length, 1, 'native Release configuration missing or ambiguous');
  const settings = block(releases[0], 'buildSettings =');
  for (const [name, expected] of Object.entries({ PRODUCT_BUNDLE_IDENTIFIER: config.ios.bundleIdentifier, PRODUCT_NAME: 'AllergyWheel',
      INFOPLIST_FILE: 'AllergyWheel/Info.plist', MARKETING_VERSION: config.version, CODE_SIGN_STYLE: 'Automatic' })) {
    assert.equal(field(settings, name), expected, 'native application configuration differs: ' + name);
  }
  assert.match(field(settings, 'CURRENT_PROJECT_VERSION') ?? '', /^\d+$/, 'native build number is invalid');
  const scheme = text(mobile, 'ios/AllergyWheel.xcodeproj/xcshareddata/xcschemes/AllergyWheel.xcscheme').replace(/<!--[\s\S]*?-->/g, '');
  const buildables = [...scheme.matchAll(/<BuildableReference\b([^>]*)>/g)];
  assert.ok(buildables.length, 'native scheme target missing');
  for (const [, attrs] of buildables) {
    for (const [name, expected] of Object.entries({ BlueprintIdentifier: target.id, BlueprintName: 'AllergyWheel', BuildableName: 'AllergyWheel.app', ReferencedContainer: 'container:AllergyWheel.xcodeproj' })) {
      assert.equal(attribute(attrs, name), expected, 'native scheme configuration differs: ' + name);
    }
  }
  assert.equal(attribute(scheme.match(/<ArchiveAction\b([^>]*)>/)?.[1] ?? '', 'buildConfiguration'), 'Release', 'native archive configuration differs');
  const workspace = text(mobile, 'ios/AllergyWheel.xcworkspace/contents.xcworkspacedata');
  assert.match(workspace, /location\s*=\s*"group:AllergyWheel.xcodeproj"/, 'native workspace configuration differs');
  const plist = text(mobile, 'ios/AllergyWheel/Info.plist').replace(/<!--[\s\S]*?-->/g, '');
  for (const [name, expected] of Object.entries({ CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)', CFBundleShortVersionString: '$(MARKETING_VERSION)', CFBundleVersion: '$(CURRENT_PROJECT_VERSION)' })) {
    assert.equal(plistString(plist, name), expected, 'native plist configuration differs: ' + name);
  }
  const properties = json(mobile, 'ios/Podfile.properties.json');
  assert.equal(properties['ios.buildReactNativeFromSource'], 'true', 'native iOS dependency selection differs');
  assert.equal(properties.EXPO_USE_PRECOMPILED_MODULES, 'false', 'native Expo dependency selection differs');
  const podLock = text(mobile, 'ios/Podfile.lock');
  const pods = Object.fromEntries([...podLock.split(/^DEPENDENCIES:/m)[0].matchAll(/^  - ([^\n]+?) \(([^()]+)\)(?::)?$/gm)].map(match => [match[1], match[2]]));
  assert.equal(pods.Expo, dependencies.dependencies.expo.resolved, 'native Expo version differs');
  assert.equal(pods['React-Core'], dependencies.dependencies['react-native'].resolved, 'native React Native version differs');
  const android = text(mobile, 'android/app/build.gradle').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
  for (const name of ['namespace', 'applicationId']) {
    const values = [...android.matchAll(new RegExp('^\\s*' + name + '\\s+[\"\']([^\"\']+)[\"\']', 'gm'))];
    assert.equal(values.length, 1, 'native application configuration missing or ambiguous: ' + name);
    assert.equal(values[0][1], config.android.package, 'native Android identifier differs: ' + name);
  }
  for (const [name, pattern] of Object.entries({ versionCode: /^\(System\.getenv\("MPRLAB_MOBILE_VERSION_CODE"\) \?: "1"\)\.toInteger\(\)$/,
      versionName: new RegExp('^\\(System\\.getenv\\("MPRLAB_MOBILE_VERSION_NAME"\\) \\?: "' + escaped(config.version) + '"\\)$'),
      bundleCommand: /^"bundle"$/ })) {
    const values = [...android.matchAll(new RegExp('^\\s*' + name + '\\s*=\\s*([^\\n]+)$', 'gm'))];
    assert.equal(values.length, 1, 'native application configuration missing or ambiguous: ' + name);
    assert.match(values[0][1].trim(), pattern, 'native application configuration differs: ' + name);
  }
  assert.match(block(block(android, 'buildTypes'), 'release'), /signingConfig\s+signingConfigs\.release/, 'native release signing selection differs');
  for (const name of ['android/gradlew', 'android/settings.gradle', 'android/build.gradle', 'android/gradle.properties', 'android/gradle/wrapper/gradle-wrapper.jar', 'android/app/src/main/AndroidManifest.xml', 'ios/Podfile', 'index.js']) required(mobile, name);
  const gradle = text(mobile, 'android/gradle/wrapper/gradle-wrapper.properties').match(/gradle-([\d.]+)-(?:bin|all)\.zip/)?.[1];
  const cocoaPods = podLock.match(/^COCOAPODS:\s*(\S+)/m)?.[1];
  assert.ok(gradle && cocoaPods, 'native toolchain versions missing');
  return { schema_version: 2, status: 'prepared',
    application: { name: config.name, iosIdentifier: config.ios.bundleIdentifier, androidIdentifier: config.android.package, version: config.version, entryFile: metadata.main },
    dependencies, toolchain: { gradle, cocoaPods }, nativeCommands: { expoPrebuild: 'completed', cocoaPods: 'completed' } };
}

/** @param {string} mobile */
export function verifyPreparation(mobile) {
  const record = json(mobile, 'native-preparation.json');
  assert.ok(record.schema_version === 2 && record.status === 'prepared', 'obsolete native preparation: run make mobile-prepare-store');
  assert.deepEqual(record, preparationFacts(mobile), 'native application configuration or dependencies differ: run make mobile-prepare-store');
}
