// @ts-check

export const StorePlatform = Object.freeze({ ANDROID: 'android', IOS: 'ios' });
export const StoreConfiguration = Object.freeze({ PATH: './data/mobile-stores.json', ELEMENT_ID: 'mobile-installation' });
export const StoreText = Object.freeze({ PRIVACY: 'Mobile privacy and support', PRIVACY_PATH: './privacy.html', TITLE: 'Play on your phone or tablet', ANDROID: 'Get it on Google Play', IOS: 'Download on the App Store', INVALID: 'Invalid mobile store catalog.' });
export const RuntimeSurface = Object.freeze({ WEB: 'web', MOBILE: 'mobile' });
export const LifecycleEvent = 'allergy-wheel:lifecycle';
export const LifecycleState = Object.freeze({ ACTIVE: 'active', BACKGROUND: 'background', INACTIVE: 'inactive' });
export const BrowserAnalytics = Object.freeze({
    MEASUREMENT_ID: 'G-5CDP19RY2Z',
    SCRIPT_URL: 'https://www.googletagmanager.com/gtag/js?id=G-5CDP19RY2Z',
    DEFAULT_CONSENT: Object.freeze({ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }),
    CONFIG: Object.freeze({ allow_google_signals: false, allow_ad_personalization_signals: false })
});

