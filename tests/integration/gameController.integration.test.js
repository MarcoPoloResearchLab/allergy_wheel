import { jest } from "@jest/globals";
import { GameController } from "../../game.js";
import { createListenerBinder } from "../../listeners.js";
import {
  ControlElementId,
  AttributeName,
  AttributeBooleanValue,
  DocumentElementId,
  BrowserEventName,
  ButtonText,
  ScreenName,
  WheelControlClassName,
  KeyboardKey
} from "../../constants.js";
import { StateManager } from "../../state.js";
import {
  setWheelControlToStartGame,
  setWheelControlToStop,
  updateWheelRestartControlVisibilityFromRevealState
} from "../../ui.js";

const GameOutcomeDescription = Object.freeze({
  LOSS: "decrements hearts to zero and shows game over",
  WIN: "increments hearts to win threshold and shows celebration"
});

const TestAllergen = Object.freeze({
  TOKEN: "nuts",
  LABEL: "Tree Nuts"
});

const DishRecord = Object.freeze({
  HAZARD: { id: "dish-hazard", name: "Peanut Satay", emoji: "🥜" },
  SAFE: { id: "dish-safe", name: "Fruit Tart", emoji: "🍓" }
});

const WheelSegmentCount = 8;

const WheelControlSequenceStep = Object.freeze({
  APPLY_STOP_MODE: "APPLY_STOP_MODE",
  RESTORE_START_MODE: "RESTORE_START_MODE",
  INVOKE_VISIBILITY_UPDATE_WHILE_STOPPED: "INVOKE_VISIBILITY_UPDATE_WHILE_STOPPED"
});

const WheelControlUiScenarioDescription = Object.freeze({
  STOP_MODE_HIDES_RESTART: "hides the restart button when stop mode is applied",
  STOP_MODE_VISIBILITY_UPDATE_RETAINS_HIDDEN_STATE:
    "keeps the restart button hidden when the visibility helper runs during stop mode",
  START_MODE_REVEALS_RESTART:
    "restores the restart button after returning to start mode once the confirmation modal is dismissed"
});

const WheelControlUiScenarios = Object.freeze([
  Object.freeze({
    description: WheelControlUiScenarioDescription.STOP_MODE_HIDES_RESTART,
    sequence: Object.freeze([WheelControlSequenceStep.APPLY_STOP_MODE]),
    expected: Object.freeze({
      isStopModeClassApplied: true,
      isRestartHidden: true,
      expectedAriaHidden: AttributeBooleanValue.TRUE
    })
  }),
  Object.freeze({
    description:
      WheelControlUiScenarioDescription.STOP_MODE_VISIBILITY_UPDATE_RETAINS_HIDDEN_STATE,
    sequence: Object.freeze([
      WheelControlSequenceStep.APPLY_STOP_MODE,
      WheelControlSequenceStep.INVOKE_VISIBILITY_UPDATE_WHILE_STOPPED
    ]),
    expected: Object.freeze({
      isStopModeClassApplied: true,
      isRestartHidden: true,
      expectedAriaHidden: AttributeBooleanValue.TRUE
    })
  }),
  Object.freeze({
    description: WheelControlUiScenarioDescription.START_MODE_REVEALS_RESTART,
    sequence: Object.freeze([
      WheelControlSequenceStep.APPLY_STOP_MODE,
      WheelControlSequenceStep.RESTORE_START_MODE
    ]),
    expected: Object.freeze({
      isStopModeClassApplied: false,
      isRestartHidden: false,
      expectedAriaHidden: AttributeBooleanValue.FALSE
    })
  })
]);

