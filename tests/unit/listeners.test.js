import { jest } from "@jest/globals";
import { createListenerBinder } from "../../listeners.js";
import {
  ControlElementId,
  AttributeName,
  AttributeBooleanValue,
  ButtonText,
  AudioControlLabel,
  MODE_STOP
} from "../../constants.js";

function createStateManagerStub({ initialMuted = false } = {}) {
  let mutedState = Boolean(initialMuted);
  return {
    hasSelectedAllergen: jest.fn(() => false),
    getStopButtonMode: jest.fn(() => MODE_STOP),
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
