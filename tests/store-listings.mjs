// @ts-check
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const temporary = await mkdtemp(join(tmpdir(), 'allergy-store-listings-'));
const script = 'scripts/prepare-store-listings.mjs';
try {
    const output = join(temporary, 'valid');
    const result = spawnSync(process.execPath, [script, '--output', output], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const metadata = JSON.parse(await readFile('mobile/store/listing.json', 'utf8'));
    const receipt = JSON.parse(await readFile(join(output, 'preparation.json'), 'utf8'));
    assert.equal(receipt.publicationStatus, 'not-submitted');
    assert.equal(receipt.applicationIdentifier, 'com.mprlab.allergywheel');
    for (const [relative, digest] of Object.entries(receipt.files)) {
        assert.equal(createHash('sha256').update(await readFile(join(output, relative))).digest('hex'), digest, relative);
    }
    assert.equal(await readFile(join(output, 'google/en-US/short-description.txt'), 'utf8'), `${metadata.google.shortDescription}\n`);
    assert.equal(await readFile(join(output, 'apple/en-US/description.txt'), 'utf8'), `${metadata.description}\n`);
    assert.equal(await readFile(join(output, 'google/en-US/full-description.txt'), 'utf8'), `${metadata.description}\n`);
    assert.equal(await readFile(join(output, 'apple/en-US/review-notes.txt'), 'utf8'), `${metadata.reviewNotes}\n`);

    for (const scenario of [
        { name: 'long-description', change: (value) => { value.google.shortDescription = 'a'.repeat(81); }, diagnostic: /google.shortDescription/ },
        { name: 'long-subtitle', change: (value) => { value.apple.subtitle = 'a'.repeat(31); }, diagnostic: /apple.subtitle/ },
        { name: 'unpublished-url', change: (value) => { value.privacyUrl = 'https://example.com/privacy'; }, diagnostic: /privacyUrl/ },
        { name: 'missing-contact', change: (value) => { value.supportEmail = ''; }, diagnostic: /supportEmail/ },
        { name: 'unknown-field', change: (value) => { value.appStoreId = '1234567890'; }, diagnostic: /Unknown listing field/ }
    ]) {
        const changed = structuredClone(metadata);
        scenario.change(changed);
        const source = join(temporary, `${scenario.name}.json`);
        const rejectedOutput = join(temporary, scenario.name);
        await writeFile(source, JSON.stringify(changed));
        const rejected = spawnSync(process.execPath, [script, '--metadata', source, '--output', rejectedOutput], { encoding: 'utf8' });
        assert.notEqual(rejected.status, 0, scenario.name);
        assert.match(rejected.stderr, scenario.diagnostic);
        await assert.rejects(access(rejectedOutput), { code: 'ENOENT' });
    }
    console.info('Store listing preparation passed export, provider text limits, destination checks, and invalid-input rejection.');
} finally {
    await rm(temporary, { recursive: true, force: true });
}
