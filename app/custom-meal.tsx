import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useCustomMeals } from '@/hooks/useCustomMeals';
import { CustomMeal } from '@/services/storage';
import { useAlert } from '@/template';

export default function CustomMealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { colors } = useTheme();
  const { addCustomMeal } = useCustomMeals();

  const [name, setName] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [cholesterol, setCholesterol] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Required Field', 'Please enter a meal name');
      return;
    }
    if (!calories || !protein || !carbs || !fat) {
      showAlert('Required Fields', 'Please enter at least calories, protein, carbs, and fat');
      return;
    }
    const customMeal: CustomMeal = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      servingSize: servingSize.trim() || '1 serving',
      nutrition: {
        calories: parseInt(calories) || 0,
        protein: parseInt(protein) || 0,
        carbs: parseInt(carbs) || 0,
        fat: parseInt(fat) || 0,
        fiber: parseInt(fiber) || 0,
        sugar: parseInt(sugar) || 0,
        sodium: parseInt(sodium) || 0,
        cholesterol: parseInt(cholesterol) || 0,
      },
      createdAt: new Date().toISOString(),
    };
    await addCustomMeal(customMeal);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Create Custom Meal</Text>
        <Pressable onPress={handleSave} hitSlop={8}>
          <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Meal Information</Text>

        <Text style={[styles.inputLabel, { color: colors.text }]}>Meal Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Homemade Pasta"
          placeholderTextColor={colors.textLight}
        />

        <Text style={[styles.inputLabel, { color: colors.text }]}>Serving Size</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={servingSize}
          onChangeText={setServingSize}
          placeholder="e.g., 1 cup, 250g"
          placeholderTextColor={colors.textLight}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Nutrition Facts</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Required *</Text>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Calories *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={calories} onChangeText={setCalories} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textLight} />
          </View>
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Protein (g) *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={protein} onChangeText={setProtein} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textLight} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Carbs (g) *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={carbs} onChangeText={setCarbs} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textLight} />
          </View>
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Fat (g) *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={fat} onChangeText={setFat} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textLight} />
          </View>
        </View>

        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Optional</Text>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Fiber (g)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={fiber} onChangeText={setFiber} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textLight} />
          </View>
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Sugar (g)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={sugar} onChangeText={setSugar} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textLight} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Sodium (mg)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={sodium} onChangeText={setSodium} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textLight} />
          </View>
          <View style={styles.halfInput}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Cholesterol (mg)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={cholesterol} onChangeText={setCholesterol} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.textLight} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...typography.h3 },
  saveText: { ...typography.body, fontWeight: '600' },
  content: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  sectionTitle: { ...typography.h3, marginTop: spacing.md, marginBottom: spacing.md },
  sectionSubtitle: { ...typography.bodySmall, marginBottom: spacing.md },
  inputLabel: { ...typography.body, fontWeight: '600', marginBottom: spacing.sm },
  input: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  halfInput: { flex: 1 },
});
