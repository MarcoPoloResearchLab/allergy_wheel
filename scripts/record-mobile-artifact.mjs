// @ts-check
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, dirname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const repository = resolve(import.meta.dirname, '..');
const artifact = resolve(process.argv[2]);
const directory = (await stat(artifact)).isDirectory();
/** Collect artifact file names without changing the native output. */
async function collectFiles(path) {
    const entries = await readdir(path, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => entry.isDirectory()
        ? collectFiles(resolve(path, entry.name)) : [resolve(path, entry.name)]))).flat();
}
const files = directory ? (await collectFiles(artifact)).sort() : [artifact];
const identities = await Promise.all(files.map(async (path) => ({
    path: directory ? relative(artifact, path) : basename(artifact),
    sha256: createHash('sha256').update(await readFile(path)).digest('hex')
})));
const config = JSON.parse(await readFile(resolve(repository, 'mobile/app.json'), 'utf8'));
const record = {
    version: config.expo.version,
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(),
    sourceHasUncommittedChanges: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: repository, encoding: 'utf8' }).trim()),
    purpose: 'local-device-validation',
    gameResources: JSON.parse(await readFile(resolve(repository, 'mobile/generated/resources.json'), 'utf8')),
    files: identities
};
await writeFile(resolve(dirname(artifact), 'artifact-receipt.json'), `${JSON.stringify(record, null, 2)}\n`);
console.info(`Recorded version ${record.version} and byte identity for ${basename(artifact)}.`);
