// @ts-check
import { resolve } from 'node:path';
import { verifyPreparation } from './native-preparation.mjs';
verifyPreparation(process.cwd());
// The SDK installs the selected mobile dependencies before this application verification command.
await import(resolve(process.cwd(), '../scripts/build-mobile-game.mjs'));
console.info('Verified native application configuration and packaged the current captured game source.');
