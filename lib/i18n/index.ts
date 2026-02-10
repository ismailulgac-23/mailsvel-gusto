import trTranslations from './tr.json';
import enTranslations from './en.json';

export const translations = {
  tr: trTranslations,
  en: enTranslations,
};

export type Locale = keyof typeof translations;

export const defaultLocale: Locale = 'tr';

export function getTranslations(locale: Locale = defaultLocale) {
  return translations[locale] || translations[defaultLocale];
}