// @ts-check
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { MobileText, MobileLocation } from '../mobile/constants.js';

/** Exercise the real App entry point with controlled native rendering and hooks. */
export async function runMobileShellFlow() {
    const result = await build({
        entryPoints: ['mobile/App.js'], bundle: true, write: false, platform: 'node', format: 'esm',
        plugins: [{ name: 'native-boundary', setup(builder) {
            builder.onResolve({ filter: /^(react|react-native|react-native-safe-area-context|react-native-webview)$/ },
                (args) => ({ path: args.path, namespace: 'native-boundary' }));
            builder.onLoad({ filter: /.*/, namespace: 'native-boundary' }, (args) => ({ contents: args.path === 'react' ? `
                export const state = { values: [], cursor: 0, effect: null, listener: null };
                export const useRef = () => ({ current: null });
                export const useState = (initial) => {
                    const index = state.cursor++;
                    if (!(index in state.values)) state.values[index] = initial;
                    return [state.values[index], (value) => {
                        state.values[index] = typeof value === 'function' ? value(state.values[index]) : value;
                    }];
                };
                export const useEffect = (callback) => { state.effect = callback; };
                export default { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) };
            ` : `
                import { state } from 'react';
                export const AppState = { addEventListener: (event, callback) => { state.listener = callback; return { remove() {} }; } };
                export const StyleSheet = { create: (styles) => styles };
                export const Text = 'Text', View = 'View', Button = 'Button', Modal = 'Modal', Pressable = 'Pressable';
                export const SafeAreaProvider = 'SafeAreaProvider', SafeAreaView = 'SafeAreaView', WebView = 'WebView';
            ` }));
        } }],
        footer: { js: 'export { state as shellState };' }
    });
    const { default: App, shellState } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
    const descendants = (node) => node && typeof node === 'object'
        ? [node, ...node.children.flatMap(descendants)] : [];
    const renderApp = () => { shellState.cursor = 0; return App(); };
    let nodes = descendants(renderApp());
    const findParentButton = () => nodes.find((node) => node.type === 'Pressable'
        && descendants(node).some((child) => child.type === 'Text' && child.children.includes(MobileText.FEEDBACK)));
    const findGame = () => nodes.find((node) => node.type === 'WebView' && node.props.source.baseUrl === MobileLocation.GAME);
    const originalGameKey = findGame().props.key;
    const safeArea = nodes.find((node) => node.type === 'SafeAreaView');
    const gameIndex = safeArea.children.findIndex((node) => node?.props.source?.baseUrl === MobileLocation.GAME);
    const parentIndex = safeArea.children.findIndex((node) => descendants(node).includes(findParentButton()));
    assert.ok(gameIndex >= 0 && parentIndex > gameIndex, 'Parent feedback must follow the game at the bottom of the safe area.');
    const parentBar = safeArea.children[parentIndex];
    assert.equal(parentBar.props.style.alignItems, 'flex-end', 'Parent feedback must align to the right edge.');
    assert.ok(findParentButton().children.some((node) => node.children.includes('Feedback')), 'The entry must use a neutral Feedback label.');
    assert.ok(findParentButton().props.style({ pressed: false })[0].minHeight >= 44);
    assert.equal(nodes.find((node) => node.type === 'Modal').props.visible, false);
    assert.equal(nodes.filter((node) => node.type === 'WebView' && node.props.source.baseUrl === MobileLocation.PARENTS).length, 0);
    findParentButton().props.onPress();
    nodes = descendants(renderApp());
    assert.equal(nodes.find((node) => node.type === 'Modal').props.visible, true);
    assert.equal(nodes.filter((node) => node.type === 'WebView' && node.props.source.baseUrl === MobileLocation.PARENTS).length, 1);
    const returnButton = nodes.find((node) => node.type === 'Pressable' && node.props.accessibilityLabel === MobileText.CLOSE);
    assert.ok(returnButton, 'Feedback must provide a styled Return to game button.');
    assert.equal(returnButton.props.accessibilityRole, 'button');
    const returnStyle = Object.assign({}, ...returnButton.props.style({ pressed: false }));
    assert.ok(returnStyle.minHeight >= 44, 'Return to game must support touch input.');
    assert.equal(returnStyle.borderColor, '#111');
    assert.ok(returnStyle.borderWidth >= 2, 'The return pill must have the game’s bold outline.');
    assert.equal(returnStyle.backgroundColor, '#fff7c8');
    assert.ok(returnStyle.borderRadius >= returnStyle.minHeight / 2);
    assert.ok(returnStyle.shadowOffset.width > 0 && returnStyle.shadowOffset.height > 0);
    assert.equal(returnStyle.shadowOpacity, 1);
    const returnBar = nodes.find((node) => node.type === 'View' && node.children.includes(returnButton));
    assert.equal(returnBar.props.style.alignItems, 'flex-start', 'The return pill must align to the left edge.');
    const returnArrow = returnButton.children.find((node) => node.props.accessible === false);
    assert.ok(returnArrow && returnArrow.children.includes('←'), 'The return pill must show a decorative back arrow.');
    const modalText = descendants(nodes.find((node) => node.type === 'Modal'))
        .filter((node) => node.type === 'Text').flatMap((node) => node.children);
    assert.deepEqual(modalText, ['←', MobileText.CLOSE], 'The native bar must not duplicate the document heading.');
    returnButton.props.onPress();
    nodes = descendants(renderApp());
    assert.equal(nodes.find((node) => node.type === 'Modal').props.visible, false);
    assert.equal(findGame().props.key, originalGameKey, 'A normal Feedback round trip must preserve the game.');
    for (const scenario of [
        { name: 'iOS termination', callback: 'onContentProcessDidTerminate', event: { nativeEvent: {} } },
        { name: 'Android crash', callback: 'onRenderProcessGone', event: { nativeEvent: { didCrash: true } } },
        { name: 'Android system kill', callback: 'onRenderProcessGone', event: { nativeEvent: { didCrash: false } } }
    ]) {
        for (const feedbackVisible of [false, true]) {
            if (feedbackVisible) findParentButton().props.onPress();
            nodes = descendants(renderApp());
            const terminatedGame = findGame();
            assert.equal(typeof terminatedGame.props[scenario.callback], 'function', `The game must recover from ${scenario.name}.`);
            terminatedGame.props[scenario.callback](scenario.event);
            nodes = descendants(renderApp());
            assert.notEqual(findGame().props.key, terminatedGame.props.key, 'A terminated game must mount a new WebView.');
            assert.equal(findGame().props.source.html, terminatedGame.props.source.html, 'Recovery must use the packaged offline game.');
            assert.equal(nodes.find((node) => node.type === 'Modal').props.visible, feedbackVisible);
            if (feedbackVisible) {
                nodes.find((node) => node.type === 'Pressable' && node.props.accessibilityLabel === MobileText.CLOSE).props.onPress();
                nodes = descendants(renderApp());
                assert.equal(nodes.find((node) => node.type === 'Modal').props.visible, false);
            }
        }
    }
    findParentButton().props.onPress();
    renderApp();
    shellState.effect();
    shellState.listener('background');
    nodes = descendants(renderApp());
    assert.equal(nodes.find((node) => node.type === 'Modal').props.visible, false, 'Backgrounding must close parent feedback.');
    console.info('Native shell entry point passed Feedback placement, open/close, background closure, and shared iOS/Android game renderer recovery.');
}
