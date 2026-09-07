// @ts-check
import assert from 'node:assert/strict';

const listings = Object.freeze({ android: 'https://play.google.com/store/apps/details?id=com.mprlab.allergywheel', ios: 'https://apps.apple.com/app/id1234567890' });

/** Verify installation links through the real website with controlled catalog responses. */
export async function runStoreFlow(browser, gameUrl) {
    const cases = [
        { userAgent: 'Android', platform: 'Linux armv8l', touch: 1, first: 'android', stores: listings },
        { userAgent: 'iPhone', platform: 'iPhone', touch: 1, first: 'ios', stores: listings },
        { userAgent: 'Macintosh', platform: 'MacIntel', touch: 5, first: 'ios', stores: listings },
        { userAgent: 'Unknown', platform: 'Unknown', touch: 0, first: 'android', stores: listings },
        { userAgent: 'Android', platform: 'Linux', touch: 1, first: 'ios', stores: { android: null, ios: listings.ios } },
        { userAgent: 'Unknown', platform: 'Unknown', touch: 0, first: null, stores: { android: null, ios: null } }
    ];
    for (const scenario of cases) {
        const context = await browser.newContext({ userAgent: scenario.userAgent });
        await context.addInitScript(({ platform, touch }) => {
            Object.defineProperty(navigator, 'platform', { value: platform });
            Object.defineProperty(navigator, 'maxTouchPoints', { value: touch });
        }, scenario);
        await context.route('**/*', (route) => {
            const url = new URL(route.request().url());
            if (url.pathname === '/data/mobile-stores.json') return route.fulfill({ json: scenario.stores });
            return url.origin === new URL(gameUrl).origin ? route.continue() : route.abort();
        });
        const page = await context.newPage();
        await page.goto(gameUrl, { waitUntil: 'networkidle' });
        const links = page.locator('#mobile-installation a');
        assert.equal(await links.count(), Object.values(scenario.stores).filter(Boolean).length);
        if (scenario.first) assert.equal(await links.first().getAttribute('data-platform'), scenario.first);
        else assert.equal(await page.locator('#mobile-installation').isVisible(), false);
        assert.equal(await page.locator('#screen-allergy').isVisible(), true);
        await page.getByRole('link', { name: 'Mobile privacy and support' }).click();
        await page.locator('#privacy-text').waitFor();
        assert.ok((await page.locator('#privacy-text').innerText()).includes('support@mprlab.com'));
        assert.equal(await page.getByRole('button').count(), 0);
        await context.close();
    }
    console.info('Store links passed Android, iPhone, iPadOS, unknown OS, partial availability, and unpublished cases.');
}
