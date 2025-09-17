import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HtmlTagName = Object.freeze({
  BUTTON: "BUTTON",
  DIV: "DIV"
});

const AttributeName = Object.freeze({
  ARIA_CONTROLS: "aria-controls",
  ARIA_EXPANDED: "aria-expanded",
  ARIA_HAS_POPUP: "aria-haspopup",
  ROLE: "role",
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

const FilterToolbarSelector = Object.freeze({
  CONTAINER_CLASS: "menu-card__filters"
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
      expect(toggleElement.tagName).toBe(HtmlTagName.BUTTON);

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

  test("menu filter toolbar avoids redundant filter buttons", () => {
    const toolbarElement = documentRoot.querySelector(`.${FilterToolbarSelector.CONTAINER_CLASS}`);
    expect(toolbarElement).not.toBeNull();

    const toggleElements = toolbarElement.querySelectorAll(HtmlTagName.BUTTON.toLowerCase());
    expect(toggleElements.length).toBeGreaterThan(0);

    toggleElements.forEach((toggleElement) => {
      const normalizedLabel = normalizeWhitespace(toggleElement.textContent);
      expect(normalizedLabel).not.toBe("Filter");
    });
  });
});
