import type { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  HomeMain: undefined;
  Editor: undefined;
};

export type StudioTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  MixesTab: undefined;
  CollageTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Studio: undefined;
};
