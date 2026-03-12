import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const mockTabScreens: Array<{ name: string; title?: string }> = [];

jest.mock('@react-navigation/bottom-tabs', () => {
  const MockReact = require('react');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) =>
        MockReact.createElement(MockReact.Fragment, null, children),
      Screen: ({ name, options }: { name: string; options?: { title?: string } }) => {
        mockTabScreens.push({ name, title: options?.title });
        return MockReact.createElement('MockTabScreen', { name, title: options?.title });
      },
    }),
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const MockReact = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) =>
        MockReact.createElement(MockReact.Fragment, null, children),
      Screen: ({
        component: Component,
      }: {
        component: React.ComponentType;
      }) => MockReact.createElement(Component),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

import { useStudioStore } from '../src/store/useStudioStore';
import { RootNavigator } from '../src/navigation/RootNavigator';

describe('RootNavigator tabs', () => {
  beforeEach(() => {
    mockTabScreens.splice(0, mockTabScreens.length);
    useStudioStore.setState({ onboardingSeen: true });
  });

  it('renders Home, Mixes, and Settings tabs', async () => {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<RootNavigator />);
    });

    expect(mockTabScreens.map(screen => screen.name)).toEqual([
      'HomeTab',
      'MixesTab',
      'SettingsTab',
    ]);
    expect(mockTabScreens.map(screen => screen.title)).toContain('Home');
    expect(mockTabScreens.map(screen => screen.title)).toContain('Mixes');
    expect(mockTabScreens.map(screen => screen.title)).toContain('Settings');
    expect(mockTabScreens.map(screen => screen.name)).not.toContain('CameraTab');
    expect(mockTabScreens.map(screen => screen.name)).not.toContain('ProjectsTab');
    expect(mockTabScreens.map(screen => screen.name)).not.toContain('EditorTab');
    expect(mockTabScreens).toHaveLength(3);
  });
});
