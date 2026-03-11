import { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  HomeStackParamList,
  RootStackParamList,
  StudioTabsParamList,
} from './types';
import { TabBarIcon } from '../components/TabBarIcon';
import { HomeScreen } from '../screens/HomeScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { MixesScreen } from '../screens/MixesScreen';
import { CollageScreen } from '../screens/CollageScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { useStudioStore } from '../store/useStudioStore';
import { palette } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<StudioTabsParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

const TAB_ICON_KIND = {
  HomeTab: 'home',
  MixesTab: 'mixes',
  CollageTab: 'collage',
  SettingsTab: 'settings',
} as const;

const TAB_ICON_RENDERERS = {
  HomeTab: ({ color, focused }: { color: string; focused: boolean }) => (
    <TabBarIcon color={color} focused={focused} kind={TAB_ICON_KIND.HomeTab} />
  ),
  MixesTab: ({ color, focused }: { color: string; focused: boolean }) => (
    <TabBarIcon color={color} focused={focused} kind={TAB_ICON_KIND.MixesTab} />
  ),
  CollageTab: ({ color, focused }: { color: string; focused: boolean }) => (
    <TabBarIcon color={color} focused={focused} kind={TAB_ICON_KIND.CollageTab} />
  ),
  SettingsTab: ({ color, focused }: { color: string; focused: boolean }) => (
    <TabBarIcon color={color} focused={focused} kind={TAB_ICON_KIND.SettingsTab} />
  ),
};

function HomeNavigator() {
  return (
    <HomeStack.Navigator
      initialRouteName="HomeMain"
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen component={HomeScreen} name="HomeMain" />
      <HomeStack.Screen component={EditorScreen} name="Editor" />
    </HomeStack.Navigator>
  );
}

function StudioTabs() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const labels = useMemo(
    () => ({
      home: t('common.home'),
      mixes: t('common.mixes'),
      collage: t('common.collage'),
      settings: t('common.settings'),
    }),
    [t],
  );

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.textPrimary,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarIcon: TAB_ICON_RENDERERS[route.name],
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        tabBarStyle: {
          backgroundColor: '#111522',
          borderTopColor: palette.border,
          height: 68 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
      })}
    >
      <Tabs.Screen
        component={HomeNavigator}
        name="HomeTab"
        options={{ title: labels.home }}
      />
      <Tabs.Screen
        component={MixesScreen}
        name="MixesTab"
        options={{ title: labels.mixes }}
      />
      <Tabs.Screen
        component={CollageScreen}
        name="CollageTab"
        options={{ title: labels.collage }}
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
