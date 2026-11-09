// @ts-check
import React, { useRef, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View, Modal, Pressable } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import game from './generated/game.json';
import parents from './generated/parents.json';
import analytics from './generated/analytics.json';
import { MobileText, MobileLocation } from './constants.js';
import { createLifecycleScript } from './lifecycle.js';

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#fffbef' },
    error: { padding: 24 },
    analytics: { position: 'absolute', width: 1, height: 1, opacity: 0 },
    parentBar: { alignItems: 'flex-end', paddingHorizontal: 16, backgroundColor: '#fffbef' },
    parentButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12 },
    parentButtonPressed: { backgroundColor: '#f5e8dc' },
    parentLabel: { color: '#64574e', fontSize: 12, fontWeight: '600' },
    returnBar: { alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: '#fffbef' },
    returnButton: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 3,
        borderColor: '#111',
        borderRadius: 999,
        backgroundColor: '#fff7c8',
        shadowColor: '#111',
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3
    },
    returnButtonPressed: {
        backgroundColor: '#ffe7ee',
        transform: [{ translateX: 2 }, { translateY: 2 }],
        shadowOffset: { width: 1, height: 2 },
        elevation: 1
    },
    returnArrow: { color: '#111', fontSize: 24, fontWeight: '900', lineHeight: 24 },
    returnLabel: { color: '#111', fontSize: 16, fontWeight: '800' }
});

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
            React.createElement(Modal, { visible: parentsVisible, presentationStyle: 'fullScreen', onRequestClose: () => setParentsVisible(false) },
                React.createElement(SafeAreaProvider, null,
                React.createElement(SafeAreaView, { style: styles.screen },
                    React.createElement(View, { style: styles.returnBar },
                        React.createElement(Pressable, {
                            accessibilityRole: 'button',
                            accessibilityLabel: MobileText.CLOSE,
                            onPress: () => setParentsVisible(false),
                            style: ({ pressed }) => [styles.returnButton, pressed && styles.returnButtonPressed]
                        },
                        React.createElement(Text, { accessible: false, importantForAccessibility: 'no', style: styles.returnArrow }, MobileText.BACK_ARROW),
                        React.createElement(Text, { style: styles.returnLabel }, MobileText.CLOSE))),
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
            }),
            React.createElement(View, { style: styles.parentBar },
                React.createElement(Pressable, {
                    accessibilityRole: 'button',
                    onPress: () => setParentsVisible(true),
                    style: ({ pressed }) => [styles.parentButton, pressed && styles.parentButtonPressed]
                }, React.createElement(Text, { style: styles.parentLabel }, MobileText.FEEDBACK)))));
}
