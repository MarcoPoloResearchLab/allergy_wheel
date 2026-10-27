// @ts-check

import { WheelControlMode, AvatarId, StateManagerErrorMessage } from "../constants.js";

const DEFAULT_INITIAL_HEARTS_COUNT = 5;

const TextValue = Object.freeze({
    EMPTY: ""
});

const ValidAvatarIdentifierSet = new Set(Object.values(AvatarId));

/**
 * Tracks transient gameplay state for the Allergy Wheel experience.
 */
class StateManager {
    #board;

    #initialHeartsCount;

    #heartsCount;

    #selectedAllergenToken;

    #selectedAllergenLabel;

    #wheelCandidateDishes;

    #wheelCandidateLabels;

    #wheelControlMode;

    #selectedAvatarId = AvatarId.DEFAULT;

    #audioMuted = false;

    constructor({
        initialHeartsCount = DEFAULT_INITIAL_HEARTS_COUNT,
        initialWheelControlMode = WheelControlMode.STOP
    } = {}) {
        this.initialize({ initialHeartsCount, initialWheelControlMode });
    }

    initialize({
        initialHeartsCount = DEFAULT_INITIAL_HEARTS_COUNT,
        initialWheelControlMode = WheelControlMode.STOP
    } = {}) {
        if (typeof initialHeartsCount !== "number" || Number.isNaN(initialHeartsCount)) {
            throw new Error(StateManagerErrorMessage.INVALID_INITIAL_HEARTS_COUNT);
        }
        this.#initialHeartsCount = initialHeartsCount;
        this.#heartsCount = initialHeartsCount;
        this.#wheelControlMode =
            initialWheelControlMode === WheelControlMode.START
                ? WheelControlMode.START
                : WheelControlMode.STOP;
        this.#selectedAllergenToken = null;
        this.#selectedAllergenLabel = TextValue.EMPTY;
        this.#wheelCandidateDishes = [];
        this.#wheelCandidateLabels = [];
        this.#board = null;
        this.#selectedAvatarId = AvatarId.DEFAULT;
        this.#audioMuted = false;
    }

    setBoard(boardInstance) {
        this.#board = boardInstance || null;
    }

    getBoard() {
        return this.#board;
    }

    setSelectedAllergen({ token, label } = {}) {
        this.#selectedAllergenToken = token || null;
        this.#selectedAllergenLabel = label || TextValue.EMPTY;
    }

    clearSelectedAllergen() {
        this.#selectedAllergenToken = null;
        this.#selectedAllergenLabel = TextValue.EMPTY;
    }

    getSelectedAllergenToken() {
        return this.#selectedAllergenToken;
    }

    getSelectedAllergenLabel() {
        return this.#selectedAllergenLabel;
    }

    hasSelectedAllergen() {
        return Boolean(this.#selectedAllergenToken);
    }

    setWheelCandidates({ dishes = [], labels = [] } = {}) {
        this.#wheelCandidateDishes = Array.isArray(dishes) ? dishes.slice() : [];
        this.#wheelCandidateLabels = Array.isArray(labels) ? labels.slice() : [];
    }

    resetWheelCandidates() {
        this.#wheelCandidateDishes = [];
        this.#wheelCandidateLabels = [];
    }

    getWheelCandidateDishes() {
        return this.#wheelCandidateDishes.slice();
    }

    getWheelCandidateLabels() {
        return this.#wheelCandidateLabels.slice();
    }

    setHeartsCount(newHeartsCount) {
        if (typeof newHeartsCount !== "number" || Number.isNaN(newHeartsCount)) {
            throw new Error(StateManagerErrorMessage.INVALID_HEARTS_COUNT);
        }
        this.#heartsCount = Math.max(0, Math.floor(newHeartsCount));
    }

    incrementHeartsCount() {
        this.#heartsCount += 1;
        return this.#heartsCount;
    }

    decrementHeartsCount() {
        this.#heartsCount = Math.max(0, this.#heartsCount - 1);
        return this.#heartsCount;
    }

    getHeartsCount() {
        return this.#heartsCount;
    }

    getInitialHeartsCount() {
        return this.#initialHeartsCount;
    }

    setWheelControlMode(mode) {
        this.#wheelControlMode =
            mode === WheelControlMode.START ? WheelControlMode.START : WheelControlMode.STOP;
    }

    getWheelControlMode() {
        return this.#wheelControlMode;
    }

    setAudioMuted(shouldMuteAudio) {
        this.#audioMuted = Boolean(shouldMuteAudio);
        return this.#audioMuted;
    }

    toggleAudioMuted() {
        this.#audioMuted = !this.#audioMuted;
        return this.#audioMuted;
    }

    isAudioMuted() {
        return this.#audioMuted;
    }

    /**
     * Validates and stores the active avatar identifier.
     * Falls back to the default avatar when the provided identifier is not recognized.
     *
     * @param {string} avatarId - Candidate avatar identifier selected by the user.
     */
    setSelectedAvatar(avatarId) {
        const validatedAvatarIdentifier =
            typeof avatarId === "string" && ValidAvatarIdentifierSet.has(avatarId)
                ? avatarId
                : AvatarId.DEFAULT;
        this.#selectedAvatarId = validatedAvatarIdentifier;
    }

    getSelectedAvatar() {
        return this.#selectedAvatarId;
    }

    hasSelectedAvatar() {
        return ValidAvatarIdentifierSet.has(this.#selectedAvatarId);
    }
}

export { StateManager, DEFAULT_INITIAL_HEARTS_COUNT };
