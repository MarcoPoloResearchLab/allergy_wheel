import { MenuView } from "../../js/ui/menu.js";
import { MenuFilterController } from "../../js/ui/menuFilters.js";
import { MenuElementId, MenuColumnLabel } from "../../js/constants.js";
import { NormalizationEngine } from "../../js/utils/utils.js";

const HtmlTagName = Object.freeze({
  TABLE: "table",
  THEAD: "thead",
  TBODY: "tbody",
  TR: "tr",
  TH: "th",
  DIV: "div",
  BUTTON: "button",
  P: "p"
});

 

const CssClassName = Object.freeze({
  HEADER_CELL: "menu-header-cell",
  HEADER_TOGGLE: "menu-header-toggle",
  FILTER_PANEL: "menu-filter-panel",
  FILTER_HEADER: "menu-filter-header",
  FILTER_TITLE: "menu-filter-title",
  FILTER_CLEAR: "menu-filter-clear",
  FILTER_LIST: "menu-filter-list",
  FILTER_OPTION: "menu-filter-option",
  EMPTY_ROW: "menu-row--empty",
  DATA_ROW: "menu-row--data",
  MOBILE_HEADER_ROW: "menu-row--mobile-header",
  MOBILE_FILTER_CONTAINER: "menu-mobile-filter-container"
});

const MobileViewportConfiguration = Object.freeze({
  MAX_WIDTH: 767,
  TARGET_WIDTH: 480,
  QUERY: "(max-width: 767px)"
});

const FilterDataAttribute = Object.freeze({
  TYPE: "data-filter-type",
  VALUE: "data-filter-value"
});

const FilterType = Object.freeze({
  CUISINE: "cuisine",
  INGREDIENT: "ingredient"
});

const MenuEmptyMessage = "No dishes match the selected filters.";

const SampleDishes = Object.freeze([
  Object.freeze({
    id: "dish-nori-ramen",
    name: "Nori Ramen Bowl",
    emoji: "🍜",
    cuisine: "Japanese",
    ingredients: ["Nori", "Soy Sauce", "Egg"],
    narrative: "Warm ramen with seaweed."
  }),
  Object.freeze({
    id: "dish-sushi",
    name: "Rainbow Sushi",
    emoji: "🍣",
    cuisine: "Japanese",
    ingredients: ["Rice", "Salmon", "Avocado"],
    narrative: "Colorful sushi roll."
  }),
  Object.freeze({
    id: "dish-pasta",
    name: "Garden Pesto Pasta",
    emoji: "🍝",
    cuisine: "Italian",
    ingredients: ["Basil", "Tomato", "Parmesan"],
    narrative: "Herby pasta dinner."
  })
]);

const FilterInteractionScenario = Object.freeze({
  APPLY_BOTH: "filters dishes when cuisine and ingredient options are selected",
  NO_MATCHES: "renders an empty state when filters have no matches",
  CLEAR_FILTERS: "clearing filters restores every dish"
});

const FilterInteractionScenarios = Object.freeze([
  Object.freeze({
    description: FilterInteractionScenario.APPLY_BOTH,
    arrange: ({ selectCuisine, selectIngredient }) => {
      selectCuisine("japanese");
      selectIngredient("soy sauce");
    },
    expectedRowCount: 1,
    expectedDishNames: ["Nori Ramen Bowl"],
    expectEmptyState: false
  }),
  Object.freeze({
    description: FilterInteractionScenario.NO_MATCHES,
    arrange: ({ selectCuisine, selectIngredient }) => {
      selectCuisine("japanese");
      selectIngredient("basil");
    },
    expectedRowCount: 0,
    expectedDishNames: [],
    expectEmptyState: true
  }),
  Object.freeze({
    description: FilterInteractionScenario.CLEAR_FILTERS,
    arrange: ({ selectCuisine, selectIngredient, clearCuisine, clearIngredient }) => {
      selectCuisine("japanese");
      selectIngredient("soy sauce");
      clearCuisine();
      clearIngredient();
    },
    expectedRowCount: SampleDishes.length,
    expectedDishNames: SampleDishes.map((dish) => dish.name),
    expectEmptyState: false
  })
]);

afterEach(() => {
  document.body.innerHTML = "";
});

