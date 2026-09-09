// @ts-check
import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';

const repository = await realpath(resolve(process.cwd(), '..'));
const mobile = await realpath(process.cwd());
for (const [root, name, label] of [[repository, 'source-preparation.json', 'game'], [mobile, 'native-preparation.json', 'native']]) {
    const record = JSON.parse(await readFile(resolve(name), 'utf8'));
    if (record.schema_version !== 1 || !record.files || Object.keys(record.files).length === 0) throw new Error(`${label} preparation record is invalid.`);
    for (const [path, expected] of Object.entries(record.files)) {
        const target = await realpath(resolve(root, path));
        const inside = relative(root, target);
        if (isAbsolute(path) || inside.startsWith('../') || isAbsolute(inside) || inside !== path) throw new Error(`${label} preparation path is invalid: ${path}`);
        const actual = createHash('sha256').update(await readFile(target)).digest('hex');
        if (actual !== expected) throw new Error(`Stale ${label} preparation: ${path}`);
    }
}
console.info('Prepared game and native source match the selected release source.');
