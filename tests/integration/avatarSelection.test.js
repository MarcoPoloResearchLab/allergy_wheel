import { createListenerBinder } from "../../listeners.js";
import { StateManager } from "../../state.js";
import { ResultCard } from "../../lastCard.js";
import { renderAvatarSelector, buildAvatarDescriptorMap } from "../../avatarRenderer.js";
import {
  ControlElementId,
  AttributeName,
  AttributeBooleanValue,
  ResultCardElementId,
  AvatarId,
  AvatarCatalog,
  AvatarClassName,
  AvatarMenuText
} from "../../constants.js";

const EmptyStringValue = "";
const SvgNamespaceUri = "http://www.w3.org/2000/svg";

const HtmlTagName = Object.freeze({
  BUTTON: "button",
  DIV: "div",
  IMG: "img",
  SPAN: "span",
  SECTION: "section",
  SVG: "svg"
});

const HtmlAttributeName = Object.freeze({
  SRC: "src",
  ALT: "alt"
});

const SvgSelector = Object.freeze({
  IMAGE: "image"
});

const SvgAttributeName = Object.freeze({
  HREF: "href"
});

const RevealSectionClassName = Object.freeze({
  ACTIONS: "actions"
});

const AvatarMenuContainerClassName = "avatar-menu";

const AvatarDescriptorById = buildAvatarDescriptorMap(AvatarCatalog);

const AvatarDefaultDescriptor =
  AvatarDescriptorById.get(AvatarId.DEFAULT) || AvatarCatalog[0];

const TestAllergenDescriptor = Object.freeze({
  TOKEN: "peanut",
  LABEL: "Peanut",
  EMOJI: "🥜"
});

const DishDescriptor = Object.freeze({
  FIRST_ROUND: {
    NAME: "Peanut Satay",
    EMOJI: "🥜",
    HAZARDOUS_INGREDIENT: "peanut"
  },
  SECOND_ROUND: {
    NAME: "Almond Cookie",
    EMOJI: "🍪",
    HAZARDOUS_INGREDIENT: "peanut"
  }
});

const AvatarSelectionScenarioDescription = Object.freeze({
  CREATIVE_PERSISTENCE: "selecting the creative boy avatar persists across rounds",
  TYRANNOSAURUS_PERSISTENCE: "selecting the tyrannosaurus rex avatar persists across rounds",
  TRICERATOPS_PERSISTENCE: "selecting the triceratops avatar persists across rounds"
});

const AvatarResourceEntries = Object.freeze(
  AvatarCatalog.map((avatarDescriptor) =>
    Object.freeze([avatarDescriptor.id, avatarDescriptor.assetPath])
  )
);

const AvatarSelectionScenarios = Object.freeze([
  Object.freeze({
    description: AvatarSelectionScenarioDescription.CREATIVE_PERSISTENCE,
    chosenAvatarId: AvatarId.CREATIVE_BOY
  }),
  Object.freeze({
    description: AvatarSelectionScenarioDescription.TYRANNOSAURUS_PERSISTENCE,
    chosenAvatarId: AvatarId.TYRANNOSAURUS_REX
  }),
  Object.freeze({
    description: AvatarSelectionScenarioDescription.TRICERATOPS_PERSISTENCE,
    chosenAvatarId: AvatarId.TRICERATOPS
  })
]);

afterEach(() => {
  document.body.innerHTML = EmptyStringValue;
});

function getAvatarDescriptorOrDefault(avatarIdentifier) {
  return AvatarDescriptorById.get(avatarIdentifier) || AvatarDefaultDescriptor;
}

function expectAvatarMenuMatchesCatalog(avatarMenuElement) {
  const menuOptionElements = Array.from(
    avatarMenuElement.querySelectorAll(`[data-avatar-id]`)
  );
  expect(menuOptionElements).toHaveLength(AvatarCatalog.length);

  for (const optionElement of menuOptionElements) {
    const optionAvatarIdentifier = optionElement.dataset.avatarId;
    const expectedDescriptor = getAvatarDescriptorOrDefault(optionAvatarIdentifier);
    expect(expectedDescriptor).toBeDefined();

    const optionImageElement = optionElement.querySelector(HtmlTagName.IMG);
    expect(optionImageElement).not.toBeNull();
    if (!optionImageElement) {
      continue;
    }

    expect(optionImageElement.getAttribute(HtmlAttributeName.SRC)).toBe(
      expectedDescriptor.assetPath
    );
    expect(optionImageElement.getAttribute(HtmlAttributeName.ALT)).toBe(
      `${expectedDescriptor.displayName}${AvatarMenuText.OPTION_ALT_SUFFIX}`
    );

    const optionLabelElement = optionElement.querySelector(
      `.${AvatarClassName.LABEL}`
    );
    expect(optionLabelElement).not.toBeNull();
    if (optionLabelElement) {
      expect(optionLabelElement.textContent).toBe(
        expectedDescriptor.displayName
      );
    }
  }
}

