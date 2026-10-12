export const LANGUAGE_KEY = 'studylens_language'

export function readStoredLanguage() {
  try {
    const value = localStorage.getItem(LANGUAGE_KEY)
    if (value === 'en' || value === 'en-US' || value === 'en-GB') return 'en'
    if (value === 'zh' || value === 'zh-CN' || value === 'zh-Hans') return 'zh'
  } catch (error) {
    console.error('Error reading language:', error)
  }
  return 'en'
}

export function applyLanguage(language) {
  const next = language === 'zh' ? 'zh' : 'en'
  document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en-US'
  document.documentElement.setAttribute('data-lang', next)
  return next
}

export function persistLanguage(language) {
  const next = applyLanguage(language)
  try {
    localStorage.setItem(LANGUAGE_KEY, next)
  } catch (error) {
    console.error('Error saving language:', error)
  }
  return next
}
