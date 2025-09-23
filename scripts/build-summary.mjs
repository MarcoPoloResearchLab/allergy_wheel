#!/usr/bin/env node
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const SUMMARY_START_MARKER = "<!-- GENERATED_ALLERGY_SUMMARY_START -->";
const SUMMARY_END_MARKER = "<!-- GENERATED_ALLERGY_SUMMARY_END -->";
const SUMMARY_SECTION_TITLE = "Food Allergy Quick Reference";
const SUMMARY_SECTION_HEADING_ID = "allergy-summary-title";
const SUMMARY_INTRO_PARAGRAPH =
    "This food allergy quick reference keeps the Allergy Wheel menu aligned with real allergen data so families can plan ahead.";
const SUMMARY_SECOND_PARAGRAPH =
    "The allergen education checklist below shows how many dishes may trigger each allergen in the Allergy Wheel catalog.";
const SUMMARY_OUTRO_PARAGRAPH =
    "Review this food allergy FAQ before spinning the Allergy Wheel to stay confident about every allergen alert.";
const SUMMARY_LIST_CLASS = "seo-summary-list";
const SUMMARY_SECTION_CLASS = "seo-summary";
const SUMMARY_NOSCRIPT_CLASS = "seo-summary-wrapper";
const SUMMARY_LIST_INTRO_PHRASE = "including";
const ZERO_DISHES_MESSAGE =
    "No dishes currently flag this allergen in the Allergy Wheel menu, so the food allergy catalog shows a safe lane here.";
const DATA_DIRECTORY_NAME = "data";
const DISHES_FILE_NAME = "dishes.json";
const ALLERGENS_FILE_NAME = "allergens.json";
const INGREDIENTS_FILE_NAME = "ingredients.json";
const NORMALIZATION_FILE_NAME = "normalization.json";
const TARGET_INDEX_FILE_NAME = "index.html";
const SUMMARY_LINE_INDENT = "            ";
const MAX_EXAMPLE_DISHES = 3;

const HTML_ENTITY_MAP = Object.freeze(
    new Map([
        ["&", "&amp;"],
        ["<", "&lt;"],
        [">", "&gt;"],
        ['"', "&quot;"],
        ["'", "&#39;"],
    ]),
);

async function main() {
    const rootDirectoryPath = resolveRootDirectory();
    const dataDirectoryPath = path.join(rootDirectoryPath, DATA_DIRECTORY_NAME);
    const targetIndexPath = path.join(rootDirectoryPath, TARGET_INDEX_FILE_NAME);

    const [dishCatalog, allergenCatalog, ingredientCatalog, normalizationCatalog] = await Promise.all([
        loadJsonFile(path.join(dataDirectoryPath, DISHES_FILE_NAME)),
        loadJsonFile(path.join(dataDirectoryPath, ALLERGENS_FILE_NAME)),
        loadJsonFile(path.join(dataDirectoryPath, INGREDIENTS_FILE_NAME)),
        loadJsonFile(path.join(dataDirectoryPath, NORMALIZATION_FILE_NAME)),
    ]);

    const ingredientToAllergenMap = buildIngredientToAllergenMap(ingredientCatalog);
    const compiledNormalizationRules = compileNormalizationRules(normalizationCatalog);

    const allergenSummaries = computeAllergenSummaries({
        allergenCatalog,
        dishCatalog,
        ingredientToAllergenMap,
        compiledNormalizationRules,
    });

    const summaryHtml = createSummaryHtml(allergenSummaries);
    await injectSummaryIntoIndex({
        indexFilePath: targetIndexPath,
        summaryHtml,
    });
}

function resolveRootDirectory() {
    const scriptFilePath = fileURLToPath(import.meta.url);
    const scriptDirectory = path.dirname(scriptFilePath);
    return path.resolve(scriptDirectory, "..");
}

async function loadJsonFile(filePath) {
    const fileContent = await readFile(filePath, "utf8");
    return JSON.parse(fileContent);
}

function buildIngredientToAllergenMap(ingredientCatalog) {
    const ingredientToAllergenMap = new Map();
    if (!Array.isArray(ingredientCatalog)) {
        return ingredientToAllergenMap;
    }

    for (const ingredientRecord of ingredientCatalog) {
        if (!ingredientRecord || typeof ingredientRecord !== "object") {
            continue;
        }
        const ingredientName = normalizeTextValue(ingredientRecord.name);
        const allergenToken = normalizeTextValue(ingredientRecord.allergen);
        if (ingredientName && allergenToken) {
            ingredientToAllergenMap.set(ingredientName, allergenToken);
        }
    }

    return ingredientToAllergenMap;
}