function expectToggleMatchesDescriptor({
  imageElement,
  labelElement,
  descriptor
}) {
  if (imageElement) {
    expect(imageElement.getAttribute(HtmlAttributeName.SRC)).toBe(
      descriptor.assetPath
    );
    expect(imageElement.getAttribute(HtmlAttributeName.ALT)).toBe(
      `${descriptor.displayName}${AvatarMenuText.TOGGLE_ALT_SUFFIX}`
    );
  }
  if (labelElement) {
    expect(labelElement.textContent).toBe(descriptor.displayName);
  }
}

function createAvatarSelectorElements({ selectedAvatarId = AvatarId.DEFAULT } = {}) {
  const headerAvatarToggleButtonElement = document.createElement(HtmlTagName.BUTTON);
  headerAvatarToggleButtonElement.id = ControlElementId.AVATAR_TOGGLE;
  if (AvatarClassName.BUTTON) {
    headerAvatarToggleButtonElement.classList.add(AvatarClassName.BUTTON);
  }

  const avatarMenuElement = document.createElement(HtmlTagName.DIV);
  avatarMenuElement.id = ControlElementId.AVATAR_MENU;
  avatarMenuElement.hidden = true;
  avatarMenuElement.className = AvatarMenuContainerClassName;

  document.body.appendChild(headerAvatarToggleButtonElement);
  document.body.appendChild(avatarMenuElement);

  const { imageElement, labelElement } = renderAvatarSelector({
    toggleButtonElement: headerAvatarToggleButtonElement,
    menuContainerElement: avatarMenuElement,
    selectedAvatarId
  });

  expectAvatarMenuMatchesCatalog(avatarMenuElement);
  expectToggleMatchesDescriptor({
    imageElement,
    labelElement,
    descriptor: getAvatarDescriptorOrDefault(selectedAvatarId)
  });

  return {
    headerAvatarToggleButtonElement,
    headerAvatarImageElement: imageElement,
    headerAvatarLabelElement: labelElement,
    avatarMenuElement
  };
}

function createResultCardElements() {
  const revealSectionElement = document.createElement(HtmlTagName.SECTION);
  revealSectionElement.id = ResultCardElementId.REVEAL_SECTION;
  revealSectionElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);

  const dishTitleElement = document.createElement(HtmlTagName.DIV);
  dishTitleElement.id = ResultCardElementId.DISH_TITLE;
  revealSectionElement.appendChild(dishTitleElement);

  const dishCuisineElement = document.createElement(HtmlTagName.DIV);
  dishCuisineElement.id = ResultCardElementId.DISH_CUISINE;
  revealSectionElement.appendChild(dishCuisineElement);

  const resultBannerElement = document.createElement(HtmlTagName.DIV);
  resultBannerElement.id = ResultCardElementId.RESULT_BANNER;
  revealSectionElement.appendChild(resultBannerElement);

  const resultTextElement = document.createElement(HtmlTagName.DIV);
  resultTextElement.id = ResultCardElementId.RESULT_TEXT;
  resultBannerElement.appendChild(resultTextElement);

  const ingredientsContainerElement = document.createElement(HtmlTagName.DIV);
  ingredientsContainerElement.id = ResultCardElementId.INGREDIENTS_CONTAINER;
  revealSectionElement.appendChild(ingredientsContainerElement);

  const faceSvgElement = document.createElementNS(SvgNamespaceUri, HtmlTagName.SVG);
  faceSvgElement.id = ResultCardElementId.FACE_SVG;
  faceSvgElement.hidden = true;
  revealSectionElement.appendChild(faceSvgElement);

  const actionsContainerElement = document.createElement(HtmlTagName.DIV);
  actionsContainerElement.className = RevealSectionClassName.ACTIONS;
  revealSectionElement.appendChild(actionsContainerElement);

  document.body.appendChild(revealSectionElement);

  const gameOverSectionElement = document.createElement(HtmlTagName.SECTION);
  gameOverSectionElement.id = ResultCardElementId.GAME_OVER_SECTION;
  gameOverSectionElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
  document.body.appendChild(gameOverSectionElement);

  return {
    revealSectionElement,
    dishTitleElement,
    dishCuisineElement,
    resultBannerElement,
    resultTextElement,
    ingredientsContainerElement,
    faceSvgElement,
    gameOverSectionElement
  };
}