export const PrivacyContract = Object.freeze({
    audience: Object.freeze({ minimumAge: 6, countries: 'all-available', price: 'free', advertisements: false, purchases: false, accountRequired: false }),
    native: Object.freeze({
        googleAnalytics: false,
        counts: Object.freeze({ storedFields: Object.freeze(['siteId', 'utcDate', 'requestCount']), retentionDays: 90, requestBody: '{}', cookies: false, referrer: false, identifiers: false, deletion: 'site-deletion', transport: 'IP address processed to deliver the request' }),
        fonts: Object.freeze({ automatic: true, hosts: Object.freeze(['fonts.googleapis.com', 'fonts.gstatic.com']), data: Object.freeze(['IP address', 'browser request headers']), retention: 'provider-managed; no fixed period verified' }),
        feedback: Object.freeze({ adultAgreementRequired: true, data: Object.freeze(['adult contact details', 'message', 'sentiment', 'site ID', 'source URL']), retention: 'while the operator account is active', deletionDays: 30, deletionEvidence: 'provider policy; live deletion not executed' }),
        preferences: Object.freeze({ data: Object.freeze(['selected allergen token', 'selected allergen label']), persistentStorage: false, retention: 'current game session only', deletion: 'restart or reload the game; clear legacy app or website storage through system settings' })
    }),
    browser: Object.freeze({ googleAnalytics: true, analyticsStorage: 'denied', advertisementStorage: 'denied', googleSignals: false, advertisementPersonalization: false, feedbackLoadsAutomatically: true }),
    support: Object.freeze({ contact: 'support@mprlab.com', data: Object.freeze(['contact details', 'message']), purpose: 'answer support and deletion requests', retention: 'operator-managed; no fixed period verified', deletion: 'request through support@mprlab.com' }),
    storeCertification: 'not-certified',
    storeReview: Object.freeze({
        status: 'operator-review-required',
        sources: Object.freeze({ apple: 'https://developer.apple.com/app-store/app-privacy-details/', google: 'https://support.google.com/googleplay/android-developer/answer/10787469' }),
        candidateMappings: Object.freeze([
            Object.freeze({ surface: 'native counts', apple: 'Product Interaction or Other Usage Data', google: 'App activity: App interactions or Other actions', review: 'Aggregate startup totals remain off-device usage data; verify retention and exact console category.' }),
            Object.freeze({ surface: 'adult feedback contact', apple: 'Email Address or Other User Contact Info', google: 'Personal info: Email address or other contact type', review: 'Use the actual contact fields. The optional-disclosure exception requires all provider and store conditions.' }),
            Object.freeze({ surface: 'adult feedback content', apple: 'Customer Support or Other User Content', google: 'App activity: Other user-generated content', review: 'Review message and sentiment fields. Do not request child health details.' }),
            Object.freeze({ surface: 'transport IP and headers', apple: 'Review real-time-only collection exclusion', google: 'Review current ephemeral processing guidance and actual IP use', review: 'Verify provider and proxy retention. Do not infer location collection from transport IP alone.' }),
            Object.freeze({ surface: 'site ID and source URL', apple: 'Review actual association and URL use', google: 'Review actual association and URL use', review: 'A site ID identifies this app configuration. Do not classify it as a user identifier without evidence.' }),
            Object.freeze({ surface: 'support email', apple: 'Customer Support if collected through the app', google: 'Review data sent by the app versus an external email client', review: 'Public policy covers operator correspondence. Do not automatically classify all external email as app collection.' })
        ]),
        unresolved: Object.freeze(['provider processing roles and sharing classification', 'data linkage and tracking answers', 'ephemeral processing and font data use', 'optional versus required collection', 'retention and deletion execution', 'child audience and country declarations'])
    }),
    qualification: Object.freeze(['deployed proxy logs', 'deployed retention execution', 'feedback deletion execution', 'support retention and deletion', 'native WebView requests and storage', 'store declarations and child-audience acceptance']),
    sections: Object.freeze([
        'Allergy Wheel is for ages six and older in available countries. The complete game is free, with no ads, purchases, or account requirement. This game does not determine whether food is safe to eat.',
        'Game rounds and the selected allergen stay in memory on your device during the current session. The game does not save these choices in local storage. Restart or reload the game to remove the selection. You can clear any older app or website storage through operating system or browser settings.',
        'The native app sends one automatic startup count to LoopAware with an empty JSON object and no cookies or referrer. It sends no allergen selection, game results, or visitor identifier. LoopAware stores daily totals without visitor or device records. Its policy retains daily counts for up to 90 UTC calendar days. The site operator can delete the site to remove its counts. Network transport processes an IP address to deliver each request.',
        'The native app does not use Google Analytics. Google Fonts loads automatically when online. Google receives your IP address and browser request headers for its stylesheet and font files. Google controls its retention. The game remains playable offline with a system font.',
        'Feedback is optional and intended for adults. An adult must pass the parent gate and agree to feedback data processing before the LoopAware form loads. Do not include a child\'s personal information. A submission contains adult contact details, a message or sentiment, the site ID, and the parent page URL. The parent gate and agreement do not establish legal parental consent for children.',
        'LoopAware\'s policy retains feedback while the operator account is active. It states that account and associated data deletion requests are completed within 30 days. Closing the feedback area ends the local session. Contact support@mprlab.com for a feedback deletion request.',
        'Support correspondence can contain contact details and message text. We use it to answer support and deletion requests. Support retention is managed by the operator, and no fixed period is verified in this app. Contact support@mprlab.com to request deletion.',
        'The browser website separately loads Google Analytics and the LoopAware feedback widget automatically. Google Analytics starts with analytics and advertisement storage denied, Google signals disabled, and advertisement personalization disabled. Denied storage does not prevent all measurement requests. The native app contract does not describe website analytics.'
    ])
});

