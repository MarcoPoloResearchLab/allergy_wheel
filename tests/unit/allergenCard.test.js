import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AllergenCard } from "../../firstCard.js";
import { BrowserEventName, ControlElementId, FirstCardElementId } from "../../constants.js";

const CssClassName = Object.freeze({
  CHIP: "chip",
  CHIP_SELECTED: "chip--selected",
});

const HtmlTagName = Object.freeze({
  INPUT: "input",
});

const SampleAllergens = Object.freeze([
  { token: "peanuts", label: "Peanuts", emoji: "🥜" },
  { token: "egg", label: "Egg", emoji: "🥚" },
  { token: "fish", label: "Fish", emoji: "🐟" },
]);

const SelectionScenarios = SampleAllergens.map((allergen, index) => ({
  description: `selecting ${allergen.label}`,
  selectedIndex: index,
}));

const ResetScenarioTable = [{ description: "clearing selection state" }];

describe("AllergenCard selection styling", () => {
  let listContainerElement;
  let badgeContainerElement;
  let onSelectionSpy;
  let cardPresenter;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="${FirstCardElementId.LIST_CONTAINER}">
        <button id="${ControlElementId.START_BUTTON}"></button>
      </div>
      <div id="${FirstCardElementId.BADGE_CONTAINER}"></div>
    `;

    listContainerElement = document.getElementById(FirstCardElementId.LIST_CONTAINER);
    badgeContainerElement = document.getElementById(FirstCardElementId.BADGE_CONTAINER);
    onSelectionSpy = jest.fn();

    cardPresenter = new AllergenCard({
      listContainerElement,
      badgeContainerElement,
      onAllergenSelected: onSelectionSpy,
    });

    cardPresenter.renderAllergens(SampleAllergens);
  });

  it.each(SelectionScenarios)("applies selection class when %s", ({ selectedIndex }) => {
    const radioInputs = listContainerElement.getElementsByTagName(HtmlTagName.INPUT);
    const selectedRadio = radioInputs[selectedIndex];
    selectedRadio.checked = true;
    selectedRadio.dispatchEvent(new Event(BrowserEventName.CHANGE, { bubbles: true }));

    const chipElements = Array.from(
      listContainerElement.getElementsByClassName(CssClassName.CHIP),
    );

    chipElements.forEach((chipElement, chipIndex) => {
      const hasSelectionClass = chipElement.classList.contains(CssClassName.CHIP_SELECTED);
      expect(hasSelectionClass).toBe(chipIndex === selectedIndex);
    });

    const expectedSelection = SampleAllergens[selectedIndex];
    expect(onSelectionSpy).toHaveBeenCalledWith({
      token: expectedSelection.token,
      label: expectedSelection.label,
      emoji: expectedSelection.emoji,
    });
  });

  it.each(ResetScenarioTable)("removes styling when %s", () => {
    const radioInputs = listContainerElement.getElementsByTagName(HtmlTagName.INPUT);
    const firstRadio = radioInputs[0];
    firstRadio.checked = true;
    firstRadio.dispatchEvent(new Event(BrowserEventName.CHANGE, { bubbles: true }));

    cardPresenter.updateBadges([]);

    const chipElements = Array.from(
      listContainerElement.getElementsByClassName(CssClassName.CHIP),
    );

    chipElements.forEach((chipElement) => {
      expect(chipElement.classList.contains(CssClassName.CHIP_SELECTED)).toBe(false);
      const radioElement = chipElement.getElementsByTagName(HtmlTagName.INPUT)[0];
      expect(radioElement.checked).toBe(false);
    });
  });
});
