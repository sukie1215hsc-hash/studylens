import { supabase } from '../supabase'
import { dbError } from './errors'

export function mapComment(row, username) {
  if (!row) return null
  return {
    id: row.id,
    reflectionId: row.reflection_id,
    userId: row.user_id,
    username: username || '',
    body: row.body,
    createdAt: row.created_at,
  }
}

export async function listComments(reflectionId) {
  if (!reflectionId) return { ok: true, comments: [] }
  const { data, error } = await supabase
    .from('comments')
    .select('id, reflection_id, user_id, body, created_at')
    .eq('reflection_id', reflectionId)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Error loading comments:', error)
    return { ok: false, comments: [], error: error.message || 'Could not load comments.' }
  }
  return { ok: true, comments: data || [] }
}

export async function countCommentsByReflectionIds(ids) {
  const reflectionIds = [...new Set((ids || []).filter(Boolean))]
  if (reflectionIds.length === 0) return { ok: true, counts: {} }
  const { data, error } = await supabase
    .from('comments')
    .select('reflection_id')
    .in('reflection_id', reflectionIds)
  if (error) {
    console.error('Error counting comments:', error)
    return { ok: false, counts: {}, error: error.message || 'Could not load comments.' }
  }
  return {
    ok: true,
    counts: (data || []).reduce((counts, row) => {
      counts[row.reflection_id] = (counts[row.reflection_id] || 0) + 1
      return counts
    }, {}),
  }
}

export async function insertComment(userId, reflectionId, body) {
  if (!userId) return { ok: false, error: 'Sign in to comment.' }
  const { data, error } = await supabase
    .from('comments')
    .insert({
      user_id: userId,
      reflection_id: reflectionId,
      body,
    })
    .select('id, reflection_id, user_id, body, created_at')
    .single()
  if (error) return dbError(error, 'Could not save that comment.')
  return { ok: true, comment: data }
}

export async function deleteComment(userId, id) {
  if (!userId) return { ok: false, error: 'Sign in to delete a comment.' }
  const { error } = await supabase.from('comments').delete().eq('id', id).eq('user_id', userId)
  if (error) return dbError(error, 'Could not delete that comment.')
  return { ok: true }
}
