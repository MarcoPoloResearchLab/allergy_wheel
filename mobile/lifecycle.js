// @ts-check
import { LifecycleEvent, LifecycleState } from '../js/constants.js';

/** Serialize only supported app states across the native-to-game boundary. */
export function createLifecycleScript(state) {
    if (!Object.values(LifecycleState).includes(state)) throw new Error('Invalid native lifecycle state.');
    return `document.dispatchEvent(new CustomEvent(${JSON.stringify(LifecycleEvent)},{detail:${JSON.stringify(state)}}));true;`;
}
