// @ts-check

import { defineSuite } from "../harness.js";
import { assertEqual } from "../assert.js";
import { setStartButtonBlockedState } from "../../js/utils/startButtonState.js";
import {
    AttributeBooleanValue,
    AttributeName,
    ControlElementId
} from "../../js/constants.js";

defineSuite("Start button state", (test) => {
    test("toggle blocked attribute", () => {
        const cases = [
            { description: "blocks start button", shouldBlock: true, expected: AttributeBooleanValue.TRUE },
            { description: "unblocks start button", shouldBlock: false, expected: AttributeBooleanValue.FALSE }
        ];
        for (const { description, shouldBlock, expected } of cases) {
            const startButtonElement = document.createElement("button");
            startButtonElement.id = ControlElementId.START_BUTTON;
            document.body.appendChild(startButtonElement);

            setStartButtonBlockedState({
                documentReference: document,
                controlElementIdMap: ControlElementId,
                attributeNameMap: AttributeName,
                shouldBlock
            });

            assertEqual(
                startButtonElement.getAttribute(AttributeName.DATA_BLOCKED),
                expected,
                `data-blocked mismatch: ${description}`
            );
            assertEqual(
                startButtonElement.getAttribute(AttributeName.ARIA_DISABLED),
                expected,
                `aria-disabled mismatch: ${description}`
            );

            startButtonElement.remove();
        }
    });
});
