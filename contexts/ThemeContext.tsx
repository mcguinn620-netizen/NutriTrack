import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const THEME_KEY = '@app_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ColorPalette {
  primary: string;
  primaryDark: string;
  secondary: string;
  info: string;
  secondaryAccent: string;
  background: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  textLight: string;
  border: string;
  borderLight: string;
  error: string;
  warning: string;
  success: string;
  protein: string;
  carbs: string;
  fat: string;
  calories: string;
  allergenChip: string;
  dietaryChip: string;
  cardShadow: string;
}

export const lightColors: ColorPalette = {
  primary: '#BA0C2F',
  primaryDark: '#8F0A25',
  secondary: '#54585A',
  info: '#0079A7',
  secondaryAccent: '#AEDBE9',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceHover: '#F5F6F7',
  text: '#000000',
  textSecondary: '#54585A',
  textLight: '#6F7375',
  border: '#D3D5D6',
  borderLight: '#E8EAEB',
  error: '#BA0C2F',
  warning: '#FDDE69',
  success: '#BAD57E',
  protein: '#0079A7',
  carbs: '#AEDBE9',
  fat: '#FDDE69',
  calories: '#BA0C2F',
  allergenChip: '#FDDE69',
  dietaryChip: '#BAD57E',
  cardShadow: '#000000',
};

export const darkColors: ColorPalette = {
  primary: '#BA0C2F',
  primaryDark: '#8F0A25',
  secondary: '#9FA3A5',
  info: '#AEDBE9',
  secondaryAccent: '#0079A7',
  background: '#121212',
  surface: '#1D1D1D',
  surfaceHover: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#CFD1D2',
  textLight: '#9FA3A5',
  border: '#3A3A3A',
  borderLight: '#2E2E2E',
  error: '#BA0C2F',
  warning: '#FDDE69',
  success: '#BAD57E',
  protein: '#AEDBE9',
  carbs: '#0079A7',
  fat: '#FDDE69',
  calories: '#BA0C2F',
  allergenChip: '#7E6A21',
  dietaryChip: '#4E6730',
  cardShadow: '#000000',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
