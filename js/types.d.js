/**
 * Canonical domain type declarations for the Allergy Wheel application.
 * These typedefs centralize the shapes shared across UI and core modules.
 *
 * @module Types
 */

/**
 * Represents an avatar entry from the catalog rendered in the UI.
 *
 * @typedef {Object} AvatarDescriptor
 * @property {string} key - Stable key used for referencing the descriptor in enumerations.
 * @property {string} id - Unique identifier used for DOM dataset attributes and persisted state.
 * @property {string} assetPath - Path or inline markup for the avatar asset rendered in the interface.
 * @property {string} displayName - Human readable label presented alongside the avatar graphic.
 */

/**
 * Describes a selectable allergen in the first card and throughout the game state.
 *
 * @typedef {Object} AllergenDescriptor
 * @property {string} token - Canonical allergen token leveraged for normalization and filtering.
 * @property {string} label - Display label shown to the player.
 * @property {string} [emoji] - Optional emoji accompanying the allergen label in the UI.
 */

/**
 * Defines the badge information rendered when an allergen is selected.
 *
 * @typedef {Object} AllergenBadgeEntry
 * @property {string} label - Text displayed inside the badge element.
 * @property {string} [emoji] - Optional emoji appended to the badge label.
 */

/**
 * Represents a dish entry pulled from the dishes catalog.
 *
 * @typedef {Object} Dish
 * @property {string} id - Unique identifier for the dish entry.
 * @property {string} [emoji] - Emoji displayed when presenting the dish.
 * @property {string} [name] - Primary dish name used in most UI contexts.
 * @property {string} [title] - Optional alternate title for the dish.
 * @property {string} [label] - Optional label fallback if name and title are unavailable.
 * @property {string} [cuisine] - Cuisine or origin used for filtering and flag lookup.
 * @property {string[]} [ingredients] - Ingredient list associated with the dish.
 * @property {string} [narrative] - Narrative description displayed in the menu view.
 */

/**
 * Normalization rule used by the NormalizationEngine to map ingredients to tokens.
 *
 * @typedef {Object} NormalizationRule
 * @property {string} pattern - Regular expression pattern describing the ingredient match.
 * @property {string} [flags] - Optional regex flags applied to the pattern.
 * @property {string} token - Token emitted when the pattern matches an ingredient.
 */

/**
 * Represents a cuisine and flag association sourced from the countries catalog.
 *
 * @typedef {Object} CountryDescriptor
 * @property {string} cuisine - Cuisine name used as the lookup key.
 * @property {string} [country] - Optional human readable country name associated with the cuisine.
 * @property {string} [flag] - Emoji flag displayed next to the cuisine label.
 */

/**
 * Represents an ingredient entry with an optional emoji and allergen mapping.
 *
 * @typedef {Object} IngredientDescriptor
 * @property {string} name - Ingredient label stored in the catalog.
 * @property {string} [emoji] - Emoji representing the ingredient.
 * @property {string} [allergen] - Associated allergen token when applicable.
 */

/**
 * Label information rendered on individual wheel segments.
 *
 * @typedef {Object} WheelLabelDescriptor
 * @property {string} label - Text presented inside the wheel segment.
 * @property {string} [emoji] - Optional emoji displayed next to the label.
 */

/**
 * Options accepted when resetting the wheel prior to a new spin.
 *
 * @typedef {Object} WheelSpinOptions
 * @property {boolean} [randomizeStart=true] - Indicates whether to randomize the wheel's starting angle.
 */

/**
 * Aggregated game data dependencies loaded during bootstrap.
 *
 * @typedef {Object} GameData
 * @property {AllergenDescriptor[]} allergensCatalog - Available allergen descriptors.
 * @property {Dish[]} dishesCatalog - Catalog of dishes used for wheel segments and menu rendering.
 * @property {NormalizationRule[]} normalizationRules - Normalization rules for mapping ingredients to allergens.
 * @property {CountryDescriptor[]} [countriesCatalog] - Optional catalog mapping cuisines to country metadata.
 * @property {IngredientDescriptor[]} ingredientsCatalog - Catalog providing ingredient emoji metadata.
 */

export {};
