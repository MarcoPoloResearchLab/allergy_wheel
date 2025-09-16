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

const WheelSegmentCount = 8;

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
    startHandler: null
  };
  binder.wireStartButton = jest.fn(({ onStartRequested }) => {
    binder.startHandler = typeof onStartRequested === "function" ? onStartRequested : null;
  });
  binder.wireStopButton = jest.fn();
  binder.wireFullscreenButton = jest.fn();
  binder.wireSpinAgainButton = jest.fn();
  binder.wireRevealBackdropDismissal = jest.fn();
  binder.wireRestartButton = jest.fn();
  binder.getStartHandler = () => binder.startHandler;
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
      const audioPresenter = createAudioPresenterStub();
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