function compileNormalizationRules(normalizationCatalog) {
    const compiledRules = [];
    if (!Array.isArray(normalizationCatalog)) {
        return compiledRules;
    }

    for (const normalizationEntry of normalizationCatalog) {
        if (!normalizationEntry || typeof normalizationEntry !== "object") {
            continue;
        }

        const patternSource = String(normalizationEntry.pattern || "");
        const patternFlags = String(normalizationEntry.flags || "");
        const allergenToken = normalizeTextValue(normalizationEntry.token);

        if (!patternSource || !allergenToken) {
            continue;
        }

        const compiledMatcher = new RegExp(patternSource, patternFlags);
        compiledRules.push({
            allergenToken,
            compiledMatcher,
        });
    }

    return compiledRules;
}

function computeAllergenSummaries({
    allergenCatalog,
    dishCatalog,
    ingredientToAllergenMap,
    compiledNormalizationRules,
}) {
    const dishesByAllergenToken = new Map();
    if (Array.isArray(allergenCatalog)) {
        for (const allergenRecord of allergenCatalog) {
            if (!allergenRecord || typeof allergenRecord !== "object") {
                continue;
            }
            const allergenToken = normalizeTextValue(allergenRecord.token);
            if (allergenToken && !dishesByAllergenToken.has(allergenToken)) {
                dishesByAllergenToken.set(allergenToken, []);
            }
        }
    }

    if (Array.isArray(dishCatalog)) {
        for (const dishRecord of dishCatalog) {
            if (!dishRecord || typeof dishRecord !== "object") {
                continue;
            }

            const dishAllergenTokens = determineDishAllergens({
                dishRecord,
                ingredientToAllergenMap,
                compiledNormalizationRules,
            });

            for (const allergenToken of dishAllergenTokens) {
                if (!dishesByAllergenToken.has(allergenToken)) {
                    dishesByAllergenToken.set(allergenToken, []);
                }
                const allergenDishList = dishesByAllergenToken.get(allergenToken);
                allergenDishList.push(dishRecord);
            }
        }
    }

    const allergenSummaries = [];
    if (Array.isArray(allergenCatalog)) {
        for (const allergenRecord of allergenCatalog) {
            if (!allergenRecord || typeof allergenRecord !== "object") {
                continue;
            }

            const allergenToken = normalizeTextValue(allergenRecord.token);
            const allergenLabel = String(allergenRecord.label || "");
            const allergenEmoji = String(allergenRecord.emoji || "");
            const matchedDishes = dishesByAllergenToken.get(allergenToken) || [];

            const deduplicatedDishes = deduplicateDishesById(matchedDishes);
            const exampleDishNames = deduplicatedDishes
                .slice(0, MAX_EXAMPLE_DISHES)
                .map((dishEntry) => String(dishEntry.name || ""))
                .filter((dishName) => dishName);

            allergenSummaries.push({
                allergenToken,
                allergenLabel,
                allergenEmoji,
                dishCount: deduplicatedDishes.length,
                exampleDishNames,
            });
        }
    }

    return allergenSummaries;
}

function determineDishAllergens({ dishRecord, ingredientToAllergenMap, compiledNormalizationRules }) {
    const detectedAllergenTokens = new Set();
    const ingredientList = Array.isArray(dishRecord.ingredients) ? dishRecord.ingredients : [];

    for (const ingredientNameRaw of ingredientList) {
        const normalizedIngredientName = normalizeTextValue(ingredientNameRaw);
        if (!normalizedIngredientName) {
            continue;
        }

        if (ingredientToAllergenMap.has(normalizedIngredientName)) {
            detectedAllergenTokens.add(ingredientToAllergenMap.get(normalizedIngredientName));
            continue;
        }

        for (const normalizationRule of compiledNormalizationRules) {
            if (normalizationRule.compiledMatcher.test(ingredientNameRaw)) {
                detectedAllergenTokens.add(normalizationRule.allergenToken);
            }
        }
    }

    return detectedAllergenTokens;
}

function deduplicateDishesById(dishList) {
    const seenIdentifiers = new Set();
    const deduplicatedDishes = [];

    for (const dishRecord of dishList) {
        const dishIdentifier = normalizeTextValue(dishRecord && dishRecord.id);
        if (!dishIdentifier || seenIdentifiers.has(dishIdentifier)) {
            continue;
        }
        seenIdentifiers.add(dishIdentifier);
        deduplicatedDishes.push(dishRecord);
    }

    return deduplicatedDishes;
}

