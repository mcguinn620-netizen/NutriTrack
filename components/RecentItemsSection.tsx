import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { RecentFoodItem } from '@/services/recentItemsService';
import CardSurface from '@/components/ui/CardSurface';
import { MetaRow, SectionLabel } from '@/components/ui/primitives';

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
      <SectionLabel label="Continue browsing" />
      <Text style={[styles.title, { color: colors.text }]}>Recent Items</Text>
      <CardSurface>
        {items.slice(0, 5).map((item, index) => (
          <Pressable
            key={`${item.id}-${item.viewed_at}`}
            onPress={() => onPressItem(item)}
            style={({ pressed }) => [
              styles.itemRow,
              {
                backgroundColor: pressed ? colors.surfaceHover : 'transparent',
                borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View style={styles.itemTextContainer}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <MetaRow icon="room-service" text={item.station_name ?? 'Last viewed item'} />
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textLight} />
          </Pressable>
        ))}
      </CardSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.sm },
  itemRow: {
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTextContainer: { flex: 1, marginRight: spacing.sm },
  itemName: { ...typography.bodySmall, fontWeight: '700' },
});
