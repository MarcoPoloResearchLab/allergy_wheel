// @ts-check
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { ExternalService, ParentText, FeedbackConfiguration } from '../js/constants.js';
import { MobileLocation } from '../mobile/constants.js';

execFileSync(process.execPath, ['scripts/build-mobile-game.mjs'], { stdio: 'inherit' });
const parentSource = await readFile('mobile/generated/parents.html', 'utf8');
const websiteSource = await readFile('index.html', 'utf8');
const websiteWidget = websiteSource.match(/<script\b[^>]*src="(https:\/\/loopaware\.mprlab\.com\/widget\.js[^\"]+)"[^>]*><\/script>/)?.[0];
assert.ok(websiteWidget, 'The website must declare its LoopAware widget.');
assert.ok(websiteWidget.includes(ExternalService.LOOP_FEEDBACK), 'Website and mobile feedback must use the same provider site.');
const siteId = new URL(ExternalService.LOOP_FEEDBACK).searchParams.get('site_id');
assert.equal(new URL(ExternalService.LOOP_ANALYTICS).searchParams.get('site_id'), siteId);
const providerOrigin = 'https://loopaware-api.mprlab.com';
const configUrl = `${providerOrigin}/public/widget-config?site_id=${siteId}`;
const scriptOrigin = new URL(ExternalService.LOOP_FEEDBACK).origin;
const scenarios = [
    { name: 'website embed', url: 'https://allergy.mprlab.com/', source: `<!doctype html><html><head>${websiteWidget}</head><body></body></html>`, parentGate: false },
    { name: 'packaged parent document', url: MobileLocation.PARENTS, source: parentSource, parentGate: true }
];

for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
        for (const scenario of scenarios) {
            const context = await browser.newContext();
            try {
                const blockedRequests = [];
                const requests = [];
                const errors = [];
                await context.route('**/*', (route) => {
                    const request = route.request();
                    if (request.url() === scenario.url) return route.fulfill({ contentType: 'text/html', body: scenario.source });
                    const origin = new URL(request.url()).origin;
                    if (request.method() !== 'GET' || ![scriptOrigin, providerOrigin].includes(origin)) {
                        blockedRequests.push(`${request.method()} ${origin}`);
                        return route.abort();
                    }
                    requests.push(request.url());
                    return route.continue();
                });
                const page = await context.newPage();
                page.on('pageerror', (error) => errors.push(error.message));
                const configResponse = page.waitForResponse(configUrl);
                await page.goto(scenario.url);
                if (scenario.parentGate) {
                    assert.deepEqual(requests, [], 'Parent entry must not start a provider request.');
                    const factors = (await page.locator('#parent-question').innerText()).match(/\d+/g).map(Number);
                    await page.getByLabel(ParentText.ANSWER).fill(String(factors[0] * factors[1]));
                    await page.getByRole('button', { name: ParentText.CONTINUE, exact: true }).click();
                    assert.deepEqual(requests, [], 'The parent gate must not start a provider request.');
                    await page.getByRole('button', { name: ParentText.FEEDBACK, exact: true }).click();
                }
                const response = await configResponse;
                assert.equal(response.status(), 200, `${engine.name()} ${scenario.name}: provider configuration failed for ${siteId}`);
                assert.equal((await response.json()).site_id, siteId);
                if (scenario.parentGate) await page.getByRole('status').filter({ hasText: ParentText.READY }).waitFor();
                await page.locator(`#${FeedbackConfiguration.BUBBLE_ID}`).click();
                await page.locator(`#${FeedbackConfiguration.CONTACT_ID}`).waitFor();
                assert.equal(await page.locator(`#${FeedbackConfiguration.PANEL_ID}`).isVisible(), true);
                assert.deepEqual(blockedRequests, [], 'The form must initialize with GET requests to its provider only.');
                assert.deepEqual(errors, []);
                console.info(JSON.stringify({ engine: engine.name(), scenario: scenario.name, siteId, configurationStatus: response.status(), feedbackFormVisible: true, submission: 'not-performed' }));
            } finally {
                await context.close();
            }
        }
    } finally {
        await browser.close();
    }
}
