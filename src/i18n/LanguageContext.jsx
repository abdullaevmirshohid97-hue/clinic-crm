import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import uz from './uz'
import ru from './ru'
import en from './en'

// Use imported translation files
const translations = { uz, ru, en }

const LanguageContext = createContext({ lang: 'uz', translate: (k) => k, setLang: () => {} })

function getPath(obj, path) {
  return path.split('.').reduce((acc, p) => acc && acc[p], obj)
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('uz')

  const translate = useCallback((key) => {
    if (!key) return '';
    const parts = key.split('.')
    let value = translations[lang]
    for (const p of parts) {
      if (value && Object.prototype.hasOwnProperty.call(value, p)) {
        value = value[p]
      } else {
        return key
      }
    }
    return typeof value === 'string' ? value : key
  }, [lang])

  // Persist language in localStorage for a nicer UX
  useEffect(() => {
    try { localStorage.setItem('clinic_lang', lang) } catch {}
  }, [lang])

  // On mount, restore language if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clinic_lang')
      if (saved && (saved === 'uz' || saved === 'en' || saved === 'ru')) setLang(saved)
    } catch {}
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
