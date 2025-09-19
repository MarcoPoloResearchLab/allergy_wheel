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
  AvatarMenuText,
  GlobalClassName
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
  NAME: "Peanut Satay",
  EMOJI: "🥜",
  HAZARDOUS_INGREDIENT: "peanut"
});

const AvatarSelectionTestDescription = Object.freeze({
  CREATIVE: "selecting the creative boy avatar renders it on the result card",
  CURIOUS: "selecting the curious girl avatar renders it on the result card",
  TYRANNOSAURUS: "selecting the tyrannosaurus rex avatar renders it on the result card",
  TRICERATOPS: "selecting the triceratops avatar renders it on the result card"
});

const AvatarResourceEntries = Object.freeze(
  AvatarCatalog.map((avatarDescriptor) =>
    Object.freeze([avatarDescriptor.id, avatarDescriptor.assetPath])
  )
);

const AvatarSelectionTestCases = Object.freeze([
  Object.freeze({
    description: AvatarSelectionTestDescription.CREATIVE,
    chosenAvatarId: AvatarId.CREATIVE_BOY
  }),
  Object.freeze({
    description: AvatarSelectionTestDescription.CURIOUS,
    chosenAvatarId: AvatarId.CURIOUS_GIRL
  }),
  Object.freeze({
    description: AvatarSelectionTestDescription.TYRANNOSAURUS,
    chosenAvatarId: AvatarId.TYRANNOSAURUS_REX
  }),
  Object.freeze({
    description: AvatarSelectionTestDescription.TRICERATOPS,
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
      expect(
        optionLabelElement.classList.contains(
          GlobalClassName.VISUALLY_HIDDEN
        )
      ).toBe(false);
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
    expect(
      labelElement.classList.contains(GlobalClassName.VISUALLY_HIDDEN)
    ).toBe(true);
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

function createAvatarSelectionTestHarness() {
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

  return {
    listenerBinder,
    stateManager,
    resultCard,
    avatarMenuElement,
    headerAvatarToggleButtonElement,
    headerAvatarImageElement,
    headerAvatarLabelElement,
    avatarResourceMap,
    updateHeaderAvatarSelection,
    faceSvgElement
  };
}

describe("Avatar selection integration", () => {
  test.each(AvatarSelectionTestCases)(
    "$description",
    ({ chosenAvatarId }) => {
      const {
        listenerBinder,
        stateManager,
        resultCard,
        avatarMenuElement,
        headerAvatarToggleButtonElement,
        headerAvatarImageElement,
        headerAvatarLabelElement,
        avatarResourceMap,
        updateHeaderAvatarSelection,
        faceSvgElement
      } = createAvatarSelectionTestHarness();

      listenerBinder.wireAvatarSelector({
        onAvatarChange: (avatarIdentifier) => {
          stateManager.setSelectedAvatar(avatarIdentifier);
          const resolvedAvatarIdentifier = stateManager.getSelectedAvatar();
          resultCard.updateAvatarSelection(resolvedAvatarIdentifier);
          updateHeaderAvatarSelection(resolvedAvatarIdentifier);
        }
      });

      headerAvatarToggleButtonElement.click();

      const avatarOptionElements = Array.from(
        avatarMenuElement.querySelectorAll(`[data-avatar-id]`)
      );
      const targetOptionButtonElement = avatarOptionElements.find(
        (optionElement) => optionElement.dataset.avatarId === chosenAvatarId
      );
      expect(targetOptionButtonElement).toBeDefined();

      targetOptionButtonElement.click();

      expect(stateManager.getSelectedAvatar()).toBe(chosenAvatarId);
      expect(avatarMenuElement.hidden).toBe(true);

      const expectedAvatarDescriptor = getAvatarDescriptorOrDefault(chosenAvatarId);
      const expectedAvatarResourcePath =
        avatarResourceMap.get(chosenAvatarId) || expectedAvatarDescriptor.assetPath;
      expect(expectedAvatarResourcePath).toBeDefined();

      const populateResult = resultCard.populateRevealCard({
        dish: {
          name: DishDescriptor.NAME,
          emoji: DishDescriptor.EMOJI,
          ingredients: [DishDescriptor.HAZARDOUS_INGREDIENT]
        },
        selectedAllergenToken: TestAllergenDescriptor.TOKEN,
        selectedAllergenLabel: TestAllergenDescriptor.LABEL
      });

      expect(populateResult.hasTriggeringIngredient).toBe(true);
      expect(faceSvgElement.hidden).toBe(false);
      expect(headerAvatarImageElement.getAttribute(HtmlAttributeName.SRC)).toBe(
        expectedAvatarResourcePath
      );

      expect(headerAvatarImageElement.getAttribute(HtmlAttributeName.ALT)).toBe(
        `${expectedAvatarDescriptor.displayName}${AvatarMenuText.TOGGLE_ALT_SUFFIX}`
      );
      expect(headerAvatarLabelElement.textContent).toBe(
        expectedAvatarDescriptor.displayName
      );
      expect(
        headerAvatarLabelElement.classList.contains(
          GlobalClassName.VISUALLY_HIDDEN
        )
      ).toBe(true);

      const renderedAvatarImageElement = faceSvgElement.querySelector(SvgSelector.IMAGE);
      expect(renderedAvatarImageElement).not.toBeNull();
      expect(renderedAvatarImageElement.getAttribute(SvgAttributeName.HREF)).toBe(
        expectedAvatarResourcePath
      );
    }
  );
});
