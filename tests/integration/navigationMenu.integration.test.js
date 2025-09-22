import { jest } from "@jest/globals";
import { NavigationController } from "../../js/core/navigation.js";
import { MenuView } from "../../js/ui/menu.js";
import {
  ControlElementId,
  AttributeName,
  AttributeBooleanValue,
  ScreenName,
  MenuElementId
} from "../../js/constants.js";
import { NormalizationEngine } from "../../js/utils/utils.js";

const HtmlTagName = Object.freeze({
  BUTTON: "button",
  TABLE: "table",
  TBODY: "tbody"
});

const NavigationScenarioDescription = Object.freeze({
  GAME_BUTTON: "clicking the game button requests the allergy screen",
  MENU_BUTTON: "clicking the menu button requests the menu screen"
});

const NavigationActiveStateScenario = Object.freeze({
  MENU_ACTIVE: "marks the menu button as pressed when menu screen is active",
  GAME_ACTIVE: "marks the game button as pressed when allergy screen is active",
  WHEEL_ACTIVE: "marks the game button as pressed when wheel screen is active"
});

const MenuRenderingScenarioDescription = Object.freeze({
  NO_SELECTION: "renders dishes without highlights when no allergen is selected",
  WITH_SELECTION: "highlights allergen ingredients when an allergen is selected"
});

const NavigationClickScenarios = Object.freeze([
  Object.freeze({
    description: NavigationScenarioDescription.GAME_BUTTON,
    buttonId: ControlElementId.NAV_GAME_BUTTON,
    expectedScreen: ScreenName.ALLERGY
  }),
  Object.freeze({
    description: NavigationScenarioDescription.MENU_BUTTON,
    buttonId: ControlElementId.NAV_MENU_BUTTON,
    expectedScreen: ScreenName.MENU
  })
]);

const NavigationActiveStateScenarios = Object.freeze([
  Object.freeze({
    description: NavigationActiveStateScenario.MENU_ACTIVE,
    targetScreen: ScreenName.MENU,
    expectedGameState: AttributeBooleanValue.FALSE,
    expectedMenuState: AttributeBooleanValue.TRUE
  }),
  Object.freeze({
    description: NavigationActiveStateScenario.GAME_ACTIVE,
    targetScreen: ScreenName.ALLERGY,
    expectedGameState: AttributeBooleanValue.TRUE,
    expectedMenuState: AttributeBooleanValue.FALSE
  }),
  Object.freeze({
    description: NavigationActiveStateScenario.WHEEL_ACTIVE,
    targetScreen: ScreenName.WHEEL,
    expectedGameState: AttributeBooleanValue.TRUE,
    expectedMenuState: AttributeBooleanValue.FALSE
  })
]);

const MenuRenderingScenarios = Object.freeze([
  Object.freeze({
    description: MenuRenderingScenarioDescription.NO_SELECTION,
    selectedAllergen: null,
    expectedHighlightedIngredients: []
  }),
  Object.freeze({
    description: MenuRenderingScenarioDescription.WITH_SELECTION,
    selectedAllergen: { token: "peanut", label: "Peanut" },
    expectedHighlightedIngredients: ["Peanuts"]
  })
]);

const SampleDishes = Object.freeze([
  Object.freeze({
    id: "dish-peanut-noodles",
    name: "Peanut Noodles",
    emoji: "🍜",
    cuisine: "Thai",
    ingredients: ["Peanuts", "Rice Noodles"],
    narrative: "A friendly noodle bowl."
  }),
  Object.freeze({
    id: "dish-fruit-salad",
    name: "Fruit Salad",
    emoji: "🥗",
    cuisine: "American",
    ingredients: ["Strawberries", "Blueberries"],
    narrative: "A colorful fruit mix."
  })
]);

const IngredientEmojiEntries = Object.freeze([
  Object.freeze(["peanuts", "🥜"]),
  Object.freeze(["rice noodles", "🍜"]),
  Object.freeze(["strawberries", "🍓"]),
  Object.freeze(["blueberries", "🔵"])
]);

const CuisineFlagEntries = Object.freeze([
  Object.freeze(["thai", "🇹🇭"]),
  Object.freeze(["american", "🇺🇸"])
]);

const AllergenCatalog = Object.freeze([
  Object.freeze({ token: "peanut", label: "Peanut", emoji: "🥜" })
]);

