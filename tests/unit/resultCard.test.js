/**
 * @jest-environment jsdom
 */

import { ResultCard } from "../../lastCard.js";
import { AvatarId, AvatarAssetPath } from "../../constants.js";

const AvatarMarkup = Object.freeze({
  SUNNY: `<circle cx="50" cy="50" data-testid="avatar-sunny" r="45"></circle>`,
  CURIOUS: `<rect data-testid="avatar-curious" height="60" width="60" x="20" y="20"></rect>`
});

const SelectedAllergen = Object.freeze({
  TOKEN: "test-allergen",
  LABEL: "Test Allergen"
});

const DishDetail = Object.freeze({
  NAME: "Test Dish",
  CUISINE: "Test Cuisine",
  INGREDIENT_TRIGGER: "Trigger Ingredient"
});

const TestDescription = Object.freeze({
  RENDER_INLINE: "renders inline SVG markup for the selected avatar when allergen is present",
  RENDER_IMAGE_PATH: "renders <image> element for avatar resource paths when allergen is present",
  RENDER_IMAGE_PATH_TYRANNOSAURUS:
    "renders <image> element for the tyrannosaurus rex avatar resource when allergen is present",
  RENDER_IMAGE_PATH_TRICERATOPS:
    "renders <image> element for the triceratops avatar resource when allergen is present",
  UPDATE_INVALID_FALLBACK: "falls back to default avatar when provided identifier is invalid",
  UPDATE_PATH_IMMEDIATE_RENDER: "renders avatar image immediately when avatar selection changes",
  UPDATE_PATH_TYRANNOSAURUS:
    "renders the tyrannosaurus rex avatar image when avatar selection changes",
  UPDATE_PATH_TRICERATOPS: "renders the triceratops avatar image when avatar selection changes"
});

const AvatarResourceType = Object.freeze({
  INLINE: "inline",
  PATH: "path"
});

const SvgElementSelector = Object.freeze({
  IMAGE: "image"
});

const SvgAttributeName = Object.freeze({
  HREF: "href"
});

const InvalidAvatarIdentifier = Object.freeze({
  UNKNOWN: "invalid-avatar"
});

function createTriggeringDish() {
  return {
    name: DishDetail.NAME,
    cuisine: DishDetail.CUISINE,
    ingredients: [DishDetail.INGREDIENT_TRIGGER]
  };
}

function createResultCardTestHarness({ avatarMapEntries }) {
  const revealSectionElement = document.createElement("section");
  const dishTitleElement = document.createElement("h3");
  const dishCuisineElement = document.createElement("span");
  const resultBannerElement = document.createElement("div");
  const resultTextElement = document.createElement("div");
  const ingredientsContainerElement = document.createElement("div");
  const faceSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const gameOverSectionElement = document.createElement("section");

  const normalizationEngine = {
    tokensForIngredient: () => new Set([SelectedAllergen.TOKEN])
  };

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
    normalizationEngine,
    allergensCatalog: [{ token: SelectedAllergen.TOKEN, emoji: "🥜" }],
    cuisineToFlagMap: new Map(),
    ingredientEmojiByName: new Map(),
    avatarMap: new Map(avatarMapEntries),
    selectedAvatarId: AvatarId.SUNNY_GIRL
  });

  return {
    resultCard,
    faceSvgElement,
    resultBannerElement,
    resultTextElement
  };
}

function createPathExpectation(expectedResourcePath) {
  return (faceSvgElement) => {
    const imageElement = faceSvgElement.querySelector(SvgElementSelector.IMAGE);
    expect(imageElement).not.toBeNull();
    expect(imageElement.getAttribute(SvgAttributeName.HREF)).toBe(expectedResourcePath);
  };
}

const RevealCardAvatarRenderingCases = [
  {
    description: TestDescription.RENDER_INLINE,
    avatarMapEntries: [
      [AvatarId.SUNNY_GIRL, AvatarMarkup.SUNNY],
      [AvatarId.CURIOUS_GIRL, AvatarMarkup.CURIOUS]
    ],
    selectedAvatarId: AvatarId.CURIOUS_GIRL,
    avatarResourceType: AvatarResourceType.INLINE,
    expectedMarkup: AvatarMarkup.CURIOUS.trim()
  },
  {
    description: TestDescription.RENDER_IMAGE_PATH,
    avatarMapEntries: [
      [AvatarId.SUNNY_GIRL, AvatarMarkup.SUNNY],
      [AvatarId.CREATIVE_BOY, AvatarAssetPath.CREATIVE_BOY]
    ],
    selectedAvatarId: AvatarId.CREATIVE_BOY,
    avatarResourceType: AvatarResourceType.PATH,
    expectedMarkup: AvatarAssetPath.CREATIVE_BOY
  },
  {
    description: TestDescription.RENDER_IMAGE_PATH_TYRANNOSAURUS,
    avatarMapEntries: [
      [AvatarId.SUNNY_GIRL, AvatarMarkup.SUNNY],
      [AvatarId.TYRANNOSAURUS_REX, AvatarAssetPath.TYRANNOSAURUS_REX]
    ],
    selectedAvatarId: AvatarId.TYRANNOSAURUS_REX,
    avatarResourceType: AvatarResourceType.PATH,
    expectedMarkup: AvatarAssetPath.TYRANNOSAURUS_REX
  },
  {
    description: TestDescription.RENDER_IMAGE_PATH_TRICERATOPS,
    avatarMapEntries: [
      [AvatarId.SUNNY_GIRL, AvatarMarkup.SUNNY],
      [AvatarId.TRICERATOPS, AvatarAssetPath.TRICERATOPS]
    ],
    selectedAvatarId: AvatarId.TRICERATOPS,
    avatarResourceType: AvatarResourceType.PATH,
    expectedMarkup: AvatarAssetPath.TRICERATOPS
  }
];

