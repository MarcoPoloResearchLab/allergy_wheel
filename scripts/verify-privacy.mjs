// @ts-check
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium, webkit } from 'playwright';
import { ExternalService, FeedbackConfiguration, ParentText } from '../js/constants.js';
import { MobileLocation } from '../mobile/constants.js';

const PRIVACY_POLICY_URL = 'https://loopaware.mprlab.com/privacy/';
const PROVIDER_ORIGIN = new URL(ExternalService.LOOP_COUNTS).origin;
const SCRIPT_ORIGIN = new URL(ExternalService.LOOP_FEEDBACK).origin;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const CONFIGURATION_PATH = '/public/widget-config';
const OUTPUT_PATH = 'artifacts/privacy-inventory/native-requests.json';

/**
 * Capture packaged browser requests without feedback submission.
 * A custom provider route is for controlled integration checks only.
 * @param {{ routeProviderRequest?: (route: import('playwright').Route) => Promise<unknown> }} [options]
 */
export async function verifyPrivacy({ routeProviderRequest } = {}) {
    execFileSync(process.execPath, ['scripts/build-mobile-game.mjs'], { stdio: 'inherit' });
    const sources = new Map(await Promise.all([
        [MobileLocation.GAME, 'game.html'],
        [MobileLocation.PARENTS, 'parents.html'],
        [MobileLocation.ANALYTICS, 'analytics.html']
    ].map(async ([location, name]) => [location, await readFile(`mobile/generated/${name}`, 'utf8')])));
    const results = [];
    for (const engine of [chromium, webkit]) {
        const browser = await engine.launch();
        try {
            const context = await browser.newContext();
            try {
                let phase = 'game';
                const requests = [];
                const blockedRequests = [];
                const failures = [];
                const responseStatuses = new Map();
                context.on('response', (response) => responseStatuses.set(response.request(), response.status()));
                context.on('requestfailed', (request) => failures.push({ request, url: request.url(), error: request.failure()?.errorText }));
                await context.route('**/*', async (route) => {
                    const request = route.request();
                    const source = sources.get(request.url());
                    if (source) return route.fulfill({ contentType: 'text/html', body: source });
                    const url = new URL(request.url());
                    const allowedRead = request.method() === 'GET' && (FONT_HOSTS.includes(url.hostname) || [SCRIPT_ORIGIN, PROVIDER_ORIGIN].includes(url.origin));
                    const allowedCount = request.method() === 'POST' && request.url() === ExternalService.LOOP_COUNTS && request.postData() === '{}';
                    if (!allowedRead && !allowedCount) {
                        blockedRequests.push({ phase, url: request.url(), method: request.method() });
                        return route.abort();
                    }
                    const headers = await request.allHeaders();
                    requests.push({ request, phase, url: request.url(), method: request.method(), body: request.postData(), cookie: Boolean(headers.cookie), referrer: headers.referer ?? null });
                    return routeProviderRequest ? routeProviderRequest(route) : route.continue();
                });
                const gamePage = await context.newPage();
                await gamePage.goto(MobileLocation.GAME);
                await gamePage.locator('#loading[hidden]').waitFor({ state: 'attached' });
                await gamePage.locator('input[value="peanuts"]').check();
                await gamePage.locator('#start').click();
                await gamePage.locator('#wheel-continue').click();
                await gamePage.locator('#reveal[aria-hidden="false"]').waitFor();
                await gamePage.evaluate(() => document.fonts.ready);
                const gameStorage = await gamePage.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
                assert.deepEqual(gameStorage, { local: [], session: [] });
                await gamePage.reload();
                await gamePage.locator('#loading[hidden]').waitFor({ state: 'attached' });
                assert.equal(await gamePage.locator('input[value="peanuts"]').isChecked(), false);
                assert.equal(await gamePage.locator('#start').isEnabled(), false);
                assert.ok(requests.some(({ url }) => url === ExternalService.FONTS), 'The font stylesheet must load.');
                assert.ok(requests.some(({ url }) => new URL(url).hostname === 'fonts.gstatic.com'), 'The font file must load.');

                phase = 'isolated-count';
                const analyticsPage = await context.newPage();
                const countResponse = analyticsPage.waitForResponse(ExternalService.LOOP_COUNTS);
                await analyticsPage.goto(MobileLocation.ANALYTICS);
                assert.equal((await countResponse).status(), 204);
                await analyticsPage.waitForFunction(() => document.documentElement.dataset.analyticsState === 'ready');
                const countRequests = requests.filter(({ url }) => url === ExternalService.LOOP_COUNTS);
                assert.equal(countRequests.length, 1);
                assert.equal(countRequests[0].body, '{}');
                assert.equal(countRequests[0].cookie, false);
                assert.equal(countRequests[0].referrer, null);
                const analyticsStorage = await analyticsPage.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
                assert.deepEqual(analyticsStorage, { local: [], session: [] });

                phase = 'parent-entry';
                const parentPage = await context.newPage();
                const beforeParent = requests.length;
                await parentPage.goto(MobileLocation.PARENTS);
                assert.equal(requests.length, beforeParent, 'Parent entry must have no provider requests.');
                phase = 'parent-gate';
                const factors = (await parentPage.locator('#parent-question').innerText()).match(/\d+/g).map(Number);
                await parentPage.getByLabel(ParentText.ANSWER).fill(String(factors[0] * factors[1]));
                await parentPage.getByRole('button', { name: ParentText.CONTINUE, exact: true }).click();
                const feedbackButton = parentPage.getByRole('button', { name: ParentText.FEEDBACK, exact: true });
                assert.equal(await feedbackButton.isEnabled(), false);
                assert.equal(requests.length, beforeParent, 'The gate alone must have no provider requests.');
                phase = 'adult-agreement';
                await parentPage.getByRole('checkbox', { name: ParentText.AGREEMENT, exact: true }).check();
                assert.equal(requests.length, beforeParent, 'Agreement alone must have no provider requests.');
                phase = 'feedback-load';
                const configurationResponse = parentPage.waitForResponse((response) => new URL(response.url()).pathname === CONFIGURATION_PATH);
                await feedbackButton.click();
                const configuration = await configurationResponse;
                assert.equal(configuration.status(), 200);
                const siteId = new URL(ExternalService.LOOP_FEEDBACK).searchParams.get('site_id');
                assert.equal((await configuration.json()).site_id, siteId);
                await parentPage.getByRole('status').filter({ hasText: ParentText.READY }).waitFor();
                await parentPage.locator(`#${FeedbackConfiguration.BUBBLE_ID}`).click();
                await parentPage.locator(`#${FeedbackConfiguration.CONTACT_ID}`).waitFor();
                assert.equal(await parentPage.locator(`#${FeedbackConfiguration.PANEL_ID}`).isVisible(), true);
                const parentStorage = await parentPage.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
                assert.deepEqual(parentStorage, { local: [], session: [] });
                await parentPage.close();
                phase = 'parent-reopen';
                const beforeReopen = requests.length;
                const freshParent = await context.newPage();
                await freshParent.goto(MobileLocation.PARENTS);
                assert.equal(requests.length, beforeReopen);
                assert.equal(await freshParent.getByRole('button', { name: ParentText.FEEDBACK, exact: true }).isVisible(), false);
                assert.equal(requests.some(({ url }) => /google.*analytics|googletagmanager/.test(url)), false);
                assert.deepEqual(blockedRequests, [], 'Unexpected traffic must not be present.');
                // WebKit can report ERR_ABORTED for an accepted no-content response.
                // The collector's 204 response and the real app's ready state are checked above.
                const networkFailures = failures.filter(({ request, url }) => !(url === ExternalService.LOOP_COUNTS && responseStatuses.get(request) === 204));
                assert.deepEqual(networkFailures, [], 'All allowed provider requests must complete.');
                assert.ok(requests.every(({ request }) => responseStatuses.has(request)), 'Each request must have a response.');
                assert.ok(requests.every(({ request }) => responseStatuses.get(request) < 400), 'Provider responses must succeed.');
                const policyResponse = await context.request.get(PRIVACY_POLICY_URL);
                assert.equal(policyResponse.status(), 200);
                const policyText = await policyResponse.text();
                assert.match(policyText, /privacy/i);
                results.push({
                    engine: engine.name(), provider: routeProviderRequest ? 'controlled' : 'live',
                    requests: requests.map(({ request, ...record }) => ({ ...record, responseStatus: responseStatuses.get(request) })),
                    storage: { game: gameStorage, analytics: analyticsStorage, parents: parentStorage },
                    checkpoints: ['parent-entry', 'parent-gate', 'adult-agreement', 'parent-reopen'].map((name) => ({ phase: name, externalRequests: 0 })),
                    feedbackSubmission: 'not-performed',
                    policy: { url: PRIVACY_POLICY_URL, status: policyResponse.status(), sha256: createHash('sha256').update(policyText).digest('hex') }
                });
            } finally {
                await context.close();
            }
        } finally {
            await browser.close();
        }
    }
    return {
        capturedAt: new Date().toISOString(), environment: 'packaged HTML in automated Chromium and WebKit',
        qualification: 'Connectivity and request inventory only; native WebViews, proxy logs, retention execution, deletion, and store declarations require separate qualification.',
        results
    };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const { values } = parseArgs({ options: { output: { type: 'string', default: OUTPUT_PATH } } });
    const inventory = await verifyPrivacy();
    await mkdir(dirname(values.output), { recursive: true });
    await writeFile(values.output, `${JSON.stringify(inventory, null, 2)}\n`);
    console.info(`Privacy request inventory saved to ${values.output}. Feedback submission was not performed.`);
}
