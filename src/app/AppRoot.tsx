import { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '../navigation/RootNavigator';
import { palette } from '../theme/colors';
import { runMigrations } from '../db/migrations';
import '../localization/i18n';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useStudioStore } from '../store/useStudioStore';
import i18n from '../localization/i18n';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.bg,
    card: '#111522',
    text: palette.textPrimary,
    border: palette.border,
    primary: palette.accent,
  },
};

export function AppRoot() {
  const language = useStudioStore(state => state.language);
  const refreshProjects = useStudioStore(state => state.refreshProjects);

  useEffect(() => {
    runMigrations();
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language).catch(() => {});
    }
  }, [language]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <ErrorBoundary>
          <NavigationContainer theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
});

