// @ts-check
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ExternalService, ParentText } from '../js/constants.js';
import { MobileLocation } from '../mobile/constants.js';

/** Verify automatic mobile services separately from the feedback gate and game preferences. */
export async function runAutomaticServicesFlow(browser, gameSource, parentSource) {
    const context = await browser.newContext();
    const requests = [];
    await context.route('**/*', async (route) => {
        const url = route.request().url();
        if (url === MobileLocation.GAME) return route.fulfill({ contentType: 'text/html', body: gameSource });
        if (url === MobileLocation.PARENTS) return route.fulfill({ contentType: 'text/html', body: parentSource });
        if (url === MobileLocation.ANALYTICS) return route.fulfill({ contentType: 'text/html', body: await readFile('mobile/generated/analytics.html', 'utf8') });
        requests.push(url);
        if (url === ExternalService.FONTS) return route.fulfill({ contentType: 'text/css', body: 'body { font-family: sans-serif; }' });
        if ([ExternalService.GOOGLE_TAG, ExternalService.LOOP_ANALYTICS].includes(url)) {
            return route.fulfill({ contentType: 'text/javascript', body: 'window.providerSawSelection = localStorage.getItem("selectedAllergen");' });
        }
        return route.abort();
    });
    try {
        const gamePage = await context.newPage();
        await gamePage.goto(MobileLocation.GAME);
        await gamePage.locator('#loading[hidden]').waitFor({ state: 'attached' });
        assert.ok(requests.includes(ExternalService.FONTS), 'The game must load fonts without a parent action.');
        await gamePage.evaluate(() => localStorage.setItem('selectedAllergen', 'peanuts'));
        const analyticsPage = await context.newPage();
        await analyticsPage.goto(MobileLocation.ANALYTICS);
        await analyticsPage.waitForFunction(() => document.documentElement.dataset.analyticsState === 'ready');
        assert.deepEqual(requests.sort(), [ExternalService.FONTS, ExternalService.GOOGLE_TAG, ExternalService.LOOP_ANALYTICS].sort());
        assert.equal(await analyticsPage.evaluate(() => window.providerSawSelection), null, 'Analytics must not read game-origin preferences.');
        const events = await analyticsPage.evaluate(() => window.dataLayer.map((event) => Array.from(event)));
        assert.equal(events[0][2].ad_storage, 'denied');
        assert.equal(events[0][2].analytics_storage, 'denied');
        assert.equal(events[2][2].page_location, MobileLocation.GAME);
        assert.equal(JSON.stringify(events).includes('peanuts'), false);
        const parentPage = await context.newPage();
        await parentPage.goto(MobileLocation.PARENTS);
        assert.equal(await parentPage.getByRole('button', { name: 'Enable analytics for this visit' }).count(), 0);
        assert.equal(await parentPage.getByRole('button', { name: 'Load online fonts' }).count(), 0);
        assert.equal(await parentPage.getByRole('button', { name: ParentText.FEEDBACK, exact: true }).isVisible(), false);
        assert.equal(await parentPage.locator('#privacy-text').isVisible(), false, 'Detailed privacy text starts collapsed.');
        await parentPage.getByLabel(ParentText.ANSWER).fill('0');
        await parentPage.getByRole('button', { name: ParentText.CONTINUE, exact: true }).click();
        assert.equal(await parentPage.getByRole('button', { name: ParentText.FEEDBACK, exact: true }).isVisible(), false);
        const factors = (await parentPage.locator('#parent-question').innerText()).match(/\d+/g).map(Number);
        await parentPage.getByLabel(ParentText.ANSWER).fill(String(factors[0] * factors[1]));
        await parentPage.getByRole('button', { name: ParentText.CONTINUE, exact: true }).click();
        assert.equal(await parentPage.getByRole('button', { name: ParentText.FEEDBACK, exact: true }).isVisible(), true);
        assert.equal(requests.includes(ExternalService.LOOP_FEEDBACK), false, 'Feedback starts only after its guarded action.');
        await parentPage.reload();
        assert.equal(await parentPage.getByRole('button', { name: ParentText.FEEDBACK, exact: true }).isVisible(), false);
        const offlineContext = await browser.newContext({ offline: true });
        try {
            const offlinePage = await offlineContext.newPage();
            await offlinePage.setContent(await readFile('mobile/generated/analytics.html', 'utf8'));
            await offlinePage.waitForFunction(() => document.documentElement.dataset.analyticsState === 'unavailable');
        } finally {
            await offlineContext.close();
        }
        console.info('Automatic fonts and isolated analytics passed; feedback alone requires the parent gate.');
    } finally {
        await context.close();
    }
}