describe("Wheel control UI integration", () => {
  test.each(WheelControlUiScenarios)(
    "%s",
    ({ sequence, expected }) => {
      createDomSkeleton();

      for (const sequenceStep of sequence) {
        if (sequenceStep === WheelControlSequenceStep.APPLY_STOP_MODE) {
          setWheelControlToStop();
          continue;
        }
        if (sequenceStep === WheelControlSequenceStep.RESTORE_START_MODE) {
          setWheelControlToStartGame();
          continue;
        }
        if (
          sequenceStep ===
          WheelControlSequenceStep.INVOKE_VISIBILITY_UPDATE_WHILE_STOPPED
        ) {
          const revealSectionElement = document.getElementById(
            ControlElementId.REVEAL_SECTION
          );
          if (revealSectionElement) {
            revealSectionElement.setAttribute(
              AttributeName.ARIA_HIDDEN,
              AttributeBooleanValue.TRUE
            );
          }
          updateWheelRestartControlVisibilityFromRevealState();
        }
      }

      const wheelControlElement = document.getElementById(
        ControlElementId.WHEEL_CONTROL_CONTAINER
      );
      const wheelRestartButton = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);

      expect(wheelControlElement).not.toBeNull();
      expect(wheelRestartButton).not.toBeNull();

      if (!wheelControlElement || !wheelRestartButton) {
        return;
      }

      expect(
        wheelControlElement.classList.contains(WheelControlClassName.STOP_MODE)
      ).toBe(expected.isStopModeClassApplied);
      expect(wheelRestartButton.hidden).toBe(expected.isRestartHidden);
      const ariaHiddenValue = wheelRestartButton.getAttribute(AttributeName.ARIA_HIDDEN);
      expect(ariaHiddenValue).toBe(expected.expectedAriaHidden);
    }
  );
});

const WheelDistributionDescription = Object.freeze({
  LOW_HEARTS: "allocates minimal allergen segments when hearts are low",
  MID_HEARTS: "increases allergen segments for moderate hearts",
  HIGH_HEARTS: "maximizes allergen segments when hearts are high"
});

const WheelDistributionDishCatalog = Object.freeze({
  HAZARDOUS: [
    { id: "dish-hazard-1", name: "Peanut Satay", emoji: "🥜" },
    { id: "dish-hazard-2", name: "Walnut Brownie", emoji: "🍫" },
    { id: "dish-hazard-3", name: "Almond Croissant", emoji: "🥐" },
    { id: "dish-hazard-4", name: "Hazelnut Gelato", emoji: "🍨" },
    { id: "dish-hazard-5", name: "Cashew Stir Fry", emoji: "🥦" },
    { id: "dish-hazard-6", name: "Pecan Pie", emoji: "🥧" },
    { id: "dish-hazard-7", name: "Nut Brittle", emoji: "🍬" }
  ],
  SAFE: [
    { id: "dish-safe-1", name: "Garden Salad", emoji: "🥗" },
    { id: "dish-safe-2", name: "Fruit Tart", emoji: "🍓" },
    { id: "dish-safe-3", name: "Tomato Soup", emoji: "🍅" },
    { id: "dish-safe-4", name: "Veggie Sushi", emoji: "🍣" }
  ]
});

const DataPathString = Object.freeze({
  ALLERGENS: "./data/allergens.json",
  DISHES: "./data/dishes.json",
  NORMALIZATION: "./data/normalization.json",
  COUNTRIES: "./data/countries.json",
  INGREDIENTS: "./data/ingredients.json"
});

const BoardErrorMessage = Object.freeze({
  MISSING_DISHES_PREFIX: "missing dishes for"
});

const DataLoaderErrorMessage = Object.freeze({
  UNEXPECTED_PATH_PREFIX: "Unexpected data path:"
});

const CountryRecord = Object.freeze({
  CUISINE: "thai",
  FLAG: "🇹🇭"
});

const IngredientRecord = Object.freeze({
  NAME: "peanut",
  EMOJI: "🥜"
});

const NormalizationRule = Object.freeze({
  PATTERN: "peanut"
});

function createWheelStub() {
  const registeredCallbacks = {};
  const wheelStub = {
    initialize: jest.fn(),
    setSpinDuration: jest.fn(),
    registerSpinCallbacks: jest.fn((callbacks) => {
      registeredCallbacks.onTick = callbacks.onTick;
      registeredCallbacks.onStop = callbacks.onStop;
    }),
    ensureSize: jest.fn(),
    resetForNewSpin: jest.fn(),
    setRevolutions: jest.fn(),
    setLabels: jest.fn(),
    draw: jest.fn(),
    spin: jest.fn(),
    stop: jest.fn(),
    triggerPointerTap: jest.fn()
  };
  return { wheelStub, registeredCallbacks };
}