function buildMenuTableMarkup() {
  return `
    <${HtmlTagName.TABLE}>
      <${HtmlTagName.THEAD}>
        <${HtmlTagName.TR}>
          <${HtmlTagName.TH}>${MenuColumnLabel.DISH}</${HtmlTagName.TH}>
          <${HtmlTagName.TH}>
            <${HtmlTagName.DIV} class="${CssClassName.HEADER_CELL}">
              <${HtmlTagName.BUTTON}
                id="${MenuElementId.INGREDIENT_FILTER_TOGGLE}"
                class="${CssClassName.HEADER_TOGGLE}"
                aria-controls="${MenuElementId.INGREDIENT_FILTER_PANEL}"
                aria-haspopup="true"
                aria-expanded="false"
                type="button"
              >${MenuColumnLabel.INGREDIENTS}</${HtmlTagName.BUTTON}>
              <${HtmlTagName.DIV}
                id="${MenuElementId.INGREDIENT_FILTER_PANEL}"
                class="${CssClassName.FILTER_PANEL}"
                hidden
                role="group"
              >
                <${HtmlTagName.DIV} class="${CssClassName.FILTER_HEADER}">
                  <${HtmlTagName.P} class="${CssClassName.FILTER_TITLE}">Filter by ingredient</${HtmlTagName.P}>
                  <${HtmlTagName.BUTTON}
                    id="${MenuElementId.INGREDIENT_FILTER_CLEAR}"
                    class="${CssClassName.FILTER_CLEAR}"
                    aria-disabled="true"
                    type="button"
                  >Clear</${HtmlTagName.BUTTON}>
                </${HtmlTagName.DIV}>
                <${HtmlTagName.DIV} id="${MenuElementId.INGREDIENT_FILTER_LIST}" class="${CssClassName.FILTER_LIST}"></${HtmlTagName.DIV}>
              </${HtmlTagName.DIV}>
            </${HtmlTagName.DIV}>
          </${HtmlTagName.TH}>
          <${HtmlTagName.TH}>
            <${HtmlTagName.DIV} class="${CssClassName.HEADER_CELL}">
              <${HtmlTagName.BUTTON}
                id="${MenuElementId.CUISINE_FILTER_TOGGLE}"
                class="${CssClassName.HEADER_TOGGLE}"
                aria-controls="${MenuElementId.CUISINE_FILTER_PANEL}"
                aria-haspopup="true"
                aria-expanded="false"
                type="button"
              >${MenuColumnLabel.CUISINE}</${HtmlTagName.BUTTON}>
              <${HtmlTagName.DIV}
                id="${MenuElementId.CUISINE_FILTER_PANEL}"
                class="${CssClassName.FILTER_PANEL}"
                hidden
                role="group"
              >
                <${HtmlTagName.DIV} class="${CssClassName.FILTER_HEADER}">
                  <${HtmlTagName.P} class="${CssClassName.FILTER_TITLE}">Filter by cuisine</${HtmlTagName.P}>
                  <${HtmlTagName.BUTTON}
                    id="${MenuElementId.CUISINE_FILTER_CLEAR}"
                    class="${CssClassName.FILTER_CLEAR}"
                    aria-disabled="true"
                    type="button"
                  >Clear</${HtmlTagName.BUTTON}>
                </${HtmlTagName.DIV}>
                <${HtmlTagName.DIV} id="${MenuElementId.CUISINE_FILTER_LIST}" class="${CssClassName.FILTER_LIST}"></${HtmlTagName.DIV}>
              </${HtmlTagName.DIV}>
            </${HtmlTagName.DIV}>
          </${HtmlTagName.TH}>
          <${HtmlTagName.TH}>${MenuColumnLabel.STORY}</${HtmlTagName.TH}>
        </${HtmlTagName.TR}>
      </${HtmlTagName.THEAD}>
      <${HtmlTagName.TBODY} id="${MenuElementId.TABLE_BODY}"></${HtmlTagName.TBODY}>
    </${HtmlTagName.TABLE}>
  `;
}

function configureViewportWidth(width) {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth");
  const originalInnerWidth = typeof window.innerWidth === "number" ? window.innerWidth : undefined;

  const createMediaQueryList = (query) => ({
    matches:
      query === MobileViewportConfiguration.QUERY
      && width <= MobileViewportConfiguration.MAX_WIDTH,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false
  });

  window.matchMedia = (query) => createMediaQueryList(query);

  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width
  });

  return () => {
    if (typeof originalMatchMedia === "function") {
      window.matchMedia = originalMatchMedia;
    } else if (originalMatchMedia === undefined) {
      delete window.matchMedia;
    } else {
      window.matchMedia = originalMatchMedia;
    }

    if (originalInnerWidthDescriptor) {
      Object.defineProperty(window, "innerWidth", originalInnerWidthDescriptor);
    } else if (typeof originalInnerWidth === "number") {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: originalInnerWidth
      });
    } else {
      delete window.innerWidth;
    }
  };
}

function createInteractionHelpers() {
  const selectFilterOption = (filterType, filterValue) => {
    const toggleId =
      filterType === FilterType.CUISINE
        ? MenuElementId.CUISINE_FILTER_TOGGLE
        : MenuElementId.INGREDIENT_FILTER_TOGGLE;
    const toggleElement = document.getElementById(toggleId);
    toggleElement.click();

    const optionSelector = `.${CssClassName.FILTER_OPTION}[${FilterDataAttribute.TYPE}="${filterType}"][${FilterDataAttribute.VALUE}="${filterValue}"]`;
    const optionElement = document.querySelector(optionSelector);
    if (!optionElement) {
      throw new Error(`Option for ${filterType} with value ${filterValue} not found`);
    }
    optionElement.click();
  };

  const clearFilters = (filterType) => {
    const clearButtonId =
      filterType === FilterType.CUISINE
        ? MenuElementId.CUISINE_FILTER_CLEAR
        : MenuElementId.INGREDIENT_FILTER_CLEAR;
    const clearButton = document.getElementById(clearButtonId);
    if (clearButton.disabled) {
      throw new Error(`Clear button for ${filterType} should be enabled before clearing`);
    }
    clearButton.click();
  };

  return {
    selectCuisine: (value) => selectFilterOption(FilterType.CUISINE, value),
    selectIngredient: (value) => selectFilterOption(FilterType.INGREDIENT, value),
    clearCuisine: () => clearFilters(FilterType.CUISINE),
    clearIngredient: () => clearFilters(FilterType.INGREDIENT)
  };
}

