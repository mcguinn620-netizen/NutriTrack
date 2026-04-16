/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#BA0C2F';
const tintColorDark = '#BA0C2F';

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#54585A',
    tabIconDefault: '#54585A',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#FFFFFF',
    background: '#121212',
    tint: tintColorDark,
    icon: '#9FA3A5',
    tabIconDefault: '#9FA3A5',
    tabIconSelected: tintColorDark,
  },
};