function createListenerBinderStub() {
  const binder = {
    startHandler: null,
    muteHandler: null,
    wheelContinueHandlers: { onStartRequested: null, onStopRequested: null }
  };
  binder.wireStartButton = jest.fn(({ onStartRequested }) => {
    binder.startHandler = typeof onStartRequested === "function" ? onStartRequested : null;
  });
  binder.wireWheelContinueButton = jest.fn(({ onStartRequested, onStopRequested }) => {
    binder.wheelContinueHandlers = {
      onStartRequested: typeof onStartRequested === "function" ? onStartRequested : null,
      onStopRequested: typeof onStopRequested === "function" ? onStopRequested : null
    };
  });
  binder.wireWheelRestartButton = jest.fn();
  binder.wireFullscreenButton = jest.fn();
  binder.wireMuteButton = jest.fn(({ onMuteChange }) => {
    binder.muteHandler = typeof onMuteChange === "function" ? onMuteChange : null;
  });
  binder.wireSpinAgainButton = jest.fn();
  binder.wireRevealBackdropDismissal = jest.fn();
  binder.wireRestartButton = jest.fn();
  binder.getStartHandler = () => binder.startHandler;
  binder.getMuteHandler = () => binder.muteHandler;
  binder.getWheelContinueHandlers = () => binder.wheelContinueHandlers;
  return binder;
}

function createFirstCardPresenterStub() {
  return {
    renderAllergens: jest.fn(),
    updateBadges: jest.fn()
  };
}

function createRevealCardPresenterStub({ revealInfo, winningCardInfo }) {
  return {
    updateDataDependencies: jest.fn(),
    populateRevealCard: jest.fn(() => revealInfo),
    showGameOver: jest.fn(),
    showWinningCard: jest.fn(() => winningCardInfo)
  };
}

function createHeartsPresenterStub() {
  return {
    renderHearts: jest.fn(),
    animateHeartLossAtHeartsBar: jest.fn(),
    animateHeartGainFromReveal: jest.fn()
  };
}

function createMenuPresenterStub() {
  return {
    updateDataDependencies: jest.fn(),
    renderMenu: jest.fn(),
    updateSelectedAllergen: jest.fn()
  };
}

function createAudioPresenterStub({ stateManager } = {}) {
  const effect = {
    playTick: jest.fn(),
    playNomNom: jest.fn(),
    playSiren: jest.fn(),
    playWin: jest.fn()
  };

  const shouldPlayAudio = () => {
    if (!stateManager || typeof stateManager.isAudioMuted !== "function") {
      return true;
    }
    return stateManager.isAudioMuted() === false;
  };

  const audioPresenter = {
    playTick: jest.fn((...args) => {
      if (!shouldPlayAudio()) {
        return;
      }
      effect.playTick(...args);
    }),
    playNomNom: jest.fn((...args) => {
      if (!shouldPlayAudio()) {
        return;
      }
      effect.playNomNom(...args);
    }),
    playSiren: jest.fn((...args) => {
      if (!shouldPlayAudio()) {
        return;
      }
      effect.playSiren(...args);
    }),
    playWin: jest.fn((...args) => {
      if (!shouldPlayAudio()) {
        return;
      }
      effect.playWin(...args);
    }),
    primeAudioOnFirstGesture: jest.fn(),
    handleMuteToggle: jest.fn((isMuted) => {
      audioPresenter.lastMuteState = isMuted;
    }),
    lastMuteState: null,
    effect
  };

  return audioPresenter;
}

function createUiPresenterStub() {
  return {
    showScreen: jest.fn(),
    setWheelControlToStartGame: jest.fn(),
    setWheelControlToStop: jest.fn(),
    openRestartConfirmation: jest.fn()
  };
}

