import {
    AttributeBooleanValue,
    AttributeName,
    BrowserEventName,
    KeyboardKey,
    MenuElementId,
    MenuFilterText
} from "../constants.js";

const MenuFilterType = Object.freeze({
    INGREDIENT: "ingredient",
    CUISINE: "cuisine"
});

const MenuFilterClassName = Object.freeze({
    PANEL: "menu-filter-panel",
    PANEL_OPEN: "is-open",
    OPTION: "menu-filter-option",
    OPTION_SELECTED: "is-selected",
    OPTION_ICON: "menu-filter-option__icon",
    OPTION_LABEL: "menu-filter-option__label"
});

const MenuFilterAttributeName = Object.freeze({
    FILTER_VALUE: "data-filter-value",
    FILTER_TYPE: "data-filter-type"
});

const MenuFilterIcon = Object.freeze({
    CHECK: "✔"
});

const TextContent = Object.freeze({
    EMPTY: ""
});

const ToggleLabelSuffix = Object.freeze({
    COUNT_PREFIX: " (",
    COUNT_SUFFIX: ")"
});

function isFunction(candidate) {
    return typeof candidate === "function";
}

function isKeyboardEscape(keyValue) {
    return keyValue === KeyboardKey.ESCAPE || keyValue === KeyboardKey.ESC;
}

export class MenuFilterController {
    #documentReference;

    #menuPresenter;

    #controlElementIdMap;

    #attributeNameMap;

    #toggleElementsByType = new Map();

    #panelElementsByType = new Map();

    #listElementsByType = new Map();

    #clearButtonByType = new Map();

    #toggleBaseLabelByType = new Map();

    #currentlyOpenFilterType = null;

    #boundDocumentClickHandler = null;

    #boundDocumentKeydownHandler = null;

    constructor({
        documentReference = document,
        menuPresenter,
        controlElementIdMap = MenuElementId,
        attributeNameMap = AttributeName
    } = {}) {
        this.#documentReference = documentReference;
        this.#menuPresenter = menuPresenter;
        this.#controlElementIdMap = controlElementIdMap;
        this.#attributeNameMap = attributeNameMap;
    }

    initialize() {
        this.#cacheFilterElements();
        this.#wireFilterInteractions();
        this.#bindPresenterUpdates();
    }

    #cacheFilterElements() {
        const filterDescriptors = [
            Object.freeze({
                filterType: MenuFilterType.INGREDIENT,
                toggleId: this.#controlElementIdMap.INGREDIENT_FILTER_TOGGLE,
                panelId: this.#controlElementIdMap.INGREDIENT_FILTER_PANEL,
                listId: this.#controlElementIdMap.INGREDIENT_FILTER_LIST,
                clearButtonId: this.#controlElementIdMap.INGREDIENT_FILTER_CLEAR,
                ariaLabel: MenuFilterText.INGREDIENT_FILTER_ARIA_LABEL
            }),
            Object.freeze({
                filterType: MenuFilterType.CUISINE,
                toggleId: this.#controlElementIdMap.CUISINE_FILTER_TOGGLE,
                panelId: this.#controlElementIdMap.CUISINE_FILTER_PANEL,
                listId: this.#controlElementIdMap.CUISINE_FILTER_LIST,
                clearButtonId: this.#controlElementIdMap.CUISINE_FILTER_CLEAR,
                ariaLabel: MenuFilterText.CUISINE_FILTER_ARIA_LABEL
            })
        ];

