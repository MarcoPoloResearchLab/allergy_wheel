// @ts-check
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repositorySigningFile } from './repository-signing-file.mjs';
import { runNativeBuild } from './native-build-process.mjs';

const acceptedOptions = new Set(['--mobile-dir', '--output', '--release-timestamp', '--manifest']);
const options = new Map();
const argumentsList = process.argv.slice(2);
for (let index = 0; index < argumentsList.length; index += 2) {
    const name = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!acceptedOptions.has(name) || options.has(name) || !value) throw new Error(`Invalid release option: ${name}`);
    options.set(name, value);
}
for (const name of ['--mobile-dir', '--output', '--release-timestamp']) {
    if (!options.has(name)) throw new Error(`Release requires ${name}`);
}
const sourceRoot = resolve(options.get('--mobile-dir'));
const output = resolve(options.get('--output'));
const platform = 'android';
if (!output.endsWith('.aab')) throw new Error('Android release output must be an AAB.');
if (options.has('--manifest') && resolve(options.get('--manifest')) !== join(dirname(output), `${platform}.json`)) {
    throw new Error('Release manifest must use the gateway platform path.');
}
const versionMatch = /^v?(\d+\.\d+\.\d+)$/.exec(process.env.MPRLAB_ARTIFACT_VERSION ?? '');
if (!versionMatch) throw new Error('Release requires the allocated MPRLAB_ARTIFACT_VERSION.');
const timestamp = options.get('--release-timestamp');
const milliseconds = Date.parse(timestamp);
if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().replace('.000Z', 'Z') !== timestamp) {
    throw new Error('Release timestamp must use canonical UTC seconds.');
}
// The sealed release timestamp allocates the Android store number.
const buildNumber = milliseconds / 1000;
if (!Number.isInteger(buildNumber) || buildNumber < 1 || buildNumber > 2100000000) throw new Error('Release build number exceeds the store range.');
const gateway = process.env.MPRLAB_GATEWAY_EXECUTABLE;
if (!gateway || !isAbsolute(gateway)) throw new Error('Release requires the authoritative gateway executable.');
const config = JSON.parse(await readFile(join(sourceRoot, 'app.json'), 'utf8')).expo;
const request = {
    schema_version: 1,
    source_root: sourceRoot,
    platform,
    output,
    application_identifier: config.android.package,
    version: versionMatch[1],
    build_number: String(buildNumber),
    release_timestamp: timestamp,
    preparation_manifest: 'native-preparation.json',
    verify_script: 'scripts/verify-native-release.mjs',
    android: {
        module: 'app',
        version_name_environment: 'MPRLAB_MOBILE_VERSION_NAME',
        version_code_environment: 'MPRLAB_MOBILE_VERSION_CODE',
        signing_environment: ['ALLERGY_WHEEL_ANDROID_KEYSTORE', 'ALLERGY_WHEEL_ANDROID_STORE_PASSWORD', 'ALLERGY_WHEEL_ANDROID_KEY_ALIAS', 'ALLERGY_WHEEL_ANDROID_KEY_PASSWORD']
    }
};
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const controller = new AbortController();
const interrupt = () => controller.abort('SIGINT');
const terminate = () => controller.abort('SIGTERM');
process.on('SIGINT', interrupt);
process.on('SIGTERM', terminate);
try {
    const keystore = await repositorySigningFile(repositoryRoot, process.env.ALLERGY_WHEEL_ANDROID_KEYSTORE, 'ALLERGY_WHEEL_ANDROID_KEYSTORE');
    const environment = { ...process.env, ALLERGY_WHEEL_ANDROID_KEYSTORE: keystore };
    delete environment.GH_TOKEN;
    delete environment.GITHUB_TOKEN;
    process.exitCode = await runNativeBuild(gateway, request, environment, controller.signal);
} catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = controller.signal.aborted ? (controller.signal.reason === 'SIGINT' ? 130 : 143) : 2;
} finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
}
