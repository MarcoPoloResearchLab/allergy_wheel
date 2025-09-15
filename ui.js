/* global document */

// Render single-select radios for allergens with shape { token, label }.
// Invokes onSelect(selectedToken, selectedLabel)
export function renderAllergenList(containerElement, allergenList, onSelect) {
    containerElement.innerHTML = "";
    const radioGroupName = "allergen_single";

    for (const allergenItem of allergenList) {
        const allergenToken = allergenItem.token;
        const allergenLabel = allergenItem.label || allergenToken;

        const labelElement = document.createElement("label");
        labelElement.className = "chip";

        const radioElement = document.createElement("input");
        radioElement.type = "radio";
        radioElement.name = radioGroupName;
        radioElement.value = allergenToken;

        radioElement.addEventListener("change", () => {
            if (typeof onSelect === "function") onSelect(allergenToken, allergenLabel);
        });

        labelElement.appendChild(radioElement);
        labelElement.appendChild(document.createTextNode(` ${allergenLabel}`));
        containerElement.appendChild(labelElement);
    }
}
