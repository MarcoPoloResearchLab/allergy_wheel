// @ts-check
import { ParentText } from '../constants.js';

/** Show the mobile data contract without starting external services. */
export function renderPrivacyInformation(main) {
    const title = document.createElement('h1');
    title.textContent = ParentText.PRIVACY_TITLE;
    const privacy = document.createElement('p');
    privacy.id = 'privacy-text';
    privacy.textContent = ParentText.PRIVACY;
    main.append(title, privacy);
}

/** Keep detailed privacy information available without crowding the feedback screen. */
export function renderPrivacyDetails(main) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = ParentText.PRIVACY_TITLE;
    const privacy = document.createElement('p');
    privacy.id = 'privacy-text';
    privacy.textContent = ParentText.PRIVACY;
    details.append(summary, privacy);
    main.append(details);
}
