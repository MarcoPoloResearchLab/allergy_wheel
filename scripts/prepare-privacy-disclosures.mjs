// @ts-check
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { PrivacyContract } from '../js/constants.js';

const { values } = parseArgs({ options: { output: { type: 'string', default: 'artifacts/privacy-disclosures' } } });
await mkdir(values.output, { recursive: true });
await writeFile(join(values.output, 'privacy-disclosures.json'), `${JSON.stringify(PrivacyContract, null, 2)}\n`);
await writeFile(join(values.output, 'store-disclosure-review.json'), `${JSON.stringify(PrivacyContract.storeReview, null, 2)}\n`);
await writeFile(join(values.output, 'privacy-policy.txt'), `${PrivacyContract.sections.join('\n\n')}\n`);
console.info('Prepared the privacy contract and text. Production qualification and store certification remain separate operations.');
