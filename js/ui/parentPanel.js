// @ts-check
import { ParentText, FeedbackConfiguration } from '../constants.js';

import { startExternalScript } from './externalResources.js';

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
        const request = startExternalScript(url);
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

/** Open usable provider controls without toggling an existing open panel closed. */
function openFeedbackPanel() {
    const bubble = document.getElementById(FeedbackConfiguration.BUBBLE_ID);
    const panel = document.getElementById(FeedbackConfiguration.PANEL_ID);
    if (!bubble || !panel) throw new Error(ParentText.UNAVAILABLE);
    if (panel.style.display === 'none') bubble.click();
}

/** Render feedback access and the explicit adult agreement in its separate document. */
export function renderParentPanel(gateway) {
    const main = document.querySelector('main');
    const card = document.createElement('section');
    card.className = 'feedback-card';
    card.setAttribute('aria-labelledby', 'feedback-title');
    const header = document.createElement('header');
    header.className = 'feedback-heading';
    const sticker = document.createElement('span');
    sticker.className = 'feedback-sticker';
    sticker.setAttribute('aria-hidden', 'true');
    sticker.textContent = ParentText.STICKER;
    const title = document.createElement('h1');
    title.id = 'feedback-title';
    title.textContent = ParentText.TITLE;
    header.append(sticker, title);
    const introduction = document.createElement('p');
    introduction.className = 'feedback-introduction';
    introduction.textContent = ParentText.INTRODUCTION;
    card.append(header, introduction);

    const form = document.createElement('form');
    form.className = 'feedback-gate';
    const gateTitle = document.createElement('h2');
    gateTitle.textContent = ParentText.GATE_TITLE;
    const explanation = document.createElement('p');
    explanation.className = 'feedback-description';
    explanation.textContent = ParentText.GATE_DESCRIPTION;
    const firstFactor = 12 + Math.floor(Math.random() * 8);
    const secondFactor = 6 + Math.floor(Math.random() * 4);
    const question = document.createElement('p');
    question.id = 'parent-question';
    question.className = 'feedback-equation';
    question.textContent = `${firstFactor} ${ParentText.MULTIPLY} ${secondFactor} ${ParentText.EQUATION_END}`;
    const label = document.createElement('label');
    label.className = 'feedback-answer-label';
    label.textContent = ParentText.ANSWER;
    const answer = document.createElement('input');
    answer.inputMode = 'numeric';
    answer.autocomplete = 'off';
    answer.enterKeyHint = 'done';
    answer.placeholder = ParentText.ANSWER_PLACEHOLDER;
    answer.setAttribute('aria-describedby', 'parent-question parent-error');
    label.append(answer);
    const error = document.createElement('p');
    error.id = 'parent-error';
    error.className = 'feedback-error';
    error.hidden = true;
    error.setAttribute('role', 'alert');
    const submit = document.createElement('button');
    submit.className = 'feedback-primary';
    submit.textContent = ParentText.CONTINUE;
    submit.disabled = true;
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = ParentText.NEXT_ICON;
    submit.append(arrow);
    answer.addEventListener('input', () => {
        submit.disabled = answer.value.trim() === '';
        answer.removeAttribute('aria-invalid');
        error.hidden = true;
    });
    const status = document.createElement('p');
    status.className = 'feedback-status';
    status.setAttribute('role', 'status');
    const actions = document.createElement('section');
    actions.className = 'feedback-actions';
    actions.hidden = true;
    const agreementTitle = document.createElement('h2');
    agreementTitle.textContent = ParentText.AGREEMENT_TITLE;
    const consent = document.createElement('p');
    consent.className = 'feedback-description';
    consent.textContent = ParentText.CONSENT;
    actions.append(agreementTitle, consent);
    const feedbackButton = document.createElement('button');
    feedbackButton.type = 'button';
    feedbackButton.className = 'feedback-primary';
    feedbackButton.textContent = ParentText.FEEDBACK;
    feedbackButton.disabled = true;
    const agreementLabel = document.createElement('label');
    agreementLabel.className = 'feedback-agreement';
    const agreement = document.createElement('input');
    agreement.type = 'checkbox';
    const agreementText = document.createElement('span');
    agreementText.textContent = ParentText.AGREEMENT;
    agreementLabel.append(agreement, agreementText);
    agreement.addEventListener('change', () => { feedbackButton.disabled = !agreement.checked; });
    actions.append(agreementLabel);
    feedbackButton.addEventListener('click', async () => {
        if (!agreement.checked) return;
        feedbackButton.disabled = true;
        agreement.disabled = true;
        status.textContent = ParentText.LOADING;
        try {
            await gateway.openFeedback();
            openFeedbackPanel();
            status.textContent = ParentText.READY;
            feedbackButton.disabled = false;
        } catch {
            status.textContent = ParentText.UNAVAILABLE;
            agreement.disabled = false;
            feedbackButton.disabled = !agreement.checked;
        }
    });
    actions.append(feedbackButton);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (Number(answer.value) !== firstFactor * secondFactor) {
            error.textContent = ParentText.INCORRECT;
            error.hidden = false;
            answer.setAttribute('aria-invalid', 'true');
            answer.focus();
            return;
        }
        form.hidden = true;
        actions.hidden = false;
        status.textContent = '';
        agreement.focus();
    });
    form.append(gateTitle, explanation, question, label, error, submit);
    card.append(form, actions, status);
    main.append(card);
}
