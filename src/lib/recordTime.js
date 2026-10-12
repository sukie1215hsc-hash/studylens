function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey)
    .split('-')
    .map((part) => Number(part))
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function isoWeekParts(date) {
  const cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const weekday = cursor.getDay() || 7
  cursor.setDate(cursor.getDate() + 4 - weekday)
  const year = cursor.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const week = Math.ceil(((cursor - yearStart) / 86400000 + 1) / 7)
  return { year, week }
}

export function describeRecordDate(dateKey, options = {}) {
  const locale = options.locale || 'en-GB'
  const weekLabelFor = options.weekLabelFor
  const date = parseDateKey(dateKey)
  if (!date) {
    return {
      dateLabel: dateKey,
      weekKey: '',
      weekLabel: '—',
      monthKey: '',
      monthLabel: '—',
      yearKey: '',
      yearLabel: '—',
    }
  }

  const { year, week } = isoWeekParts(date)
  const weekKey = `${year}-W${String(week).padStart(2, '0')}`
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  const yearKey = String(date.getFullYear())

  return {
    dateLabel: date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    weekKey,
    weekLabel: weekLabelFor ? weekLabelFor(week, year) : `Week ${week}, ${year}`,
    monthKey,
    monthLabel: date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    yearKey,
    yearLabel: yearKey,
  }
}

export function uniqueOptions(records, keyName, labelName, options = {}) {
  const seen = new Map()
  records.forEach((record) => {
    const meta = describeRecordDate(record.date, options)
    const key = meta[keyName]
    if (!key || seen.has(key)) return
    seen.set(key, meta[labelName])
  })
  return [...seen.entries()].map(([value, label]) => ({ value, label }))
}