export const ParentText = Object.freeze({
    TITLE: 'For parents', ANSWER: 'Answer', CONTINUE: 'Continue', QUESTION: 'To continue, multiply',
    INCORRECT: 'Please ask an adult to answer the question.',
    FEEDBACK: 'Open feedback', PRIVACY_TITLE: 'Privacy and support',
    INTRODUCTION: 'Have a question or an idea? Ask an adult to open feedback.',
    LOADING: 'The online service is starting.', READY: 'The online service is ready.', UNAVAILABLE: 'Internet is unavailable or the service could not load. The game still works offline.',
    PRIVACY: PrivacyContract.sections.join('\n\n'),
    CONSENT: 'Feedback is for adults. Share a question or suggestion with our team.',
    AGREEMENT: 'I am an adult and agree to LoopAware processing my contact details, message, and sentiment for feedback. I will not include a child\'s personal information.'
});
export const FeedbackConfiguration = Object.freeze({
    BUBBLE_ID: 'mp-feedback-bubble', PANEL_ID: 'mp-feedback-panel', CONTACT_ID: 'mp-feedback-contact',
    INITIALIZATION_TIMEOUT_MS: 10_000
});
export const ExternalService = Object.freeze({
    LOOP_COUNTS: 'https://loopaware-api.mprlab.com/public/sites/eaf3654a-9f9b-4e86-9262-558201a6e276/visit-counts',
    LOOP_FEEDBACK: 'https://loopaware.mprlab.com/widget.js?site_id=9931e62f-5a60-48e6-9e31-16de62f62e7d',
    FONTS: 'https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap',
});

/* File: constants.js */

export const ScreenName = Object.freeze({
    ALLERGY: "allergy",
    WHEEL: "wheel",
    MENU: "menu"
});


export const WheelConfiguration = Object.freeze({
    SEGMENT_COUNT: 8,
    DEFAULT_SPIN_DURATION_MS: 30000,
    WIN_CONDITION_HEARTS: 10,
    MIN_RANDOM_SPIN_DURATION_MS: 22000,
    MAX_RANDOM_SPIN_DURATION_MS: 34000,
    MIN_RANDOM_REVOLUTIONS: 3,
    MAX_RANDOM_REVOLUTIONS: 6
});

export const AllergenDistributionConfiguration = Object.freeze({
    MIN_HEARTS_FOR_DISTRIBUTION: 1,
    MAX_HEARTS_FOR_DISTRIBUTION: 9,
    MIN_ALLERGEN_SEGMENTS: 1,
    MAX_ALLERGEN_SEGMENTS: 7
});

export const WheelLabelFallback = Object.freeze({
    NO_SELECTION: Object.freeze({ label: "No selection", emoji: "" }),
    NO_MATCHES: Object.freeze({ label: "No matches", emoji: "" })
});

export const ButtonClassName = Object.freeze({
    ACTION: "action",
    START: "is-start",
    STOP: "is-stop",
    PRIMARY: "primary",
    DANGER: "danger"
});


const WheelControlModeStringStop = "stop";
const WheelControlModeStringStart = "start";
const WheelControlStopClassName = "wheel-control--stop-mode";
const WheelControlContainerElementId = "wheel-control";

const AvatarIdentifierSunnyGirl = "avatar-sunny-girl";
const AvatarIdentifierCuriousGirl = "avatar-curious-girl";
const AvatarIdentifierAdventurousBoy = "avatar-adventurous-boy";
const AvatarIdentifierCreativeBoy = "avatar-creative-boy";
const AvatarIdentifierTyrannosaurusRex = "avatar-tyrannosaurus-rex";
const AvatarIdentifierTriceratops = "avatar-triceratops";

export const MODE_STOP = WheelControlModeStringStop;
export const MODE_START = WheelControlModeStringStart;

export const WheelControlMode = Object.freeze({
    STOP: WheelControlModeStringStop,
    START: WheelControlModeStringStart
});

export const WheelControlClassName = Object.freeze({
    STOP_MODE: WheelControlStopClassName
});

const AvatarAssetPathSunnyGirl = "assets/avatars/sunny.svg";
const AvatarAssetPathCuriousGirl = "assets/avatars/sea.svg";
const AvatarAssetPathAdventurousBoy = "assets/avatars/adventurous-boy.svg";
const AvatarAssetPathCreativeBoy = "assets/avatars/sunny girl.svg";
const AvatarAssetPathTyrannosaurusRex = "assets/avatars/t-rex.svg";
const AvatarAssetPathTriceratops = "assets/avatars/triceratops.svg";

