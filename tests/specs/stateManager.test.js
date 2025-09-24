// @ts-check

import { defineSuite } from "../harness.js";
import { assertEqual, assertThrows } from "../assert.js";
import { StateManager, DEFAULT_INITIAL_HEARTS_COUNT } from "../../js/core/state.js";
import { WheelControlMode, AvatarId } from "../../js/constants.js";

defineSuite("StateManager", (test) => {
    test("setHeartsCount clamps numeric input", () => {
        const stateManager = new StateManager();
        const cases = [
            { description: "drops fractional input", initialHearts: 7, input: 4.6, expected: 4 },
            { description: "ignores negatives", initialHearts: 5, input: -3, expected: 0 },
            { description: "accepts zero", initialHearts: 3, input: 0, expected: 0 },
            { description: "keeps positive integers", initialHearts: 2, input: 9, expected: 9 }
        ];
        for (const { description, initialHearts, input, expected } of cases) {
            stateManager.initialize({ initialHeartsCount: initialHearts });
            stateManager.setHeartsCount(input);
            assertEqual(
                stateManager.getHeartsCount(),
                expected,
                `hearts count mismatch: ${description}`
            );
        }
    });

    test("setHeartsCount rejects invalid values", () => {
        const stateManager = new StateManager();
        const cases = [
            { description: "rejects NaN", input: Number.NaN },
            { description: "rejects null", input: null },
            { description: "rejects undefined", input: undefined }
        ];
        for (const { description, input } of cases) {
            assertThrows(
                () => stateManager.setHeartsCount(/** @type {number} */ (input)),
                `expected error when ${description}`
            );
        }
    });

    test("setWheelControlMode normalizes values", () => {
        const stateManager = new StateManager();
        const cases = [
            { description: "accepts start", input: WheelControlMode.START, expected: WheelControlMode.START },
            { description: "accepts stop", input: WheelControlMode.STOP, expected: WheelControlMode.STOP },
            { description: "defaults unknown", input: "not-a-mode", expected: WheelControlMode.STOP }
        ];
        for (const { description, input, expected } of cases) {
            stateManager.setWheelControlMode(/** @type {string} */ (input));
            assertEqual(
                stateManager.getWheelControlMode(),
                expected,
                `wheel control mode mismatch: ${description}`
            );
        }
    });

    test("setSelectedAvatar coerces unknown identifiers", () => {
        const stateManager = new StateManager();
        const cases = [
            { description: "keeps known avatar", input: AvatarId.TYRANNOSAURUS_REX, expected: AvatarId.TYRANNOSAURUS_REX },
            { description: "falls back on empty", input: "", expected: AvatarId.DEFAULT },
            { description: "falls back on null", input: null, expected: AvatarId.DEFAULT }
        ];
        for (const { description, input, expected } of cases) {
            stateManager.setSelectedAvatar(/** @type {string} */ (input));
            assertEqual(
                stateManager.getSelectedAvatar(),
                expected,
                `avatar selection mismatch: ${description}`
            );
        }
    });

    test("initialize validates hearts input", () => {
        const invalidCases = [
            { description: "rejects string", input: "five" },
            { description: "rejects NaN", input: Number.NaN }
        ];
        for (const { description, input } of invalidCases) {
            assertThrows(
                () => new StateManager({ initialHeartsCount: /** @type {number} */ (input) }),
                `expected initialization error when ${description}`
            );
        }
        const stateManager = new StateManager();
        stateManager.initialize({ initialHeartsCount: DEFAULT_INITIAL_HEARTS_COUNT });
        assertEqual(
            stateManager.getHeartsCount(),
            DEFAULT_INITIAL_HEARTS_COUNT,
            "initialize should set default hearts"
        );
    });
});
