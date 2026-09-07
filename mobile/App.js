// @ts-check
import React, { useRef, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View, Button, Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import game from './generated/game.json';
import parents from './generated/parents.json';
import analytics from './generated/analytics.json';
import { MobileText, MobileLocation } from './constants.js';
import { createLifecycleScript } from './lifecycle.js';

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#fff5e9' }, error: { padding: 24 }, analytics: { position: 'absolute', width: 1, height: 1, opacity: 0 } });

/** The native entry point contains the packaged game and respects device safe areas. */
export default function App() {
    const webView = useRef(null);
    const [parentsVisible, setParentsVisible] = useState(false);
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            webView.current?.injectJavaScript(createLifecycleScript(state));
            if (state !== 'active') setParentsVisible(false);
        });
        return () => subscription.remove();
    }, []);
    return React.createElement(SafeAreaProvider, null,
        React.createElement(View, { style: styles.analytics, pointerEvents: 'none', accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' },
            React.createElement(WebView, {
                source: { html: analytics.html, baseUrl: MobileLocation.ANALYTICS },
                originWhitelist: ['*'],
                onShouldStartLoadWithRequest: (request) => request.url === 'about:blank' || request.url === MobileLocation.ANALYTICS,
                javaScriptEnabled: true, domStorageEnabled: false, incognito: true,
                thirdPartyCookiesEnabled: false, allowFileAccess: false, setSupportMultipleWindows: false
            })),
        React.createElement(SafeAreaView, { style: styles.screen },
            React.createElement(Button, { title: MobileText.PARENTS, onPress: () => setParentsVisible(true) }),
            React.createElement(Modal, { visible: parentsVisible, presentationStyle: 'fullScreen', onRequestClose: () => setParentsVisible(false) },
                React.createElement(SafeAreaProvider, null,
                React.createElement(SafeAreaView, { style: styles.screen },
                    React.createElement(Button, { title: MobileText.CLOSE, onPress: () => setParentsVisible(false) }),
                    parentsVisible ? React.createElement(WebView, {
                        source: { html: parents.html, baseUrl: MobileLocation.PARENTS },
                        originWhitelist: ['*'],
                        onShouldStartLoadWithRequest: (request) => request.url === 'about:blank' || request.url === MobileLocation.PARENTS,
                        javaScriptEnabled: true, domStorageEnabled: false, incognito: true,
                        thirdPartyCookiesEnabled: false,
                        allowFileAccess: false, setSupportMultipleWindows: false, style: styles.screen
                    }) : null))),
            React.createElement(WebView, {
                ref: webView,
                source: { html: game.html, baseUrl: MobileLocation.GAME },
                originWhitelist: ['*'],
                onShouldStartLoadWithRequest: (request) => request.url === 'about:blank' || request.url === MobileLocation.GAME,
                javaScriptEnabled: true,
                domStorageEnabled: true,
                allowsInlineMediaPlayback: true,
                mediaPlaybackRequiresUserAction: false,
                setSupportMultipleWindows: false,
                allowFileAccess: false,
                style: styles.screen,
                renderError: () => React.createElement(View, { style: styles.error }, React.createElement(Text, { accessibilityRole: 'alert' }, MobileText.LOAD_ERROR))
            })));
}