function createBoardStub(allergenToDishesMap) {
  return {
    allergensCatalog: [],
    dishesCatalog: [],
    normalizationEngine: null,
    manualMapping: allergenToDishesMap,
    dishesByAllergen: new Map(),
    buildDishIndexByAllergen() {
      this.dishesByAllergen = new Map(Object.entries(this.manualMapping));
    },
    throwIfAnyAllergenHasNoDishes() {
      for (const allergen of this.allergensCatalog) {
        const matchingDishes = this.dishesByAllergen.get(allergen.token) || [];
        if (matchingDishes.length === 0) {
          throw new Error(`${BoardErrorMessage.MISSING_DISHES_PREFIX} ${allergen.token}`);
        }
      }
    },
    getDishesForAllergen(token) {
      return this.dishesByAllergen.get(token) || [];
    },
    getDishLabel(dish) {
      return dish.name;
    }
  };
}

function createDataLoaderStub(gameDataByPath) {
  return {
    loadJson: jest.fn(async (path) => {
      if (!Object.prototype.hasOwnProperty.call(gameDataByPath, path)) {
        throw new Error(`${DataLoaderErrorMessage.UNEXPECTED_PATH_PREFIX} ${path}`);
      }
      return gameDataByPath[path];
    })
  };
}

function createNormalizationFactoryStub() {
  return jest.fn(() => ({ tokensForIngredient: () => new Set() }));
}

function createPickRandomUniqueStub() {
  return jest.fn((sourceArray, count) => sourceArray.slice(0, count));
}

function createDomSkeleton() {
  document.body.innerHTML = `
    <div id="${DocumentElementId.LOADING}"></div>
    <div id="${DocumentElementId.LOAD_ERROR}"></div>
    <div id="wheel-wrapper">
      <canvas id="${DocumentElementId.WHEEL_CANVAS}"></canvas>
      <div id="${ControlElementId.WHEEL_CONTROL_CONTAINER}">
        <button id="${ControlElementId.WHEEL_CONTINUE_BUTTON}">${ButtonText.SPIN}</button>
        <button id="${ControlElementId.WHEEL_RESTART_BUTTON}"></button>
      </div>
    </div>
    <button id="${ControlElementId.START_BUTTON}"></button>
    <button id="${ControlElementId.FULLSCREEN_BUTTON}"></button>
    <button id="${ControlElementId.MUTE_BUTTON}" aria-pressed="false"></button>
    <button id="${ControlElementId.SPIN_AGAIN_BUTTON}"></button>
    <section id="${ControlElementId.REVEAL_SECTION}"></section>
    <section id="${ControlElementId.GAME_OVER_SECTION}"></section>
    <button id="${ControlElementId.RESTART_BUTTON}"></button>
  `;
}

const GameOutcomeScenarios = [
  {
    description: GameOutcomeDescription.LOSS,
    initialHearts: 1,
    revealInfo: { hasTriggeringIngredient: true },
    winningCardInfo: { restartButton: null, isDisplayed: false },
    winningDish: DishRecord.HAZARD,
    expectedHeartsAfterSpin: 0,
    expectGameOver: true,
    expectWin: false,
    expectedAudio: { playSiren: 1, playNomNom: 0, playWin: 0 }
  },
  {
    description: GameOutcomeDescription.WIN,
    initialHearts: 9,
    revealInfo: { hasTriggeringIngredient: false },
    winningCardInfo: { restartButton: null, isDisplayed: true },
    winningDish: DishRecord.SAFE,
    expectedHeartsAfterSpin: 10,
    expectGameOver: false,
    expectWin: true,
    expectedAudio: { playSiren: 0, playNomNom: 1, playWin: 1 }
  }
];

const AudioMuteScenarioDescription = "does not trigger audio playback when audio is muted";

const WheelDistributionScenarios = [
  {
    description: WheelDistributionDescription.LOW_HEARTS,
    initialHearts: 1,
    expectedAllergenSegments: 1
  },
  {
    description: WheelDistributionDescription.MID_HEARTS,
    initialHearts: 5,
    expectedAllergenSegments: 4
  },
  {
    description: WheelDistributionDescription.HIGH_HEARTS,
    initialHearts: 9,
    expectedAllergenSegments: 7
  }
];

