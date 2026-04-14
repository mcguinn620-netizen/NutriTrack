import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onPress: () => void;
}

export default function FavoriteButton({ isFavorite, onPress }: FavoriteButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceHover : colors.surface,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <MaterialIcons name={isFavorite ? 'star' : 'star-border'} size={18} color={isFavorite ? '#f59e0b' : colors.textSecondary} />
      <Text style={[styles.label, { color: colors.textSecondary }]}>{isFavorite ? 'Favorited' : 'Favorite'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
