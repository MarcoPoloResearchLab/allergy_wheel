// @ts-check

import { defineSuite } from "../harness.js";
import { assert, assertEqual } from "../assert.js";
import { createListenerBinder } from "../../js/utils/listeners.js";
import {
    AttributeBooleanValue,
    AttributeName,
    AudioControlLabel,
    ButtonText,
    BrowserEventName,
    ControlElementId,
    KeyboardKey,
    WheelControlMode
} from "../../js/constants.js";

function createStateManagerStub({
    initialMuted = false,
    initialWheelControlMode = WheelControlMode.STOP
} = {}) {
    let mutedState = Boolean(initialMuted);
    let wheelControlMode = initialWheelControlMode;
    let toggleAudioMutedCallCount = 0;

    return {
        hasSelectedAllergen: () => true,
        getWheelControlMode: () => wheelControlMode,
        setWheelControlMode: (nextMode) => {
            wheelControlMode = nextMode;
            return wheelControlMode;
        },
        isAudioMuted: () => mutedState,
        toggleAudioMuted: () => {
            toggleAudioMutedCallCount += 1;
            mutedState = !mutedState;
            return mutedState;
        },
        getToggleAudioMutedCallCount: () => toggleAudioMutedCallCount
    };
}

function dispatchKeydownEvent(targetElement, keyValue) {
    const keyboardEvent = new KeyboardEvent(BrowserEventName.KEY_DOWN, {
        key: keyValue,
        bubbles: true
    });
    targetElement.dispatchEvent(keyboardEvent);
}

function renderRestartModalSkeleton() {
    document.body.innerHTML = `
        <section
            id="${ControlElementId.REVEAL_SECTION}"
            aria-hidden="${AttributeBooleanValue.FALSE}"
        ></section>
        <section
            id="${ControlElementId.GAME_OVER_SECTION}"
            aria-hidden="${AttributeBooleanValue.FALSE}"
        ></section>
        <div
            id="${ControlElementId.WHEEL_CONTROL_CONTAINER}"
            data-wheel-control-mode="${WheelControlMode.STOP}"
        ></div>
        <div
            aria-hidden="${AttributeBooleanValue.FALSE}"
            id="${ControlElementId.WHEEL_RESTART_BUTTON}"
            role="button"
            tabindex="0"
        ></div>
        <div
            aria-hidden="${AttributeBooleanValue.TRUE}"
            hidden
            id="${ControlElementId.RESTART_CONFIRMATION_CONTAINER}"
        >
            <div id="${ControlElementId.RESTART_CONFIRMATION_OVERLAY}"></div>
            <div
                aria-hidden="${AttributeBooleanValue.TRUE}"
                id="${ControlElementId.RESTART_CONFIRMATION_DIALOG}"
                tabindex="-1"
            >
                <div>
                    <button
                        id="${ControlElementId.RESTART_CONFIRMATION_CONFIRM_BUTTON}"
                        type="button"
                    ></button>
                    <button
                        id="${ControlElementId.RESTART_CONFIRMATION_CANCEL_BUTTON}"
                        type="button"
                    ></button>
                </div>
            </div>
        </div>
    `;
}