const NormalizationRules = Object.freeze([
  Object.freeze({ pattern: "peanut", token: "peanut", flags: "i" })
]);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NavigationController", () => {
  test.each(NavigationClickScenarios)("%s", ({ buttonId, expectedScreen }) => {
    document.body.innerHTML = `
      <div>
        <${HtmlTagName.BUTTON} id="${ControlElementId.NAV_GAME_BUTTON}" aria-pressed="true">Game</${HtmlTagName.BUTTON}>
        <${HtmlTagName.BUTTON} id="${ControlElementId.NAV_MENU_BUTTON}" aria-pressed="false">Menu</${HtmlTagName.BUTTON}>
      </div>
    `;

    const onScreenChange = jest.fn();
    const navigationController = new NavigationController({
      documentReference: document,
      controlElementIdMap: ControlElementId,
      attributeNameMap: AttributeName,
      onScreenChange
    });

    navigationController.initialize();

    const targetButton = document.getElementById(buttonId);
    targetButton.click();

    expect(onScreenChange).toHaveBeenCalledWith(expectedScreen);
  });

  test.each(NavigationActiveStateScenarios)("%s", ({
    targetScreen,
    expectedGameState,
    expectedMenuState
  }) => {
    document.body.innerHTML = `
      <div>
        <${HtmlTagName.BUTTON} id="${ControlElementId.NAV_GAME_BUTTON}" aria-pressed="false">Game</${HtmlTagName.BUTTON}>
        <${HtmlTagName.BUTTON} id="${ControlElementId.NAV_MENU_BUTTON}" aria-pressed="false">Menu</${HtmlTagName.BUTTON}>
      </div>
    `;

    const navigationController = new NavigationController({
      documentReference: document,
      controlElementIdMap: ControlElementId,
      attributeNameMap: AttributeName
    });

    navigationController.initialize();
    navigationController.updateActiveScreen(targetScreen);

    const gameButton = document.getElementById(ControlElementId.NAV_GAME_BUTTON);
    const menuButton = document.getElementById(ControlElementId.NAV_MENU_BUTTON);

    expect(gameButton.getAttribute(AttributeName.ARIA_PRESSED)).toBe(expectedGameState);
    expect(menuButton.getAttribute(AttributeName.ARIA_PRESSED)).toBe(expectedMenuState);
  });
});

describe("MenuView", () => {
  test.each(MenuRenderingScenarios)("%s", ({ selectedAllergen, expectedHighlightedIngredients }) => {
    document.body.innerHTML = `
      <${HtmlTagName.TABLE}>
        <${HtmlTagName.TBODY} id="${MenuElementId.TABLE_BODY}"></${HtmlTagName.TBODY}>
      </${HtmlTagName.TABLE}>
    `;

    const menuTableBodyElement = document.getElementById(MenuElementId.TABLE_BODY);
    const menuView = new MenuView({
      documentReference: document,
      menuTableBodyElement
    });

    const normalizationEngine = new NormalizationEngine(NormalizationRules);

    menuView.updateDataDependencies({
      dishesCatalog: SampleDishes,
      normalizationEngine,
      ingredientEmojiByName: new Map(IngredientEmojiEntries),
      cuisineToFlagMap: new Map(CuisineFlagEntries),
      allergensCatalog: AllergenCatalog
    });

    if (selectedAllergen) {
      menuView.updateSelectedAllergen(selectedAllergen);
    } else {
      menuView.updateSelectedAllergen({});
    }

    const rowElements = menuTableBodyElement.querySelectorAll("tr");
    expect(rowElements).toHaveLength(SampleDishes.length);

    const firstRowText = rowElements[0].textContent;
    expect(firstRowText).toContain(SampleDishes[0].name);
    expect(firstRowText).toContain(SampleDishes[0].narrative);

    const cuisineBadgeElement = rowElements[0].querySelector(".menu-cuisine-badge");
    expect(cuisineBadgeElement.textContent).toContain(SampleDishes[0].cuisine);

    const highlightedIngredients = Array.from(
      menuTableBodyElement.querySelectorAll(".ingredient.bad")
    );

    expect(highlightedIngredients).toHaveLength(expectedHighlightedIngredients.length);
    for (const ingredientName of expectedHighlightedIngredients) {
      expect(
        highlightedIngredients.some((ingredientElement) =>
          ingredientElement.textContent.includes(ingredientName)
        )
      ).toBe(true);
    }
  });
});
