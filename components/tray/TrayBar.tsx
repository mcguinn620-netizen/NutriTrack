import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useTray } from './TrayContext';

interface TrayBarProps {
  onOpen: () => void;
}

export default function TrayBar({ onOpen }: TrayBarProps) {
  const { colors } = useTheme();
  const { totals } = useTray();

  if (totals.itemCount === 0) return null;

  return (
    <View style={[styles.container, { borderTopColor: colors.border, backgroundColor: colors.background }]}> 
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed ? colors.primaryDark ?? colors.primary : colors.primary,
          },
        ]}
      >
        <View style={styles.left}>
          <MaterialIcons name="restaurant-menu" size={20} color="#fff" />
          <Text style={styles.buttonTitle}>Tray · {totals.itemCount} items</Text>
        </View>
        <Text style={styles.buttonMeta}>
          {Math.round(totals.calories)} cal · P {Math.round(totals.protein)} C {Math.round(totals.carbs)} F {Math.round(totals.fat)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
  },
  button: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  buttonTitle: { ...typography.body, fontWeight: '700', color: '#fff' },
  buttonMeta: { ...typography.caption, color: '#fff' },
});
