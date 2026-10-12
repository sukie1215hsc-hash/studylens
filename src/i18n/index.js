import en from './en'
import zh from './zh'

export const dictionaries = { en, zh }

export function interpolate(template, vars) {
  if (!vars) return template
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] == null ? `{${key}}` : String(vars[key]),
  )
}

export function translate(language, key, vars) {
  const dict = dictionaries[language] || dictionaries.en
  const raw = dict[key] ?? dictionaries.en[key] ?? key
  return interpolate(raw, vars)
}

export function localeFor(language) {
  return language === 'zh' ? 'zh-CN' : 'en-GB'
}
