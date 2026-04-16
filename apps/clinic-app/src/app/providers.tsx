import React, { ReactNode } from 'react';
import { LanguageProvider } from '../i18n/LanguageContext';
import { ToastProvider } from '../components/ui/Toast';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </LanguageProvider>
  );
}
