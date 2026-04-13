import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

// 1. This is the inner component that USES the theme
function AppContent() {
  const { isDark } = useTheme(); // This only works if ThemeProvider is ABOVE this in the tree
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="location/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Meals',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="custom-meal"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}

// 2. This is the actual DEFAULT EXPORT that Expo Router looks for
export default function RootLayout() {
  return (
    <ThemeProvider> 
      <SafeAreaProvider>
        <AlertProvider>
          <AppContent /> 
        </AlertProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