const AvatarDisplayNameSunnyGirl = "Earthling";
const AvatarDisplayNameCuriousGirl = "Marine";
const AvatarDisplayNameAdventurousBoy = "Adventurous Boy";
const AvatarDisplayNameCreativeBoy = "Sunny Girl";
const AvatarDisplayNameTyrannosaurusRex = "T-Rex";
const AvatarDisplayNameTriceratops = "Triceratops";

const AvatarCatalogEntries = Object.freeze([
    Object.freeze({
        key: "SUNNY_GIRL",
        id: AvatarIdentifierSunnyGirl,
        assetPath: AvatarAssetPathSunnyGirl,
        displayName: AvatarDisplayNameSunnyGirl
    }),
    Object.freeze({
        key: "CURIOUS_GIRL",
        id: AvatarIdentifierCuriousGirl,
        assetPath: AvatarAssetPathCuriousGirl,
        displayName: AvatarDisplayNameCuriousGirl
    }),
    Object.freeze({
        key: "ADVENTUROUS_BOY",
        id: AvatarIdentifierAdventurousBoy,
        assetPath: AvatarAssetPathAdventurousBoy,
        displayName: AvatarDisplayNameAdventurousBoy
    }),
    Object.freeze({
        key: "CREATIVE_BOY",
        id: AvatarIdentifierCreativeBoy,
        assetPath: AvatarAssetPathCreativeBoy,
        displayName: AvatarDisplayNameCreativeBoy
    }),
    Object.freeze({
        key: "TYRANNOSAURUS_REX",
        id: AvatarIdentifierTyrannosaurusRex,
        assetPath: AvatarAssetPathTyrannosaurusRex,
        displayName: AvatarDisplayNameTyrannosaurusRex
    }),
    Object.freeze({
        key: "TRICERATOPS",
        id: AvatarIdentifierTriceratops,
        assetPath: AvatarAssetPathTriceratops,
        displayName: AvatarDisplayNameTriceratops
    })
]);

const createAvatarMapByKey = (propertyName) => {
    const mapping = {};
    for (const descriptor of AvatarCatalogEntries) {
        mapping[descriptor.key] = descriptor[propertyName];
    }
    return mapping;
};

const createAvatarMapById = (propertyName) => {
    const mapping = {};
    for (const descriptor of AvatarCatalogEntries) {
        mapping[descriptor.id] = descriptor[propertyName];
    }
    return mapping;
};

const avatarIdByKey = createAvatarMapByKey("id");
avatarIdByKey.DEFAULT = AvatarIdentifierSunnyGirl;

export const AvatarId = Object.freeze(avatarIdByKey);

export const AvatarCatalog = AvatarCatalogEntries;

export const AvatarAssetPath = Object.freeze(createAvatarMapByKey("assetPath"));

export const AvatarDisplayName = Object.freeze(createAvatarMapById("displayName"));

const AudioAssetPathYamYam = "assets/audio/yam_yam.mp3";
const AudioAssetPathSiren = "assets/audio/ambulance_siren.mp3";

export const AudioAssetPath = Object.freeze({
    NOM_NOM: AudioAssetPathYamYam,
    SIREN: AudioAssetPathSiren
});

