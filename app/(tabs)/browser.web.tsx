import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography } from '@/constants/theme';

const SUPABASE_DASHBOARD_URL = 'https://supabase.com/dashboard';

export default function BrowserTabWeb() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const openExternalBrowser = async () => {
    console.log('[BrowserTab] Opening external browser:', SUPABASE_DASHBOARD_URL);
    await Linking.openURL(SUPABASE_DASHBOARD_URL);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}> 
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
        <Text style={[styles.title, { color: colors.text }]}>Supabase Browser</Text>
        <Text numberOfLines={1} style={[styles.urlText, { color: colors.textSecondary }]}>
          {SUPABASE_DASHBOARD_URL}
        </Text>
      </View>

      <View style={[styles.controls, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
        <Pressable style={styles.controlBtn} disabled>
          <MaterialIcons name="arrow-back" size={22} color={colors.textLight} />
        </Pressable>
        <Pressable style={styles.controlBtn} disabled>
          <MaterialIcons name="arrow-forward" size={22} color={colors.textLight} />
        </Pressable>
        <Pressable style={styles.controlBtn} disabled>
          <MaterialIcons name="refresh" size={22} color={colors.textLight} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
          onPress={openExternalBrowser}
        >
          <MaterialIcons name="open-in-new" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.webFallback}>
        <Text style={[styles.webFallbackTitle, { color: colors.text }]}>In-app browsing is unavailable on web.</Text>
        <Text style={[styles.webFallbackBody, { color: colors.textSecondary }]}>
          Use the open button above to launch Supabase in a new browser tab.
        </Text>
      </View>
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
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  webFallbackTitle: {
    ...typography.h4,
    textAlign: 'center',
  },
  webFallbackBody: {
    ...typography.body,
    textAlign: 'center',
  },
});
