// @ts-check
import { readFile, realpath } from 'node:fs/promises';
import { join, relative, isAbsolute } from 'node:path';

/** Require a private input file inside the selected repository directory. */
export async function repositorySigningFile(repositoryRoot, value, name) {
    if (!value) throw new Error(`Signing requires ${name} in configs/.env.allergy-wheel.`);
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
