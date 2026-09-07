// @ts-check
import { ParentText } from '../constants.js';

/** Load a parent-selected external resource and expose connection failures. */
export function loadParentScript(url) {
    return new Promise((resolveLoad, rejectLoad) => {
        const element = document.createElement('script');
        element.src = url;
        element.onload = () => resolveLoad();
        element.onerror = () => { element.remove(); rejectLoad(new Error(ParentText.UNAVAILABLE)); };
        document.head.append(element);
    });
}

/** Load the optional font stylesheet after an adult selects it. */
export function loadParentStylesheet(url) {
    return new Promise((resolveLoad, rejectLoad) => {
        const element = document.createElement('link');
        element.rel = 'stylesheet';
        element.href = url;
        element.onload = () => resolveLoad();
        element.onerror = () => { element.remove(); rejectLoad(new Error(ParentText.UNAVAILABLE)); };
        document.head.append(element);
    });
}

/** Render a parent gate and service actions in the separate parent document. */
export function renderParentPanel(gateway) {
    const main = document.querySelector('main');
    const form = document.createElement('form');
    const firstFactor = 12 + Math.floor(Math.random() * 8);
    const secondFactor = 6 + Math.floor(Math.random() * 4);
    const question = document.createElement('p');
    question.id = 'parent-question';
    question.textContent = `${ParentText.QUESTION} ${firstFactor} × ${secondFactor}.`;
    const label = document.createElement('label');
    label.textContent = ParentText.ANSWER;
    const answer = document.createElement('input');
    answer.inputMode = 'numeric';
    answer.autocomplete = 'off';
    label.append(answer);
    const submit = document.createElement('button');
    submit.textContent = ParentText.CONTINUE;
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const actions = document.createElement('section');
    actions.hidden = true;
    const consent = document.createElement('p');
    consent.textContent = ParentText.CONSENT;
    actions.append(consent);
    for (const [text, action] of [[ParentText.ANALYTICS, gateway.enableAnalytics], [ParentText.FEEDBACK, gateway.openFeedback], [ParentText.FONTS, gateway.loadFonts]]) {
        const button = document.createElement('button');
        button.textContent = text;
        button.addEventListener('click', async () => {
            button.disabled = true;
            try { await action(); status.textContent = ParentText.READY; }
            catch { status.textContent = ParentText.UNAVAILABLE; button.disabled = false; }
        });
        actions.append(button);
    }
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (Number(answer.value) !== firstFactor * secondFactor) { status.textContent = ParentText.INCORRECT; return; }
        form.hidden = true;
        actions.hidden = false;
        status.textContent = '';
        actions.querySelector('button').focus();
    });
    form.append(question, label, submit);
    main.append(form, actions, status);
}
