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
                export const state = { visible: false, effect: null, listener: null };
                export const useRef = () => ({ current: null });
                export const useState = () => [state.visible, (value) => { state.visible = value; }];
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
    let nodes = descendants(App());
    const findParentButton = () => nodes.find((node) => node.type === 'Pressable');
    const safeArea = nodes.find((node) => node.type === 'SafeAreaView');
    const gameIndex = safeArea.children.findIndex((node) => node?.props.source?.baseUrl === MobileLocation.GAME);
    const parentIndex = safeArea.children.findIndex((node) => descendants(node).some((item) => item.type === 'Pressable'));
    assert.ok(gameIndex >= 0 && parentIndex > gameIndex, 'Parent feedback must follow the game at the bottom of the safe area.');
    const parentBar = safeArea.children[parentIndex];
    assert.equal(parentBar.props.style.alignItems, 'flex-end', 'Parent feedback must align to the right edge.');
    assert.ok(findParentButton().children.some((node) => node.children.includes('Feedback')), 'The entry must use a neutral Feedback label.');
    assert.ok(findParentButton().props.style({ pressed: false })[0].minHeight >= 44);
    assert.equal(nodes.find((node) => node.type === 'Modal').props.visible, false);
    assert.equal(nodes.filter((node) => node.type === 'WebView' && node.props.source.baseUrl === MobileLocation.PARENTS).length, 0);
    findParentButton().props.onPress();
    nodes = descendants(App());
    assert.equal(nodes.find((node) => node.type === 'Modal').props.visible, true);
    assert.equal(nodes.filter((node) => node.type === 'WebView' && node.props.source.baseUrl === MobileLocation.PARENTS).length, 1);
    nodes.find((node) => node.type === 'Button' && node.props.title === MobileText.CLOSE).props.onPress();
    nodes = descendants(App());
    assert.equal(nodes.find((node) => node.type === 'Modal').props.visible, false);
    findParentButton().props.onPress();
    App();
    shellState.effect();
    shellState.listener('background');
    assert.equal(shellState.visible, false, 'Backgrounding must close parent feedback.');
    console.info('Native shell entry point passed bottom-right placement, parent open/close, and background closure.');
}
