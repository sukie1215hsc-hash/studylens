import { supabase } from '../supabase'
import { dbError } from './errors'

export function mapReflection(row, extras = {}) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    username: extras.username || '',
    title: row.title,
    body: row.body,
    category: row.category || '',
    galaxyId: row.galaxy_id,
    createdAt: row.created_at,
    stamp: extras.stamp || '',
    excerpt: extras.excerpt || '',
    commentCount: extras.commentCount ?? 0,
    galaxy: extras.galaxy || null,
  }
}

export async function listReflections() {
  const { data, error } = await supabase
    .from('reflections')
    .select('id, user_id, title, body, category, galaxy_id, created_at')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Error loading reflections:', error)
    return { ok: false, reflections: [], error: error.message || 'Could not load reflections.' }
  }
  return { ok: true, reflections: data || [] }
}

export async function getReflection(id) {
  if (!id) return { ok: true, reflection: null }
  const { data, error } = await supabase
    .from('reflections')
    .select('id, user_id, title, body, category, galaxy_id, created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('Error loading reflection:', error)
    return { ok: false, reflection: null, error: error.message || 'Could not load that reflection.' }
  }
  return { ok: true, reflection: data }
}

export async function insertReflection(userId, entry) {
  if (!userId) return { ok: false, error: 'Sign in before sharing a reflection.' }
  const { data, error } = await supabase
    .from('reflections')
    .insert({
      user_id: userId,
      title: entry.title,
      body: entry.body,
      category: entry.category || '',
      galaxy_id: entry.galaxyId || null,
    })
    .select('id, user_id, title, body, category, galaxy_id, created_at')
    .single()
  if (error) return dbError(error, 'Could not publish.')
  return { ok: true, item: data }
}

export async function updateReflection(userId, id, entry) {
  if (!userId) return { ok: false, error: 'Sign in before sharing a reflection.' }
  const { data, error } = await supabase
    .from('reflections')
    .update({
      title: entry.title,
      body: entry.body,
      category: entry.category || '',
      galaxy_id: entry.galaxyId || null,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, user_id, title, body, category, galaxy_id, created_at')
    .single()
  if (error) return dbError(error, 'Could not save that reflection.')
  return { ok: true, updated: true, item: data }
}

export async function deleteReflection(userId, id) {
  if (!userId) return { ok: false, error: 'Sign in before deleting a reflection.' }
  const { error } = await supabase.from('reflections').delete().eq('id', id).eq('user_id', userId)
  if (error) return dbError(error, 'Could not delete that reflection.')
  return { ok: true }
}
