// @ts-check
import { StoreConfiguration, StorePlatform, StoreText } from '../constants.js';

/** Render validated store destinations without a placeholder download action. */
export function renderStoreLinks(links, documentReference = document) {
    const section = documentReference.createElement('aside');
    section.id = StoreConfiguration.ELEMENT_ID;
    section.hidden = links.length === 0;
    const heading = documentReference.createElement('h2');
    heading.textContent = StoreText.TITLE;
    section.append(heading);
    for (const entry of links) {
        const link = documentReference.createElement('a');
        link.href = entry.url;
        link.dataset.platform = entry.platform;
        link.textContent = entry.platform === StorePlatform.IOS ? StoreText.IOS : StoreText.ANDROID;
        section.append(link);
    }
    const privacy = documentReference.createElement('a');
    privacy.href = StoreText.PRIVACY_PATH;
    privacy.textContent = StoreText.PRIVACY;
    const footer = documentReference.createElement('footer');
    footer.append(privacy);
    requestAnimationFrame(() => documentReference.body.append(section, footer));
}
