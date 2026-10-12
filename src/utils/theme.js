export const THEME_KEY = 'studylens_appearance'

export function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    if (value === 'dark' || value === 'light') return value
  } catch (error) {
    console.error('Error reading theme:', error)
  }
  return 'light'
}

export function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', next)
  document.documentElement.style.colorScheme = next
  return next
}

export function persistTheme(theme) {
  const next = applyTheme(theme)
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch (error) {
    console.error('Error saving theme:', error)
  }
  return next
}

export function withAlpha(color, alpha) {
  const hex = String(color || '').replace('#', '')
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = Number.parseInt(hex.slice(0, 2), 16)
    const g = Number.parseInt(hex.slice(2, 4), 16)
    const b = Number.parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return color
}

export function readThemePaint(el) {
  const styles = getComputedStyle(el || document.documentElement)
  const value = (name, fallback) => styles.getPropertyValue(name).trim() || fallback
  return {
    galaxyBg: value('--galaxy-bg', '#ece7dc'),
    ink: value('--ink', '#2b2a27'),
    cobalt: value('--cobalt', '#3a5ba0'),
    sun: value('--sun', '#e8c36a'),
    bg: value('--bg', '#f3f0e8'),
    mapGuide: value('--map-guide', 'rgba(43, 42, 39, 0.12)'),
    mapGuideStrong: value('--map-guide-strong', 'rgba(43, 42, 39, 0.16)'),
    mapLink: value('--map-link', 'rgba(43, 42, 39, 0.32)'),
    mapDust: value('--map-dust', '#2b2a27'),
  }
}
