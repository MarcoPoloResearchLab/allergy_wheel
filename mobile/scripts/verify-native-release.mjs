// @ts-check
import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';

const repository = await realpath(resolve(process.cwd(), '..'));
const record = JSON.parse(await readFile(resolve('source-preparation.json'), 'utf8'));
if (record.schema_version !== 1 || !record.files || Object.keys(record.files).length === 0) throw new Error('Game preparation record is invalid.');
for (const [path, expected] of Object.entries(record.files)) {
    const target = await realpath(resolve(repository, path));
    const inside = relative(repository, target);
    if (isAbsolute(path) || inside.startsWith('../') || isAbsolute(inside) || inside !== path) throw new Error(`Game preparation path is invalid: ${path}`);
    const actual = createHash('sha256').update(await readFile(target)).digest('hex');
    if (actual !== expected) throw new Error(`Stale game preparation: ${path}`);
}
console.info('Prepared game source matches the selected release source.');