describe("GameController integration", () => {
  test.each(GameOutcomeScenarios)(
    "%s",
    async ({
      initialHearts,
      revealInfo,
      winningCardInfo,
      winningDish,
      expectedHeartsAfterSpin,
      expectGameOver,
      expectWin,
      expectedAudio
    }) => {
      createDomSkeleton();

      const { wheelStub, registeredCallbacks } = createWheelStub();
      const listenerBinder = createListenerBinderStub();
      const board = createBoardStub({
        [TestAllergen.TOKEN]: [DishRecord.HAZARD, DishRecord.SAFE]
      });
      const stateManager = new StateManager({ initialHeartsCount: initialHearts });
      const firstCardPresenter = createFirstCardPresenterStub();
      const restartButton = document.getElementById(ControlElementId.RESTART_BUTTON);
      const resolvedWinningCardInfo = { ...winningCardInfo };
      if (expectWin) {
        resolvedWinningCardInfo.restartButton = restartButton;
        restartButton.addEventListener = jest.fn();
      }
      const revealCardPresenter = createRevealCardPresenterStub({
        revealInfo,
        winningCardInfo: resolvedWinningCardInfo
      });
      const heartsPresenter = createHeartsPresenterStub();
      const audioPresenter = createAudioPresenterStub({ stateManager });
      const menuPresenter = createMenuPresenterStub();
      const uiPresenter = createUiPresenterStub();
      const normalizationFactory = createNormalizationFactoryStub();
      const randomPicker = createPickRandomUniqueStub();

      const gameDataByPath = {
        [DataPathString.ALLERGENS]: [{ token: TestAllergen.TOKEN, label: TestAllergen.LABEL }],
        [DataPathString.DISHES]: [DishRecord.HAZARD, DishRecord.SAFE],
        [DataPathString.NORMALIZATION]: [{ pattern: NormalizationRule.PATTERN, token: TestAllergen.TOKEN }],
        [DataPathString.COUNTRIES]: [{ cuisine: CountryRecord.CUISINE, flag: CountryRecord.FLAG }],
        [DataPathString.INGREDIENTS]: [{ name: IngredientRecord.NAME, emoji: IngredientRecord.EMOJI }]
      };
      const dataLoader = createDataLoaderStub(gameDataByPath);

      const gameController = new GameController({
        documentReference: document,
        controlElementIdMap: ControlElementId,
        attributeNameMap: AttributeName,
        wheel: wheelStub,
        listenerBinder,
        board,
        stateManager,
        firstCardPresenter,
        revealCardPresenter,
        heartsPresenter,
        audioPresenter,
        menuPresenter,
        uiPresenter,
        dataLoader,
        createNormalizationEngine: normalizationFactory,
        pickRandomUnique: randomPicker
      });

      await gameController.bootstrap();

      const wheelContinueButton = document.getElementById(
        ControlElementId.WHEEL_CONTINUE_BUTTON
      );
      if (!wheelContinueButton) {
        throw new Error("Wheel continue button not found in DOM");
      }
      expect(wheelContinueButton.textContent).toBe(ButtonText.SPIN);

      expect(normalizationFactory).toHaveBeenCalled();
      expect(dataLoader.loadJson).toHaveBeenCalledTimes(5);
      expect(firstCardPresenter.renderAllergens).toHaveBeenCalledWith(expect.any(Array));
      expect(wheelStub.registerSpinCallbacks).toHaveBeenCalled();
      expect(menuPresenter.updateDataDependencies).toHaveBeenCalledWith(
        expect.objectContaining({ dishesCatalog: expect.any(Array) })
      );
      expect(menuPresenter.renderMenu).toHaveBeenCalled();

      stateManager.setSelectedAllergen({ token: TestAllergen.TOKEN, label: TestAllergen.LABEL });
      stateManager.setWheelCandidates({
        dishes: [winningDish],
        labels: [{ label: winningDish.name, emoji: winningDish.emoji }]
      });

      expect(typeof registeredCallbacks.onStop).toBe("function");
      registeredCallbacks.onStop(0);

      expect(wheelContinueButton.textContent).toBe(ButtonText.SPIN);

      const renderHeartsCalls = heartsPresenter.renderHearts.mock.calls;
      const latestRenderCall = renderHeartsCalls[renderHeartsCalls.length - 1];
      expect(latestRenderCall[0]).toBe(expectedHeartsAfterSpin);
      expect(revealCardPresenter.showGameOver).toHaveBeenCalledTimes(expectGameOver ? 1 : 0);
      expect(revealCardPresenter.showWinningCard).toHaveBeenCalledTimes(expectWin ? 1 : 0);
      expect(audioPresenter.effect.playSiren).toHaveBeenCalledTimes(expectedAudio.playSiren);
      expect(audioPresenter.effect.playNomNom).toHaveBeenCalledTimes(expectedAudio.playNomNom);
      expect(audioPresenter.effect.playWin).toHaveBeenCalledTimes(expectedAudio.playWin);
      expect(uiPresenter.setWheelControlToStartGame).toHaveBeenCalled();
      expect(uiPresenter.showScreen).toHaveBeenCalledWith(ScreenName.ALLERGY);
      if (expectWin && resolvedWinningCardInfo.restartButton) {
        expect(resolvedWinningCardInfo.restartButton.addEventListener).toHaveBeenCalledWith(
          BrowserEventName.CLICK,
          expect.any(Function)
        );
      }
    }
  );

  test("keeps the wheel restart control hidden until the reveal modal is dismissed", async () => {
    createDomSkeleton();

    const revealSectionElement = document.getElementById(ControlElementId.REVEAL_SECTION);
    const wheelRestartButtonElement = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);
    if (!revealSectionElement || !wheelRestartButtonElement) {
      throw new Error("Reveal modal elements not found in DOM");
    }

    revealSectionElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
    wheelRestartButtonElement.hidden = true;
    wheelRestartButtonElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);

    const { wheelStub, registeredCallbacks } = createWheelStub();
    const board = createBoardStub({
      [TestAllergen.TOKEN]: [DishRecord.SAFE]
    });
    const stateManager = new StateManager({ initialHeartsCount: 5 });

    const listenerBinder = createListenerBinder({
      controlElementId: ControlElementId,
      attributeName: AttributeName,
      documentReference: document,
      stateManager
    });

    const firstCardPresenter = createFirstCardPresenterStub();
    const revealCardPresenter = {
      updateDataDependencies: jest.fn(),
      populateRevealCard: jest.fn(() => {
        revealSectionElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.FALSE);
        return { hasTriggeringIngredient: false };
      }),
      showGameOver: jest.fn(),
      showWinningCard: jest.fn(() => ({ restartButton: null, isDisplayed: false }))
    };
    const heartsPresenter = createHeartsPresenterStub();
    const audioPresenter = createAudioPresenterStub({ stateManager });
    const menuPresenter = createMenuPresenterStub();
    const uiPresenter = {
      showScreen: jest.fn(),
      setWheelControlToStartGame,
      setWheelControlToStop,
      openRestartConfirmation: jest.fn()
    };
    const normalizationFactory = createNormalizationFactoryStub();
    const randomPicker = createPickRandomUniqueStub();

    const gameDataByPath = {
      [DataPathString.ALLERGENS]: [{ token: TestAllergen.TOKEN, label: TestAllergen.LABEL }],
      [DataPathString.DISHES]: [DishRecord.SAFE],
      [DataPathString.NORMALIZATION]: [{ pattern: NormalizationRule.PATTERN, token: TestAllergen.TOKEN }],
      [DataPathString.COUNTRIES]: [{ cuisine: CountryRecord.CUISINE, flag: CountryRecord.FLAG }],
      [DataPathString.INGREDIENTS]: [{ name: IngredientRecord.NAME, emoji: IngredientRecord.EMOJI }]
    };
    const dataLoader = createDataLoaderStub(gameDataByPath);

    const gameController = new GameController({
      documentReference: document,
      controlElementIdMap: ControlElementId,
      attributeNameMap: AttributeName,
      wheel: wheelStub,
      listenerBinder,
      board,
      stateManager,
      firstCardPresenter,
      revealCardPresenter,
      heartsPresenter,
      audioPresenter,
      menuPresenter,
      uiPresenter,
      dataLoader,
      createNormalizationEngine: normalizationFactory,
      pickRandomUnique: randomPicker
    });

    await gameController.bootstrap();

    stateManager.setSelectedAllergen({ token: TestAllergen.TOKEN, label: TestAllergen.LABEL });
    stateManager.setWheelCandidates({
      dishes: [DishRecord.SAFE],
      labels: [{ label: DishRecord.SAFE.name, emoji: DishRecord.SAFE.emoji }]
    });

    if (typeof registeredCallbacks.onStop !== "function") {
      throw new Error("Wheel stop callback was not registered");
    }
    registeredCallbacks.onStop(0);

    expect(revealSectionElement.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.FALSE);
    expect(wheelRestartButtonElement.hidden).toBe(true);
    expect(wheelRestartButtonElement.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);

    const escapeEvent = new KeyboardEvent(BrowserEventName.KEY_DOWN, { key: KeyboardKey.ESCAPE, bubbles: true });
    document.dispatchEvent(escapeEvent);

    expect(revealSectionElement.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.TRUE);
    expect(wheelRestartButtonElement.hidden).toBe(false);
    expect(wheelRestartButtonElement.getAttribute(AttributeName.ARIA_HIDDEN)).toBe(AttributeBooleanValue.FALSE);
  });

  test(AudioMuteScenarioDescription, async () => {
    createDomSkeleton();

    const { wheelStub, registeredCallbacks } = createWheelStub();
    const listenerBinder = createListenerBinderStub();
    const board = createBoardStub({
      [TestAllergen.TOKEN]: [DishRecord.HAZARD, DishRecord.SAFE]
    });
    const stateManager = new StateManager({ initialHeartsCount: 3 });
    stateManager.setAudioMuted(true);
    const firstCardPresenter = createFirstCardPresenterStub();
    const revealCardPresenter = createRevealCardPresenterStub({
      revealInfo: { hasTriggeringIngredient: true },
      winningCardInfo: { restartButton: null, isDisplayed: false }
    });
    const heartsPresenter = createHeartsPresenterStub();
    const audioPresenter = createAudioPresenterStub({ stateManager });
    const menuPresenter = createMenuPresenterStub();
    const uiPresenter = createUiPresenterStub();
    const normalizationFactory = createNormalizationFactoryStub();
    const randomPicker = createPickRandomUniqueStub();

    const gameDataByPath = {
      [DataPathString.ALLERGENS]: [{ token: TestAllergen.TOKEN, label: TestAllergen.LABEL }],
      [DataPathString.DISHES]: [DishRecord.HAZARD, DishRecord.SAFE],
      [DataPathString.NORMALIZATION]: [{ pattern: NormalizationRule.PATTERN, token: TestAllergen.TOKEN }],
      [DataPathString.COUNTRIES]: [{ cuisine: CountryRecord.CUISINE, flag: CountryRecord.FLAG }],
      [DataPathString.INGREDIENTS]: [{ name: IngredientRecord.NAME, emoji: IngredientRecord.EMOJI }]
    };
    const dataLoader = createDataLoaderStub(gameDataByPath);

    const gameController = new GameController({
      documentReference: document,
      controlElementIdMap: ControlElementId,
      attributeNameMap: AttributeName,
      wheel: wheelStub,
      listenerBinder,
      board,
      stateManager,
      firstCardPresenter,
      revealCardPresenter,
      heartsPresenter,
      audioPresenter,
      menuPresenter,
      uiPresenter,
      dataLoader,
      createNormalizationEngine: normalizationFactory,
      pickRandomUnique: randomPicker
    });

    await gameController.bootstrap();

    expect(listenerBinder.wireMuteButton).toHaveBeenCalled();
    expect(typeof listenerBinder.getMuteHandler()).toBe("function");

    stateManager.setSelectedAllergen({ token: TestAllergen.TOKEN, label: TestAllergen.LABEL });
    stateManager.setWheelCandidates({
      dishes: [DishRecord.HAZARD],
      labels: [{ label: DishRecord.HAZARD.name, emoji: DishRecord.HAZARD.emoji }]
    });

    expect(typeof registeredCallbacks.onTick).toBe("function");
    registeredCallbacks.onTick();

    expect(typeof registeredCallbacks.onStop).toBe("function");
    registeredCallbacks.onStop(0);

    expect(audioPresenter.effect.playTick).not.toHaveBeenCalled();
    expect(audioPresenter.effect.playSiren).not.toHaveBeenCalled();
    expect(audioPresenter.effect.playNomNom).not.toHaveBeenCalled();
    expect(audioPresenter.effect.playWin).not.toHaveBeenCalled();
  });
});

