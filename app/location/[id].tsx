import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useMenus, useCourses, useItems, useNutrition } from '@/hooks/useNetNutrition';
import { NNItem, NNMenu, NNCourse } from '@/services/netNutritionService';
import { useFavorites } from '@/hooks/useFavorites';
import { useDailyLog } from '@/hooks/useDailyLog';
import { Meal, mockMeals, diningLocations } from '@/services/mockData';
import { LoggedMeal } from '@/services/storage';
import { MacroCard } from '@/components/ui/MacroCard';
import { useAlert } from '@/template';

export default function LocationDetailScreen() {
  const { id, name: encodedName } = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { isFavorite, toggleFavorite } = useFavorites();
  const today = new Date().toISOString().split('T')[0];
  const { addMeal } = useDailyLog(today);

  const routeId = Array.isArray(id) ? id[0] : id;
  const routeName = Array.isArray(encodedName) ? encodedName[0] : encodedName;
  const unitOid = Number.parseInt(routeId ?? '0', 10);
  const locationName = (() => {
    if (!routeName) return 'Dining Location';
    try {
      return decodeURIComponent(routeName);
    } catch {
      return routeName;
    }
  })();
  const isStatic = unitOid < 0;

  // ── Static fallback ──────────────────────────────────────────────────────────
  const staticLocation = useMemo(
    () =>
      isStatic
        ? diningLocations.find((loc) => loc.name === locationName) ?? null
        : null,
    [isStatic, locationName],
  );

  const staticMenus: NNMenu[] = useMemo(
    () =>
      staticLocation
        ? staticLocation.categories.map((cat, i) => ({ oid: -(i + 1), name: cat }))
        : [],
    [staticLocation],
  );

  // ── Selection state ──────────────────────────────────────────────────────────
  const [selectedMenu, setSelectedMenu] = useState<NNMenu | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<NNCourse | null>(null);

  // ── Live data ────────────────────────────────────────────────────────────────
  const { menus: liveMenus, loading: menusLoading } = useMenus(isStatic ? null : unitOid);
  const { courses: liveCourses, loading: coursesLoading } = useCourses(
    isStatic ? null : unitOid,
    isStatic ? null : selectedMenu?.oid ?? null,
  );
  const { items: liveItems, loading: itemsLoading } = useItems(
    isStatic ? null : unitOid,
    isStatic ? null : selectedMenu?.oid ?? null,
    isStatic ? null : selectedCourse?.oid ?? null,
  );

  // Resolve menus
  const menus = isStatic ? staticMenus : liveMenus;

  // Resolve items for static mode
  const staticItems = useMemo<NNItem[]>(() => {
    if (!isStatic || !selectedMenu) return [];
    return mockMeals
      .filter(
        (m) => m.location === locationName && m.category === selectedMenu.name,
      )
      .map((m) => ({
        oid:
          parseInt(m.id.replace(/\D/g, '').slice(0, 8)) ||
          (Math.random() * 1e6) | 0,
        name: m.name,
        serving: m.servingSize,
        calories: m.nutrition.calories,
        _mockMeal: m,
      })) as (NNItem & { _mockMeal: Meal })[];
  }, [isStatic, selectedMenu, locationName]);

  const items: (NNItem & { _mockMeal?: Meal })[] = isStatic
    ? staticItems
    : (liveItems as (NNItem & { _mockMeal?: Meal })[]);

  // Auto-select first menu on load
  useEffect(() => {
    if (menus.length > 0 && !selectedMenu) {
      setSelectedMenu(menus[0]);
    }
  }, [menus, selectedMenu]);

  // Reset course when menu changes
  useEffect(() => {
    setSelectedCourse(null);
  }, [selectedMenu?.oid]);

  // ── Nutrition modal ──────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [previewMeal, setPreviewMeal] = useState<Meal | null>(null);
  const { nutrition, loading: nutrLoading, loadNutrition, reset: resetNutr } =
    useNutrition();

  const handleItemPress = (item: NNItem & { _mockMeal?: Meal }) => {
    if (isStatic && item._mockMeal) {
      setPreviewMeal(item._mockMeal);
      resetNutr();
      setModalVisible(true);
    } else {
      const partial: Meal = {
        id: String(item.oid),
        name: item.name,
        category: selectedCourse?.name ?? selectedMenu?.name ?? '',
        location: locationName,
        servingSize: item.serving,
        nutrition: {
          calories: item.calories,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
          cholesterol: 0,
        },
      };
      setPreviewMeal(partial);
      resetNutr();
      setModalVisible(true);
      loadNutrition(item.oid, selectedMenu?.oid);
    }
  };

  const handleAddMeal = async (
    mealTime: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks',
  ) => {
    if (!previewMeal) return;
    const n = nutrition ?? previewMeal.nutrition;
    const logged: LoggedMeal = {
      mealId: previewMeal.id,
      mealName: previewMeal.name,
      mealTime,
      nutrition: {
        calories: n.calories,
        protein: (n as any).protein ?? 0,
        carbs: (n as any).carbs ?? 0,
        fat: (n as any).fat ?? 0,
        fiber: (n as any).fiber ?? 0,
        sugar: (n as any).sugar ?? 0,
        sodium: (n as any).sodium ?? 0,
        cholesterol: (n as any).cholesterol ?? 0,
      },
      timestamp: new Date().toISOString(),
      date: today,
    };
    await addMeal(logged);
    setModalVisible(false);
    showAlert('Added!', `${previewMeal.name} added to ${mealTime}`);
  };

  const displayNutrition =
    nutrition ?? (isStatic && previewMeal ? previewMeal.nutrition : null);
  const showNutrLoading = !isStatic && nutrLoading;

  // ── Loading / empty states ───────────────────────────────────────────────────
  const showMenusLoader = !isStatic && menusLoading;
  const showCoursesLoader = !isStatic && coursesLoading && selectedMenu !== null;
  const showItemsLoader =
    !isStatic && itemsLoading && selectedMenu !== null;

  const renderItem = ({
    item,
  }: {
    item: NNItem & { _mockMeal?: Meal };
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.itemCard,
        {
          backgroundColor: pressed ? colors.surfaceHover : colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemMain}>
        <Text
          style={[styles.itemName, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        <Text style={[styles.itemServing, { color: colors.textSecondary }]}>
          {item.serving}
        </Text>
      </View>
      <View style={styles.itemRight}>
        {item.calories > 0 && (
          <View
            style={[
              styles.calBadge,
              { backgroundColor: colors.primary + '15' },
            ]}
          >
            <Text style={[styles.calText, { color: colors.primary }]}>
              {item.calories}
            </Text>
            <Text style={[styles.calLabel, { color: colors.primary }]}>
              cal
            </Text>
          </View>
        )}
        <MaterialIcons name="info-outline" size={20} color={colors.textLight} />
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Location header ── */}
      <View
        style={[
          styles.locationHeader,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top > 0 ? insets.top : spacing.sm,
          },
        ]}
      >
        <Text
          style={[styles.locationTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {locationName}
        </Text>
        <View
          style={[
            styles.liveChip,
            {
              backgroundColor: isStatic
                ? colors.textLight + '15'
                : colors.success + '15',
              borderColor: isStatic
                ? colors.textLight + '30'
                : colors.success + '30',
            },
          ]}
        >
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor: isStatic ? colors.textLight : colors.success,
              },
            ]}
          />
          <Text
            style={[
              styles.liveLabel,
              {
                color: isStatic ? colors.textSecondary : colors.success,
              },
            ]}
          >
            {isStatic ? 'Cached' : 'Live'}
          </Text>
        </View>
      </View>

      {/* ── Menu tabs (Breakfast / Lunch / Dinner) ── */}
      {showMenusLoader ? (
        <View
          style={[
            styles.tabsPlaceholder,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingTabsText, { color: colors.textSecondary }]}>
            Loading menus…
          </Text>
        </View>
      ) : menus.length > 0 ? (
        <View
          style={[
            styles.tabsContainer,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <FlatList
            horizontal
            data={menus}
            keyExtractor={(m) => String(m.oid)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
            renderItem={({ item: menu }) => {
              const active = selectedMenu?.oid === menu.oid;
              return (
                <Pressable
                  style={[
                    styles.tab,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedMenu(menu)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: active ? '#fff' : colors.textSecondary,
                        fontWeight: active ? '600' : '400',
                      },
                    ]}
                  >
                    {menu.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}

      {/* ── Station filter chips ── */}
      {!isStatic && liveCourses.length > 0 ? (
        <View
          style={[
            styles.courseBar,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.borderLight,
            },
          ]}
        >
          <FlatList
            horizontal
            data={[{ oid: 0, name: 'All Stations' }, ...liveCourses]}
            keyExtractor={(c) => String(c.oid)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.courseContent}
            renderItem={({ item: course }) => {
              const active =
                (course.oid === 0 && !selectedCourse) ||
                selectedCourse?.oid === course.oid;
              return (
                <Pressable
                  style={[
                    styles.courseChip,
                    {
                      backgroundColor: active
                        ? colors.primary + '20'
                        : 'transparent',
                      borderColor: active
                        ? colors.primary
                        : colors.borderLight,
                    },
                  ]}
                  onPress={() =>
                    setSelectedCourse(course.oid === 0 ? null : course)
                  }
                >
                  <Text
                    style={[
                      styles.courseChipText,
                      {
                        color: active ? colors.primary : colors.textSecondary,
                        fontWeight: active ? '600' : '400',
                      },
                    ]}
                  >
                    {course.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      ) : showCoursesLoader ? (
        <View
          style={[
            styles.courseBar,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.borderLight,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingTabsText, { color: colors.textSecondary }]}>
            Loading stations...
          </Text>
        </View>
      ) : null}

      {/* ── Items list ── */}
      {showItemsLoader ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading menu items…
          </Text>
        </View>
      ) : items.length === 0 && selectedMenu ? (
        <View style={styles.loadingCenter}>
          <MaterialIcons
            name="restaurant-menu"
            size={48}
            color={colors.textLight}
          />
          <Text style={[styles.errorText, { color: colors.text }]}>
            No items found
          </Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
            {isStatic
              ? 'Select a station above'
              : 'Try selecting a different station or meal period'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.oid)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            selectedMenu ? (
              <View style={styles.categoryHeader}>
                <View>
                  <Text style={[styles.categoryTitle, { color: colors.text }]}>
                    {selectedCourse?.name ?? selectedMenu.name}
                  </Text>
                  {selectedCourse && (
                    <Text
                      style={[
                        styles.categorySubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {selectedMenu.name}
                    </Text>
                  )}
                </View>
                <Text
                  style={[styles.itemCount, { color: colors.textSecondary }]}
                >
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* ── Nutrition Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.background,
              paddingTop: insets.top > 0 ? insets.top : spacing.md,
            },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.border },
            ]}
          >
            <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
              <MaterialIcons name="close" size={28} color={colors.text} />
            </Pressable>
            <Text
              style={[styles.modalTitle, { color: colors.text }]}
              numberOfLines={2}
            >
              {previewMeal?.name ?? ''}
            </Text>
            <Pressable
              onPress={() =>
                previewMeal && toggleFavorite(previewMeal.id)
              }
              hitSlop={8}
            >
              <MaterialIcons
                name={
                  previewMeal && isFavorite(previewMeal.id)
                    ? 'favorite'
                    : 'favorite-border'
                }
                size={26}
                color={colors.primary}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: insets.bottom + spacing.lg },
            ]}
          >
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[styles.infoLabel, { color: colors.textSecondary }]}
              >
                Serving Size
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {displayNutrition
                  ? (displayNutrition as any).servingSize ??
                    previewMeal?.servingSize
                  : previewMeal?.servingSize ?? '1 serving'}
              </Text>
              <Text style={[styles.infoSub, { color: colors.textLight }]}>
                {selectedCourse?.name ?? selectedMenu?.name ?? ''} ·{' '}
                {locationName}
              </Text>
            </View>

            <View
              style={[
                styles.calorieCard,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.calorieNum}>
                {showNutrLoading
                  ? '—'
                  : displayNutrition?.calories ??
                    previewMeal?.nutrition.calories ??
                    0}
              </Text>
              <Text style={styles.calorieLabel}>Calories</Text>
            </View>

            {showNutrLoading ? (
              <View style={styles.nutrLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text
                  style={[
                    styles.nutrLoadingText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Loading nutrition facts…
                </Text>
              </View>
            ) : displayNutrition ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Macronutrients
                </Text>
                <MacroCard
                  label="Protein"
                  value={(displayNutrition as any).protein ?? 0}
                  unit="g"
                  color={colors.protein}
                />
                <MacroCard
                  label="Carbohydrates"
                  value={(displayNutrition as any).carbs ?? 0}
                  unit="g"
                  color={colors.carbs}
                />
                <MacroCard
                  label="Fat"
                  value={(displayNutrition as any).fat ?? 0}
                  unit="g"
                  color={colors.fat}
                />

                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Detailed Nutrients
                </Text>
                <View
                  style={[
                    styles.detailsCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  {[
                    {
                      label: 'Total Fat',
                      value: `${(displayNutrition as any).fat ?? 0}g`,
                    },
                    {
                      label: 'Saturated Fat',
                      value: `${(displayNutrition as any).saturatedFat ?? 0}g`,
                      indent: true,
                    },
                    {
                      label: 'Trans Fat',
                      value: `${(displayNutrition as any).transFat ?? 0}g`,
                      indent: true,
                    },
                    {
                      label: 'Cholesterol',
                      value: `${(displayNutrition as any).cholesterol ?? 0}mg`,
                    },
                    {
                      label: 'Sodium',
                      value: `${(displayNutrition as any).sodium ?? 0}mg`,
                    },
                    {
                      label: 'Total Carbohydrate',
                      value: `${(displayNutrition as any).carbs ?? 0}g`,
                    },
                    {
                      label: 'Dietary Fiber',
                      value: `${(displayNutrition as any).fiber ?? 0}g`,
                      indent: true,
                    },
                    {
                      label: 'Total Sugars',
                      value: `${(displayNutrition as any).sugar ?? 0}g`,
                      indent: true,
                    },
                    {
                      label: 'Protein',
                      value: `${(displayNutrition as any).protein ?? 0}g`,
                    },
                  ].map((row, i, arr) => (
                    <View
                      key={row.label}
                      style={[
                        styles.detailRow,
                        i < arr.length - 1 && {
                          borderBottomColor: colors.borderLight,
                          borderBottomWidth: 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailLabel,
                          {
                            color: row.indent
                              ? colors.textSecondary
                              : colors.text,
                          },
                          row.indent && styles.detailIndent,
                        ]}
                      >
                        {row.label}
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: colors.text }]}
                      >
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Add to Daily Log
            </Text>
            <View style={styles.mealTimeGrid}>
              {(
                ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const
              ).map((mt) => (
                <Pressable
                  key={mt}
                  style={[
                    styles.mealTimeBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handleAddMeal(mt)}
                >
                  <Text style={styles.mealTimeBtnText}>{mt}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  locationTitle: { ...typography.h3, flex: 1 },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    gap: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveLabel: { fontSize: 11, fontWeight: '700' },

  tabsContainer: { borderBottomWidth: 1, paddingVertical: spacing.sm },
  tabsPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  loadingTabsText: { ...typography.bodySmall },
  tabsContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  tabText: { ...typography.bodySmall },

  courseBar: {
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  courseContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  courseChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  courseChipText: { fontSize: 12 },

  listContent: { padding: spacing.lg },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  categoryTitle: { ...typography.h2 },
  categorySubtitle: { ...typography.caption, marginTop: 2 },
  itemCount: { ...typography.bodySmall },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  itemMain: { flex: 1, marginRight: spacing.sm },
  itemName: { ...typography.body, fontWeight: '600', marginBottom: 3 },
  itemServing: { ...typography.caption },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  calBadge: {
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  calText: { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  calLabel: { fontSize: 10, fontWeight: '600' },

  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl * 2,
  },
  loadingText: { ...typography.body },
  errorText: { ...typography.h3 },
  errorSub: { ...typography.bodySmall, textAlign: 'center' },

  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  modalTitle: { ...typography.h3, flex: 1, textAlign: 'center' },
  modalContent: { padding: spacing.lg },

  infoCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoLabel: { ...typography.caption, marginBottom: 4 },
  infoValue: { ...typography.body, fontWeight: '600', marginBottom: 4 },
  infoSub: { ...typography.caption },

  calorieCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  calorieNum: {
    fontSize: 56,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 64,
  },
  calorieLabel: { ...typography.body, color: '#fff', opacity: 0.9 },

  nutrLoading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  nutrLoadingText: { ...typography.body },

  sectionTitle: {
    ...typography.h3,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  detailsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  detailLabel: { ...typography.body },
  detailIndent: { paddingLeft: spacing.md },
  detailValue: { ...typography.body, fontWeight: '600' },

  mealTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mealTimeBtn: {
    flex: 1,
    minWidth: '45%',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  mealTimeBtnText: { ...typography.body, color: '#fff', fontWeight: '600' },
});
