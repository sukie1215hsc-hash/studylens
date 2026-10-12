const COMPARE_DAYS = 7
const SMOOTH_WINDOW = 3
const STABLE_HOURS = 0.12
const STABLE_RELATIVE = 0.12

export function formatDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey)
    .split('-')
    .map((part) => Number(part))
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function shiftDateKey(dateKey, deltaDays) {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  date.setDate(date.getDate() + deltaDays)
  return formatDateKey(date)
}

function daysBetween(fromKey, toKey) {
  const from = parseDateKey(fromKey)
  const to = parseDateKey(toKey)
  if (!from || !to) return 0
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

function mean(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function trailingAverage(values, windowSize, counted) {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1)
    const slice = []
    for (let cursor = start; cursor <= index; cursor += 1) {
      if (!counted || counted[cursor]) slice.push(values[cursor])
    }
    return slice.length ? mean(slice) : 0
  })
}

export function dailyHoursByDate(records, today = formatDateKey()) {
  const totals = new Map()
  records.forEach((record) => {
    const key = String(record.date || '')
    if (!parseDateKey(key) || key > today) return
    const minutes = Number(record.duration) || 0
    if (minutes <= 0) return
    totals.set(key, (totals.get(key) || 0) + minutes)
  })
  const hours = new Map()
  totals.forEach((minutes, key) => {
    hours.set(key, minutes / 60)
  })
  return hours
}

export function dailyHoursSeries(records, days, now = new Date()) {
  const today = formatDateKey(now)
  const count = Math.max(1, Number(days) || 14)
  const hoursMap = dailyHoursByDate(records, today)
  const points = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = shiftDateKey(today, -offset)
    if (date > today) continue
    points.push({
      date,
      hours: hoursMap.get(date) || 0,
    })
  }
  return points
}

export function formatHoursLabel(hours) {
  const value = Number(hours) || 0
  if (value === 0) return '0'
  if (value < 10) return value.toFixed(1)
  return String(Math.round(value * 10) / 10)
}

export function computeLearningMomentum(records, now = new Date()) {
  const today = formatDateKey(now)
  const hoursMap = dailyHoursByDate(records, today)
  const datedKeys = [...hoursMap.keys()].sort()

  if (datedKeys.length === 0) {
    return {
      status: 'empty',
      score: null,
      direction: null,
      recentAvg: 0,
      prevAvg: 0,
      studyDaysRecent: 0,
      studyDaysPrevious: 0,
    }
  }

  const firstDate = datedKeys[0]
  const historyDays = daysBetween(firstDate, today) + 1
  if (historyDays < COMPARE_DAYS * 2) {
    return {
      status: 'building',
      score: null,
      direction: null,
      recentAvg: 0,
      prevAvg: 0,
      studyDaysRecent: datedKeys.filter((key) => key >= shiftDateKey(today, -(COMPARE_DAYS - 1))).length,
      studyDaysPrevious: 0,
    }
  }

  const rawLength = COMPARE_DAYS * 2 + (SMOOTH_WINDOW - 1)
  const raw = []
  const counted = []
  for (let offset = rawLength - 1; offset >= 0; offset -= 1) {
    const date = shiftDateKey(today, -offset)
    const inHistory = date >= firstDate
    counted.push(inHistory)
    raw.push(inHistory ? hoursMap.get(date) || 0 : 0)
  }

  const smoothed = trailingAverage(raw, SMOOTH_WINDOW, counted)
  const compared = smoothed.slice(SMOOTH_WINDOW - 1)
  const rawCompared = raw.slice(SMOOTH_WINDOW - 1)
  const previous = compared.slice(0, COMPARE_DAYS)
  const recent = compared.slice(COMPARE_DAYS)
  const prevAvg = mean(previous)
  const recentAvg = mean(recent)

  const studyDaysRecent = rawCompared.slice(COMPARE_DAYS).filter((value) => value > 0).length
  const studyDaysPrevious = rawCompared.slice(0, COMPARE_DAYS).filter((value) => value > 0).length

  if (recentAvg === 0 && prevAvg === 0) {
    return {
      status: 'ready',
      score: 0,
      direction: 'declining',
      recentAvg,
      prevAvg,
      studyDaysRecent,
      studyDaysPrevious,
    }
  }

  const change = (recentAvg - prevAvg) / (recentAvg + prevAvg)
  const score = Math.round(clamp(50 + 50 * change, 0, 100))
  const absDelta = Math.abs(recentAvg - prevAvg)
  let direction = 'steady'
  if (absDelta > STABLE_HOURS && Math.abs(change) >= STABLE_RELATIVE) {
    direction = recentAvg > prevAvg ? 'rising' : 'declining'
  }

  return {
    status: 'ready',
    score,
    direction,
    recentAvg,
    prevAvg,
    studyDaysRecent,
    studyDaysPrevious,
  }
}

export function formatAxisDate(dateKey, locale = 'en-GB') {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export { COMPARE_DAYS }
