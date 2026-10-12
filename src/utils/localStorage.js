const STORAGE_KEY = 'studylens_learning_records'

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object') return null

  const id = typeof raw.id === 'string' ? raw.id : String(Date.now())
  const date = typeof raw.date === 'string' ? raw.date : ''
  const title = isNonEmptyString(raw.title)
    ? raw.title.trim()
    : isNonEmptyString(raw.content)
      ? raw.content.trim()
      : ''
  const category = isNonEmptyString(raw.category)
    ? raw.category.trim()
    : isNonEmptyString(raw.subject)
      ? raw.subject.trim()
      : 'Other'
  const duration = Number(raw.duration)
  const notes =
    typeof raw.notes === 'string'
      ? raw.notes
      : typeof raw.tasks === 'string'
        ? raw.tasks
        : ''

  if (!date || !title || !Number.isFinite(duration) || duration <= 0) return null

  return {
    id,
    title,
    category,
    duration,
    date,
    notes,
    missionId: typeof raw.missionId === 'string' ? raw.missionId : null,
  }
}

export const loadRecords = () => {
  try {
    const serializedRecords = localStorage.getItem(STORAGE_KEY)
    if (serializedRecords === null) return []

    const parsed = JSON.parse(serializedRecords)
    if (!Array.isArray(parsed)) {
      console.warn('LocalStorage data was not an array. Returning empty list.')
      return []
    }

    const records = parsed.map(normalizeRecord).filter(Boolean)
    if (records.length !== parsed.length) {
      saveRecords(records)
    }
    return records
  } catch (error) {
    console.error('Error loading records from localStorage:', error)
    return []
  }
}

export const saveRecords = (records) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (error) {
    console.error('Error saving records to localStorage:', error)
  }
}

export const addRecord = (newRecord) => {
  const record = normalizeRecord(newRecord)
  if (!record) return loadRecords()
  const records = [...loadRecords(), record]
  saveRecords(records)
  return records
}

export const deleteRecord = (id) => {
  const records = loadRecords().filter((record) => record.id !== id)
  saveRecords(records)
  return records
}

export const renameRecordCategory = (fromName, toName) => {
  const from = String(fromName || '').trim()
  const to = String(toName || '').trim()
  if (!from || !to || from === to) return loadRecords()
  const records = loadRecords().map((record) =>
    record.category === from ? { ...record, category: to } : record,
  )
  saveRecords(records)
  return records
}
