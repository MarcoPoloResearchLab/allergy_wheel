// @ts-check

import { defineSuite } from "../harness.js";
import { assertDeepEqual, assertEqual } from "../assert.js";
import { NavigationController, resolveInitialNavState } from "../../js/ui/navigation.js";
import { ScreenName, ScreenElementId, NavigationText, AttributeName, ControlElementId } from "../../js/constants.js";

defineSuite("Navigation controller", (test) => {
    test("updateActiveScreen renders the opposite destination and remembers the game", () => {
        const button = document.createElement("button");
        button.id = ControlElementId.NAV_TOGGLE_BUTTON;
        document.body.appendChild(button);
        const controller = new NavigationController();
        controller.initialize();
        const cases = [
            { screen: ScreenName.ALLERGY, label: NavigationText.MENU, target: ScreenElementId.MENU },
            { screen: ScreenName.MENU, label: NavigationText.GAME, target: ScreenElementId.ALLERGY },
            { screen: ScreenName.WHEEL, label: NavigationText.MENU, target: ScreenElementId.MENU },
            { screen: ScreenName.MENU, label: NavigationText.GAME, target: ScreenElementId.WHEEL },
            { screen: ScreenName.ALLERGY, label: NavigationText.MENU, target: ScreenElementId.MENU },
            { screen: ScreenName.MENU, label: NavigationText.GAME, target: ScreenElementId.ALLERGY }
        ];
        for (const scenario of cases) {
            controller.updateActiveScreen(scenario.screen);
            assertEqual(button.textContent, scenario.label, "Navigation must name the other view.");
            assertEqual(button.getAttribute(AttributeName.ARIA_CONTROLS), scenario.target, "Navigation must identify its destination.");
        }
        button.remove();
    });

    test("initialize emits the destination through the public callback", () => {
        const button = document.createElement("button");
        button.id = ControlElementId.NAV_TOGGLE_BUTTON;
        document.body.appendChild(button);
        const observedScreens = [];
        const controller = new NavigationController({ onScreenChange: (screen) => observedScreens.push(screen) });
        controller.initialize();
        const cases = [
            { screen: ScreenName.ALLERGY, target: ScreenName.MENU },
            { screen: ScreenName.MENU, target: ScreenName.ALLERGY },
            { screen: ScreenName.WHEEL, target: ScreenName.MENU },
            { screen: ScreenName.MENU, target: ScreenName.WHEEL }
        ];
        for (const scenario of cases) {
            controller.updateActiveScreen(scenario.screen);
            button.click();
        }
        assertDeepEqual(observedScreens, cases.map((scenario) => scenario.target), "Clicks must request the current destination.");
        button.remove();
    });

    test("resolveInitialNavState reads body attribute", () => {
        const cases = [
            { bodyValue: ScreenName.MENU, expected: ScreenName.MENU },
            { bodyValue: "", expected: ScreenName.ALLERGY }
        ];
        for (const scenario of cases) {
            document.body.setAttribute(AttributeName.DATA_SCREEN, scenario.bodyValue);
            assertEqual(resolveInitialNavState(), scenario.expected, "Initial navigation must match the page.");
        }
        document.body.removeAttribute(AttributeName.DATA_SCREEN);
    });
});
