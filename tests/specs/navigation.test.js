// @ts-check

import { defineSuite } from "../harness.js";
import { assert, assertEqual } from "../assert.js";
import { NavigationController, resolveInitialNavState } from "../../js/core/navigation.js";
import {
    ScreenName,
    AttributeBooleanValue,
    AttributeName,
    ControlElementId
} from "../../js/constants.js";

defineSuite("Navigation controller", (test) => {
    test("updateActiveScreen toggles aria-pressed", () => {
        const gameButton = document.createElement("button");
        gameButton.id = ControlElementId.NAV_GAME_BUTTON;
        const menuButton = document.createElement("button");
        menuButton.id = ControlElementId.NAV_MENU_BUTTON;
        document.body.appendChild(gameButton);
        document.body.appendChild(menuButton);

        const controller = new NavigationController({
            documentReference: document,
            controlElementIdMap: ControlElementId,
            attributeNameMap: AttributeName
        });
        controller.initialize();

        const cases = [
            {
                description: "allergy screen presses game button",
                screenName: ScreenName.ALLERGY,
                expectedGame: AttributeBooleanValue.TRUE,
                expectedMenu: AttributeBooleanValue.FALSE
            },
            {
                description: "menu screen presses menu button",
                screenName: ScreenName.MENU,
                expectedGame: AttributeBooleanValue.FALSE,
                expectedMenu: AttributeBooleanValue.TRUE
            }
        ];

        for (const { description, screenName, expectedGame, expectedMenu } of cases) {
            controller.updateActiveScreen(screenName);
            assertEqual(
                gameButton.getAttribute(AttributeName.ARIA_PRESSED),
                expectedGame,
                `game button aria-pressed mismatch: ${description}`
            );
            assertEqual(
                menuButton.getAttribute(AttributeName.ARIA_PRESSED),
                expectedMenu,
                `menu button aria-pressed mismatch: ${description}`
            );
        }

        gameButton.remove();
        menuButton.remove();
    });

    test("initialize wires click handlers", () => {
        const gameButton = document.createElement("button");
        gameButton.id = ControlElementId.NAV_GAME_BUTTON;
        const menuButton = document.createElement("button");
        menuButton.id = ControlElementId.NAV_MENU_BUTTON;
        document.body.appendChild(gameButton);
        document.body.appendChild(menuButton);

        const observedScreens = [];
        const controller = new NavigationController({
            documentReference: document,
            controlElementIdMap: ControlElementId,
            attributeNameMap: AttributeName,
            onScreenChange: (targetScreen) => {
                observedScreens.push(targetScreen);
            }
        });
        controller.initialize();

        const cases = [
            { description: "game button click", element: gameButton, expected: ScreenName.ALLERGY },
            { description: "menu button click", element: menuButton, expected: ScreenName.MENU }
        ];

        for (const { description, element, expected } of cases) {
            observedScreens.length = 0;
            element.click();
            assert(
                observedScreens.includes(expected),
                `expected onScreenChange for ${description}`
            );
        }

        gameButton.remove();
        menuButton.remove();
    });

    test("resolveInitialNavState reads body attribute", () => {
        const cases = [
            { description: "menu attribute", bodyValue: ScreenName.MENU, expected: ScreenName.MENU },
            { description: "missing attribute defaults to allergy", bodyValue: "", expected: ScreenName.ALLERGY }
        ];
        for (const { description, bodyValue, expected } of cases) {
            document.body.setAttribute(AttributeName.DATA_SCREEN, bodyValue);
            assertEqual(
                resolveInitialNavState(),
                expected,
                `initial state mismatch: ${description}`
            );
        }
        document.body.removeAttribute(AttributeName.DATA_SCREEN);
    });
});