describe("GameController wheel allergen distribution", () => {
  test.each(WheelDistributionScenarios)(
    "%s",
    async ({ initialHearts, expectedAllergenSegments }) => {
      createDomSkeleton();

      const { wheelStub } = createWheelStub();
      const listenerBinder = createListenerBinderStub();
      const board = createBoardStub({
        [TestAllergen.TOKEN]: WheelDistributionDishCatalog.HAZARDOUS
      });
      const stateManager = new StateManager({ initialHeartsCount: initialHearts });
      const firstCardPresenter = createFirstCardPresenterStub();
      const revealCardPresenter = createRevealCardPresenterStub({
        revealInfo: { hasTriggeringIngredient: false },
        winningCardInfo: { restartButton: null, isDisplayed: false }
      });
      const heartsPresenter = createHeartsPresenterStub();
      const audioPresenter = createAudioPresenterStub({ stateManager });
      const menuPresenter = createMenuPresenterStub();
      const uiPresenter = createUiPresenterStub();
      const normalizationFactory = createNormalizationFactoryStub();
      const randomPicker = createPickRandomUniqueStub();

      const dishesForData = [
        ...WheelDistributionDishCatalog.HAZARDOUS,
        ...WheelDistributionDishCatalog.SAFE
      ];
      const gameDataByPath = {
        [DataPathString.ALLERGENS]: [{ token: TestAllergen.TOKEN, label: TestAllergen.LABEL }],
        [DataPathString.DISHES]: dishesForData,
        [DataPathString.NORMALIZATION]: [{ pattern: NormalizationRule.PATTERN, token: TestAllergen.TOKEN }],
        [DataPathString.COUNTRIES]: [{ cuisine: CountryRecord.CUISINE, flag: CountryRecord.FLAG }],
        [DataPathString.INGREDIENTS]: [{ name: IngredientRecord.NAME, emoji: IngredientRecord.EMOJI }]
      };
      const dataLoader = createDataLoaderStub(gameDataByPath);

      const gameController = new GameController({
        documentReference: document,
        controlElementIdMap: ControlElementId,
        attributeNameMap: AttributeName,
        wheel: wheelStub,
        listenerBinder,
        board,
        stateManager,
        firstCardPresenter,
        revealCardPresenter,
        heartsPresenter,
        audioPresenter,
        menuPresenter,
        uiPresenter,
        dataLoader,
        createNormalizationEngine: normalizationFactory,
        pickRandomUnique: randomPicker
      });

      await gameController.bootstrap();

      stateManager.setSelectedAllergen({ token: TestAllergen.TOKEN, label: TestAllergen.LABEL });
      const startHandler = listenerBinder.getStartHandler();
      expect(typeof startHandler).toBe("function");
      startHandler();

      const hazardIdentifiers = new Set(
        WheelDistributionDishCatalog.HAZARDOUS.map((dish) => dish.id)
      );
      const candidateDishes = stateManager.getWheelCandidateDishes();
      expect(candidateDishes).toHaveLength(WheelSegmentCount);
      const allergenDishCount = candidateDishes.filter((dish) => hazardIdentifiers.has(dish.id)).length;
      expect(allergenDishCount).toBe(expectedAllergenSegments);
      const safeDishCount = candidateDishes.length - allergenDishCount;
      expect(safeDishCount).toBe(WheelSegmentCount - expectedAllergenSegments);
    }
  );
});