function createNormalizationEngineDouble(allergenToken) {
  return {
    tokensForIngredient: () => new Set([allergenToken])
  };
}

function createDishRecord(dishDescriptor) {
  return {
    name: dishDescriptor.NAME,
    emoji: dishDescriptor.EMOJI,
    ingredients: [dishDescriptor.HAZARDOUS_INGREDIENT]
  };
}

function createAvatarSelectionIntegrationHarness() {
  const avatarResourceMap = new Map(AvatarResourceEntries);
  const {
    headerAvatarToggleButtonElement,
    headerAvatarImageElement,
    headerAvatarLabelElement,
    avatarMenuElement
  } = createAvatarSelectorElements();

  const {
    revealSectionElement,
    dishTitleElement,
    dishCuisineElement,
    resultBannerElement,
    resultTextElement,
    ingredientsContainerElement,
    faceSvgElement,
    gameOverSectionElement
  } = createResultCardElements();

  const stateManager = new StateManager();
  stateManager.setSelectedAllergen({
    token: TestAllergenDescriptor.TOKEN,
    label: TestAllergenDescriptor.LABEL
  });

  const listenerBinder = createListenerBinder({
    controlElementId: ControlElementId,
    attributeName: AttributeName,
    documentReference: document,
    stateManager
  });

  const normalizationEngineDouble = createNormalizationEngineDouble(TestAllergenDescriptor.TOKEN);

  const resultCard = new ResultCard({
    documentReference: document,
    revealSectionElement,
    dishTitleElement,
    dishCuisineElement,
    resultBannerElement,
    resultTextElement,
    ingredientsContainerElement,
    faceSvgElement,
    gameOverSectionElement,
    normalizationEngine: normalizationEngineDouble,
    allergensCatalog: [
      { token: TestAllergenDescriptor.TOKEN, emoji: TestAllergenDescriptor.EMOJI }
    ],
    cuisineToFlagMap: new Map(),
    ingredientEmojiByName: new Map(),
    avatarMap: avatarResourceMap,
    selectedAvatarId: stateManager.getSelectedAvatar()
  });

  const updateHeaderAvatarSelection = (avatarIdentifier) => {
    const resolvedDescriptor = getAvatarDescriptorOrDefault(avatarIdentifier);
    if (headerAvatarImageElement) {
      headerAvatarImageElement.setAttribute(
        HtmlAttributeName.SRC,
        resolvedDescriptor.assetPath
      );
      headerAvatarImageElement.setAttribute(
        HtmlAttributeName.ALT,
        `${resolvedDescriptor.displayName}${AvatarMenuText.TOGGLE_ALT_SUFFIX}`
      );
    }

    if (headerAvatarLabelElement) {
      headerAvatarLabelElement.textContent = resolvedDescriptor.displayName;
    }
  };

  updateHeaderAvatarSelection(stateManager.getSelectedAvatar());

  listenerBinder.wireAvatarSelector({
    onAvatarChange: (avatarIdentifier) => {
      stateManager.setSelectedAvatar(avatarIdentifier);
      const resolvedAvatarIdentifier = stateManager.getSelectedAvatar();
      resultCard.updateAvatarSelection(resolvedAvatarIdentifier);
      updateHeaderAvatarSelection(resolvedAvatarIdentifier);
    }
  });

  const selectAvatar = (avatarIdentifier) => {
    headerAvatarToggleButtonElement.click();
    const avatarOptionElements = Array.from(
      avatarMenuElement.querySelectorAll(`[data-avatar-id]`)
    );
    return avatarOptionElements.find((optionElement) => optionElement.dataset.avatarId === avatarIdentifier);
  };

  const simulateSpinAndReveal = (dishDescriptor) => {
    const dishRecord = createDishRecord(dishDescriptor);
    stateManager.setWheelCandidates({
      dishes: [dishRecord],
      labels: [{ label: dishDescriptor.NAME, emoji: dishDescriptor.EMOJI }]
    });
    return resultCard.populateRevealCard({
      dish: dishRecord,
      selectedAllergenToken: TestAllergenDescriptor.TOKEN,
      selectedAllergenLabel: TestAllergenDescriptor.LABEL
    });
  };

  const getRenderedAvatarImageElement = () => faceSvgElement.querySelector(SvgSelector.IMAGE);

  return {
    stateManager,
    avatarResourceMap,
    headerAvatarToggleButtonElement,
    headerAvatarImageElement,
    headerAvatarLabelElement,
    avatarMenuElement,
    faceSvgElement,
    selectAvatar,
    simulateSpinAndReveal,
    getRenderedAvatarImageElement
  };
}

