import { jest } from "@jest/globals";
import { StateManager, DEFAULT_INITIAL_HEARTS_COUNT } from "../../state.js";
import { MODE_START, MODE_STOP, AvatarId } from "../../constants.js";

const ErrorPattern = Object.freeze({
  INVALID_INITIAL_HEARTS: /requires a numeric initialHeartsCount/iu,
  INVALID_HEARTS: /requires a numeric value/iu
});

const AllergenSelection = Object.freeze({
  TOKEN: "nuts",
  LABEL: "Tree Nuts",
  EMPTY_LABEL: ""
});

const WheelCandidate = Object.freeze({
  FIRST: { id: "dish-1" },
  SECOND: { id: "dish-2" }
});

const WheelLabel = Object.freeze({
  FIRST: { label: "Dish One", emoji: "🍲" },
  SECOND: { label: "Dish Two", emoji: "🥗" }
});

const StateTestDescription = Object.freeze({
  INVALID_INITIAL_NON_NUMERIC: "throws when provided initial hearts count is not a number",
  INVALID_INITIAL_NAN: "throws when provided initial hearts count is NaN",
  DEFAULT_INITIALIZATION: "establishes default state when no options are provided",
  HEARTS_FLOORING: "floors non-integer hearts values",
  HEARTS_CLAMPING: "clamps negative hearts to zero",
  HEARTS_NO_UNDERFLOW: "decrement does not reduce hearts below zero",
  HEARTS_INVALID_INPUT: "setHeartsCount rejects invalid inputs",
  HEARTS_RETRIEVAL: "reports current hearts count",
  SELECTION_RECORDS: "records provided allergen token and label",
  SELECTION_CLEARS: "clears selection when null values are provided",
  SELECTION_RESET: "clearSelectedAllergen resets selection state",
  CANDIDATE_DEFENSIVE_COPY: "creates defensive copies of candidate arrays",
  CANDIDATE_RESET: "resetWheelCandidates clears stored dishes and labels",
  STOP_BUTTON_SWITCH: "switches between start and stop modes",
  AVATAR_DEFAULT: "provides the default avatar when initialized",
  AVATAR_VALID_SELECTION: "stores a provided valid avatar identifier",
  AVATAR_TYRANNOSAURUS_SELECTION: "stores the tyrannosaurus rex avatar identifier when selected",
  AVATAR_TRICERATOPS_SELECTION: "stores the triceratops avatar identifier when selected",
  AVATAR_INVALID_UNKNOWN: "falls back to the default avatar when given an unknown identifier",
  AVATAR_INVALID_NON_STRING: "falls back to the default avatar when given a non-string identifier",
  AVATAR_RESET_ON_INITIALIZE: "reinitialize restores the default avatar"
});

const InvalidModeValue = Object.freeze({ VALUE: "invalid mode" });

const InvalidAvatarSelection = Object.freeze({
  UNKNOWN: "invalid-avatar",
  NON_STRING: 12345
});

const InvalidInitializationCases = [
  {
    description: StateTestDescription.INVALID_INITIAL_NON_NUMERIC,
    initialHeartsCount: "five",
    expectedError: ErrorPattern.INVALID_INITIAL_HEARTS
  },
  {
    description: StateTestDescription.INVALID_INITIAL_NAN,
    initialHeartsCount: Number.NaN,
    expectedError: ErrorPattern.INVALID_INITIAL_HEARTS
  }
];

describe("StateManager initialization", () => {
  test.each(InvalidInitializationCases)(
    "%s",
    ({ initialHeartsCount, expectedError }) => {
      expect(() => new StateManager({ initialHeartsCount })).toThrow(expectedError);
    }
  );

  test(StateTestDescription.DEFAULT_INITIALIZATION, () => {
    const stateManager = new StateManager();
    expect(stateManager.getInitialHeartsCount()).toBe(DEFAULT_INITIAL_HEARTS_COUNT);
    expect(stateManager.getStopButtonMode()).toBe(MODE_STOP);
    expect(stateManager.hasSelectedAllergen()).toBe(false);
    expect(stateManager.getSelectedAvatar()).toBe(AvatarId.DEFAULT);
    expect(stateManager.hasSelectedAvatar()).toBe(true);
  });
});