describe("Menu filters", () => {
  test.each(FilterInteractionScenarios)("%s", ({
    arrange,
    expectedRowCount,
    expectedDishNames,
    expectEmptyState
  }) => {
    document.body.innerHTML = buildMenuTableMarkup();

    const menuTableBodyElement = document.getElementById(MenuElementId.TABLE_BODY);

    const menuView = new MenuView({
      documentReference: document,
      menuTableBodyElement
    });

    const menuFilterController = new MenuFilterController({
      documentReference: document,
      menuPresenter: menuView
    });

    menuFilterController.initialize();

    const normalizationEngine = new NormalizationEngine([]);

    menuView.updateDataDependencies({
      dishesCatalog: SampleDishes,
      normalizationEngine,
      ingredientEmojiByName: new Map(),
      cuisineToFlagMap: new Map(),
      allergensCatalog: []
    });
    menuView.renderMenu();

    const helpers = createInteractionHelpers();
    arrange(helpers);

    const headerRows = Array.from(
      menuTableBodyElement.querySelectorAll(`.${CssClassName.MOBILE_HEADER_ROW}`)
    );
    const dataRows = Array.from(
      menuTableBodyElement.querySelectorAll(`.${CssClassName.DATA_ROW}`)
    );
    const emptyRows = Array.from(
      menuTableBodyElement.querySelectorAll(`.${CssClassName.EMPTY_ROW}`)
    );
    const bodyChildren = Array.from(menuTableBodyElement.children);

    expect(dataRows).toHaveLength(expectedRowCount);

    expect(headerRows).toHaveLength(0);

    const unexpectedRows = bodyChildren.filter(
      (rowElement) =>
        !rowElement.classList.contains(CssClassName.DATA_ROW)
        && !rowElement.classList.contains(CssClassName.EMPTY_ROW)
    );

    expect(unexpectedRows).toHaveLength(0);

    if (expectEmptyState) {
      expect(emptyRows).toHaveLength(1);
      expect(emptyRows[0].textContent).toContain(MenuEmptyMessage);
    } else {
      expect(emptyRows).toHaveLength(0);
    }

    for (const expectedName of expectedDishNames) {
      expect(
        dataRows.some((rowElement) => rowElement.textContent.includes(expectedName))
      ).toBe(true);
    }
  });
});

describe("MenuView responsive layout", () => {
  test("renders only data rows inside the table body when viewport is mobile", () => {
    document.body.innerHTML = buildMenuTableMarkup();

    const restoreViewport = configureViewportWidth(MobileViewportConfiguration.TARGET_WIDTH);

    try {
      const menuTableBodyElement = document.getElementById(MenuElementId.TABLE_BODY);

      const menuView = new MenuView({
        documentReference: document,
        menuTableBodyElement
      });

      const menuFilterController = new MenuFilterController({
        documentReference: document,
        menuPresenter: menuView
      });

      menuFilterController.initialize();

      const normalizationEngine = new NormalizationEngine([]);

      menuView.updateDataDependencies({
        dishesCatalog: SampleDishes,
        normalizationEngine,
        ingredientEmojiByName: new Map(),
        cuisineToFlagMap: new Map(),
        allergensCatalog: []
      });
      menuView.renderMenu();

      const dataRows = Array.from(
        menuTableBodyElement.querySelectorAll(`.${CssClassName.DATA_ROW}`)
      );
      expect(dataRows).toHaveLength(SampleDishes.length);

      const headerRowsWithinBody = menuTableBodyElement.querySelectorAll(
        `.${CssClassName.MOBILE_HEADER_ROW}`
      );
      expect(headerRowsWithinBody).toHaveLength(0);

      const unexpectedRows = Array.from(menuTableBodyElement.children).filter(
        (rowElement) =>
          !rowElement.classList.contains(CssClassName.DATA_ROW)
          && !rowElement.classList.contains(CssClassName.EMPTY_ROW)
      );
      expect(unexpectedRows).toHaveLength(0);

      const filterContainers = document.querySelectorAll(
        `.${CssClassName.MOBILE_FILTER_CONTAINER}`
      );
      expect(filterContainers).toHaveLength(1);

      const mobileHeaders = filterContainers[0].querySelectorAll(
        `.${CssClassName.MOBILE_HEADER_ROW}`
      );
      expect(mobileHeaders).toHaveLength(1);
    } finally {
      restoreViewport();
    }
  });
});
