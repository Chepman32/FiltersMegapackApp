import { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList, StudioTabsParamList } from './types';
import { CameraScreen } from '../screens/CameraScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { CollageScreen } from '../screens/CollageScreen';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { useStudioStore } from '../store/useStudioStore';
import { palette } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<StudioTabsParamList>();

function StudioTabs() {
  const { t } = useTranslation();
  const labels = useMemo(
    () => ({
      camera: t('common.camera'),
      editor: t('common.editor'),
      collage: t('common.collage'),
      projects: t('common.projects'),
      settings: t('common.settings'),
    }),
    [t],
  );

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.textPrimary,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarStyle: {
          backgroundColor: '#111522',
          borderTopColor: palette.border,
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        component={CameraScreen}
        name="CameraTab"
        options={{ title: labels.camera }}
      />
      <Tabs.Screen
        component={EditorScreen}
        name="EditorTab"
        options={{ title: labels.editor }}
      />
      <Tabs.Screen
        component={CollageScreen}
        name="CollageTab"
        options={{ title: labels.collage }}
      />
      <Tabs.Screen
        component={ProjectsScreen}
        name="ProjectsTab"
        options={{ title: labels.projects }}
      />
      <Tabs.Screen
        component={SettingsScreen}
        name="SettingsTab"
        options={{ title: labels.settings }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const onboardingSeen = useStudioStore(state => state.onboardingSeen);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={onboardingSeen ? 'Studio' : 'Onboarding'}
    >
      {!onboardingSeen ? (
        <Stack.Screen component={OnboardingScreen} name="Onboarding" />
      ) : null}
      <Stack.Screen component={StudioTabs} name="Studio" />
    </Stack.Navigator>
  );
}

