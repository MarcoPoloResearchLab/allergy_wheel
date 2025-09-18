import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ControlElementId } from "../../constants.js";

const CurrentModuleFilePath = fileURLToPath(import.meta.url);
const IntegrationTestDirectoryPath = dirname(CurrentModuleFilePath);
const ProjectRootDirectoryPath = join(IntegrationTestDirectoryPath, "..", "..");
const IndexDocumentFileName = "index.html";
const IndexDocumentFilePath = join(ProjectRootDirectoryPath, IndexDocumentFileName);

const OnboardingCopyText = Object.freeze({
  INSTRUCTION: "Choose anything that might cause trouble. You can change this later.",
  GOAL: "Spin the allergy wheel to win 10 hearts!"
});

const OnboardingParagraphDescription = Object.freeze({
  INSTRUCTION: "guides players to select potential allergens",
  GOAL: "explains the heart-winning objective"
});

const OnboardingElementSelector = Object.freeze({
  CARD_BODY: "#screen-allergy .card__body",
  MUTED_PARAGRAPH: "p.muted"
});

const OnboardingParagraphExpectationTable = Object.freeze([
  Object.freeze({
    description: OnboardingParagraphDescription.INSTRUCTION,
    expectedText: OnboardingCopyText.INSTRUCTION
  }),
  Object.freeze({
    description: OnboardingParagraphDescription.GOAL,
    expectedText: OnboardingCopyText.GOAL
  })
]);

describe("Allergy onboarding copy", () => {
  let parsedHtmlDocument;
  let quickGameCardBodyElement;
  let mutedParagraphTextList;

  beforeAll(() => {
    const indexHtmlSource = readFileSync(IndexDocumentFilePath, { encoding: "utf-8" });
    const DomParserConstructor = globalThis.DOMParser;
    expect(DomParserConstructor).toBeDefined();
    const htmlParser = new DomParserConstructor();
    parsedHtmlDocument = htmlParser.parseFromString(indexHtmlSource, "text/html");
    quickGameCardBodyElement = parsedHtmlDocument.querySelector(OnboardingElementSelector.CARD_BODY);
    mutedParagraphTextList = quickGameCardBodyElement
      ? Array.from(
          quickGameCardBodyElement.querySelectorAll(OnboardingElementSelector.MUTED_PARAGRAPH),
          (paragraphElement) => paragraphElement.textContent.trim()
        )
      : [];
  });

  test("exposes the allergen selection title element", () => {
    const allergyTitleElement = parsedHtmlDocument.getElementById(ControlElementId.ALLERGY_TITLE);
    expect(allergyTitleElement).not.toBeNull();
  });

  test.each(OnboardingParagraphExpectationTable)(
    "renders onboarding paragraph that $description",
    ({ expectedText }) => {
      expect(quickGameCardBodyElement).not.toBeNull();
      expect(mutedParagraphTextList).toContain(expectedText);
    }
  );
});
