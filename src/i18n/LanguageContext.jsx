import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { applyLanguage, persistLanguage, readStoredLanguage } from '../utils/language'
import { localeFor, translate } from './index'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => applyLanguage(readStoredLanguage()))

  const setLanguage = useCallback((next) => {
    setLanguageState(persistLanguage(next))
  }, [])

  const t = useCallback((key, vars) => translate(language, key, vars), [language])

  const value = useMemo(
    () => ({
      language,
      locale: localeFor(language),
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useI18n must be used within LanguageProvider')
  }
  return context
}
