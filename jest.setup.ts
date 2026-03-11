import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
  const { Image, ScrollView, Text, View } = require('react-native');
  const makeTransition = () => ({
    springify() {
      return this;
    },
    damping() {
      return this;
    },
    stiffness() {
      return this;
    },
    mass() {
      return this;
    },
    duration() {
      return this;
    },
  });

  return {
    __esModule: true,
    default: {
      View,
      Text,
      Image,
      ScrollView,
      createAnimatedComponent: (Component: unknown) => Component,
    },
    interpolateColor: jest.fn((_value, _input, output) => output[0]),
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withSpring: (value: unknown) => value,
    LinearTransition: makeTransition(),
    FadeIn: makeTransition(),
    FadeOut: makeTransition(),
  };
});
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { FlatList } = require('react-native');
  return {
    FlashList: React.forwardRef((props: unknown, ref: unknown) =>
      React.createElement(FlatList, { ...(props as object), ref }),
    ),
  };
});

jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve({})),
}));

jest.mock('react-native-mmkv', () => {
  class MockMMKVStore {
    private store = new Map<string, string>();

    getString(key: string): string | undefined {
      return this.store.get(key);
    }

    set(key: string, value: string): void {
      this.store.set(key, value);
    }
  }

  return {
    createMMKV: () => new MockMMKVStore(),
  };
});

jest.mock('react-native-quick-sqlite', () => {
  const execute = jest.fn(() => ({ rowsAffected: 0, rows: { _array: [], length: 0, item: () => null } }));
  return {
    open: jest.fn(() => ({
      execute,
      executeAsync: jest.fn(async () => execute()),
      executeBatch: jest.fn(),
      executeBatchAsync: jest.fn(),
      close: jest.fn(),
      delete: jest.fn(),
      attach: jest.fn(),
      detach: jest.fn(),
      transaction: jest.fn(async () => undefined),
      loadFile: jest.fn(),
      loadFileAsync: jest.fn(),
    })),
  };
});

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({ assets: [] })),
  launchImageLibrary: jest.fn(async () => ({ assets: [] })),
}));

jest.mock('react-native-document-picker', () => ({
  isCancel: jest.fn(() => false),
  pickSingle: jest.fn(async () => null),
  types: {
    images: 'public.image',
    video: 'public.movie',
  },
}));

jest.mock('@react-native-menu/menu', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    MenuView: React.forwardRef((props: unknown, ref: unknown) =>
      React.createElement(View, { ...(props as object), ref }),
    ),
  };
});

jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));
