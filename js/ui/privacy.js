// @ts-check
import { ParentText } from '../constants.js';

/** Show the mobile data contract without starting external services. */
export function renderPrivacyInformation(main) {
    const title = document.createElement('h1');
    title.textContent = ParentText.TITLE;
    const privacy = document.createElement('p');
    privacy.id = 'privacy-text';
    privacy.textContent = ParentText.PRIVACY;
    main.append(title, privacy);
}
