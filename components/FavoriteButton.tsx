import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onPress: () => void;
  compact?: boolean;
}

export default function FavoriteButton({ isFavorite, onPress, compact = false }: FavoriteButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact ? styles.buttonCompact : null,
        {
          borderColor: isFavorite ? colors.warning : colors.border,
          backgroundColor: pressed ? colors.surfaceHover : colors.surface,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      hitSlop={8}
    >
      <MaterialIcons name={isFavorite ? 'star' : 'star-border'} size={compact ? 16 : 18} color={isFavorite ? colors.warning : colors.textSecondary} />
      {!compact ? <Text style={[styles.label, { color: colors.textSecondary }]}>{isFavorite ? 'Favorited' : 'Favorite'}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  buttonCompact: {
    minHeight: 34,
    minWidth: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
  },
});
