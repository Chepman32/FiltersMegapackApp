import { open } from 'react-native-quick-sqlite';

export const DB_NAME = 'filters_megapack.db';

export const db = open({
  name: DB_NAME,
  location: 'default',
});

