import { rememberCategoryColors } from '../lib/categories'
import {
  insertCategories as insertCloudCategories,
  insertCategory as insertCloudCategory,
  listCategories as listCloudCategories,
  removeCategory as removeCloudCategory,
  updateCategory as updateCloudCategory,
} from '../lib/db/categories'
import { listRecords, renameRecordCategory as renameCloudRecordCategory } from '../lib/db/records'
import { loadRecords, renameRecordCategory as renameLocalRecordCategory } from './localStorage'

const STORAGE_KEY = 'studylens_categories'
const LEGACY_KEY = 'studylens_subjects'

export const DEFAULT_CATEGORIES = [
  { name: 'Knowledge', color: '#3a5ba0' },
  { name: 'Technology', color: '#4f7f9e' },
  { name: 'Science', color: '#3d8b7a' },
  { name: 'Creativity', color: '#c46b8a' },
  { name: 'Language', color: '#8a7ca8' },
  { name: 'Thinking', color: '#c9a227' },
  { name: 'Health', color: '#9dbea8' },
  { name: 'Career', color: '#6b675f' },
  { name: 'Other', color: '#e07a5f' },
]

const PALETTE = DEFAULT_CATEGORIES.map((item) => item.color)

let cache = null

export function colorAt(index) {
  return PALETTE[index % PALETTE.length]
}

export function defaultCategoryList() {
  return DEFAULT_CATEGORIES.map((item, index) => ({
    id: `default-${item.name.toLowerCase()}`,
    name: item.name,
    color: item.color || colorAt(index),
  }))
}

function persistLocal(list) {
  cache = list
  rememberCategoryColors(list.map((item) => [item.name, item.color]))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (error) {
    console.error('Error saving categories:', error)
  }
  return list
}

function normalizeCategory(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name) return null
  return {
    id: typeof raw.id === 'string' ? raw.id : `${Date.now()}-${index}`,
    name,
    color: typeof raw.color === 'string' && raw.color ? raw.color : colorAt(index),
  }
}

function mergeRecordNames(list) {
  const next = [...list]
  loadRecords().forEach((record) => {
    const name = record.category?.trim()
    if (!name) return
    if (next.some((item) => item.name.toLowerCase() === name.toLowerCase())) return
    next.push({
      id: `seed-${next.length}-${name}`,
      name,
      color: colorAt(next.length),
    })
  })
  return next
}

function readStoredList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const list = parsed.map(normalizeCategory).filter(Boolean)
    return list.length > 0 ? list : null
  } catch (error) {
    console.error('Error loading categories:', error)
    return null
  }
}

export function loadLocalCategories() {
  if (cache) return cache
  const stored = readStoredList()
  if (stored) return persistLocal(stored)
  return persistLocal(mergeRecordNames(defaultCategoryList()))
}

export function loadCategories() {
  return loadLocalCategories()
}

function addLocalCategory(name) {
  const title = String(name || '').trim()
  if (!title) return loadLocalCategories()

  const current = loadLocalCategories()
  const existing = current.find((item) => item.name.toLowerCase() === title.toLowerCase())
  if (existing) return current

  return persistLocal([
    ...current,
    {
      id: `${Date.now()}`,
      name: title,
      color: colorAt(current.length),
    },
  ])
}

function renameLocalCategory(id, name) {
  const title = String(name || '').trim()
  const current = loadLocalCategories()
  const target = current.find((item) => item.id === id)
  if (!target) return { categories: current, records: loadRecords() }
  if (!title) return { categories: current, records: loadRecords() }
  const clash = current.find((item) => item.id !== id && item.name.toLowerCase() === title.toLowerCase())
  if (clash) return { categories: current, records: loadRecords() }
  const previous = target.name
  const categories = persistLocal(
    current.map((item) => (item.id === id ? { ...item, name: title } : item)),
  )
  const records = previous === title ? loadRecords() : renameLocalRecordCategory(previous, title)
  return { categories, records }
}

function removeLocalCategory(id) {
  return persistLocal(loadLocalCategories().filter((item) => item.id !== id))
}

function withColors(categories) {
  rememberCategoryColors((categories || []).map((item) => [item.name, item.color]))
  return categories || []
}

async function ensureCloudDefaults(userId, current) {
  if (current.length > 0) return { ok: true, categories: current }
  const seeded = await insertCloudCategories(userId, DEFAULT_CATEGORIES)
  if (!seeded.ok) {
    const retry = await listCloudCategories(userId)
    if (retry.ok && retry.categories.length > 0) return retry
    return seeded
  }
  return listCloudCategories(userId)
}

export async function listCategories(userId) {
  if (!userId) {
    return { ok: true, categories: withColors(loadLocalCategories()) }
  }

  const result = await listCloudCategories(userId)
  if (!result.ok) return result
  const ensured = await ensureCloudDefaults(userId, result.categories)
  if (!ensured.ok) return ensured
  return { ok: true, categories: withColors(ensured.categories) }
}

export async function createCategory(userId, name) {
  const title = String(name || '').trim()
  if (!title) return { ok: false, categories: [], error: 'star.needName' }

  if (!userId) {
    return { ok: true, categories: withColors(addLocalCategory(title)) }
  }

  const current = await listCloudCategories(userId)
  if (!current.ok) return current
  const existing = current.categories.find((item) => item.name.toLowerCase() === title.toLowerCase())
  if (existing) return { ok: true, categories: withColors(current.categories) }

  const inserted = await insertCloudCategory(userId, {
    name: title,
    color: colorAt(current.categories.length),
  })
  if (!inserted.ok) return { ...inserted, categories: current.categories }
  return listCategories(userId)
}

export async function renameCategory(userId, id, name) {
  const title = String(name || '').trim()
  if (!title) return { ok: false, categories: [], error: 'star.needName' }

  if (!userId) {
    const next = renameLocalCategory(id, title)
    return { ok: true, categories: withColors(next.categories), records: next.records }
  }

  const current = await listCloudCategories(userId)
  if (!current.ok) return current
  const target = current.categories.find((item) => item.id === id)
  if (!target) return { ok: false, categories: withColors(current.categories), error: 'star.categoryGone' }
  const clash = current.categories.find((item) => item.id !== id && item.name.toLowerCase() === title.toLowerCase())
  if (clash) return { ok: true, categories: withColors(current.categories) }

  const updated = await updateCloudCategory(userId, id, { name: title, color: target.color })
  if (!updated.ok) return { ...updated, categories: current.categories }

  if (target.name !== title) {
    const renamed = await renameCloudRecordCategory(userId, target.name, title)
    if (!renamed.ok) return { ...renamed, categories: withColors(current.categories) }
  }

  const listed = await listCategories(userId)
  if (!listed.ok) return listed
  const records = await listRecords(userId)
  return {
    ok: true,
    categories: listed.categories,
    records: records.ok ? records.records : undefined,
  }
}

export async function deleteCategory(userId, id) {
  if (!userId) {
    return { ok: true, categories: withColors(removeLocalCategory(id)) }
  }

  const removed = await removeCloudCategory(userId, id)
  if (!removed.ok) return { ...removed, categories: [] }
  return listCategories(userId)
}

export const addCategory = (name) => addLocalCategory(name)
export const removeCategory = (id) => removeLocalCategory(id)
