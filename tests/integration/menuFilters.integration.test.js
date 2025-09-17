import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HtmlTagName = Object.freeze({
  BUTTON: "BUTTON",
  DIV: "DIV",
  TH: "TH",
  THEAD: "THEAD",
  TR: "TR"
});

const AttributeName = Object.freeze({
  ARIA_CONTROLS: "aria-controls",
  ARIA_EXPANDED: "aria-expanded",
  ARIA_HAS_POPUP: "aria-haspopup",
  ROLE: "role",
  SCOPE: "scope",
  TYPE: "type"
});

const AttributeBooleanValue = Object.freeze({
  TRUE: "true",
  FALSE: "false"
});

const InputType = Object.freeze({
  BUTTON: "button"
});

const RoleName = Object.freeze({
  REGION: "region"
});

const TableStructureSelector = Object.freeze({
  HEADER_ROW: ".menu-table thead tr"
});

const DeprecatedStructureClass = Object.freeze({
  FILTER_TOOLBAR: "menu-card__filters"
});

const ColumnScope = Object.freeze({
  COLUMN: "col"
});

const ExpectedHeaderCellCount = Object.freeze({
  TOTAL: 4
});

const MenuFilterToggleScenarios = Object.freeze([
  Object.freeze({
    description: "ingredient filter header toggle",
    toggleId: "menu-ingredient-filter-toggle",
    expectedLabel: "Ingredients",
    expectedPanelId: "menu-ingredient-filter-panel"
  }),
  Object.freeze({
    description: "cuisine filter header toggle",
    toggleId: "menu-cuisine-filter-toggle",
    expectedLabel: "Cuisine",
    expectedPanelId: "menu-cuisine-filter-panel"
  })
]);

function normalizeWhitespace(candidateText) {
  return candidateText.replace(/\s+/g, " ").trim();
}

describe("menu filter header toggles", () => {
  let documentRoot;

  beforeAll(() => {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDirectoryPath = path.dirname(currentFilePath);
    const indexMarkupPath = path.resolve(currentDirectoryPath, "../../index.html");
    const indexMarkup = readFileSync(indexMarkupPath, "utf8");

    const domParser = new DOMParser();
    documentRoot = domParser.parseFromString(indexMarkup, "text/html");
  });

  test.each(MenuFilterToggleScenarios)(
    "%s",
    ({ toggleId, expectedLabel, expectedPanelId }) => {
      const toggleElement = documentRoot.getElementById(toggleId);
      expect(toggleElement).not.toBeNull();
      if (!toggleElement) {
        return;
      }
      expect(toggleElement.tagName).toBe(HtmlTagName.BUTTON);

      const headerCellElement = toggleElement.closest(HtmlTagName.TH.toLowerCase());
      expect(headerCellElement).not.toBeNull();
      if (!headerCellElement) {
        return;
      }
      expect(headerCellElement.getAttribute(AttributeName.SCOPE)).toBe(ColumnScope.COLUMN);

      const headerRowElement = headerCellElement.parentElement;
      expect(headerRowElement).not.toBeNull();
      if (!headerRowElement) {
        return;
      }
      expect(headerRowElement.tagName).toBe(HtmlTagName.TR);

      const headerSectionElement = headerRowElement.parentElement;
      expect(headerSectionElement).not.toBeNull();
      if (!headerSectionElement) {
        return;
      }
      expect(headerSectionElement.tagName).toBe(HtmlTagName.THEAD);

      const normalizedLabel = normalizeWhitespace(toggleElement.textContent);
      expect(normalizedLabel).toContain(expectedLabel);

      expect(toggleElement.getAttribute(AttributeName.TYPE)).toBe(InputType.BUTTON);
      expect(toggleElement.getAttribute(AttributeName.ARIA_CONTROLS)).toBe(expectedPanelId);
      expect(toggleElement.getAttribute(AttributeName.ARIA_HAS_POPUP)).toBe(AttributeBooleanValue.TRUE);
      expect(toggleElement.getAttribute(AttributeName.ARIA_EXPANDED)).toBe(AttributeBooleanValue.FALSE);

      const panelElement = documentRoot.getElementById(expectedPanelId);
      expect(panelElement).not.toBeNull();
      expect(panelElement.tagName).toBe(HtmlTagName.DIV);
      expect(panelElement.getAttribute(AttributeName.ROLE)).toBe(RoleName.REGION);
      expect(panelElement.hasAttribute("hidden")).toBe(true);
    }
  );

  test("menu filter toggles are embedded in the menu table header row", () => {
    const headerRowElement = documentRoot.querySelector(TableStructureSelector.HEADER_ROW);
    expect(headerRowElement).not.toBeNull();
    if (!headerRowElement) {
      return;
    }

    const headerCellElements = headerRowElement.querySelectorAll(HtmlTagName.TH.toLowerCase());
    expect(headerCellElements.length).toBe(ExpectedHeaderCellCount.TOTAL);

    const toggleIds = MenuFilterToggleScenarios.map((scenario) => scenario.toggleId);
    toggleIds.forEach((toggleId) => {
      const toggleElement = documentRoot.getElementById(toggleId);
      expect(toggleElement).not.toBeNull();
      if (toggleElement) {
        expect(headerRowElement.contains(toggleElement)).toBe(true);
      }
    });

    const deprecatedToolbarElement = documentRoot.querySelector(`.${DeprecatedStructureClass.FILTER_TOOLBAR}`);
    expect(deprecatedToolbarElement).toBeNull();
  });
});
