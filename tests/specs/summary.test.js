// @ts-check

import { defineSuite } from "../harness.js";
import { assert, assertEqual } from "../assert.js";
import { renderAllergenSummary } from "../../js/ui/summary.js";
import { SummaryElementId, SummaryText } from "../../js/constants.js";

defineSuite("Allergen summary", (test) => {
    test("renders expected list entries", () => {
        const cases = [
            {
                description: "formats three samples",
                dishes: [
                    { id: "dish-1", name: "Dish One" },
                    { id: "dish-2", name: "Dish Two" },
                    { id: "dish-3", name: "Dish Three" },
                    { id: "dish-4", name: "Dish Four" }
                ],
                expectedSnippet: "Dish One, Dish Two, and Dish Three."
            },
            {
                description: "formats single sample",
                dishes: [{ id: "dish-5", name: "Solo Dish" }],
                expectedSnippet: "1 dish in the Allergy Wheel menu trigger this allergen alert, including Solo Dish."
            },
            {
                description: "handles zero dishes",
                dishes: [],
                expectedSnippet: SummaryText.ZERO_DISHES_MESSAGE
            }
        ];

        for (const { description, dishes, expectedSnippet } of cases) {
            const wrapperElement = document.createElement("div");
            wrapperElement.id = SummaryElementId.WRAPPER;
            const containerElement = document.createElement("section");
            containerElement.id = SummaryElementId.CONTAINER;
            wrapperElement.appendChild(containerElement);
            document.body.appendChild(wrapperElement);

            renderAllergenSummary({
                documentReference: document,
                allergensCatalog: [
                    { token: "test", label: "Test Allergen", emoji: "🥜" }
                ],
                dishesByAllergenToken: new Map([["test", dishes]])
            });

            const titleElement = document.getElementById(SummaryElementId.TITLE);
            assert(titleElement !== null, "title element should exist");
            assertEqual(titleElement?.textContent ?? "", SummaryText.TITLE, "title text mismatch");

            const listElement = document.getElementById(SummaryElementId.LIST);
            assert(listElement !== null, "list element should exist");
            const listText = listElement?.textContent ?? "";
            assert(
                listText.includes(expectedSnippet),
                `summary detail mismatch: ${description}`
            );

            wrapperElement.remove();
        }
    });
});
