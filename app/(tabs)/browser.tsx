import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/theme';

const NET_NUTRITION_URL = 'http://netnutrition.bsu.edu/NetNutrition/1#';

export default function BrowserTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(NET_NUTRITION_URL);

  const [items, setItems] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    loadFavorites();
    loadCache();
  }, []);

  const loadFavorites = async () => {
    const data = await AsyncStorage.getItem('favorites');
    if (data) setFavorites(JSON.parse(data));
  };

  const saveFavorites = async (favList: any[]) => {
    setFavorites(favList);
    await AsyncStorage.setItem('favorites', JSON.stringify(favList));
  };

  const toggleFavorite = (item: any) => {
    const exists = favorites.find((f) => f.name === item.name);
    let updated;

    if (exists) {
      updated = favorites.filter((f) => f.name !== item.name);
    } else {
      updated = [...favorites, item];
    }

    saveFavorites(updated);
  };

  const saveCache = async (data: any[]) => {
    await AsyncStorage.setItem('menu_cache', JSON.stringify(data));
  };

  const loadCache = async () => {
    const data = await AsyncStorage.getItem('menu_cache');
    if (data) setItems(JSON.parse(data));
  };

  const onMessage = (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);

      if (parsed.type === 'ITEMS') {
        setItems(parsed.items);
        saveCache(parsed.items);
      }
    } catch (e) {
      console.log('Parse error', e);
    }
  };

  const injectedJS = `
    (function() {

      function extractItems() {
        const items = [];

        const containers =
          document.querySelectorAll('#itemPanel, #menuPanel, #coursesPanel');

        containers.forEach(container => {
          const nodes = container.querySelectorAll('a, div, span');

          nodes.forEach(el => {
            const text = el.innerText?.trim();

            if (!text) return;
            if (text.length < 3) return;

            items.push({
              name: text,
              hasNutrition: !!el.querySelector('[class*="nutr"], [alt*="nutrition"]')
            });
          });
        });

        const unique = Array.from(
          new Map(items.map(i => [i.name, i])).values()
        );

        return unique.slice(0, 100);
      }

      function sendItems() {
        const items = extractItems();

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ITEMS',
          items
        }));
      }

      const observer = new MutationObserver(() => {
        sendItems();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(sendItems, 1500);

    })();
  `;

  const openExternalBrowser = async () => {
    await WebBrowser.openBrowserAsync(currentUrl);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>NetNutrition Browser</Text>
        <Text numberOfLines={1} style={[styles.urlText, { color: colors.textSecondary }]}>
          {currentUrl}
        </Text>
      </View>

      {/* CONTROLS */}
      <View style={[styles.controls, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => webViewRef.current?.goBack()} disabled={!canGoBack}>
          <MaterialIcons name="arrow-back" size={22} color={canGoBack ? colors.text : colors.textLight} />
        </Pressable>
        <Pressable onPress={() => webViewRef.current?.goForward()} disabled={!canGoForward}>
          <MaterialIcons name="arrow-forward" size={22} color={canGoForward ? colors.text : colors.textLight} />
        </Pressable>
        <Pressable onPress={() => webViewRef.current?.reload()}>
          <MaterialIcons name="refresh" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={openExternalBrowser}>
          <MaterialIcons name="open-in-new" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* WEBVIEW */}
      <WebView
        ref={webViewRef}
        source={{ uri: NET_NUTRITION_URL }}
        injectedJavaScript={injectedJS}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onNavigationStateChange={(state) => {
          setCanGoBack(state.canGoBack);
          setCanGoForward(state.canGoForward);
          setCurrentUrl(state.url);
        }}
      />

      {/* OVERLAY MENU UI */}
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <Text style={{ padding: 10, fontWeight: 'bold', color: colors.text }}>
          Menu Items
        </Text>

        <FlatList
          data={items}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => {
            const isFav = favorites.some(f => f.name === item.name);

            return (
              <Pressable
                onPress={() => toggleFavorite(item)}
                style={{ padding: 10, borderBottomWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.text }}>
                  {item.name} {isFav ? '⭐' : ''}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    gap: 12,
  },
});