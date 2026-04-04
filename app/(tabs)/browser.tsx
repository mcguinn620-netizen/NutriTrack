import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/theme';

const NET_NUTRITION_URL = 'http://netnutrition.bsu.edu/NetNutrition/1';

export default function BrowserTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(NET_NUTRITION_URL);

  const openExternalBrowser = async () => {
    console.log('[BrowserTab] Opening external browser:', currentUrl);
    await WebBrowser.openBrowserAsync(currentUrl);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>NetNutrition Browser</Text>
        <Text numberOfLines={1} style={[styles.urlText, { color: colors.textSecondary }]}>
          {currentUrl}
        </Text>
      </View>

      <View style={[styles.controls, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}
        >
          <MaterialIcons
            name="arrow-back"
            size={22}
            color={canGoBack ? colors.text : colors.textLight}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
          onPress={() => webViewRef.current?.goForward()}
          disabled={!canGoForward}
        >
          <MaterialIcons
            name="arrow-forward"
            size={22}
            color={canGoForward ? colors.text : colors.textLight}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
          onPress={() => webViewRef.current?.reload()}
        >
          <MaterialIcons name="refresh" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
          onPress={openExternalBrowser}
        >
          <MaterialIcons name="open-in-new" size={22} color={colors.text} />
        </Pressable>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: NET_NUTRITION_URL }}
        startInLoadingState
        onNavigationStateChange={(state) => {
          setCanGoBack(state.canGoBack);
          setCanGoForward(state.canGoForward);
          setCurrentUrl(state.url);
          console.log('[BrowserTab] Navigation:', {
            url: state.url,
            canGoBack: state.canGoBack,
            canGoForward: state.canGoForward,
            title: state.title,
          });
        }}
        onError={(event) => {
          console.error('[BrowserTab] WebView error:', event.nativeEvent);
        }}
        onHttpError={(event) => {
          console.error('[BrowserTab] HTTP error:', event.nativeEvent);
        }}
        onLoadEnd={() => {
          console.log('[BrowserTab] Page load complete:', currentUrl);
        }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.h3,
    marginBottom: 4,
  },
  urlText: {
    ...typography.bodySmall,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    gap: 8,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnPressed: {
    opacity: 0.6,
  },
});
