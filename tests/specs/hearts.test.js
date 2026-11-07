// @ts-check
import { defineSuite } from '../harness.js';
import { assertEqual } from '../assert.js';
import { renderHearts } from '../../js/ui/hearts.js';
import { HeartsElementId, HeartsText, WheelConfiguration } from '../../js/constants.js';

defineSuite('Heart goal', (test) => {
    test('renderHearts shows the full goal through gains, losses, and reset', () => {
        const bar = document.createElement('div');
        bar.id = HeartsElementId.HEARTS_BAR;
        document.body.appendChild(bar);
        try {
            for (const count of [0, 1, 5, 9, 10, 9, 1, 0, 5]) {
                renderHearts(count);
                assertEqual(bar.querySelectorAll('.heart').length, WheelConfiguration.WIN_CONDITION_HEARTS);
                assertEqual(bar.querySelectorAll('.heart:not(.heart-empty)').length, count);
                assertEqual(bar.querySelector('.heart-count')?.textContent,
                    `${count}${HeartsText.COUNT_SEPARATOR}${WheelConfiguration.WIN_CONDITION_HEARTS}`);
                assertEqual(bar.querySelector('.heart-goal')?.textContent, HeartsText.GOAL);
            }
        } finally {
            bar.remove();
        }
    });
});
