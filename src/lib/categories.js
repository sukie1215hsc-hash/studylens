const categoryColors = new Map()

const FALLBACK_PALETTE = ['#3a5ba0', '#8a7ca8', '#3d8b7a', '#e07a5f', '#c9a227', '#6b675f', '#9dbea8']

function colorFromName(name) {
  const text = String(name || '')
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  }
  return FALLBACK_PALETTE[(hash >>> 0) % FALLBACK_PALETTE.length]
}

export function rememberCategoryColors(entries) {
  categoryColors.clear()
  entries.forEach(([name, color]) => {
    if (name) categoryColors.set(name, color)
  })
}

export function colorForCategory(name) {
  return categoryColors.get(name) || colorFromName(name)
}

export function formatDuration(minutes) {
  const value = Number(minutes) || 0
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const rest = value % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export function formatHours(minutes) {
  const hours = (Number(minutes) || 0) / 60
  if (hours < 10) return hours.toFixed(1)
  return String(Math.round(hours))
}
