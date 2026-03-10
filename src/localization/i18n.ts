import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import { translations } from './translations';

const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode ?? 'en';
const initialLanguage = deviceLanguage.startsWith('ru') ? 'ru' : 'en';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: translations.en },
      ru: { translation: translations.ru },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });
}

export default i18n;

