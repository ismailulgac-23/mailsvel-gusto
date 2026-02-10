'use client';

import { translations, type Locale } from '@/lib/i18n';
import { useMemo } from 'react';

export function useTranslation(locale: Locale = 'tr') {
  const t = useMemo(() => translations[locale], [locale]);
  
  return { t, locale };
}