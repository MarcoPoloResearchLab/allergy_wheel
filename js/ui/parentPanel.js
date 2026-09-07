// @ts-check
import { ParentText, FeedbackConfiguration } from '../constants.js';

/** Start a script request and retain its element for initialization cleanup. */
function startParentScript(url) {
    const element = document.createElement('script');
    element.src = url;
    const loaded = new Promise((resolveLoad, rejectLoad) => {
        element.onload = () => resolveLoad();
        element.onerror = () => { element.remove(); rejectLoad(new Error(ParentText.UNAVAILABLE)); };
        document.head.append(element);
    });
    return { element, loaded };
}

/** Load a parent-selected script and expose download failures. */
export function loadParentScript(url) {
    return startParentScript(url).loaded;
}

/** Confirm the provider created its launcher and feedback form. */
function feedbackControlsExist() {
    const bubble = document.getElementById(FeedbackConfiguration.BUBBLE_ID);
    const panel = document.getElementById(FeedbackConfiguration.PANEL_ID);
    const contact = document.getElementById(FeedbackConfiguration.CONTACT_ID);
    return Boolean(bubble && panel && contact && panel.contains(contact));
}

/** Wait for usable LoopAware controls, including its asynchronous configuration request. */
export function loadParentFeedback(url) {
    if (feedbackControlsExist()) return Promise.resolve();
    return new Promise((resolveReady, rejectReady) => {
        let scriptLoaded = false;
        let settled = false;
        const observer = new MutationObserver(handleWidgetMutation);
        const timer = window.setTimeout(() => finish(new Error(ParentText.UNAVAILABLE)), FeedbackConfiguration.INITIALIZATION_TIMEOUT_MS);
        observer.observe(document.body, { childList: true, subtree: true });
        const request = startParentScript(url);
        request.loaded.then(() => {
            scriptLoaded = true;
            handleWidgetMutation();
        }, finish);

        function handleWidgetMutation() {
            if (scriptLoaded && feedbackControlsExist()) finish();
        }

        function finish(error) {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            observer.disconnect();
            if (error) {
                request.element.remove();
                // A render error can leave a launcher without a usable panel.
                if (!feedbackControlsExist()) {
                    document.getElementById(FeedbackConfiguration.BUBBLE_ID)?.remove();
                    document.getElementById(FeedbackConfiguration.PANEL_ID)?.remove();
                }
                rejectReady(error);
            } else {
                resolveReady();
            }
        }
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
            status.textContent = ParentText.LOADING;
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