describe("ResultCard avatar rendering", () => {
  test.each(RevealCardAvatarRenderingCases)(
    "%s",
    ({ avatarMapEntries, selectedAvatarId, avatarResourceType, expectedMarkup }) => {
      const { resultCard, faceSvgElement, resultBannerElement, resultTextElement } =
        createResultCardTestHarness({ avatarMapEntries });

      resultCard.updateAvatarSelection(selectedAvatarId);
      resultCard.populateRevealCard({
        dish: createTriggeringDish(),
        selectedAllergenToken: SelectedAllergen.TOKEN,
        selectedAllergenLabel: SelectedAllergen.LABEL
      });

      expect(resultBannerElement.classList.contains("bad")).toBe(true);
      expect(resultTextElement.textContent).toBe(
        `Contains your allergen: ${SelectedAllergen.LABEL}`
      );
      expect(faceSvgElement.hidden).toBe(false);

      if (avatarResourceType === AvatarResourceType.INLINE) {
        expect(faceSvgElement.innerHTML.trim()).toBe(expectedMarkup);
      } else {
        const imageElement = faceSvgElement.querySelector(SvgElementSelector.IMAGE);
        expect(imageElement).not.toBeNull();
        const hrefAttribute = imageElement.getAttribute(SvgAttributeName.HREF);
        expect(hrefAttribute).toBe(expectedMarkup);
      }
    }
  );
});

const UpdateAvatarSelectionCases = [
  {
    description: TestDescription.UPDATE_PATH_IMMEDIATE_RENDER,
    avatarIdentifierCandidate: AvatarId.CREATIVE_BOY,
    expectedSelectedAvatarId: AvatarId.CREATIVE_BOY,
    expectedHasRenderableAvatar: true,
    avatarMapEntries: [
      [AvatarId.SUNNY_GIRL, AvatarMarkup.SUNNY],
      [AvatarId.CREATIVE_BOY, AvatarAssetPath.CREATIVE_BOY]
    ],
    expectation: createPathExpectation(AvatarAssetPath.CREATIVE_BOY)
  },
  {
    description: TestDescription.UPDATE_PATH_TYRANNOSAURUS,
    avatarIdentifierCandidate: AvatarId.TYRANNOSAURUS_REX,
    expectedSelectedAvatarId: AvatarId.TYRANNOSAURUS_REX,
    expectedHasRenderableAvatar: true,
    avatarMapEntries: [
      [AvatarId.SUNNY_GIRL, AvatarMarkup.SUNNY],
      [AvatarId.TYRANNOSAURUS_REX, AvatarAssetPath.TYRANNOSAURUS_REX]
    ],
    expectation: createPathExpectation(AvatarAssetPath.TYRANNOSAURUS_REX)
  },
  {
    description: TestDescription.UPDATE_PATH_TRICERATOPS,
    avatarIdentifierCandidate: AvatarId.TRICERATOPS,
    expectedSelectedAvatarId: AvatarId.TRICERATOPS,
    expectedHasRenderableAvatar: true,
    avatarMapEntries: [
      [AvatarId.SUNNY_GIRL, AvatarMarkup.SUNNY],
      [AvatarId.TRICERATOPS, AvatarAssetPath.TRICERATOPS]
    ],
    expectation: createPathExpectation(AvatarAssetPath.TRICERATOPS)
  },
  {
    description: TestDescription.UPDATE_INVALID_FALLBACK,
    avatarIdentifierCandidate: InvalidAvatarIdentifier.UNKNOWN,
    expectedSelectedAvatarId: AvatarId.SUNNY_GIRL,
    expectedHasRenderableAvatar: true,
    avatarMapEntries: [
      [AvatarId.SUNNY_GIRL, AvatarMarkup.SUNNY]
    ],
    expectation: (faceSvgElement) => {
      expect(faceSvgElement.innerHTML.trim()).toBe(AvatarMarkup.SUNNY.trim());
    }
  }
];

describe("ResultCard updateAvatarSelection", () => {
  test.each(UpdateAvatarSelectionCases)(
    "%s",
    ({
      avatarIdentifierCandidate,
      expectedSelectedAvatarId,
      expectedHasRenderableAvatar,
      avatarMapEntries,
      expectation
    }) => {
      const { resultCard, faceSvgElement } = createResultCardTestHarness({ avatarMapEntries });

      const updateResult = resultCard.updateAvatarSelection(avatarIdentifierCandidate);

      expect(updateResult.selectedAvatarId).toBe(expectedSelectedAvatarId);
      expect(updateResult.hasRenderableAvatar).toBe(expectedHasRenderableAvatar);
      expectation(faceSvgElement);
    }
  );
});
