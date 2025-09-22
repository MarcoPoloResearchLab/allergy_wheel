import { jest } from "@jest/globals";

import {
  NormalizationEngine,
  loadJson,
  persistSelectedAllergen,
  restorePersistedAllergen,
  pickRandomUnique
} from "../../js/utils/utils.js";

const TokenValue = Object.freeze({
  DAIRY: "dairy",
  EGGS: "eggs",
  PEANUTS: "peanuts"
});

const IngredientText = Object.freeze({
  SKIM_MILK: "Skim Milk",
  PEANUT_BUTTER: "Peanut Butter",
  CARROT: "Carrot",
  SPINACH: "Spinach"
});

const AllergenLabel = Object.freeze({
  PEANUTS: "Peanuts",
  MISSING: "No Token"
});

const SourceValue = Object.freeze({
  ALPHA: "A",
  BETA: "B",
  GAMMA: "C",
  DELTA: "D",
  RED: "Red",
  BLUE: "Blue"
});

const JsonPath = Object.freeze({
  SAMPLE: "./data/test.json"
});

const LoadJsonResult = Object.freeze({
  SUCCESS: { success: true }
});

const TestDescription = Object.freeze({
  NORMALIZATION_MATCHES: "collects all tokens that match each ingredient",
  NORMALIZATION_MISSES: "returns empty set when no pattern matches",
  NORMALIZATION_MALFORMED_RULES: "ignores malformed normalization rules",
  PERSISTENCE_RESTORES: "restores persisted allergen token and label",
  PERSISTENCE_NO_TOKEN: "returns null when token is missing and nothing is stored",
  RANDOM_UNIQUE_DETERMINISTIC: "returns deterministic subset when Math.random is controlled",
  RANDOM_UNIQUE_SHORT_SOURCE: "returns entire array when requesting more elements than available",
  LOAD_JSON_SUCCESS: "resolves with parsed JSON when fetch succeeds",
  LOAD_JSON_FAILURE: "throws an error when fetch indicates failure"
});

const NormalizationRuleSet = Object.freeze([
  { pattern: "milk", flags: "i", token: TokenValue.DAIRY },
  { pattern: "egg", flags: "i", token: TokenValue.EGGS },
  { pattern: "peanut", flags: "i", token: TokenValue.PEANUTS }
]);

const IngredientNormalizationCases = [
  {
    description: TestDescription.NORMALIZATION_MATCHES,
    ingredients: [IngredientText.SKIM_MILK, IngredientText.PEANUT_BUTTER],
    expectedTokens: [TokenValue.DAIRY, TokenValue.PEANUTS]
  },
  {
    description: TestDescription.NORMALIZATION_MISSES,
    ingredients: [IngredientText.CARROT, IngredientText.SPINACH],
    expectedTokens: []
  }
];

describe("NormalizationEngine tokenization", () => {
  test.each(IngredientNormalizationCases)(
    "%s",
    ({ ingredients, expectedTokens }) => {
      const normalizationEngine = new NormalizationEngine(NormalizationRuleSet);
      const observedTokens = normalizationEngine.tokensForDishIngredients(ingredients);
      expect(Array.from(observedTokens).sort()).toEqual(expectedTokens.sort());
    }
  );

  test(TestDescription.NORMALIZATION_MALFORMED_RULES, () => {
    const malformedRuleSet = [
      { pattern: "", token: "empty" },
      { token: "missingPattern" }
    ];
    const normalizationEngine = new NormalizationEngine(malformedRuleSet);
    const observedTokens = normalizationEngine.tokensForIngredient(IngredientText.CARROT);
    expect(Array.from(observedTokens)).toEqual([]);
  });
});

const PersistenceTestCases = [
  {
    description: TestDescription.PERSISTENCE_RESTORES,
    persistInput: { token: TokenValue.PEANUTS, label: AllergenLabel.PEANUTS },
    expectedValue: { token: TokenValue.PEANUTS, label: AllergenLabel.PEANUTS }
  },
  {
    description: TestDescription.PERSISTENCE_NO_TOKEN,
    persistInput: { token: "", label: AllergenLabel.MISSING },
    expectedValue: null
  }
];

describe("Allergen persistence utilities", () => {
  test.each(PersistenceTestCases)(
    "%s",
    ({ persistInput, expectedValue }) => {
      persistSelectedAllergen(persistInput.token, persistInput.label);
      const restored = restorePersistedAllergen();
      expect(restored).toEqual(expectedValue);
    }
  );
});

const PickRandomUniqueCases = [
  {
    description: TestDescription.RANDOM_UNIQUE_DETERMINISTIC,
    sourceValues: [
      SourceValue.ALPHA,
      SourceValue.BETA,
      SourceValue.GAMMA,
      SourceValue.DELTA
    ],
    howMany: 2,
    randomSequence: [0.25, 0.1, 0.9],
    expectedResult: [SourceValue.GAMMA, SourceValue.DELTA],
    assertAsSet: false
  },
  {
    description: TestDescription.RANDOM_UNIQUE_SHORT_SOURCE,
    sourceValues: [SourceValue.RED, SourceValue.BLUE],
    howMany: 5,
    randomSequence: [0.2],
    expectedResult: [SourceValue.RED, SourceValue.BLUE],
    assertAsSet: true
  }
];

describe("pickRandomUnique", () => {
  test.each(PickRandomUniqueCases)(
    "%s",
    ({ sourceValues, howMany, randomSequence, expectedResult, assertAsSet }) => {
      const randomMock = jest.spyOn(Math, "random");
      for (const sequenceValue of randomSequence) {
        randomMock.mockReturnValueOnce(sequenceValue);
      }
      const observed = pickRandomUnique(sourceValues, howMany);
      if (assertAsSet) {
        expect(new Set(observed)).toEqual(new Set(expectedResult));
        expect(observed).toHaveLength(Math.min(sourceValues.length, howMany));
      } else {
        expect(observed).toEqual(expectedResult);
      }
    }
  );
});

const LoadJsonResponse = Object.freeze({
  ok: true,
  json: async () => LoadJsonResult.SUCCESS
});

const LoadJsonFailureResponse = Object.freeze({
  ok: false,
  json: async () => ({})
});

const LoadJsonCases = [
  {
    description: TestDescription.LOAD_JSON_SUCCESS,
    fetchResponse: LoadJsonResponse,
    expectedValue: LoadJsonResult.SUCCESS,
    expectedErrorPattern: null
  },
  {
    description: TestDescription.LOAD_JSON_FAILURE,
    fetchResponse: LoadJsonFailureResponse,
    expectedValue: null,
    expectedErrorPattern: /failed to load/iu
  }
];

describe("loadJson", () => {
  test.each(LoadJsonCases)(
    "%s",
    async ({ fetchResponse, expectedValue, expectedErrorPattern }) => {
      const pathString = JsonPath.SAMPLE;
      const originalFetch = global.fetch;
      global.fetch = jest.fn(async () => fetchResponse);
      try {
        if (expectedErrorPattern) {
          await expect(loadJson(pathString)).rejects.toThrow(expectedErrorPattern);
        } else {
          await expect(loadJson(pathString)).resolves.toEqual(expectedValue);
        }
      } finally {
        global.fetch = originalFetch;
      }
    }
  );
});
