// @ts-check
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { MobileLocation } from '../mobile/constants.js';
import { ParentService } from '../js/constants.js';

execFileSync(process.execPath, ['scripts/build-mobile-game.mjs'], { stdio: 'inherit' });
const documentSource = await readFile('mobile/generated/game.html', 'utf8');
const browser = await chromium.launch();
try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
        const context = await browser.newContext({ viewport, offline: true });
        const page = await context.newPage();
        await page.evaluate(() => {
            const NativeAudioContext = window.AudioContext;
            window.audioContexts = [];
            window.AudioContext = class extends NativeAudioContext {
                constructor(...args) { super(...args); window.audioContexts.push(this); }
            };
        });
        const externalRequests = [];
        const errors = [];
        page.on('request', (request) => {
            if (/^https?:/.test(request.url())) externalRequests.push(request.url());
        });
        page.on('pageerror', (error) => errors.push(error.message));
        await page.clock.install();
        await page.setContent(documentSource, { waitUntil: 'load' });
        await page.locator('#loading[hidden]').waitFor({ state: 'attached' });
        assert.equal(await page.locator('#load-error').isVisible(), false);
        assert.equal(await page.getByRole('button', { name: 'Full Screen', exact: true }).isVisible(), false, 'Native shell already fills the available screen.');
        await page.locator('input[value="peanuts"]').check();
        await page.locator('#start').click();
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('allergy-wheel:lifecycle', { detail: 'background' })));
        await page.clock.runFor(1500);
        await page.waitForFunction(() => window.audioContexts.length > 0 && window.audioContexts.every((context) => context.state === 'suspended'), null, { timeout: 2000 });
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('allergy-wheel:lifecycle', { detail: 'active' })));
        await page.locator('#wheel-continue').click();
        await page.locator('#reveal[aria-hidden="false"]').waitFor();
        assert.ok((await page.locator('#dish-ingredients').innerText()).length > 0);
        await page.locator('#again').click();
        await page.clock.runFor(35_000);
        await page.locator('#reveal[aria-hidden="false"]').waitFor();
        const imagesLoaded = await page.locator('img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0));
        assert.equal(imagesLoaded, true, 'Packaged images must load offline.');
        assert.deepEqual(externalRequests, [], 'The initial game must not contact external services.');
        assert.deepEqual(errors, []);
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('allergy-wheel:lifecycle', { detail: 'background' })));
        await page.waitForFunction(() => window.audioContexts.length > 0 && window.audioContexts.every((context) => context.state === 'suspended'), null, { timeout: 2000 });
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('allergy-wheel:lifecycle', { detail: 'active' })));
        await page.waitForFunction(() => window.audioContexts.every((context) => context.state === 'running'), null, { timeout: 2000 });
        await context.close();
    }
    const parentSource = await readFile('mobile/generated/parents.html', 'utf8');
    const context = await browser.newContext({ offline: true });
    const parentPage = await context.newPage();
    await parentPage.setContent(parentSource);
    assert.equal(await parentPage.getByRole('button', { name: 'Enable analytics for this visit' }).isVisible(), false);
    const question = await parentPage.locator('#parent-question').innerText();
    const numbers = question.match(/\d+/g).map(Number);
    await parentPage.getByLabel('Answer').fill('0');
    await parentPage.getByRole('button', { name: 'Continue', exact: true }).click();
    assert.equal(await parentPage.getByRole('button', { name: 'Enable analytics for this visit' }).isVisible(), false);
    await parentPage.getByLabel('Answer').fill(String(numbers[0] * numbers[1]));
    await parentPage.getByRole('button', { name: 'Continue', exact: true }).click();
    await parentPage.getByRole('button', { name: 'Enable analytics for this visit' }).waitFor();
    await parentPage.getByRole('button', { name: 'Open LoopAware feedback' }).click();
    await parentPage.getByRole('status').filter({ hasText: 'Internet is unavailable' }).waitFor();
    assert.ok((await parentPage.locator('#privacy-text').innerText()).includes('support@mprlab.com'));
    await context.close();
    const connected = await browser.newContext();
    const requests = [];
    await connected.route('**/*', (route) => {
        const url = route.request().url();
        if (url === MobileLocation.GAME) return route.fulfill({ contentType: 'text/html', body: '<main>Game storage fixture</main>' });
        if (url === MobileLocation.PARENTS) return route.fulfill({ contentType: 'text/html', body: parentSource });
        requests.push(url);
        if ([ParentService.GOOGLE_TAG, ParentService.LOOP_ANALYTICS, ParentService.LOOP_FEEDBACK].includes(url)) {
            return route.fulfill({ contentType: 'text/javascript', body: 'window.providerSawSelection = localStorage.getItem("selectedAllergen");' });
        }
        if (url === ParentService.FONTS) return route.fulfill({ contentType: 'text/css', body: 'body { font-family: sans-serif; }' });
        return route.abort();
    });
    const connectedPage = await connected.newPage();
    await connectedPage.goto(MobileLocation.GAME);
    await connectedPage.evaluate(() => localStorage.setItem('selectedAllergen', 'peanuts'));
    await connectedPage.goto(MobileLocation.PARENTS);
    assert.deepEqual(requests, [], 'Parent entry must not start a service before consent.');
    const factors = (await connectedPage.locator('#parent-question').innerText()).match(/\d+/g).map(Number);
    await connectedPage.getByLabel('Answer').fill(String(factors[0] * factors[1]));
    await connectedPage.getByRole('button', { name: 'Continue', exact: true }).click();
    assert.deepEqual(requests, [], 'Passing the gate must not enable analytics.');
    for (const name of ['Enable analytics for this visit', 'Open LoopAware feedback', 'Load online fonts']) {
        await connectedPage.getByRole('button', { name, exact: true }).click();
        await connectedPage.waitForFunction(() => document.querySelector('[role="status"]').textContent.includes('ready'));
    }
    assert.deepEqual(requests.sort(), [ParentService.GOOGLE_TAG, ParentService.LOOP_ANALYTICS, ParentService.LOOP_FEEDBACK, ParentService.FONTS].sort());
    assert.equal(await connectedPage.evaluate(() => window.providerSawSelection), null, 'Parent scripts cannot read game-origin storage.');
    const consent = await connectedPage.evaluate(() => Array.from(window.dataLayer[0]));
    assert.equal(consent[0], 'consent');
    assert.equal(consent[2].ad_storage, 'denied');
    assert.equal(consent[2].analytics_storage, 'denied');
    await connectedPage.reload();
    assert.equal(await connectedPage.getByRole('button', { name: 'Enable analytics for this visit' }).isVisible(), false);
    assert.equal(requests.length, 4, 'A new parent document requires a new choice.');
    await connected.close();
    console.info('Parent controls passed explicit consent, external resource boundaries, storage isolation, and session reset.');
    console.info('Mobile package passed offline first-launch and game rounds at phone and tablet sizes.');
} finally {
    await browser.close();
}
