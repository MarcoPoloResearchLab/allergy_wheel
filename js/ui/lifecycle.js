// @ts-check
import { LifecycleEvent, LifecycleState } from '../constants.js';

/** Connect validated native lifecycle events to the public audio commands. */
export function bindMobileLifecycle({ suspendAudio, resumeAudio, reportError }) {
    document.addEventListener(LifecycleEvent, (event) => {
        if (!Object.values(LifecycleState).includes(event.detail)) {
            reportError(LifecycleEvent, new Error('Invalid native lifecycle state.'));
            return;
        }
        const operation = event.detail === LifecycleState.ACTIVE ? resumeAudio : suspendAudio;
        operation().catch((error) => reportError(LifecycleEvent, error));
    });
}
