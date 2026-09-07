// @ts-check
import { StorePlatform, StoreText } from '../constants.js';

/** Validate the publication catalog once, before any URL reaches a link. */
export function validateStoreCatalog(value) {
    const platforms = Object.values(StorePlatform);
    if (!value || Array.isArray(value) || typeof value !== 'object'
        || Object.keys(value).length !== platforms.length
        || platforms.some((platform) => !Object.prototype.hasOwnProperty.call(value, platform))) throw new Error(StoreText.INVALID);
    return Object.freeze(Object.fromEntries(platforms.map((platform) => {
        const rawUrl = value[platform];
        if (rawUrl === null) return [platform, null];
        if (typeof rawUrl !== 'string') throw new Error(StoreText.INVALID);
        const url = new URL(rawUrl);
        const validDestination = platform === StorePlatform.ANDROID
            ? url.hostname === 'play.google.com' && url.pathname === '/store/apps/details' && url.searchParams.get('id') === 'com.mprlab.allergywheel'
            : url.hostname === 'apps.apple.com' && /\/id\d+$/.test(url.pathname);
        if (url.protocol !== 'https:' || url.username || url.password || url.port || !validDestination) throw new Error(StoreText.INVALID);
        return [platform, url.href];
    })));
}

/** Order available links using browser device information, including iPad desktop mode. */
export function orderStoreLinks(catalog, { userAgent, platform, maxTouchPoints }) {
    const preferredPlatform = /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
        ? StorePlatform.IOS : StorePlatform.ANDROID;
    return [preferredPlatform, ...Object.values(StorePlatform).filter((entry) => entry !== preferredPlatform)]
        .filter((entry) => catalog[entry] !== null)
        .map((entry) => ({ platform: entry, url: catalog[entry] }));
}
