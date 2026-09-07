// @ts-check
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ParentText } from '../js/constants.js';

const listing = JSON.parse(await readFile('mobile/store/listing.json', 'utf8'));
const browser = await chromium.launch();
try {
    for (const destination of new Set([listing.privacyUrl, listing.supportUrl])) {
        const context = await browser.newContext();
        try {
            const externalRequests = [];
            const pageErrors = [];
            await context.route('**/*', (route) => {
                if (new URL(route.request().url()).origin !== new URL(destination).origin) {
                    externalRequests.push(route.request().url());
                    return route.abort();
                }
                return route.continue();
            });
            const page = await context.newPage();
            page.on('pageerror', (error) => pageErrors.push(error.message));
            const response = await page.goto(destination, { waitUntil: 'networkidle' });
            assert.equal(response?.status(), 200, `Public store page failed: ${destination}`);
            assert.equal(page.url(), destination, 'Public store page redirected to a different destination.');
            await page.locator('#privacy-text').waitFor();
            assert.equal(await page.locator('#privacy-text').innerText(), ParentText.PRIVACY, 'Public privacy text differs from the application source.');
            assert.ok((await page.locator('main').innerText()).includes(listing.supportEmail));
            assert.deepEqual(externalRequests, [], 'Privacy and support pages must not start external services.');
            assert.deepEqual(pageErrors, []);
        } finally {
            await context.close();
        }
    }
    console.info('Public privacy and support passed HTTPS, rendered content, contact, and external-service checks.');
} finally {
    await browser.close();
}
