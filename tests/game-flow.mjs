// @ts-check
import assert from "node:assert/strict";

/** Exercise the real game with its catalogs, controls, wheel, and audio APIs. */
export async function runGameFlow(browser, gameUrl) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("**/*", (route) => new URL(route.request().url()).origin === new URL(gameUrl).origin
        ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
        await page.clock.install();
        await page.goto(gameUrl, { waitUntil: "domcontentloaded" });
        await page.locator('#loading[hidden]').waitFor({ state: "attached" });
        assert.equal(await page.locator('#load-error').isVisible(), false);
        assert.equal(await page.locator('#start').getAttribute('aria-disabled'), 'true');
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'allergy');
        await page.locator('input[value="peanuts"]').check();
        await page.locator('#mute').click();
        assert.equal(await page.locator('#mute').getAttribute('aria-pressed'), 'true');
        await page.locator('#start').click();
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'wheel');
        assert.equal(await page.locator('#screen-allergy').isVisible(), false);
        await page.locator('#wheel-continue').click();
        await page.locator('#reveal[aria-hidden="false"]').waitFor();
        assert.ok((await page.locator('#dish-ingredients').innerText()).length > 0);
        assert.ok((await page.locator('#dish-title').innerText()).length > 0);
        await page.locator('#again').click();
        await page.clock.runFor(35_000);
        await page.locator('#reveal[aria-hidden="false"]').waitFor();
        await page.keyboard.press('Escape');
        await page.locator('#wheel-restart').click();
        await page.locator('#restart-confirmation-cancel').click();
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'wheel');
        await page.locator('#wheel-restart').click();
        await page.locator('#restart-confirmation-confirm').click();
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'allergy');
        await page.locator('#nav-menu').click();
        await page.locator('#menu-table-body tr').first().waitFor();
        assert.ok(await page.locator('#menu-table-body tr').count() > 1);
        const menuText = await page.locator('#menu-table-body').innerText();
        assert.doesNotMatch(menuText, /\b(?:wine|beer|alcohol|vodka|brandy|rum|whiskey|whisky|liqueur)\b/i);
        const codRow = page.locator('#menu-table-body tr').filter({ hasText: 'Crispy Battered Cod' });
        await codRow.waitFor();
        assert.match(await codRow.innerText(), /cod[\s\S]*wheat flour[\s\S]*egg[\s\S]*milk/i);
        const musselsRow = page.locator('#menu-table-body tr').filter({ hasText: 'Mussels with Fries' });
        assert.match(await musselsRow.innerText(), /mussels[\s\S]*cream[\s\S]*butter[\s\S]*lemon/i);
        await page.locator('#nav-game').click();
        await page.locator('#mute').click();
        assert.equal(await page.locator('#mute').getAttribute('aria-pressed'), 'false');
        assert.deepEqual(errors, []);
        console.info('Real game flow passed: selection, Stop, automatic stop, reveal, restart, mute, and navigation.');
    } finally {
        await context.close();
    }
}
