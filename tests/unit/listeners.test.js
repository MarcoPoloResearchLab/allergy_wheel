import { jest } from "@jest/globals";
import { createListenerBinder } from "../../js/utils/listeners.js";
import {
  ControlElementId,
  AttributeName,
  AttributeBooleanValue,
  ButtonText,
  AudioControlLabel,
  WheelControlMode,
  KeyboardKey,
  BrowserEventName
} from "../../js/constants.js";

function createStateManagerStub({ initialMuted = false, initialWheelControlMode = WheelControlMode.STOP } = {}) {
  let mutedState = Boolean(initialMuted);
  let wheelControlMode = initialWheelControlMode;
  return {
    hasSelectedAllergen: jest.fn(() => false),
    getWheelControlMode: jest.fn(() => wheelControlMode),
    setWheelControlMode: jest.fn((nextMode) => {
      wheelControlMode = nextMode;
      return wheelControlMode;
    }),
    isAudioMuted: jest.fn(() => mutedState),
    toggleAudioMuted: jest.fn(() => {
      mutedState = !mutedState;
      return mutedState;
    }),
    setAudioMuted: jest.fn((nextState) => {
      mutedState = Boolean(nextState);
      return mutedState;
    })
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
    <section id="${ControlElementId.REVEAL_SECTION}" aria-hidden="${AttributeBooleanValue.FALSE}"></section>
    <section id="${ControlElementId.GAME_OVER_SECTION}" aria-hidden="${AttributeBooleanValue.FALSE}"></section>
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
          <button id="${ControlElementId.RESTART_CONFIRMATION_CONFIRM_BUTTON}" type="button"></button>
          <button id="${ControlElementId.RESTART_CONFIRMATION_CANCEL_BUTTON}" type="button"></button>
        </div>
      </div>
    </div>
  `;
}

const MuteInitializationScenarios = [
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

describe("listenerBinder wireMuteButton", () => {
  test.each(MuteInitializationScenarios)(
    "%s",
    ({ initialMuted, expectedPressed, expectedText, expectedLabel }) => {
      document.body.innerHTML = `<button id="${ControlElementId.MUTE_BUTTON}" aria-pressed="false"></button>`;
      const stateManager = createStateManagerStub({ initialMuted });
      const binder = createListenerBinder({
        controlElementId: ControlElementId,
        attributeName: AttributeName,
        documentReference: document,
        stateManager
      });

      binder.wireMuteButton();

      const muteButton = document.getElementById(ControlElementId.MUTE_BUTTON);
      expect(muteButton.textContent).toBe(expectedText);
      expect(muteButton.getAttribute(AttributeName.ARIA_PRESSED)).toBe(expectedPressed);
      expect(muteButton.getAttribute(AttributeName.ARIA_LABEL)).toBe(expectedLabel);
    }
  );

  test("clicking toggles the state and notifies listeners", () => {
    document.body.innerHTML = `<button id="${ControlElementId.MUTE_BUTTON}" aria-pressed="false"></button>`;
    const stateManager = createStateManagerStub({ initialMuted: false });
    const binder = createListenerBinder({
      controlElementId: ControlElementId,
      attributeName: AttributeName,
      documentReference: document,
      stateManager
    });
    const onMuteChange = jest.fn();

    binder.wireMuteButton({ onMuteChange });

    const muteButton = document.getElementById(ControlElementId.MUTE_BUTTON);
    muteButton.click();

    expect(stateManager.toggleAudioMuted).toHaveBeenCalledTimes(1);
    expect(onMuteChange).toHaveBeenCalledWith(true);
    expect(muteButton.getAttribute(AttributeName.ARIA_PRESSED)).toBe(AttributeBooleanValue.TRUE);
    expect(muteButton.textContent).toBe(ButtonText.SOUND_ON);
    expect(muteButton.getAttribute(AttributeName.ARIA_LABEL)).toBe(AudioControlLabel.UNMUTE_AUDIO);

    muteButton.click();

    expect(stateManager.toggleAudioMuted).toHaveBeenCalledTimes(2);
    expect(onMuteChange).toHaveBeenLastCalledWith(false);
    expect(muteButton.getAttribute(AttributeName.ARIA_PRESSED)).toBe(AttributeBooleanValue.FALSE);
    expect(muteButton.textContent).toBe(ButtonText.MUTE);
    expect(muteButton.getAttribute(AttributeName.ARIA_LABEL)).toBe(AudioControlLabel.MUTE_AUDIO);
  });
});

describe("listenerBinder wireWheelContinueButton", () => {
  const ContinueActivationScenarios = [
    {
      description: "clicking stops the wheel when a spin is active",
      initialMode: WheelControlMode.STOP,
      trigger: (buttonElement) => buttonElement.click(),
      expectedStopCalls: 1,
      expectedStartCalls: 0
    },
    {
      description: "pressing Enter stops the wheel when a spin is active",
      initialMode: WheelControlMode.STOP,
      trigger: (buttonElement) => dispatchKeydownEvent(buttonElement, KeyboardKey.ENTER),
      expectedStopCalls: 1,
      expectedStartCalls: 0
    },
    {
      description: "pressing Spacebar stops the wheel when a spin is active",
      initialMode: WheelControlMode.STOP,
      trigger: (buttonElement) => dispatchKeydownEvent(buttonElement, KeyboardKey.SPACEBAR),
      expectedStopCalls: 1,
      expectedStartCalls: 0
    },
    {
      description: "clicking starts a new spin when the wheel is idle",
      initialMode: WheelControlMode.START,
      trigger: (buttonElement) => buttonElement.click(),
      expectedStopCalls: 0,
      expectedStartCalls: 1
    },
    {
      description: "pressing Space starts a new spin when the wheel is idle",
      initialMode: WheelControlMode.START,
      trigger: (buttonElement) => dispatchKeydownEvent(buttonElement, KeyboardKey.SPACE),
      expectedStopCalls: 0,
      expectedStartCalls: 1
    },
    {
      description: "falls back to the button attribute when manager state is unavailable",
      initialMode: WheelControlMode.START,
      trigger: (buttonElement, { stateManager }) => {
        stateManager.setWheelControlMode("unknown");
        buttonElement.setAttribute(AttributeName.DATA_WHEEL_CONTROL_MODE, WheelControlMode.STOP);
        buttonElement.click();
      },
      expectedStopCalls: 1,
      expectedStartCalls: 0
    }
  ];

  test.each(ContinueActivationScenarios)(
    "%s",
    ({ description: _description, initialMode, trigger, expectedStopCalls, expectedStartCalls }) => {
      document.body.innerHTML = `<button id="${ControlElementId.WHEEL_CONTINUE_BUTTON}" type="button"></button>`;
      const stateManager = createStateManagerStub({ initialWheelControlMode: initialMode });
      const binder = createListenerBinder({
        controlElementId: ControlElementId,
        attributeName: AttributeName,
        documentReference: document,
        stateManager
      });
      const onStartRequested = jest.fn();
      const onStopRequested = jest.fn();

      binder.wireWheelContinueButton({ onStartRequested, onStopRequested });

      const continueButton = document.getElementById(ControlElementId.WHEEL_CONTINUE_BUTTON);
      if (!continueButton) {
        throw new Error("Wheel continue button not found in DOM");
      }

      if (trigger.length === 2) {
        trigger(continueButton, { stateManager });
      } else {
        trigger(continueButton);
      }

      expect(onStopRequested).toHaveBeenCalledTimes(expectedStopCalls);
      expect(onStartRequested).toHaveBeenCalledTimes(expectedStartCalls);
    }
  );
});

describe("listenerBinder wireWheelRestartButton", () => {
  const RestartActivationScenarios = [
    {
      description: "clicking opens the restart confirmation and notifies listeners",
      trigger: (buttonElement) => buttonElement.click()
    },
    {
      description: "pressing Enter opens the restart confirmation and notifies listeners",
      trigger: (buttonElement) => dispatchKeydownEvent(buttonElement, KeyboardKey.ENTER)
    }
  ];

  test.each(RestartActivationScenarios)(
    "%s",
    ({ description: _description, trigger }) => {
      renderRestartModalSkeleton();
      const stateManager = createStateManagerStub();
      const binder = createListenerBinder({
        controlElementId: ControlElementId,
        attributeName: AttributeName,
        documentReference: document,
        stateManager
      });
      const onRestartRequested = jest.fn();

      binder.wireWheelRestartButton({ onRestartRequested });

      const restartButton = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);
      if (!restartButton) {
        throw new Error("Wheel restart button not found in DOM");
      }

      const modalContainer = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CONTAINER);
      const modalDialog = document.getElementById(ControlElementId.RESTART_CONFIRMATION_DIALOG);
      const revealSection = document.getElementById(ControlElementId.REVEAL_SECTION);
      const gameOverSection = document.getElementById(ControlElementId.GAME_OVER_SECTION);

      trigger(restartButton);

      expect(onRestartRequested).toHaveBeenCalledTimes(1);
      expect(modalContainer.hidden).toBe(false);
      expect(modalContainer.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.FALSE);
      expect(modalDialog.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.FALSE);
      expect(document.activeElement).toBe(modalDialog);
      expect(revealSection.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.FALSE);
      expect(gameOverSection.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.FALSE);
    }
  );

  test("confirming hides overlays and invokes the restart callback", () => {
    renderRestartModalSkeleton();
    const stateManager = createStateManagerStub();
    const binder = createListenerBinder({
      controlElementId: ControlElementId,
      attributeName: AttributeName,
      documentReference: document,
      stateManager
    });
    const onRestartRequested = jest.fn();
    const onRestartConfirmed = jest.fn();

    binder.wireWheelRestartButton({
      onRestartRequested,
      onRestartConfirmed
    });

    const restartButton = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);
    const confirmButton = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CONFIRM_BUTTON);
    const modalContainer = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CONTAINER);
    const modalDialog = document.getElementById(ControlElementId.RESTART_CONFIRMATION_DIALOG);
    const revealSection = document.getElementById(ControlElementId.REVEAL_SECTION);
    const gameOverSection = document.getElementById(ControlElementId.GAME_OVER_SECTION);

    if (!restartButton || !confirmButton) {
      throw new Error("Restart confirmation controls not found in DOM");
    }

    restartButton.click();
    confirmButton.click();

    expect(onRestartRequested).toHaveBeenCalledTimes(1);
    expect(onRestartConfirmed).toHaveBeenCalledTimes(1);
    expect(modalContainer.hidden).toBe(true);
    expect(modalContainer.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
    expect(modalDialog.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
    expect(revealSection.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
    expect(gameOverSection.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
  });
});