const HeartsAssignmentCases = [
  {
    description: StateTestDescription.HEARTS_FLOORING,
    inputHearts: 4.7,
    expectedAfterIncrement: 5
  },
  {
    description: StateTestDescription.HEARTS_CLAMPING,
    inputHearts: -3,
    expectedAfterIncrement: 1
  }
];

describe("StateManager heart management", () => {
  test.each(HeartsAssignmentCases)(
    "%s",
    ({ inputHearts, expectedAfterIncrement }) => {
      const stateManager = new StateManager();
      stateManager.setHeartsCount(inputHearts);
      expect(stateManager.incrementHeartsCount()).toBe(expectedAfterIncrement);
    }
  );

  test(StateTestDescription.HEARTS_NO_UNDERFLOW, () => {
    const stateManager = new StateManager({ initialHeartsCount: 1 });
    stateManager.decrementHeartsCount();
    expect(stateManager.decrementHeartsCount()).toBe(0);
  });

  test(StateTestDescription.HEARTS_RETRIEVAL, () => {
    const stateManager = new StateManager({ initialHeartsCount: 3 });
    expect(stateManager.getHeartsCount()).toBe(3);
    stateManager.incrementHeartsCount();
    expect(stateManager.getHeartsCount()).toBe(4);
    stateManager.decrementHeartsCount();
    expect(stateManager.getHeartsCount()).toBe(3);
  });

  test(StateTestDescription.HEARTS_INVALID_INPUT, () => {
    const stateManager = new StateManager();
    expect(() => stateManager.setHeartsCount("invalid")).toThrow(ErrorPattern.INVALID_HEARTS);
  });
});

const AllergenSelectionCases = [
  {
    description: StateTestDescription.SELECTION_RECORDS,
    selection: { token: AllergenSelection.TOKEN, label: AllergenSelection.LABEL },
    expectedHasSelection: true,
    expectedLabel: AllergenSelection.LABEL
  },
  {
    description: StateTestDescription.SELECTION_CLEARS,
    selection: { token: null, label: null },
    expectedHasSelection: false,
    expectedLabel: AllergenSelection.EMPTY_LABEL
  }
];

const AvatarSelectionCases = [
  {
    description: StateTestDescription.AVATAR_VALID_SELECTION,
    avatarIdentifier: AvatarId.CURIOUS_GIRL,
    expectedStoredIdentifier: AvatarId.CURIOUS_GIRL,
    expectedHasSelection: true
  },
  {
    description: StateTestDescription.AVATAR_TYRANNOSAURUS_SELECTION,
    avatarIdentifier: AvatarId.TYRANNOSAURUS_REX,
    expectedStoredIdentifier: AvatarId.TYRANNOSAURUS_REX,
    expectedHasSelection: true
  },
  {
    description: StateTestDescription.AVATAR_TRICERATOPS_SELECTION,
    avatarIdentifier: AvatarId.TRICERATOPS,
    expectedStoredIdentifier: AvatarId.TRICERATOPS,
    expectedHasSelection: true
  },
  {
    description: StateTestDescription.AVATAR_INVALID_UNKNOWN,
    avatarIdentifier: InvalidAvatarSelection.UNKNOWN,
    expectedStoredIdentifier: AvatarId.DEFAULT,
    expectedHasSelection: true
  },
  {
    description: StateTestDescription.AVATAR_INVALID_NON_STRING,
    avatarIdentifier: InvalidAvatarSelection.NON_STRING,
    expectedStoredIdentifier: AvatarId.DEFAULT,
    expectedHasSelection: true
  }
];

const AvatarReinitializationCases = [
  {
    description: StateTestDescription.AVATAR_RESET_ON_INITIALIZE,
    initialAvatarIdentifier: AvatarId.ADVENTUROUS_BOY,
    reinitializeOptions: {},
    expectedStoredIdentifier: AvatarId.DEFAULT
  }
];

