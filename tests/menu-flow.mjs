// @ts-check
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { MobileLocation } from '../mobile/constants.js';
import { runPageFlow } from '../scripts/page-flow.mjs';

const websiteUrl = 'https://allergy.mprlab.com/';
const outputDirectory = '/output';
const widths = [320, 390, 768, 983, 1100, 1101, 1440];
const dishes = JSON.parse(await readFile('data/dishes.json', 'utf8'));
const ingredients = JSON.parse(await readFile('data/ingredients.json', 'utf8'));
const ingredientEmoji = new Map(ingredients.map((ingredient) => [ingredient.name, ingredient.emoji]));
const contentTypes = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml' };
execFileSync(process.execPath, ['scripts/build-mobile-game.mjs'], { stdio: 'inherit' });
const mobileSource = await readFile('mobile/generated/game.html', 'utf8');
const fontData = (await readFile('tests/fixtures/fredoka-one.ttf')).toString('base64');
await mkdir(outputDirectory, { recursive: true });

/** Open a filter through its visible control. */
async function openFilter(page, type) {
    const toggle = page.locator(`#menu-${type}-filter-toggle`);
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
    await page.locator(`#menu-${type}-filter-panel`).waitFor({ state: 'visible' });
}

/** Check every full story against the card, cell, and viewport. */
async function assertStoriesFit(page, width) {
    const result = await page.locator('.menu-row--data').evaluateAll((rows) => rows.map((row) => {
        const story = row.querySelector('.menu-narrative');
        const bounds = story.getBoundingClientRect();
        const cell = story.closest('td').getBoundingClientRect();
        const wrapper = row.closest('.menu-table-wrapper').getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(story);
        return {
            story: story.textContent,
            readable: bounds.width >= Math.min(200, innerWidth / 2),
            contained: [...range.getClientRects()].every((text) => text.left >= cell.left - 1 && text.right <= cell.right + 1
                && text.left >= wrapper.left && text.right <= wrapper.right && text.right <= innerWidth),
            fullWidth: cell.width >= wrapper.width - 8,
            scrollFits: story.scrollWidth <= story.clientWidth + 1,
            completeHeight: story.scrollHeight <= story.clientHeight + 1,
            clipped: getComputedStyle(story).overflow === 'hidden'
        };
    }));
    assert.equal(result.length, dishes.length);
    assert.deepEqual(result.map((item) => item.story), dishes.map((dish) => dish.narrative));
    for (const story of result) {
        assert.equal(story.readable, true, 'Stories must have readable line lengths.');
        assert.equal(story.contained, true, 'Story text must stay inside the card and viewport.');
        assert.equal(story.scrollFits && story.completeHeight && !story.clipped, true, 'The complete story must remain visible.');
        if (width <= 1100) assert.equal(story.fullWidth, true, 'Phone and tablet stories must span the full dish row.');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}

/** Verify filter panels and every food icon on their first opening. */
async function assertFilterFits(page, type) {
    await openFilter(page, type);
    const panel = page.locator(`#menu-${type}-filter-panel`);
    const fits = await panel.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        let ancestor = element.parentElement;
        while (ancestor) {
            const style = getComputedStyle(ancestor);
            const parentBounds = ancestor.getBoundingClientRect();
            if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)
                && (bounds.top < parentBounds.top || bounds.bottom > parentBounds.bottom)) return false;
            if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)
                && (bounds.left < parentBounds.left || bounds.right > parentBounds.right)) return false;
            ancestor = ancestor.parentElement;
        }
        return bounds.left >= 0 && bounds.right <= innerWidth && element.scrollWidth <= element.clientWidth;
    });
    assert.equal(fits, true, 'Open filters must fit inside the menu without clipping.');
    if (type === 'ingredient') {
        const options = await page.locator('#menu-ingredient-filter-list .menu-filter-option').evaluateAll((buttons) => buttons.map((button) => ({
            value: button.getAttribute('data-filter-value'),
            emoji: button.querySelector('.menu-filter-option__icon')?.textContent,
            visible: button.querySelector('.menu-filter-option__icon')
                && getComputedStyle(button.querySelector('.menu-filter-option__icon')).color !== 'rgba(0, 0, 0, 0)'
        })));
        for (const option of options) {
            assert.equal(option.emoji, ingredientEmoji.get(option.value), `Filter ${option.value} must show its existing food icon.`);
            assert.equal(option.visible, true, 'Food icons must stay visible before selection.');
        }
    }
    const lastOption = panel.locator('.menu-filter-option').last();
    await lastOption.scrollIntoViewIfNeeded();
    assert.equal(await lastOption.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const list = element.parentElement.getBoundingClientRect();
        const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        return bounds.top >= list.top - 1 && bounds.bottom <= list.bottom + 1 && element.contains(hit);
    }), true, 'The final filter option must be reachable inside its scroll area.');
    await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(), false);
    assert.equal(await page.locator(`#menu-${type}-filter-toggle`).evaluate((element) => element === document.activeElement), true);
}

