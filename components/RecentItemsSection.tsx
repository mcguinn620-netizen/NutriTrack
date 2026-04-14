import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { RecentFoodItem } from '@/services/recentItemsService';

interface RecentItemsSectionProps {
  items: RecentFoodItem[];
  onPressItem: (item: RecentFoodItem) => void;
}

export default function RecentItemsSection({ items, onPressItem }: RecentItemsSectionProps) {
  const { colors } = useTheme();

  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Recent Items</Text>
      <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
        {items.slice(0, 6).map((item) => (
          <Pressable
            key={`${item.id}-${item.viewed_at}`}
            onPress={() => onPressItem(item)}
            style={({ pressed }) => [
              styles.itemRow,
              { backgroundColor: pressed ? colors.surfaceHover : 'transparent' },
            ]}
          >
            <View style={styles.itemTextContainer}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.itemMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.station_name ?? 'Last viewed item'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textLight} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.sm },
  panel: { borderWidth: 1, borderRadius: borderRadius.md, paddingVertical: spacing.xs },
  itemRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTextContainer: { flex: 1, marginRight: spacing.sm },
  itemName: { ...typography.bodySmall, fontWeight: '600' },
  itemMeta: { ...typography.caption },
});