describe("Avatar selection persistence", () => {
  test.each(AvatarSelectionScenarios)("%s", ({ chosenAvatarId }) => {
    const {
      stateManager,
      avatarResourceMap,
      headerAvatarImageElement,
      headerAvatarLabelElement,
      avatarMenuElement,
      faceSvgElement,
      selectAvatar,
      simulateSpinAndReveal,
      getRenderedAvatarImageElement
    } = createAvatarSelectionIntegrationHarness();

    const targetOptionButtonElement = selectAvatar(chosenAvatarId);
    expect(targetOptionButtonElement).toBeDefined();
    targetOptionButtonElement.click();

    expect(stateManager.getSelectedAvatar()).toBe(chosenAvatarId);
    expect(avatarMenuElement.hidden).toBe(true);

    const expectedAvatarDescriptor = getAvatarDescriptorOrDefault(chosenAvatarId);
    const expectedAvatarResourcePath =
      avatarResourceMap.get(chosenAvatarId) || expectedAvatarDescriptor.assetPath;
    expect(expectedAvatarResourcePath).toBeDefined();
    expect(headerAvatarImageElement.getAttribute(HtmlAttributeName.SRC)).toBe(
      expectedAvatarResourcePath
    );
    expect(headerAvatarImageElement.getAttribute(HtmlAttributeName.ALT)).toBe(
      `${expectedAvatarDescriptor.displayName}${AvatarMenuText.TOGGLE_ALT_SUFFIX}`
    );

    expect(headerAvatarLabelElement.textContent).toBe(
      expectedAvatarDescriptor.displayName
    );

    const firstSpinResult = simulateSpinAndReveal(DishDescriptor.FIRST_ROUND);
    expect(firstSpinResult.hasTriggeringIngredient).toBe(true);
    expect(faceSvgElement.hidden).toBe(false);

    const renderedAvatarImageElement = getRenderedAvatarImageElement();
    expect(renderedAvatarImageElement).not.toBeNull();
    expect(renderedAvatarImageElement.getAttribute(SvgAttributeName.HREF)).toBe(
      expectedAvatarResourcePath
    );

    const secondSpinResult = simulateSpinAndReveal(DishDescriptor.SECOND_ROUND);
    expect(secondSpinResult.hasTriggeringIngredient).toBe(true);
    expect(faceSvgElement.hidden).toBe(false);

    const secondRenderedAvatarImageElement = getRenderedAvatarImageElement();
    expect(secondRenderedAvatarImageElement).not.toBeNull();
    expect(secondRenderedAvatarImageElement.getAttribute(SvgAttributeName.HREF)).toBe(
      expectedAvatarResourcePath
    );

    expect(stateManager.getSelectedAvatar()).toBe(chosenAvatarId);
    expect(headerAvatarImageElement.getAttribute(HtmlAttributeName.SRC)).toBe(
      expectedAvatarResourcePath
    );
    expect(headerAvatarLabelElement.textContent).toBe(
      expectedAvatarDescriptor.displayName
    );
    expect(headerAvatarImageElement.getAttribute(HtmlAttributeName.ALT)).toBe(
      `${expectedAvatarDescriptor.displayName}${AvatarMenuText.TOGGLE_ALT_SUFFIX}`
    );
  });
});