export const ControlElementId = Object.freeze({
    START_BUTTON: "start",
    WHEEL_CONTINUE_BUTTON: "wheel-continue",
    WHEEL_RESTART_BUTTON: "wheel-restart",
    WHEEL_CONTROL_CONTAINER: WheelControlContainerElementId,
    FULLSCREEN_BUTTON: "fs",
    MUTE_BUTTON: "mute",
    SPIN_AGAIN_BUTTON: "again",
    REVEAL_SECTION: "reveal",
    GAME_OVER_SECTION: "gameover",
    RESTART_BUTTON: "restart",
    AVATAR_TOGGLE: "avatar-toggle",
    AVATAR_MENU: "avatar-menu",
    AVATAR_MENU_BACKDROP: "avatar-menu-backdrop",
    ALLERGY_TITLE: "allergy-title",
    NAV_GAME_BUTTON: "nav-game",
    NAV_MENU_BUTTON: "nav-menu",
    RESTART_CONFIRMATION_CONTAINER: "restart-confirmation",
    RESTART_CONFIRMATION_OVERLAY: "restart-confirmation-overlay",
    RESTART_CONFIRMATION_DIALOG: "restart-confirmation-dialog",
    RESTART_CONFIRMATION_CONFIRM_BUTTON: "restart-confirmation-confirm",
    RESTART_CONFIRMATION_CANCEL_BUTTON: "restart-confirmation-cancel"
});

export const RestartConfirmationText = Object.freeze({
    TITLE: "Restart the game?",
    MESSAGE: "Are you sure you want to restart? Your current progress will be lost.",
    CONFIRM: "Yes, restart",
    CANCEL: "Continue playing"
});

const AvatarButtonClassName = "avatar-button";
const AvatarOptionClassName = "avatar-option";
const AvatarImageClassName = "avatar-image";
const AvatarLabelClassName = "avatar-label";
const AvatarMenuContainerClassName = "avatar-menu";
const AvatarMenuOpenClassName = "is-open";
const AvatarMenuBackdropClassName = "avatar-menu-backdrop";
const AvatarMenuBackdropVisibleClassName = "avatar-menu-backdrop--visible";

const VisuallyHiddenClassName = "visually-hidden";

const AvatarTogglePromptText = "Choose your avatar";
const AvatarToggleAltSuffixText = " avatar";
const AvatarOptionAltSuffixText = " avatar option";

export const AvatarClassName = Object.freeze({
    BUTTON: AvatarButtonClassName,
    OPTION: AvatarOptionClassName,
    IMAGE: AvatarImageClassName,
    LABEL: AvatarLabelClassName
});

export const AvatarMenuClassName = Object.freeze({
    CONTAINER: AvatarMenuContainerClassName,
    OPEN: AvatarMenuOpenClassName,
    BACKDROP: AvatarMenuBackdropClassName,
    BACKDROP_VISIBLE: AvatarMenuBackdropVisibleClassName
});

export const GlobalClassName = Object.freeze({
    VISUALLY_HIDDEN: VisuallyHiddenClassName
});

export const AvatarMenuText = Object.freeze({
    TOGGLE_PROMPT: AvatarTogglePromptText,
    TOGGLE_ALT_SUFFIX: AvatarToggleAltSuffixText,
    OPTION_ALT_SUFFIX: AvatarOptionAltSuffixText
});

const TitleAttentionClassName = "title--attention";

export const TitleClassName = Object.freeze({
    ATTENTION: TitleAttentionClassName
});

export const FirstCardElementId = Object.freeze({
    LIST_CONTAINER: "allergy-list",
    BADGE_CONTAINER: "sel-badges"
});

export const ResultCardElementId = Object.freeze({
    REVEAL_SECTION: ControlElementId.REVEAL_SECTION,
    DISH_TITLE: "dish-title",
    DISH_CUISINE: "dish-cuisine",
    RESULT_BANNER: "result",
    RESULT_TEXT: "result-text",
    INGREDIENTS_CONTAINER: "dish-ingredients",
    FACE_SVG: "face",
    GAME_OVER_SECTION: ControlElementId.GAME_OVER_SECTION,
    WIN_RESTART_BUTTON: "win-restart"
});

export const ScreenElementId = Object.freeze({
    ALLERGY: "screen-allergy",
    WHEEL: "screen-wheel",
    MENU: "screen-menu"
});