        for (const descriptor of filterDescriptors) {
            const toggleElement = descriptor.toggleId
                ? this.#documentReference.getElementById(descriptor.toggleId)
                : null;
            const panelElement = descriptor.panelId
                ? this.#documentReference.getElementById(descriptor.panelId)
                : null;
            const listElement = descriptor.listId
                ? this.#documentReference.getElementById(descriptor.listId)
                : null;
            const clearButtonElement = descriptor.clearButtonId
                ? this.#documentReference.getElementById(descriptor.clearButtonId)
                : null;

            if (!toggleElement || !panelElement || !listElement) {
                continue;
            }

            const baseLabel = toggleElement.textContent
                ? toggleElement.textContent.trim()
                : MenuFilterText.FILTER_LABEL;

            toggleElement.setAttribute(
                this.#attributeNameMap.ARIA_LABEL,
                descriptor.ariaLabel
            );

            this.#toggleElementsByType.set(descriptor.filterType, toggleElement);
            this.#panelElementsByType.set(descriptor.filterType, panelElement);
            this.#listElementsByType.set(descriptor.filterType, listElement);
            this.#toggleBaseLabelByType.set(descriptor.filterType, baseLabel);

            if (clearButtonElement) {
                this.#clearButtonByType.set(descriptor.filterType, clearButtonElement);
            }
        }
    }

    #wireFilterInteractions() {
        for (const [filterType, toggleElement] of this.#toggleElementsByType.entries()) {
            toggleElement.addEventListener(BrowserEventName.CLICK, (eventObject) => {
                eventObject.preventDefault();
                this.#toggleFilterMenu(filterType);
            });
        }

        for (const [filterType, listElement] of this.#listElementsByType.entries()) {
            listElement.addEventListener(BrowserEventName.CLICK, (eventObject) => {
                const optionButton = eventObject.target instanceof Element
                    ? eventObject.target.closest(`.${MenuFilterClassName.OPTION}`)
                    : null;
                if (!optionButton) {
                    return;
                }
                const filterValue = optionButton.getAttribute(MenuFilterAttributeName.FILTER_VALUE);
                const optionFilterType = optionButton.getAttribute(MenuFilterAttributeName.FILTER_TYPE);
                if (!filterValue || optionFilterType !== filterType) {
                    return;
                }
                this.#handleFilterToggleRequest(filterType, filterValue);
            });
        }

        for (const [filterType, clearButton] of this.#clearButtonByType.entries()) {
            clearButton.addEventListener(BrowserEventName.CLICK, (eventObject) => {
                eventObject.preventDefault();
                this.#clearFilters(filterType);
            });
        }

        this.#boundDocumentClickHandler = (eventObject) => {
            const eventTarget = eventObject.target instanceof Element ? eventObject.target : null;
            if (!eventTarget) {
                return;
            }
            if (!this.#isEventWithinFilterInterface(eventTarget)) {
                this.#closeAllMenus();
            }
        };
        this.#boundDocumentKeydownHandler = (eventObject) => {
            if (!eventObject || !isKeyboardEscape(eventObject.key)) {
                return;
            }
            const openFilterType = this.#currentlyOpenFilterType;
            if (!openFilterType) {
                return;
            }
            this.#closeAllMenus();
            const toggleElement = this.#toggleElementsByType.get(openFilterType);
            if (toggleElement && isFunction(toggleElement.focus)) {
                toggleElement.focus();
            }
        };

        this.#documentReference.addEventListener(BrowserEventName.CLICK, this.#boundDocumentClickHandler);
        this.#documentReference.addEventListener(BrowserEventName.KEY_DOWN, this.#boundDocumentKeydownHandler);
    }

    #bindPresenterUpdates() {
        if (!this.#menuPresenter || !isFunction(this.#menuPresenter.bindFilterOptionsChangeHandler)) {
            return;
        }
        this.#menuPresenter.bindFilterOptionsChangeHandler((filterState) => {
            this.#applyFilterStateUpdate(filterState);
        });
    }

    #toggleFilterMenu(filterType) {
        if (!filterType) {
            return;
        }
        if (this.#currentlyOpenFilterType === filterType) {
            this.#closeAllMenus();
            return;
        }
        this.#openMenuForFilterType(filterType);
    }

    #openMenuForFilterType(filterType) {
        this.#closeAllMenus();

        const panelElement = this.#panelElementsByType.get(filterType);
        const toggleElement = this.#toggleElementsByType.get(filterType);
        if (!panelElement || !toggleElement) {
            return;
        }

        panelElement.hidden = false;
        panelElement.classList.add(MenuFilterClassName.PANEL_OPEN);
        toggleElement.setAttribute(this.#attributeNameMap.ARIA_EXPANDED, AttributeBooleanValue.TRUE);
        this.#currentlyOpenFilterType = filterType;
    }

    #closeAllMenus() {
        for (const panelElement of this.#panelElementsByType.values()) {
            panelElement.hidden = true;
            panelElement.classList.remove(MenuFilterClassName.PANEL_OPEN);
        }
        for (const toggleElement of this.#toggleElementsByType.values()) {
            toggleElement.setAttribute(this.#attributeNameMap.ARIA_EXPANDED, AttributeBooleanValue.FALSE);
        }
        this.#currentlyOpenFilterType = null;
    }

    #isEventWithinFilterInterface(targetElement) {
        for (const toggleElement of this.#toggleElementsByType.values()) {
            if (toggleElement && toggleElement.contains(targetElement)) {
                return true;
            }
        }
        for (const panelElement of this.#panelElementsByType.values()) {
            if (panelElement && panelElement.contains(targetElement)) {
                return true;
            }
        }
        return false;
    }

    #handleFilterToggleRequest(filterType, filterValue) {
        if (!this.#menuPresenter || !filterValue) {
            return;
        }
        if (filterType === MenuFilterType.INGREDIENT && isFunction(this.#menuPresenter.toggleIngredientFilter)) {
            this.#menuPresenter.toggleIngredientFilter(filterValue);
        }
        if (filterType === MenuFilterType.CUISINE && isFunction(this.#menuPresenter.toggleCuisineFilter)) {
            this.#menuPresenter.toggleCuisineFilter(filterValue);
        }
    }

    #clearFilters(filterType) {
        if (!this.#menuPresenter) {
            return;
        }
        if (filterType === MenuFilterType.INGREDIENT && isFunction(this.#menuPresenter.clearIngredientFilters)) {
            this.#menuPresenter.clearIngredientFilters();
        }
        if (filterType === MenuFilterType.CUISINE && isFunction(this.#menuPresenter.clearCuisineFilters)) {
            this.#menuPresenter.clearCuisineFilters();
        }
    }

    #applyFilterStateUpdate(filterState = {}) {
        const cuisineOptions = Array.isArray(filterState.cuisines) ? filterState.cuisines : [];
        const ingredientOptions = Array.isArray(filterState.ingredients) ? filterState.ingredients : [];
        const selectedCuisineValues = new Set(filterState.selectedCuisineValues || []);
        const selectedIngredientValues = new Set(filterState.selectedIngredientValues || []);

        this.#renderFilterOptions(MenuFilterType.CUISINE, cuisineOptions, selectedCuisineValues);
        this.#renderFilterOptions(MenuFilterType.INGREDIENT, ingredientOptions, selectedIngredientValues);

        this.#updateToggleSummary(MenuFilterType.CUISINE, selectedCuisineValues.size);
        this.#updateToggleSummary(MenuFilterType.INGREDIENT, selectedIngredientValues.size);

        this.#updateClearButtonState(MenuFilterType.CUISINE, selectedCuisineValues.size > 0);
        this.#updateClearButtonState(MenuFilterType.INGREDIENT, selectedIngredientValues.size > 0);
    }

    #renderFilterOptions(filterType, optionDescriptors, selectedValuesSet) {
        const listElement = this.#listElementsByType.get(filterType);
        if (!listElement) {
            return;
        }

        listElement.textContent = TextContent.EMPTY;

        for (const optionDescriptor of optionDescriptors) {
            if (!optionDescriptor || !optionDescriptor.value) {
                continue;
            }

            const optionButton = this.#documentReference.createElement("button");
            optionButton.type = "button";
            optionButton.className = MenuFilterClassName.OPTION;
            optionButton.setAttribute(MenuFilterAttributeName.FILTER_VALUE, optionDescriptor.value);
            optionButton.setAttribute(MenuFilterAttributeName.FILTER_TYPE, filterType);

            const isSelected = selectedValuesSet.has(optionDescriptor.value);
            optionButton.setAttribute(
                this.#attributeNameMap.ARIA_PRESSED,
                isSelected ? AttributeBooleanValue.TRUE : AttributeBooleanValue.FALSE
            );
            if (isSelected) {
                optionButton.classList.add(MenuFilterClassName.OPTION_SELECTED);
            }

            const iconSpan = this.#documentReference.createElement("span");
            iconSpan.className = MenuFilterClassName.OPTION_ICON;
            iconSpan.textContent = isSelected ? MenuFilterIcon.CHECK : TextContent.EMPTY;

            const labelSpan = this.#documentReference.createElement("span");
            labelSpan.className = MenuFilterClassName.OPTION_LABEL;
            labelSpan.textContent = optionDescriptor.label || optionDescriptor.value;

            optionButton.appendChild(iconSpan);
            optionButton.appendChild(labelSpan);

            listElement.appendChild(optionButton);
        }
    }

    #updateToggleSummary(filterType, selectedCount) {
        const toggleElement = this.#toggleElementsByType.get(filterType);
        if (!toggleElement) {
            return;
        }
        const baseLabel = this.#toggleBaseLabelByType.get(filterType) || MenuFilterText.FILTER_LABEL;
        const ariaLabel = filterType === MenuFilterType.CUISINE
            ? MenuFilterText.CUISINE_FILTER_ARIA_LABEL
            : MenuFilterText.INGREDIENT_FILTER_ARIA_LABEL;

        let renderedLabel = baseLabel;
        let renderedAriaLabel = ariaLabel;
        if (selectedCount > 0) {
            renderedLabel = `${baseLabel}${ToggleLabelSuffix.COUNT_PREFIX}${selectedCount}${ToggleLabelSuffix.COUNT_SUFFIX}`;
            renderedAriaLabel = `${ariaLabel}${ToggleLabelSuffix.COUNT_PREFIX}${selectedCount} selected${ToggleLabelSuffix.COUNT_SUFFIX}`;
        }

        toggleElement.textContent = renderedLabel;
        toggleElement.setAttribute(this.#attributeNameMap.ARIA_LABEL, renderedAriaLabel);
    }

    #updateClearButtonState(filterType, hasActiveSelections) {
        const clearButton = this.#clearButtonByType.get(filterType);
        if (!clearButton) {
            return;
        }
        clearButton.disabled = !hasActiveSelections;
        clearButton.setAttribute(
            this.#attributeNameMap.ARIA_DISABLED,
            hasActiveSelections ? AttributeBooleanValue.FALSE : AttributeBooleanValue.TRUE
        );
    }
}
