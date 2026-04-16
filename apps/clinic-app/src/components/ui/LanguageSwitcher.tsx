import React from 'react'
import { useTranslation } from '../../i18n/LanguageContext'

export default function LanguageSwitcher(){
  const { lang, setLang, t } = useTranslation()
  const toggle = () => setLang(lang === 'uz' ? 'en' : 'uz')
  return (
    <button onClick={toggle} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc' }}>
      {lang.toUpperCase()} → {lang === 'uz' ? 'EN' : 'UZ'}
    </button>
  )
}
