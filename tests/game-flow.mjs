// @ts-check
import assert from "node:assert/strict";
import { runPageFlow } from "../scripts/page-flow.mjs";

/** Exercise the real game with its catalogs, controls, wheel, and audio APIs. */
export async function runGameFlow(browser, gameUrl) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route("**/*", (route) => new URL(route.request().url()).origin === new URL(gameUrl).origin
        ? route.continue() : route.abort());
    const page = await context.newPage();
    await runPageFlow(page, async () => {
        await page.clock.install();
        await page.goto(gameUrl, { waitUntil: "domcontentloaded" });
        await page.locator('#loading[hidden]').waitFor({ state: "attached" });
        assert.equal(await page.locator('#load-error').isVisible(), false);
        const assertHeartGoal = async () => {
            const count = Number(await page.locator('#hearts-bar').getAttribute('data-count'));
            assert.equal(await page.locator('.heart-icons .heart').count(), 10, 'The goal must always show ten heart slots.');
            assert.equal(await page.locator('.heart-icons .heart:not(.heart-empty)').count(), count);
            assert.equal(await page.locator('.heart-count').innerText(), `${count} / 10`);
            assert.equal(await page.locator('.heart-goal').innerText(), 'Collect 10 hearts to win');
            assert.equal(await page.locator('#hearts-bar').getAttribute('aria-label'), `${count} of 10 hearts. Collect 10 hearts to win.`);
        };
        await assertHeartGoal();
        assert.equal(await page.locator('#start').getAttribute('aria-disabled'), 'true');
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'allergy');
        assert.equal(await page.locator('.header-nav button').count(), 1, 'Navigation must use one destination button.');
        assert.equal(await page.locator('#nav-toggle').innerText(), 'Menu');
        assert.equal(await page.locator('#nav-toggle').getAttribute('aria-controls'), 'screen-menu');
        assert.equal(await page.getByRole('button', { name: 'Full Screen', exact: true }).locator('svg').count(), 1);
        await page.locator('input[value="peanuts"]').check();
        await page.locator('#mute').click();
        assert.equal(await page.locator('#mute').getAttribute('aria-pressed'), 'true');
        await page.locator('#start').click();
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'wheel');
        assert.equal(await page.locator('#screen-allergy').isVisible(), false);
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'menu');
        assert.equal(await page.locator('#nav-toggle').innerText(), 'Game');
        assert.equal(await page.locator('#nav-toggle').getAttribute('aria-controls'), 'screen-wheel');
        await page.getByRole('button', { name: 'Game', exact: true }).click();
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'wheel', 'Game must return to the current wheel round.');
        assert.equal(await page.locator('#nav-toggle').innerText(), 'Menu');
        await page.locator('#wheel-continue').click();
        await page.locator('#reveal[aria-hidden="false"]').waitFor();
        assert.ok((await page.locator('#dish-ingredients').innerText()).length > 0);
        assert.ok((await page.locator('#dish-title').innerText()).length > 0);
        await assertHeartGoal();
        await page.locator('#again').click();
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
        await page.clock.runFor(35_000);
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'menu');
        assert.equal(await page.locator('#reveal').isVisible(), false);
        await page.getByRole('button', { name: 'Game', exact: true }).click();
        await page.locator('#reveal[aria-hidden="false"]').waitFor();
        assert.equal(await page.locator('#reveal').isVisible(), true, 'A result completed in Menu must appear when Game resumes.');
        await page.keyboard.press('Escape');
        await page.locator('#wheel-restart').click();
        await page.locator('#restart-confirmation-cancel').click();
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'wheel');
        await page.locator('#wheel-restart').click();
        await page.locator('#restart-confirmation-confirm').click();
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'allergy');
        await assertHeartGoal();
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
        assert.equal(await page.locator('#nav-toggle').innerText(), 'Game');
        assert.equal(await page.locator('#nav-toggle').getAttribute('aria-controls'), 'screen-allergy');
        await page.locator('#menu-table-body tr').first().waitFor();
        assert.ok(await page.locator('#menu-table-body tr').count() > 1);
        const menuText = await page.locator('#menu-table-body').innerText();
        assert.doesNotMatch(menuText, /\b(?:wine|beer|alcohol|vodka|brandy|rum|whiskey|whisky|liqueur)\b/i);
        const codRow = page.locator('#menu-table-body tr').filter({ hasText: 'Crispy Battered Cod' });
        await codRow.waitFor();
        assert.match(await codRow.innerText(), /cod[\s\S]*wheat flour[\s\S]*egg[\s\S]*milk/i);
        const musselsRow = page.locator('#menu-table-body tr').filter({ hasText: 'Mussels with Fries' });
        assert.match(await musselsRow.innerText(), /mussels[\s\S]*cream[\s\S]*butter[\s\S]*lemon/i);
        await page.getByRole('button', { name: 'Game', exact: true }).click();
        assert.equal(await page.locator('body').getAttribute('data-screen'), 'allergy');
        assert.equal(await page.locator('#nav-toggle').innerText(), 'Menu');
        await page.locator('#mute').click();
        assert.equal(await page.locator('#mute').getAttribute('aria-pressed'), 'false');
        console.info('Real game flow passed: selection, Stop, automatic stop, reveal, restart, mute, and navigation.');
    });
}
