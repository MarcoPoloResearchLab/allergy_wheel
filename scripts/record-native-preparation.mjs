// @ts-check
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { preparationFacts } from './native-preparation.mjs';
const repository = resolve(process.argv[2] ?? resolve(import.meta.dirname, '..'));
const mobile = join(repository, 'mobile');
const record = preparationFacts(mobile);
await mkdir(join(mobile, 'scripts'), { recursive: true });
for (const name of ['native-preparation.mjs', 'verify-native-release.mjs']) {
  await copyFile(resolve(import.meta.dirname, name), join(mobile, 'scripts', name));
}
await rm(join(mobile, 'source-preparation.json'), { force: true });
await writeFile(join(mobile, 'native-preparation.json'), JSON.stringify(record, null, 2) + '\n');
console.info('Recorded native application configuration, dependency versions, and successful preparation commands.');
