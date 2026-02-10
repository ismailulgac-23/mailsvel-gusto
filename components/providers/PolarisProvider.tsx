'use client';

import { AppProvider } from '@shopify/polaris';
import { translations } from '@/lib/i18n';
import { ReactNode } from 'react';

interface PolarisProviderProps {
  children: ReactNode;
  locale?: 'tr' | 'en';
}

export default function PolarisProvider({ children, locale = 'tr' }: PolarisProviderProps) {
  return (
    <AppProvider i18n={translations[locale]}>
      {children}
    </AppProvider>
  );
}