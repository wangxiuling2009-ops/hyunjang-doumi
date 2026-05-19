import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './locales/ko.json';
import zh from './locales/zh.json';
import en from './locales/en.json';

const saved = localStorage.getItem('lang') || 'ko';

i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, zh: { translation: zh }, en: { translation: en } },
  lng: saved,
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => localStorage.setItem('lang', lng));

export default i18n;
