import { createListenerBinder } from "../../listeners.js";
import { StateManager } from "../../state.js";
import { ResultCard } from "../../lastCard.js";
import {
  ControlElementId,
  AttributeName,
  AttributeBooleanValue,
  ResultCardElementId,
  AvatarId,
  AvatarAssetPath,
  AvatarDisplayName,
  AvatarClassName
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
  SRC: "src"
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

const DinosaurAvatarDescriptors = Object.freeze([
  Object.freeze({
    avatarIdentifier: AvatarId.TYRANNOSAURUS_REX,
    avatarResourcePath: AvatarAssetPath.TYRANNOSAURUS_REX,
    persistenceDescription: AvatarSelectionScenarioDescription.TYRANNOSAURUS_PERSISTENCE
  }),
  Object.freeze({
    avatarIdentifier: AvatarId.TRICERATOPS,
    avatarResourcePath: AvatarAssetPath.TRICERATOPS,
    persistenceDescription: AvatarSelectionScenarioDescription.TRICERATOPS_PERSISTENCE
  })
]);

const AvatarResourceEntries = (() => {
  const baseEntries = [
    Object.freeze([AvatarId.SUNNY_GIRL, AvatarAssetPath.SUNNY_GIRL]),
    Object.freeze([AvatarId.CURIOUS_GIRL, AvatarAssetPath.CURIOUS_GIRL]),
    Object.freeze([AvatarId.ADVENTUROUS_BOY, AvatarAssetPath.ADVENTUROUS_BOY]),
    Object.freeze([AvatarId.CREATIVE_BOY, AvatarAssetPath.CREATIVE_BOY])
  ];

  for (const dinosaurAvatarDescriptor of DinosaurAvatarDescriptors) {
    baseEntries.push(
      Object.freeze([
        dinosaurAvatarDescriptor.avatarIdentifier,
        dinosaurAvatarDescriptor.avatarResourcePath
      ])
    );
  }

  return Object.freeze(baseEntries);
})();

const AvatarSelectionScenarios = (() => {
  const scenarios = [
    Object.freeze({
      description: AvatarSelectionScenarioDescription.CREATIVE_PERSISTENCE,
      chosenAvatarId: AvatarId.CREATIVE_BOY
    })
  ];

  for (const dinosaurAvatarDescriptor of DinosaurAvatarDescriptors) {
    scenarios.push(
      Object.freeze({
        description: dinosaurAvatarDescriptor.persistenceDescription,
        chosenAvatarId: dinosaurAvatarDescriptor.avatarIdentifier
      })
    );
  }

  return Object.freeze(scenarios);
})();

afterEach(() => {
  document.body.innerHTML = EmptyStringValue;
});

function createAvatarSelectorElements({ avatarResourceEntries, defaultAvatarResource }) {
  const headerAvatarToggleButtonElement = document.createElement(HtmlTagName.BUTTON);
  headerAvatarToggleButtonElement.id = ControlElementId.AVATAR_TOGGLE;
  headerAvatarToggleButtonElement.setAttribute(
    AttributeName.ARIA_EXPANDED,
    AttributeBooleanValue.FALSE
  );

  const headerAvatarImageElement = document.createElement(HtmlTagName.IMG);
  headerAvatarImageElement.className = AvatarClassName.IMAGE;
  if (defaultAvatarResource) {
    headerAvatarImageElement.setAttribute(HtmlAttributeName.SRC, defaultAvatarResource);
  }
  headerAvatarToggleButtonElement.appendChild(headerAvatarImageElement);

  const headerAvatarLabelElement = document.createElement(HtmlTagName.SPAN);
  headerAvatarLabelElement.className = AvatarClassName.LABEL;
  const defaultAvatarDisplayName = AvatarDisplayName[AvatarId.DEFAULT];
  if (defaultAvatarDisplayName) {
    headerAvatarLabelElement.textContent = defaultAvatarDisplayName;
  }
  headerAvatarToggleButtonElement.appendChild(headerAvatarLabelElement);

  const avatarMenuElement = document.createElement(HtmlTagName.DIV);
  avatarMenuElement.id = ControlElementId.AVATAR_MENU;
  avatarMenuElement.hidden = true;

  for (const [avatarIdentifier, avatarResourcePath] of avatarResourceEntries) {
    const avatarOptionButtonElement = document.createElement(HtmlTagName.BUTTON);
    avatarOptionButtonElement.classList.add(AvatarClassName.OPTION);
    avatarOptionButtonElement.dataset.avatarId = avatarIdentifier;

    const avatarOptionImageElement = document.createElement(HtmlTagName.IMG);
    avatarOptionImageElement.className = AvatarClassName.IMAGE;
    avatarOptionImageElement.setAttribute(HtmlAttributeName.SRC, avatarResourcePath);
    avatarOptionButtonElement.appendChild(avatarOptionImageElement);

    avatarMenuElement.appendChild(avatarOptionButtonElement);
  }

  document.body.appendChild(headerAvatarToggleButtonElement);
  document.body.appendChild(avatarMenuElement);

  return {
    headerAvatarToggleButtonElement,
    headerAvatarImageElement,
    headerAvatarLabelElement,
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
  const defaultAvatarResource = avatarResourceMap.get(AvatarId.DEFAULT);
  const {
    headerAvatarToggleButtonElement,
    headerAvatarImageElement,
    headerAvatarLabelElement,
    avatarMenuElement
  } = createAvatarSelectorElements({
    avatarResourceEntries: AvatarResourceEntries,
    defaultAvatarResource
  });

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

  const avatarDisplayNameMap = new Map(Object.entries(AvatarDisplayName));

  const updateHeaderAvatarSelection = (avatarIdentifier) => {
    const resolvedAvatarIdentifier = avatarResourceMap.has(avatarIdentifier)
      ? avatarIdentifier
      : AvatarId.DEFAULT;

    const resolvedAvatarResource =
      avatarResourceMap.get(resolvedAvatarIdentifier) || avatarResourceMap.get(AvatarId.DEFAULT);
    if (resolvedAvatarResource) {
      headerAvatarImageElement.setAttribute(HtmlAttributeName.SRC, resolvedAvatarResource);
    }

    if (headerAvatarLabelElement) {
      const resolvedAvatarDisplayName =
        avatarDisplayNameMap.get(resolvedAvatarIdentifier) ||
        avatarDisplayNameMap.get(AvatarId.DEFAULT);
      if (resolvedAvatarDisplayName) {
        headerAvatarLabelElement.textContent = resolvedAvatarDisplayName;
      }
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
      avatarMenuElement.getElementsByClassName(AvatarClassName.OPTION)
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

    const expectedAvatarResourcePath = avatarResourceMap.get(chosenAvatarId);
    expect(expectedAvatarResourcePath).toBeDefined();
    expect(headerAvatarImageElement.getAttribute(HtmlAttributeName.SRC)).toBe(
      expectedAvatarResourcePath
    );

    const expectedAvatarDisplayName =
      AvatarDisplayName[chosenAvatarId] || AvatarDisplayName[AvatarId.DEFAULT];
    expect(headerAvatarLabelElement.textContent).toBe(expectedAvatarDisplayName);

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
    expect(headerAvatarLabelElement.textContent).toBe(expectedAvatarDisplayName);
  });
});
