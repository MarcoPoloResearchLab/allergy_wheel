import { jest } from "@jest/globals";
import { createListenerBinder } from "../../js/utils/listeners.js";
import {
  AttributeBooleanValue,
  AttributeName,
  BrowserEventName,
  ControlElementId,
  KeyboardKey,
  RestartConfirmationText,
  WheelControlMode
} from "../../js/constants.js";

const RestartModalScenarioDescription = Object.freeze({
  PRESENTS_DIALOG: "displays the restart confirmation modal and focuses the dialog",
  DISMISS_ESCAPE: "closes the restart confirmation modal when Escape is pressed",
  DISMISS_OVERLAY: "closes the restart confirmation modal when the overlay is clicked",
  DISMISS_CONTINUE: "closes the restart confirmation modal when Continue is activated",
  CONFIRM_RESTART: "confirms the restart request when Yes is activated"
});

function createStateManagerDouble() {
  return {
    hasSelectedAllergen: jest.fn(() => true),
    getWheelControlMode: jest.fn(() => WheelControlMode.START),
    isAudioMuted: jest.fn(() => false),
    toggleAudioMuted: jest.fn(() => false)
  };
}

function initializeRestartModalDom() {
  document.body.innerHTML = `
    <section id="${ControlElementId.REVEAL_SECTION}" aria-hidden="${AttributeBooleanValue.FALSE}"></section>
    <section id="${ControlElementId.GAME_OVER_SECTION}" aria-hidden="${AttributeBooleanValue.FALSE}"></section>
    <div
      aria-hidden="${AttributeBooleanValue.FALSE}"
      id="${ControlElementId.WHEEL_RESTART_BUTTON}"
      role="button"
      tabindex="0"
    >
      Restart
    </div>
    <div
      aria-hidden="${AttributeBooleanValue.TRUE}"
      hidden
      id="${ControlElementId.RESTART_CONFIRMATION_CONTAINER}"
    >
      <div id="${ControlElementId.RESTART_CONFIRMATION_OVERLAY}"></div>
      <div
        aria-hidden="${AttributeBooleanValue.TRUE}"
        id="${ControlElementId.RESTART_CONFIRMATION_DIALOG}"
        role="dialog"
        tabindex="-1"
      >
        <h2 id="restart-confirmation-title">${RestartConfirmationText.TITLE}</h2>
        <p id="restart-confirmation-description">${RestartConfirmationText.MESSAGE}</p>
        <div>
          <button id="${ControlElementId.RESTART_CONFIRMATION_CONFIRM_BUTTON}" type="button">
            ${RestartConfirmationText.CONFIRM}
          </button>
          <button id="${ControlElementId.RESTART_CONFIRMATION_CANCEL_BUTTON}" type="button">
            ${RestartConfirmationText.CANCEL}
          </button>
        </div>
      </div>
    </div>
  `;
}

describe("Restart confirmation modal interactions", () => {
  test(RestartModalScenarioDescription.PRESENTS_DIALOG, () => {
    initializeRestartModalDom();
    const stateManager = createStateManagerDouble();
    const listenerBinder = createListenerBinder({
      controlElementId: ControlElementId,
      attributeName: AttributeName,
      documentReference: document,
      stateManager
    });

    const restartRequestedSpy = jest.fn();
    const restartConfirmedSpy = jest.fn();

    listenerBinder.wireWheelRestartButton({
      onRestartRequested: restartRequestedSpy,
      onRestartConfirmed: restartConfirmedSpy
    });

    const restartButton = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);
    const modalContainer = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CONTAINER);
    const modalDialog = document.getElementById(ControlElementId.RESTART_CONFIRMATION_DIALOG);
    const confirmButton = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CONFIRM_BUTTON);
    const continueButton = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CANCEL_BUTTON);

    restartButton.click();

    expect(modalContainer.hidden).toBe(false);
    expect(modalContainer.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.FALSE);
    expect(modalDialog.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.FALSE);
    expect(document.activeElement).toBe(modalDialog);
    expect(restartRequestedSpy).toHaveBeenCalledTimes(1);
    expect(confirmButton.textContent.trim()).toBe(RestartConfirmationText.CONFIRM);
    expect(continueButton.textContent.trim()).toBe(RestartConfirmationText.CANCEL);
  });

  const RestartModalDismissalScenarios = [
    {
      description: RestartModalScenarioDescription.DISMISS_ESCAPE,
      triggerDismissal: () => {
        const escapeEvent = new KeyboardEvent(BrowserEventName.KEY_DOWN, {
          key: KeyboardKey.ESCAPE,
          bubbles: true
        });
        document.dispatchEvent(escapeEvent);
      }
    },
    {
      description: RestartModalScenarioDescription.DISMISS_OVERLAY,
      triggerDismissal: ({ overlayElement }) => {
        overlayElement.click();
      }
    },
    {
      description: RestartModalScenarioDescription.DISMISS_CONTINUE,
      triggerDismissal: ({ continueButton }) => {
        continueButton.click();
      }
    }
  ];

  test.each(RestartModalDismissalScenarios)(
    "%s",
    ({ triggerDismissal }) => {
      initializeRestartModalDom();
      const stateManager = createStateManagerDouble();
      const listenerBinder = createListenerBinder({
        controlElementId: ControlElementId,
        attributeName: AttributeName,
        documentReference: document,
        stateManager
      });

      const restartConfirmedSpy = jest.fn();

      listenerBinder.wireWheelRestartButton({
        onRestartConfirmed: restartConfirmedSpy
      });

      const restartButton = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);
      const modalContainer = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CONTAINER);
      const modalDialog = document.getElementById(ControlElementId.RESTART_CONFIRMATION_DIALOG);
      const overlayElement = document.getElementById(ControlElementId.RESTART_CONFIRMATION_OVERLAY);
      const continueButton = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CANCEL_BUTTON);

      restartButton.click();

      triggerDismissal({ overlayElement, continueButton });

      expect(modalContainer.hidden).toBe(true);
      expect(modalContainer.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
      expect(modalDialog.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
      expect(document.activeElement).toBe(restartButton);
      expect(restartConfirmedSpy).not.toHaveBeenCalled();
    }
  );

  test(RestartModalScenarioDescription.CONFIRM_RESTART, () => {
    initializeRestartModalDom();
    const stateManager = createStateManagerDouble();
    const listenerBinder = createListenerBinder({
      controlElementId: ControlElementId,
      attributeName: AttributeName,
      documentReference: document,
      stateManager
    });

    const restartConfirmedSpy = jest.fn();

    listenerBinder.wireWheelRestartButton({
      onRestartConfirmed: restartConfirmedSpy
    });

    const restartButton = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);
    const confirmButton = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CONFIRM_BUTTON);
    const modalContainer = document.getElementById(ControlElementId.RESTART_CONFIRMATION_CONTAINER);
    const modalDialog = document.getElementById(ControlElementId.RESTART_CONFIRMATION_DIALOG);
    const revealSection = document.getElementById(ControlElementId.REVEAL_SECTION);
    const gameOverSection = document.getElementById(ControlElementId.GAME_OVER_SECTION);

    restartButton.click();
    confirmButton.click();

    expect(restartConfirmedSpy).toHaveBeenCalledTimes(1);
    expect(revealSection.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
    expect(gameOverSection.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
    expect(modalContainer.hidden).toBe(true);
    expect(modalContainer.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
    expect(modalDialog.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
  });
});