defineSuite("Listener binder", (test) => {
    test("wireMuteButton applies the initial presentation", () => {
        const cases = [
            {
                description: "applies the unmuted presentation when audio starts active",
                initialMuted: false,
                expectedPressed: AttributeBooleanValue.FALSE,
                expectedText: ButtonText.MUTE,
                expectedLabel: AudioControlLabel.MUTE_AUDIO
            },
            {
                description: "applies the muted presentation when audio starts disabled",
                initialMuted: true,
                expectedPressed: AttributeBooleanValue.TRUE,
                expectedText: ButtonText.SOUND_ON,
                expectedLabel: AudioControlLabel.UNMUTE_AUDIO
            }
        ];

        for (const {
            description,
            initialMuted,
            expectedPressed,
            expectedText,
            expectedLabel
        } of cases) {
            document.body.innerHTML = `
                <button id="${ControlElementId.MUTE_BUTTON}" aria-pressed="false"></button>
            `;
            const stateManager = createStateManagerStub({ initialMuted });
            const binder = createListenerBinder({
                controlElementId: ControlElementId,
                attributeName: AttributeName,
                documentReference: document,
                stateManager
            });

            binder.wireMuteButton();

            const muteButton = /** @type {HTMLButtonElement | null} */ (
                document.getElementById(ControlElementId.MUTE_BUTTON)
            );
            assert(muteButton !== null, "mute button should exist after wiring");
            assertEqual(
                muteButton.getAttribute(AttributeName.ARIA_PRESSED),
                expectedPressed,
                `aria-pressed mismatch: ${description}`
            );
            assertEqual(
                muteButton.textContent ?? "",
                expectedText,
                `text content mismatch: ${description}`
            );
            assertEqual(
                muteButton.getAttribute(AttributeName.ARIA_LABEL),
                expectedLabel,
                `aria-label mismatch: ${description}`
            );

            document.body.innerHTML = "";
        }
    });

    test("wireMuteButton toggles state and notifies listeners", () => {
        document.body.innerHTML = `
            <button id="${ControlElementId.MUTE_BUTTON}" aria-pressed="false"></button>
        `;
        const stateManager = createStateManagerStub({ initialMuted: false });
        const binder = createListenerBinder({
            controlElementId: ControlElementId,
            attributeName: AttributeName,
            documentReference: document,
            stateManager
        });
        const observedMuteStates = [];

        binder.wireMuteButton({
            onMuteChange: (muteState) => {
                observedMuteStates.push(Boolean(muteState));
            }
        });

        const muteButton = /** @type {HTMLButtonElement | null} */ (
            document.getElementById(ControlElementId.MUTE_BUTTON)
        );
        assert(muteButton !== null, "mute button should exist after wiring");

        muteButton.click();

        assertEqual(
            stateManager.getToggleAudioMutedCallCount(),
            1,
            "toggleAudioMuted should be called on first click"
        );
        assertEqual(observedMuteStates.length, 1, "onMuteChange should fire once after first toggle");
        assertEqual(observedMuteStates[0], true, "first toggle should report muted state");
        assertEqual(
            muteButton.getAttribute(AttributeName.ARIA_PRESSED),
            AttributeBooleanValue.TRUE,
            "aria-pressed should reflect muted state"
        );
        assertEqual(muteButton.textContent ?? "", ButtonText.SOUND_ON, "text should switch to sound-on");
        assertEqual(
            muteButton.getAttribute(AttributeName.ARIA_LABEL),
            AudioControlLabel.UNMUTE_AUDIO,
            "aria-label should describe unmute action"
        );

        muteButton.click();

        assertEqual(
            stateManager.getToggleAudioMutedCallCount(),
            2,
            "toggleAudioMuted should be called on second click"
        );
        assertEqual(observedMuteStates.length, 2, "onMuteChange should fire on second toggle");
        assertEqual(observedMuteStates[1], false, "second toggle should report unmuted state");
        assertEqual(
            muteButton.getAttribute(AttributeName.ARIA_PRESSED),
            AttributeBooleanValue.FALSE,
            "aria-pressed should reset to false"
        );
        assertEqual(muteButton.textContent ?? "", ButtonText.MUTE, "text should reset to mute");
        assertEqual(
            muteButton.getAttribute(AttributeName.ARIA_LABEL),
            AudioControlLabel.MUTE_AUDIO,
            "aria-label should describe mute action"
        );

        document.body.innerHTML = "";
    });

    test("wireWheelContinueButton routes events based on control mode", () => {
        const cases = [
            {
                description: "clicking stops the wheel when a spin is active",
                initialMode: WheelControlMode.STOP,
                trigger: (buttonElement) => {
                    buttonElement.click();
                },
                expectedStopCalls: 1,
                expectedStartCalls: 0
            },
            {
                description: "pressing Enter stops the wheel when a spin is active",
                initialMode: WheelControlMode.STOP,
                trigger: (buttonElement) => {
                    dispatchKeydownEvent(buttonElement, KeyboardKey.ENTER);
                },
                expectedStopCalls: 1,
                expectedStartCalls: 0
            },
            {
                description: "pressing Spacebar stops the wheel when a spin is active",
                initialMode: WheelControlMode.STOP,
                trigger: (buttonElement) => {
                    dispatchKeydownEvent(buttonElement, KeyboardKey.SPACEBAR);
                },
                expectedStopCalls: 1,
                expectedStartCalls: 0
            },
            {
                description: "clicking starts a new spin when the wheel is idle",
                initialMode: WheelControlMode.START,
                trigger: (buttonElement) => {
                    buttonElement.click();
                },
                expectedStopCalls: 0,
                expectedStartCalls: 1
            },
            {
                description: "pressing Space starts a new spin when the wheel is idle",
                initialMode: WheelControlMode.START,
                trigger: (buttonElement) => {
                    dispatchKeydownEvent(buttonElement, KeyboardKey.SPACE);
                },
                expectedStopCalls: 0,
                expectedStartCalls: 1
            },
            {
                description: "falls back to the button attribute when manager state is unavailable",
                initialMode: WheelControlMode.START,
                prepare: ({ buttonElement, stateManager }) => {
                    stateManager.setWheelControlMode("unknown");
                    buttonElement.setAttribute(
                        AttributeName.DATA_WHEEL_CONTROL_MODE,
                        WheelControlMode.STOP
                    );
                },
                trigger: (buttonElement) => {
                    buttonElement.click();
                },
                expectedStopCalls: 1,
                expectedStartCalls: 0
            }
        ];

        for (const testCase of cases) {
            document.body.innerHTML = `
                <button id="${ControlElementId.WHEEL_CONTINUE_BUTTON}" type="button"></button>
            `;
            const stateManager = createStateManagerStub({
                initialWheelControlMode: testCase.initialMode
            });
            const binder = createListenerBinder({
                controlElementId: ControlElementId,
                attributeName: AttributeName,
                documentReference: document,
                stateManager
            });
            let startCallCount = 0;
            let stopCallCount = 0;

            binder.wireWheelContinueButton({
                onStartRequested: () => {
                    startCallCount += 1;
                },
                onStopRequested: () => {
                    stopCallCount += 1;
                }
            });

            const continueButton = document.getElementById(ControlElementId.WHEEL_CONTINUE_BUTTON);
            assert(continueButton !== null, "wheel continue button should exist");

            if (testCase.prepare) {
                testCase.prepare({
                    buttonElement: continueButton,
                    stateManager
                });
            }

            testCase.trigger(continueButton);

            assertEqual(
                stopCallCount,
                testCase.expectedStopCalls,
                `stop request mismatch: ${testCase.description}`
            );
            assertEqual(
                startCallCount,
                testCase.expectedStartCalls,
                `start request mismatch: ${testCase.description}`
            );

            document.body.innerHTML = "";
        }
    });

    test("wireWheelRestartButton opens modal and notifies listeners", () => {
        const scenarios = [
            {
                description: "clicking opens the restart confirmation and notifies listeners",
                trigger: (buttonElement) => {
                    buttonElement.click();
                }
            },
            {
                description: "pressing Enter opens the restart confirmation and notifies listeners",
                trigger: (buttonElement) => {
                    dispatchKeydownEvent(buttonElement, KeyboardKey.ENTER);
                }
            }
        ];

        for (const { description, trigger } of scenarios) {
            renderRestartModalSkeleton();
            const stateManager = createStateManagerStub();
            const binder = createListenerBinder({
                controlElementId: ControlElementId,
                attributeName: AttributeName,
                documentReference: document,
                stateManager
            });
            let restartRequestedCount = 0;

            binder.wireWheelRestartButton({
                onRestartRequested: () => {
                    restartRequestedCount += 1;
                }
            });

            const restartButton = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);
            const modalContainer = document.getElementById(
                ControlElementId.RESTART_CONFIRMATION_CONTAINER
            );
            const modalDialog = document.getElementById(
                ControlElementId.RESTART_CONFIRMATION_DIALOG
            );
            const revealSection = document.getElementById(ControlElementId.REVEAL_SECTION);
            const gameOverSection = document.getElementById(ControlElementId.GAME_OVER_SECTION);

            assert(restartButton !== null, "restart button should exist");
            assert(modalContainer !== null, "modal container should exist");
            assert(modalDialog !== null, "modal dialog should exist");
            assert(revealSection !== null, "reveal section should exist");
            assert(gameOverSection !== null, "game over section should exist");

            trigger(restartButton);

            assertEqual(restartRequestedCount, 1, `onRestartRequested mismatch: ${description}`);
            assertEqual(modalContainer.hidden, false, `modal container hidden mismatch: ${description}`);
            assertEqual(
                modalContainer.getAttribute(AttributeName.ARIA_HIDDEN),
                AttributeBooleanValue.FALSE,
                `modal container aria-hidden mismatch: ${description}`
            );
            assertEqual(
                modalDialog.getAttribute(AttributeName.ARIA_HIDDEN),
                AttributeBooleanValue.FALSE,
                `modal dialog aria-hidden mismatch: ${description}`
            );
            assertEqual(document.activeElement, modalDialog, "modal dialog should receive focus");
            assertEqual(
                revealSection.getAttribute(AttributeName.ARIA_HIDDEN),
                AttributeBooleanValue.FALSE,
                `reveal section visibility mismatch: ${description}`
            );
            assertEqual(
                gameOverSection.getAttribute(AttributeName.ARIA_HIDDEN),
                AttributeBooleanValue.FALSE,
                `game over section visibility mismatch: ${description}`
            );

            document.body.innerHTML = "";
        }
    });

    test("wireWheelRestartButton confirms the restart workflow", () => {
        renderRestartModalSkeleton();
        const stateManager = createStateManagerStub();
        const binder = createListenerBinder({
            controlElementId: ControlElementId,
            attributeName: AttributeName,
            documentReference: document,
            stateManager
        });
        let restartRequestedCount = 0;
        let restartConfirmedCount = 0;

        binder.wireWheelRestartButton({
            onRestartRequested: () => {
                restartRequestedCount += 1;
            },
            onRestartConfirmed: () => {
                restartConfirmedCount += 1;
            }
        });

        const restartButton = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);
        const confirmButton = document.getElementById(
            ControlElementId.RESTART_CONFIRMATION_CONFIRM_BUTTON
        );
        const modalContainer = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CONTAINER);
        const modalDialog = document.getElementById(ControlElementId.RESTART_CONFIRMATION_DIALOG);
        const revealSection = document.getElementById(ControlElementId.REVEAL_SECTION);
        const gameOverSection = document.getElementById(ControlElementId.GAME_OVER_SECTION);

        assert(restartButton !== null, "restart button should exist");
        assert(confirmButton !== null, "confirm button should exist");
        assert(modalContainer !== null, "modal container should exist");
        assert(modalDialog !== null, "modal dialog should exist");
        assert(revealSection !== null, "reveal section should exist");
        assert(gameOverSection !== null, "game over section should exist");

        restartButton.click();
        confirmButton.click();

        assertEqual(restartRequestedCount, 1, "restart should be requested once");
        assertEqual(restartConfirmedCount, 1, "restart should be confirmed once");
        assertEqual(modalContainer.hidden, true, "modal container should hide after confirmation");
        assertEqual(
            modalContainer.getAttribute(AttributeName.ARIA_HIDDEN),
            AttributeBooleanValue.TRUE,
            "modal container aria-hidden should be true after confirmation"
        );
        assertEqual(
            modalDialog.getAttribute(AttributeName.ARIA_HIDDEN),
            AttributeBooleanValue.TRUE,
            "modal dialog aria-hidden should be true after confirmation"
        );
        assertEqual(
            revealSection.getAttribute(AttributeName.ARIA_HIDDEN),
            AttributeBooleanValue.TRUE,
            "reveal section should hide after restart"
        );
        assertEqual(
            gameOverSection.getAttribute(AttributeName.ARIA_HIDDEN),
            AttributeBooleanValue.TRUE,
            "game over section should hide after restart"
        );

        document.body.innerHTML = "";
    });
});
