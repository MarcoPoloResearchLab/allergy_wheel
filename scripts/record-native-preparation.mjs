// @ts-check
import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const repository = resolve(process.argv[2] ?? resolve(import.meta.dirname, '..'));
const mobile = join(repository, 'mobile');
const excludedDirectories = new Set(['node_modules', 'Pods', 'build', 'DerivedData', '.gradle', '.kotlin', '.cxx', '.expo', 'dist', 'xcuserdata', 'project.xcworkspace', '.git', 'store']);
const excludedFiles = new Set(['native-preparation.json', '.DS_Store', 'local.properties', '.xcode.env.local']);

/** Collect prepared source files without build caches or machine-local inputs. */
async function collect(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (excludedDirectories.has(entry.name) || excludedFiles.has(entry.name) || entry.name.startsWith('.env') || /\.(keystore|p12|mobileprovision|xcuserstate)$/.test(entry.name)) continue;
        const path = join(directory, entry.name);
        if (['generated/game.html', 'generated/parents.html', 'generated/analytics.html'].includes(relative(mobile, path))) continue;
        if (entry.isSymbolicLink()) throw new Error(`Native preparation cannot include a symbolic link: ${path}`);
        if (entry.isDirectory()) files.push(...await collect(path));
        else if (entry.isFile()) files.push(path);
    }
    return files;
}

/** Record exact nonempty file content relative to its source root. */
async function digests(root, paths) {
    const files = {};
    for (const path of paths.sort()) {
        const bytes = await readFile(path);
        if (bytes.length === 0) continue;
        files[relative(root, path)] = createHash('sha256').update(bytes).digest('hex');
    }
    return { schema_version: 1, files };
}

const gameInputs = [];
for (const directory of ['js', 'assets', 'data']) gameInputs.push(...await collect(join(repository, directory)));
for (const path of ['index.html', 'privacy.html', 'package.json', 'package-lock.json', 'scripts/build-mobile-game.mjs', 'scripts/prepare-mobile.sh', 'scripts/record-native-preparation.mjs', 'scripts/verify-native-release.mjs']) gameInputs.push(join(repository, path));
await writeFile(join(mobile, 'source-preparation.json'), `${JSON.stringify(await digests(repository, gameInputs), null, 2)}\n`);
await mkdir(join(mobile, 'scripts'), { recursive: true });
const verifierSource = resolve(import.meta.dirname, 'verify-native-release.mjs');
await copyFile(verifierSource, join(mobile, 'scripts/verify-native-release.mjs'));
const prepared = await digests(mobile, await collect(mobile));
for (const path of ['package.json', 'package-lock.json', 'app.json', 'scripts/verify-native-release.mjs', 'android/gradlew', 'android/app/build.gradle', 'ios/Podfile', 'ios/Podfile.lock', 'ios/AllergyWheel.xcworkspace/contents.xcworkspacedata', 'generated/game.json', 'generated/parents.json', 'generated/analytics.json']) {
    if (!prepared.files[path]) throw new Error(`Native preparation requires ${path}`);
}
await writeFile(join(mobile, 'native-preparation.json'), `${JSON.stringify(prepared, null, 2)}\n`);
console.info(`Recorded ${Object.keys(prepared.files).length} prepared native inputs.`);
