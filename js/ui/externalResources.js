// @ts-check
import { ParentText } from '../constants.js';

/** Start a script request and retain its element for initialization cleanup. */
export function startExternalScript(url) {
    const element = document.createElement('script');
    element.src = url;
    const loaded = new Promise((resolveLoad, rejectLoad) => {
        element.onload = () => resolveLoad();
        element.onerror = () => { element.remove(); rejectLoad(new Error(ParentText.UNAVAILABLE)); };
        document.head.append(element);
    });
    return { element, loaded };
}

/** Load a external script and expose download failures. */
export function loadExternalScript(url) {
    return startExternalScript(url).loaded;
}
