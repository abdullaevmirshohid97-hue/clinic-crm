import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import uz from './uz'
import ru from './ru'
import en from './en'

type Translations = typeof uz;
type Lang = 'uz' | 'ru' | 'en';

const translations: Record<Lang, Translations> = { uz, ru, en }

interface LanguageContextValue {
  lang: Lang;
  translate: (key: string) => string;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'uz',
  translate: (k: string) => k,
  setLang: () => {},
})

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, p: string) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[p];
    return undefined;
  }, obj)
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('uz')

  const translate = useCallback((key: string): string => {
    if (!key) return '';
    const parts = key.split('.')
    let value: unknown = translations[lang]
    for (const p of parts) {
      if (value && Object.prototype.hasOwnProperty.call(value, p)) {
        value = (value as Record<string, unknown>)[p]
      } else {
        return key
      }
    }
    return typeof value === 'string' ? value : key
  }, [lang])

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('clinic_lang', lang) } catch { /* storage unavailable */ }
  }, [lang])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('clinic_lang')
      if (saved && (saved === 'uz' || saved === 'en' || saved === 'ru')) setLangState(saved as Lang)
    } catch { /* storage unavailable */ }
  }, [])

  const value = useMemo(() => ({ lang, translate, setLang }), [lang, translate, setLang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useTranslation = () => {
  const { lang, translate, setLang } = useContext(LanguageContext)
  return useMemo(() => ({
    t: translate,
    lang,
    setLang
  }), [lang, translate, setLang])
}
