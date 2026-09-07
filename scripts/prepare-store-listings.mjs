// @ts-check
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';

const { values } = parseArgs({ options: {
    metadata: { type: 'string', default: 'mobile/store/listing.json' },
    output: { type: 'string', default: 'artifacts/store-listings' }
} });
const source = await readFile(values.metadata, 'utf8');
const listing = JSON.parse(source);
const application = JSON.parse(await readFile('mobile/app.json', 'utf8')).expo;
const manifest = parse(await readFile('.mprlab/deploy/resources.yml', 'utf8'));
const website = manifest.mprlab_resources.resources.find((resource) => resource.kind === 'github_pages' && resource.id === 'website');

/** Reject missing or unknown fields at the metadata file boundary. */
function requireFields(value, fields, label) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid listing object: ${label}`);
    for (const field of Object.keys(value)) {
        if (!fields.includes(field)) throw new Error(`Unknown listing field: ${label}.${field}`);
    }
    for (const field of fields) {
        if (!Object.hasOwn(value, field)) throw new Error(`Missing listing field: ${label}.${field}`);
    }
}

/** Apply the documented store text limit before any output is written. */
function requireText(value, maximum, label) {
    if (typeof value !== 'string' || value.trim() !== value || value.length === 0 || [...value].length > maximum) {
        throw new Error(`Invalid listing ${label}: expected 1-${maximum} characters without surrounding whitespace.`);
    }
    return value;
}

requireFields(listing, ['locale', 'name', 'description', 'supportEmail', 'supportUrl', 'privacyUrl', 'marketingUrl', 'reviewNotes', 'apple', 'google'], 'listing');
requireFields(listing.apple, ['subtitle', 'keywords'], 'apple');
requireFields(listing.google, ['shortDescription'], 'google');
if (listing.locale !== 'en-US') throw new Error('Only the prepared en-US listing is supported.');
if (listing.name !== application.name) throw new Error('Listing name differs from the mobile app.');
if (application.android.package !== application.ios.bundleIdentifier) throw new Error('Mobile platform identifiers differ.');
if (listing.supportEmail !== 'support@mprlab.com') throw new Error('Listing supportEmail differs from the selected support contact.');
for (const field of ['supportUrl', 'privacyUrl', 'marketingUrl']) {
    const destination = new URL(listing[field]);
    const expectedPath = field === 'marketingUrl' ? '/' : '/privacy.html';
    if (destination.href !== new URL(expectedPath, website.url).href) throw new Error(`Listing ${field} differs from the selected public website.`);
}

const name = requireText(listing.name, 30, 'name');
const description = requireText(listing.description, 4000, 'description');
const files = {
    'apple/en-US/name.txt': name,
    'apple/en-US/subtitle.txt': requireText(listing.apple.subtitle, 30, 'apple.subtitle'),
    'apple/en-US/keywords.txt': requireText(listing.apple.keywords, 100, 'apple.keywords'),
    'apple/en-US/description.txt': description,
    'apple/en-US/review-notes.txt': requireText(listing.reviewNotes, 4000, 'reviewNotes'),
    'apple/en-US/support-url.txt': listing.supportUrl,
    'apple/en-US/privacy-url.txt': listing.privacyUrl,
    'apple/en-US/marketing-url.txt': listing.marketingUrl,
    'google/en-US/title.txt': name,
    'google/en-US/short-description.txt': requireText(listing.google.shortDescription, 80, 'google.shortDescription'),
    'google/en-US/full-description.txt': description,
    'google/en-US/privacy-url.txt': listing.privacyUrl,
    'google/en-US/support-email.txt': listing.supportEmail,
    'google/en-US/website.txt': listing.marketingUrl
};
for (const [relative, content] of Object.entries(files)) {
    const destination = join(values.output, relative);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, `${content}\n`);
}
await writeFile(join(values.output, 'preparation.json'), `${JSON.stringify({
    publicationStatus: 'not-submitted',
    applicationIdentifier: application.android.package,
    metadataSha256: createHash('sha256').update(source).digest('hex'),
    files: Object.fromEntries(Object.entries(files).map(([relative, content]) => [relative, createHash('sha256').update(`${content}\n`).digest('hex')]))
}, null, 2)}\n`);
console.info(`Prepared ${Object.keys(files).length} store text files. Store submission and declarations remain separate acceptance steps.`);
