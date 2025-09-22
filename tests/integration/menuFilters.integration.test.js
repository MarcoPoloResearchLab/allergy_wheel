import { MenuView } from "../../js/ui/menu.js";
import { MenuFilterController } from "../../js/ui/menuFilters.js";
import { MenuElementId } from "../../js/constants.js";
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
  EMPTY_ROW: "menu-row--empty"
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
    expectedRowCount: 1,
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
          <${HtmlTagName.TH}>Dish</${HtmlTagName.TH}>
          <${HtmlTagName.TH}>
            <${HtmlTagName.DIV} class="${CssClassName.HEADER_CELL}">
              <${HtmlTagName.BUTTON}
                id="${MenuElementId.INGREDIENT_FILTER_TOGGLE}"
                class="${CssClassName.HEADER_TOGGLE}"
                aria-controls="${MenuElementId.INGREDIENT_FILTER_PANEL}"
                aria-haspopup="true"
                aria-expanded="false"
                type="button"
              >Ingredients</${HtmlTagName.BUTTON}>
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
              >Cuisine</${HtmlTagName.BUTTON}>
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
          <${HtmlTagName.TH}>Story</${HtmlTagName.TH}>
        </${HtmlTagName.TR}>
      </${HtmlTagName.THEAD}>
      <${HtmlTagName.TBODY} id="${MenuElementId.TABLE_BODY}"></${HtmlTagName.TBODY}>
    </${HtmlTagName.TABLE}>
  `;
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

    const renderedRows = Array.from(menuTableBodyElement.querySelectorAll(HtmlTagName.TR));
    expect(renderedRows).toHaveLength(expectedRowCount);

    const emptyRows = renderedRows.filter((rowElement) =>
      rowElement.classList.contains(CssClassName.EMPTY_ROW)
    );

    if (expectEmptyState) {
      expect(emptyRows).toHaveLength(1);
      expect(emptyRows[0].textContent).toContain(MenuEmptyMessage);
    } else {
      expect(emptyRows).toHaveLength(0);
    }

    const renderedDishRows = renderedRows.filter(
      (rowElement) => !rowElement.classList.contains(CssClassName.EMPTY_ROW)
    );

    for (const expectedName of expectedDishNames) {
      expect(
        renderedDishRows.some((rowElement) => rowElement.textContent.includes(expectedName))
      ).toBe(true);
    }
  });
});
