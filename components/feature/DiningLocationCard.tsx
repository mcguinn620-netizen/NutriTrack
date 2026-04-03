import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { DiningLocation } from '@/services/mockData';
import { menuService } from '@/services/menuService';

interface DiningLocationCardProps {
  location: DiningLocation;
  onPress: () => void;
  weekIndex?: number;
}

export function DiningLocationCard({ location, onPress, weekIndex = 0 }: DiningLocationCardProps) {
  const { colors } = useTheme();
  const specialsCount = menuService.getWeeklySpecials(location.id, weekIndex).length;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.surfaceHover : colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.iconRow}>
        <View style={[styles.iconBadge, { backgroundColor: colors.primary + '18' }]}>
          <MaterialIcons name={location.icon as any} size={26} color={colors.primary} />
        </View>
        <View style={styles.meta}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {location.shortName}
          </Text>
          <Text style={[styles.fullName, { color: colors.textSecondary }]} numberOfLines={1}>
            {location.name}
          </Text>
        </View>
        {specialsCount > 0 && (
          <View style={[styles.specialsBadge, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
            <Text style={[styles.specialsBadgeText, { color: colors.success }]}>
              {specialsCount} specials
            </Text>
          </View>
        )}
        <MaterialIcons name="chevron-right" size={22} color={colors.textLight} />
      </View>

      <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
        {location.description}
      </Text>

      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        <MaterialIcons name="access-time" size={14} color={colors.textLight} />
        <Text style={[styles.hours, { color: colors.textLight }]} numberOfLines={1}>
          {location.hours}
        </Text>
      </View>

      <View style={styles.categories}>
        {location.categories.slice(0, 4).map((cat) => (
          <View key={cat} style={[styles.categoryChip, { backgroundColor: colors.primary + '12' }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]} numberOfLines={1}>
              {cat}
            </Text>
          </View>
        ))}
        {location.categories.length > 4 && (
          <View style={[styles.categoryChip, { backgroundColor: colors.borderLight }]}>
            <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
              +{location.categories.length - 4}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1 },
  name: { ...typography.h3, marginBottom: 2 },
  fullName: { ...typography.caption, fontSize: 11 },
  specialsBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  specialsBadgeText: { fontSize: 11, fontWeight: '600' },
  description: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  hours: { ...typography.caption, flex: 1 },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  categoryText: { fontSize: 11, fontWeight: '500' },
});
