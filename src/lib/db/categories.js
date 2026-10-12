import { supabase } from '../supabase'
import { dbError } from './errors'

export function mapCategory(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
  }
}

export async function listCategories(userId) {
  if (!userId) return { ok: false, categories: [], error: 'Sign in to load categories.' }
  const { data, error } = await supabase
    .from('categories')
    .select('id, user_id, name, color')
    .eq('user_id', userId)
    .order('name')
  if (error) {
    console.error('Error loading categories:', error)
    return { ok: false, categories: [], error: error.message || 'Could not load categories.' }
  }
  return { ok: true, categories: (data || []).map(mapCategory) }
}

export async function insertCategories(userId, categories) {
  if (!userId) return { ok: false, error: 'Sign in to add a category.' }
  const seen = new Set()
  const rows = []
  ;(categories || []).forEach((item) => {
    const name = String(item?.name || '').trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) return
    seen.add(key)
    rows.push({
      user_id: userId,
      name,
      color: item.color || '#3a5ba0',
    })
  })
  if (rows.length === 0) return { ok: true, categories: [] }
  const { data, error } = await supabase
    .from('categories')
    .insert(rows)
    .select('id, user_id, name, color')
  if (error) return dbError(error, 'Could not import those categories.')
  return { ok: true, categories: (data || []).map(mapCategory) }
}

export async function insertCategory(userId, { name, color }) {
  if (!userId) return { ok: false, error: 'Sign in to add a category.' }
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name, color })
    .select('id, user_id, name, color')
    .single()
  if (error) return dbError(error, 'Could not save that category.')
  return { ok: true, category: mapCategory(data) }
}

export async function updateCategory(userId, id, { name, color }) {
  if (!userId) return { ok: false, error: 'Sign in to update a category.' }
  const patch = {}
  if (typeof name === 'string') patch.name = name.trim()
  if (typeof color === 'string' && color) patch.color = color
  if (Object.keys(patch).length === 0) return { ok: false, error: 'Nothing to update.' }
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, user_id, name, color')
    .single()
  if (error) return dbError(error, 'Could not rename that category.')
  return { ok: true, category: mapCategory(data) }
}

export async function removeCategory(userId, id) {
  if (!userId) return { ok: false, error: 'Sign in to delete a category.' }
  const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', userId)
  if (error) return dbError(error, 'Could not delete that category.')
  return { ok: true }
}