/** Exercise combined filters and restore the complete menu. */
async function assertFiltering(page) {
    for (const [type, value] of [['ingredient', 'peanuts'], ['cuisine', 'thai'], ['cuisine', 'japanese'], ['ingredient', 'egg']]) {
        await openFilter(page, type);
        await page.locator(`#menu-${type}-filter-list [data-filter-value="${value}"]`).click();
        if (type === 'ingredient') {
            const selected = page.locator(`#menu-ingredient-filter-list [data-filter-value="${value}"]`);
            assert.equal(await selected.getAttribute('aria-pressed'), 'true');
            assert.equal(await selected.locator('.menu-filter-option__icon').textContent(), ingredientEmoji.get(value));
        }
    }
    const expected = dishes.filter((dish) => ['thai', 'japanese'].includes(dish.cuisine.toLowerCase())
        && ['peanuts', 'egg'].every((ingredient) => dish.ingredients.includes(ingredient)));
    assert.deepEqual(await page.locator('.menu-dish-title').allTextContents(), expected.map((dish) => dish.name));
    await openFilter(page, 'ingredient');
    await page.locator('#menu-ingredient-filter-list [data-filter-value="almonds"]').click();
    assert.equal(await page.locator('.menu-row--empty').count(), 1, 'An unmatched combination must show the empty state.');
    await assertFilterFits(page, 'ingredient');
    await assertFilterFits(page, 'cuisine');
    for (const type of ['ingredient', 'cuisine']) {
        await openFilter(page, type);
        await page.locator(`#menu-${type}-filter-clear`).click();
    }
    assert.equal(await page.locator('.menu-row--data').count(), dishes.length);
    await page.keyboard.press('Escape');
}

for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
        for (const surface of ['browser', 'mobile']) {
            for (const { width, fontMode } of widths.flatMap((width) => ['offline', 'fredoka'].map((fontMode) => ({ width, fontMode })))) {
                const context = await browser.newContext({ viewport: { width, height: 1000 } });
                try {
                    await context.route('**/*', async (route) => {
                        const url = new URL(route.request().url());
                        if (url.href === MobileLocation.GAME) return route.fulfill({ contentType: 'text/html', body: mobileSource });
                        if (url.hostname === 'fonts.googleapis.com' && fontMode === 'fredoka') return route.fulfill({ contentType: 'text/css', body: `@font-face { font-family: 'Fredoka One'; src: url(data:font/ttf;base64,${fontData}); }` });
                        if (url.origin !== new URL(websiteUrl).origin) return route.abort();
                        const path = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
                        return route.fulfill({ body: await readFile(path), contentType: contentTypes[path.split('.').at(-1)] });
                    });
                    const page = await context.newPage();
                    await runPageFlow(page, async () => {
                    await page.goto(surface === 'mobile' ? MobileLocation.GAME : websiteUrl);
                    await page.locator('#loading[hidden]').waitFor({ state: 'attached' });
                    await page.evaluate(() => document.fonts.ready);
                    await page.getByRole('button', { name: 'Menu', exact: true }).click();
                    await page.locator('.menu-row--data').first().waitFor();
                    await assertStoriesFit(page, width);
                    assert.equal(await page.getByRole('table', { name: 'Global Allergy-Friendly Menu' }).count(), 1);
                    await assertFilterFits(page, 'ingredient');
                    await assertFilterFits(page, 'cuisine');
                    await assertFiltering(page);
                    if ([390, 983, 1440].includes(width) && fontMode === 'fredoka') await page.screenshot({ path: `${outputDirectory}/${engine.name()}-${surface}-${width}.png` });
                    if (width === 983 && fontMode === 'fredoka') {
                        await openFilter(page, 'ingredient');
                        await page.locator('#menu-ingredient-filter-list').evaluate((element) => { element.scrollTop = 0; });
                        await page.screenshot({ path: `${outputDirectory}/${engine.name()}-${surface}-ingredients.png` });
                        await page.keyboard.press('Escape');
                        await page.locator('#mute').click();
                        await page.screenshot({ path: `${outputDirectory}/${engine.name()}-${surface}-muted.png` });
                        await page.locator('#mute').click();
                    }
                    if (width === 1100) {
                        await openFilter(page, 'ingredient');
                        for (const resizedWidth of [1101, 1100]) {
                            await page.setViewportSize({ width: resizedWidth, height: 1000 });
                            await page.locator('#menu-ingredient-filter-toggle').waitFor({ state: 'visible' });
                            assert.equal(await page.locator('#menu-ingredient-filter-panel').isVisible(), true);
                            await assertStoriesFit(page, resizedWidth);
                        }
                    }
                    await page.getByRole('button', { name: 'Game', exact: true }).click();
                    assert.equal(await page.locator('body').getAttribute('data-screen'), 'allergy');
                    console.info(`${engine.name()} ${surface} ${width} ${fontMode}: menu stories, icons, filters, and navigation passed.`);
                    });
                } finally {
                    await context.close();
                }
            }
        }
    } finally {
        await browser.close();
    }
}
