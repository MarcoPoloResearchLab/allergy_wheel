import { jest } from "@jest/globals";
import { GameController } from "../../game.js";
import {
  ControlElementId,
  AttributeName,
  DocumentElementId,
  BrowserEventName,
  ScreenName
} from "../../constants.js";
import { StateManager } from "../../state.js";

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
  return {
    wireStartButton: jest.fn(),
    wireStopButton: jest.fn(),
    wireFullscreenButton: jest.fn(),
    wireSpinAgainButton: jest.fn(),
    wireRevealBackdropDismissal: jest.fn(),
    wireRestartButton: jest.fn()
  };
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

function createAudioPresenterStub() {
  return {
    playTick: jest.fn(),
    playNomNom: jest.fn(),
    playSiren: jest.fn(),
    playWin: jest.fn(),
    primeAudioOnFirstGesture: jest.fn()
  };
}

function createUiPresenterStub() {
  return {
    showScreen: jest.fn(),
    setWheelControlToStartGame: jest.fn(),
    setWheelControlToStop: jest.fn()
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
    </div>
    <button id="${ControlElementId.START_BUTTON}"></button>
    <button id="${ControlElementId.STOP_BUTTON}"></button>
    <button id="${ControlElementId.FULLSCREEN_BUTTON}"></button>
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
      const audioPresenter = createAudioPresenterStub();
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
        uiPresenter,
        dataLoader,
        createNormalizationEngine: normalizationFactory,
        pickRandomUnique: randomPicker
      });

      await gameController.bootstrap();

      expect(normalizationFactory).toHaveBeenCalled();
      expect(dataLoader.loadJson).toHaveBeenCalledTimes(5);
      expect(firstCardPresenter.renderAllergens).toHaveBeenCalledWith(expect.any(Array));
      expect(wheelStub.registerSpinCallbacks).toHaveBeenCalled();

      stateManager.setSelectedAllergen({ token: TestAllergen.TOKEN, label: TestAllergen.LABEL });
      stateManager.setWheelCandidates({
        dishes: [winningDish],
        labels: [{ label: winningDish.name, emoji: winningDish.emoji }]
      });

      expect(typeof registeredCallbacks.onStop).toBe("function");
      registeredCallbacks.onStop(0);

      const renderHeartsCalls = heartsPresenter.renderHearts.mock.calls;
      const latestRenderCall = renderHeartsCalls[renderHeartsCalls.length - 1];
      expect(latestRenderCall[0]).toBe(expectedHeartsAfterSpin);
      expect(revealCardPresenter.showGameOver).toHaveBeenCalledTimes(expectGameOver ? 1 : 0);
      expect(revealCardPresenter.showWinningCard).toHaveBeenCalledTimes(expectWin ? 1 : 0);
      expect(audioPresenter.playSiren).toHaveBeenCalledTimes(expectedAudio.playSiren);
      expect(audioPresenter.playNomNom).toHaveBeenCalledTimes(expectedAudio.playNomNom);
      expect(audioPresenter.playWin).toHaveBeenCalledTimes(expectedAudio.playWin);
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
});
