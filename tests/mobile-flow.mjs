// @ts-check
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { runFeedbackFlow } from './feedback-flow.mjs';
import { ExternalService, ParentText } from '../js/constants.js';
import { runAutomaticServicesFlow } from './mobile-services.mjs';

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
        assert.ok(externalRequests.every((url) => url === ExternalService.FONTS), 'Offline game startup may attempt its font stylesheet only.');
        assert.deepEqual(errors, []);
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('allergy-wheel:lifecycle', { detail: 'background' })));
        await page.waitForFunction(() => window.audioContexts.length > 0 && window.audioContexts.every((context) => context.state === 'suspended'), null, { timeout: 2000 });
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('allergy-wheel:lifecycle', { detail: 'active' })));
        await page.waitForFunction(() => window.audioContexts.every((context) => context.state === 'running'), null, { timeout: 2000 });
        await context.close();
    }
    const parentSource = await readFile('mobile/generated/parents.html', 'utf8');
    await runAutomaticServicesFlow(browser, documentSource, parentSource);
    await runFeedbackFlow(browser, parentSource);
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
    assert.equal(await parentPage.getByRole('button', { name: 'Enable analytics for this visit' }).count(), 0);
    await parentPage.getByRole('button', { name: ParentText.FEEDBACK }).click();
    await parentPage.getByRole('status').filter({ hasText: 'Internet is unavailable' }).waitFor();
    await parentPage.getByText(ParentText.PRIVACY_TITLE, { exact: true }).click();
    assert.ok((await parentPage.locator('#privacy-text').innerText()).includes('support@mprlab.com'));
    await context.close();
    console.info('Mobile package passed offline first-launch and game rounds at phone and tablet sizes.');
} finally {
    await browser.close();
}
