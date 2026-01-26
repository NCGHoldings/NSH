import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import siTranslation from './locales/si.json';

const i18nInstance = i18n
    .use(LanguageDetector)
    .use(initReactI18next);

i18nInstance.init({
    resources: {
        en: { translation: enTranslation },
        si: { translation: siTranslation }
    },
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false
    },
    detection: {
        order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
        caches: ['localStorage']
    }
});

export default i18nInstance;