function createSummaryHtml(allergenSummaries) {
    const summaryLines = [];
    summaryLines.push(`<noscript class="${SUMMARY_NOSCRIPT_CLASS}">`);
    summaryLines.push(
        `    <section aria-labelledby="${SUMMARY_SECTION_HEADING_ID}" class="${SUMMARY_SECTION_CLASS}">`,
    );
    summaryLines.push(`        <h2 id="${SUMMARY_SECTION_HEADING_ID}">${escapeHtml(SUMMARY_SECTION_TITLE)}</h2>`);
    summaryLines.push(`        <p>${escapeHtml(SUMMARY_INTRO_PARAGRAPH)}</p>`);
    summaryLines.push(`        <p>${escapeHtml(SUMMARY_SECOND_PARAGRAPH)}</p>`);
    summaryLines.push(`        <ul class="${SUMMARY_LIST_CLASS}">`);

    for (const allergenSummary of allergenSummaries) {
        summaryLines.push(`            ${createAllergenListItem(allergenSummary)}`);
    }

    summaryLines.push("        </ul>");
    summaryLines.push(`        <p>${escapeHtml(SUMMARY_OUTRO_PARAGRAPH)}</p>`);
    summaryLines.push("    </section>");
    summaryLines.push("</noscript>");

    return summaryLines
        .map((line) => `${SUMMARY_LINE_INDENT}${line}`)
        .join("\n");
}

function createAllergenListItem(allergenSummary) {
    const { allergenEmoji, allergenLabel, dishCount, exampleDishNames } = allergenSummary;
    const escapedLabel = escapeHtml(allergenLabel);
    const emojiPart = escapeHtml(allergenEmoji);
    const dishCountText = formatDishCount(dishCount);

    if (dishCount === 0) {
        return `<li><strong>${emojiPart} ${escapedLabel}</strong> — ${escapeHtml(ZERO_DISHES_MESSAGE)}</li>`;
    }

    const escapedExamples = exampleDishNames.map((name) => escapeHtml(name));
    const exampleList = formatExampleList(escapedExamples);
    const exampleText = exampleList
        ? ` ${SUMMARY_LIST_INTRO_PHRASE} ${exampleList}.`
        : "";
    const allergenAlertText = `${dishCountText} in the Allergy Wheel menu trigger this allergen alert,`;
    const escapedAlertText = escapeHtml(allergenAlertText);

    return `<li><strong>${emojiPart} ${escapedLabel}</strong> — ${escapedAlertText}${exampleText}</li>`;
}

function formatDishCount(dishCount) {
    if (dishCount === 1) {
        return "1 dish";
    }
    return `${dishCount} dishes`;
}

function formatExampleList(exampleNames) {
    if (exampleNames.length === 0) {
        return "";
    }
    if (exampleNames.length === 1) {
        return exampleNames[0];
    }
    if (exampleNames.length === 2) {
        return `${exampleNames[0]} and ${exampleNames[1]}`;
    }
    const leadingExamples = exampleNames.slice(0, exampleNames.length - 1).join(", ");
    const finalExample = exampleNames[exampleNames.length - 1];
    return `${leadingExamples}, and ${finalExample}`;
}

function escapeHtml(textValue) {
    return String(textValue).replace(/[&<>"']/g, (character) => HTML_ENTITY_MAP.get(character) || character);
}

function normalizeTextValue(rawValue) {
    return typeof rawValue === "string" ? rawValue.trim().toLowerCase() : "";
}

async function injectSummaryIntoIndex({ indexFilePath, summaryHtml }) {
    const existingIndexContent = await readFile(indexFilePath, "utf8");
    const startMarkerIndex = existingIndexContent.indexOf(SUMMARY_START_MARKER);
    const endMarkerIndex = existingIndexContent.indexOf(SUMMARY_END_MARKER);

    if (startMarkerIndex === -1 || endMarkerIndex === -1 || endMarkerIndex < startMarkerIndex) {
        throw new Error(
            `Summary markers not found in ${indexFilePath}. Add ${SUMMARY_START_MARKER} and ${SUMMARY_END_MARKER} placeholders.`,
        );
    }

    const contentBeforeMarker = existingIndexContent.slice(0, startMarkerIndex + SUMMARY_START_MARKER.length);
    const contentAfterMarker = existingIndexContent.slice(endMarkerIndex);
    const updatedIndexContent = `${contentBeforeMarker}\n${summaryHtml}\n${SUMMARY_LINE_INDENT}${contentAfterMarker}`;

    await writeFile(indexFilePath, updatedIndexContent);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