export const MenuElementId = Object.freeze({
    TABLE_BODY: "menu-table-body",
    INGREDIENT_FILTER_TOGGLE: "menu-ingredient-filter-toggle",
    INGREDIENT_FILTER_PANEL: "menu-ingredient-filter-panel",
    INGREDIENT_FILTER_LIST: "menu-ingredient-filter-list",
    INGREDIENT_FILTER_CLEAR: "menu-ingredient-filter-clear",
    CUISINE_FILTER_TOGGLE: "menu-cuisine-filter-toggle",
    CUISINE_FILTER_PANEL: "menu-cuisine-filter-panel",
    CUISINE_FILTER_LIST: "menu-cuisine-filter-list",
    CUISINE_FILTER_CLEAR: "menu-cuisine-filter-clear"
});

export const MenuFilterText = Object.freeze({
    FILTER_LABEL: "Filter",
    INGREDIENT_FILTER_ARIA_LABEL: "Filter ingredients",
    CUISINE_FILTER_ARIA_LABEL: "Filter cuisines",
    CLEAR_INGREDIENT_LABEL: "Clear ingredient filters",
    CLEAR_CUISINE_LABEL: "Clear cuisine filters",
    SELECT_ALL_LABEL: "Show all"
});

const MenuColumnLabelDishText = "Dish";
const MenuColumnLabelIngredientsText = "Ingredients";
const MenuColumnLabelCuisineText = "Cuisine";
const MenuColumnLabelStoryText = "Story";

export const MenuColumnLabel = Object.freeze({
    DISH: MenuColumnLabelDishText,
    INGREDIENTS: MenuColumnLabelIngredientsText,
    CUISINE: MenuColumnLabelCuisineText,
    STORY: MenuColumnLabelStoryText
});

export const DocumentElementId = Object.freeze({
    LOADING: "loading",
    LOAD_ERROR: "load-error",
    WHEEL_CANVAS: "wheel"
});

export const HeartsElementId = Object.freeze({
    HEARTS_BAR: "hearts-bar"
});

export const AttributeName = Object.freeze({
    ARIA_HIDDEN: "aria-hidden",
    ARIA_LABEL: "aria-label",
    ARIA_PRESSED: "aria-pressed",
    ARIA_EXPANDED: "aria-expanded",
    ARIA_HAS_POPUP: "aria-haspopup",
    ARIA_DISABLED: "aria-disabled",
    DATA_SCREEN: "data-screen",
    DATA_COUNT: "data-count",
    DATA_BLOCKED: "data-blocked",
    DATA_WHEEL_CONTROL_MODE: "data-wheel-control-mode",
    DATA_COLUMN_LABEL: "data-column-label"
});

export const AttributeBooleanValue = Object.freeze({
    TRUE: "true",
    FALSE: "false"
});

const DocumentReadyStateLoading = "loading";
const DocumentReadyStateInteractive = "interactive";
const DocumentReadyStateComplete = "complete";

export const DocumentReadyState = Object.freeze({
    LOADING: DocumentReadyStateLoading,
    INTERACTIVE: DocumentReadyStateInteractive,
    COMPLETE: DocumentReadyStateComplete
});

export const BrowserEventName = Object.freeze({
    DOM_CONTENT_LOADED: "DOMContentLoaded",
    CLICK: "click",
    KEY_DOWN: "keydown",
    CHANGE: "change",
    ANIMATION_END: "animationend",
    POINTER_DOWN: "pointerdown",
    TOUCH_START: "touchstart",
    VISIBILITY_CHANGE: "visibilitychange",
    RESIZE: "resize"
});

const KeyboardKeyEnter = "Enter";
const KeyboardKeySpace = " ";
const KeyboardKeySpacebar = "Spacebar";
const KeyboardKeyEscape = "Escape";
const KeyboardKeyEsc = "Esc";

export const KeyboardKey = Object.freeze({
    ENTER: KeyboardKeyEnter,
    SPACE: KeyboardKeySpace,
    SPACEBAR: KeyboardKeySpacebar,
    ESCAPE: KeyboardKeyEscape,
    ESC: KeyboardKeyEsc
});

