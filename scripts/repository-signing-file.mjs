// @ts-check
import { readFile, realpath } from 'node:fs/promises';
import { join, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';

/** Require a private input file inside the selected repository directory. */
export async function repositorySigningFile(gateway, name) {
    const repositoryRoot = process.env.MPRLAB_APP_ROOT;
    if (!repositoryRoot || !isAbsolute(repositoryRoot)) throw new Error('Signing requires the captured application root.');
    const captured = spawnSync(gateway, ['private-environment-operation'], {
        cwd: repositoryRoot, env: process.env, encoding: 'utf8',
        input: JSON.stringify({ root: repositoryRoot, keys: [name] })
    });
    if (captured.error) throw new Error(`Read captured signing input ${name}: ${captured.error.message}`);
    if (captured.status !== 0) throw new Error(`Read captured signing input ${name}: ${captured.stderr.trim()}`);
    const values = JSON.parse(captured.stdout);
    if (!values || typeof values !== 'object' || Array.isArray(values) || Object.keys(values).length !== 1 ||
        typeof values[name] !== 'string' || !values[name].trim()) throw new Error(`Gateway must return the required captured signing input ${name}.`);
    const value = values[name];
    const root = await realpath(repositoryRoot);
    let path;
    try {
        path = await realpath(isAbsolute(value) ? value : join(root, value));
        const inside = relative(root, path);
        const privatePath = relative(join(root, 'configs/signing'), path);
        if (inside.startsWith('..') || isAbsolute(inside) || privatePath.startsWith('..') || isAbsolute(privatePath)) throw new Error('outside repository');
        const content = await readFile(path);
        if (!content.length) throw new Error('empty input');
    } catch {
        throw new Error(`Signing input ${name} must identify a nonempty file under configs/signing/.`);
    }
    return path;
}
