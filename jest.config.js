module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-native-reanimated|react-native-worklets|@shopify/flash-list)/)',
  ],
};