export const ButtonText = Object.freeze({
    SPIN: "SPIN",
    STOP: "STOP",
    RESTART: "Restart",
    MUTE: "Mute",
    SOUND_ON: "Sound On"
});

export const AudioControlLabel = Object.freeze({
    MUTE_AUDIO: "Mute audio",
    UNMUTE_AUDIO: "Unmute audio"
});

export const DataPath = Object.freeze({
    ALLERGENS: "./data/allergens.json",
    DISHES: "./data/dishes.json",
    NORMALIZATION: "./data/normalization.json",
    COUNTRIES: "./data/countries.json",
    INGREDIENTS: "./data/ingredients.json"
});

export const DataValidationMessage = Object.freeze({
    ALLERGENS: "allergens.json is missing or empty",
    DISHES: "dishes.json is missing or empty",
    NORMALIZATION: "normalization.json is missing or empty",
    INGREDIENTS: "ingredients.json is missing or empty"
});

export const GameErrorMessage = Object.freeze({
    MISSING_DEPENDENCIES:
        "GameController requires wheel, board, listenerBinder, stateManager, uiPresenter, firstCardPresenter, revealCardPresenter, heartsPresenter, audioPresenter, menuPresenter, dataLoader, createNormalizationEngine, and pickRandomUnique.",
    INVALID_DATA_LOADER: "GameController requires dataLoader.loadJson to be a function.",
    INVALID_NORMALIZATION_FACTORY: "GameController requires createNormalizationEngine to be a function.",
    INVALID_RANDOM_PICKER: "GameController requires pickRandomUnique to be a function.",
    NO_DISHES_FOR_ALLERGEN_PREFIX: "Invariant broken: no dishes for allergen token"
});

export const BoardErrorMessage = Object.freeze({
    MISSING_DISHES_PREFIX: "Data invariant violated: no dishes found for allergen token(s):"
});

export const ListenerErrorMessage = Object.freeze({
    MISSING_DEPENDENCIES:
        "createListenerBinder requires controlElementId, attributeName, and stateManager",
    MISSING_STATE_MANAGER_METHODS:
        "createListenerBinder requires stateManager methods hasSelectedAllergen, getWheelControlMode, isAudioMuted, and toggleAudioMuted"
});

export const StateManagerErrorMessage = Object.freeze({
    INVALID_INITIAL_HEARTS_COUNT: "StateManager.initialize requires a numeric initialHeartsCount",
    INVALID_HEARTS_COUNT: "StateManager.setHeartsCount requires a numeric value"
});

export const AudioErrorMessage = Object.freeze({
    ASSET_LOAD_FAILURE: "Unable to load audio asset",
    ASSET_DECODE_FAILURE: "Unable to decode audio asset",
    SIREN_ASSET_LOAD_FAILURE: "Unable to load siren audio asset.",
    SIREN_DECODE_FAILURE: "Unable to decode siren audio asset.",
    FETCH_UNSUPPORTED: "Audio asset loading requires fetch support."
});

export const WheelErrorMessage = Object.freeze({
    MISSING_CANVAS: "Wheel requires a canvas element with a 2d context",
    MISSING_CONTEXT: "Wheel could not acquire a 2d drawing context"
});

export const MenuMessage = Object.freeze({
    NO_MATCHES: "No dishes match the selected filters."
});

export const LoadJsonErrorMessage = Object.freeze({
    PREFIX: "failed to load"
});

export const ResultCardText = Object.freeze({
    WIN_TITLE: "You Win! 🏆",
    WIN_MESSAGE: "Amazing! You collected 10 hearts!",
    SAFE_TO_EAT: "Safe to eat. Yummy!",
    RESULT_BAD_PREFIX: "Contains your allergen: "
});

export const HeartsText = Object.freeze({
    DELTA_GAIN: "+1",
    DELTA_LOSS: "-1",
    LABEL_SUFFIX: " hearts"
});