describe("StateManager allergen selection", () => {
  test.each(AllergenSelectionCases)(
    "%s",
    ({ selection, expectedHasSelection, expectedLabel }) => {
      const stateManager = new StateManager();
      stateManager.setSelectedAllergen(selection);
      expect(stateManager.hasSelectedAllergen()).toBe(expectedHasSelection);
      expect(stateManager.getSelectedAllergenToken()).toBe(selection.token || null);
      expect(stateManager.getSelectedAllergenLabel()).toBe(expectedLabel);
    }
  );

  test(StateTestDescription.SELECTION_RESET, () => {
    const stateManager = new StateManager();
    stateManager.setSelectedAllergen({ token: AllergenSelection.TOKEN, label: AllergenSelection.LABEL });
    stateManager.clearSelectedAllergen();
    expect(stateManager.hasSelectedAllergen()).toBe(false);
    expect(stateManager.getSelectedAllergenToken()).toBeNull();
    expect(stateManager.getSelectedAllergenLabel()).toBe(AllergenSelection.EMPTY_LABEL);
  });
});

describe("StateManager avatar selection", () => {
  test(StateTestDescription.AVATAR_DEFAULT, () => {
    const stateManager = new StateManager();
    expect(stateManager.getSelectedAvatar()).toBe(AvatarId.DEFAULT);
    expect(stateManager.hasSelectedAvatar()).toBe(true);
  });

  test.each(AvatarSelectionCases)(
    "%s",
    ({ avatarIdentifier, expectedStoredIdentifier, expectedHasSelection }) => {
      const stateManager = new StateManager();
      stateManager.setSelectedAvatar(avatarIdentifier);
      expect(stateManager.getSelectedAvatar()).toBe(expectedStoredIdentifier);
      expect(stateManager.hasSelectedAvatar()).toBe(expectedHasSelection);
    }
  );

  test.each(AvatarReinitializationCases)(
    "%s",
    ({ initialAvatarIdentifier, reinitializeOptions, expectedStoredIdentifier }) => {
      const stateManager = new StateManager();
      stateManager.setSelectedAvatar(initialAvatarIdentifier);
      stateManager.initialize(reinitializeOptions);
      expect(stateManager.getSelectedAvatar()).toBe(expectedStoredIdentifier);
      expect(stateManager.hasSelectedAvatar()).toBe(true);
    }
  );
});

describe("StateManager wheel candidate management", () => {
  test(StateTestDescription.CANDIDATE_DEFENSIVE_COPY, () => {
    const stateManager = new StateManager();
    const dishes = [WheelCandidate.FIRST, WheelCandidate.SECOND];
    const labels = [WheelLabel.FIRST, WheelLabel.SECOND];
    stateManager.setWheelCandidates({ dishes, labels });

    const retrievedDishes = stateManager.getWheelCandidateDishes();
    const retrievedLabels = stateManager.getWheelCandidateLabels();

    retrievedDishes.pop();
    retrievedLabels.pop();

    expect(stateManager.getWheelCandidateDishes()).toHaveLength(2);
    expect(stateManager.getWheelCandidateLabels()).toHaveLength(2);
  });

  test(StateTestDescription.CANDIDATE_RESET, () => {
    const stateManager = new StateManager();
    stateManager.setWheelCandidates({ dishes: [WheelCandidate.FIRST], labels: [WheelLabel.FIRST] });
    stateManager.resetWheelCandidates();
    expect(stateManager.getWheelCandidateDishes()).toEqual([]);
    expect(stateManager.getWheelCandidateLabels()).toEqual([]);
  });
});

describe("StateManager stop button mode", () => {
  test(StateTestDescription.STOP_BUTTON_SWITCH, () => {
    const stateManager = new StateManager();
    stateManager.setStopButtonMode(MODE_START);
    expect(stateManager.getStopButtonMode()).toBe(MODE_START);
    stateManager.setStopButtonMode(InvalidModeValue.VALUE);
    expect(stateManager.getStopButtonMode()).toBe(MODE_STOP);
  });
});
