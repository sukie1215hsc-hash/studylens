import { supabase } from '../supabase'
import { dbError } from './errors'

export function mapRecord(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    category: row.category || '',
    duration: Number(row.duration) || 0,
    date: row.date,
    notes: row.notes || '',
    missionId: row.mission_id || null,
    createdAt: row.created_at,
  }
}

export async function listRecords(userId) {
  if (!userId) return { ok: false, records: [], error: 'Sign in to load stars.' }
  const { data, error } = await supabase
    .from('learning_records')
    .select('id, user_id, title, category, duration, date, notes, mission_id, created_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) {
    console.error('Error loading records:', error)
    return { ok: false, records: [], error: error.message || 'Could not load stars.' }
  }
  return { ok: true, records: (data || []).map(mapRecord) }
}

export async function insertRecords(userId, records) {
  if (!userId) return { ok: false, error: 'Sign in to save a star.' }
  const rows = (records || [])
    .map((record) => ({
      user_id: userId,
      title: record.title,
      category: record.category || '',
      duration: record.duration,
      date: record.date,
      notes: record.notes || '',
      mission_id: record.missionId || null,
    }))
    .filter((row) => row.title && row.date && Number(row.duration) > 0)
  if (rows.length === 0) return { ok: true, records: [] }
  const { data, error } = await supabase
    .from('learning_records')
    .insert(rows)
    .select('id, user_id, title, category, duration, date, notes, mission_id, created_at')
  if (error) return dbError(error, 'Could not import those stars.')
  return { ok: true, records: (data || []).map(mapRecord) }
}

export async function insertRecord(userId, record) {
  if (!userId) return { ok: false, error: 'Sign in to save a star.' }
  const { data, error } = await supabase
    .from('learning_records')
    .insert({
      user_id: userId,
      title: record.title,
      category: record.category || '',
      duration: record.duration,
      date: record.date,
      notes: record.notes || '',
      mission_id: record.missionId || null,
    })
    .select('id, user_id, title, category, duration, date, notes, mission_id, created_at')
    .single()
  if (error) return dbError(error, 'Could not save that star.')
  return { ok: true, record: mapRecord(data) }
}

export async function renameRecordCategory(userId, fromName, toName) {
  if (!userId) return { ok: false, error: 'Sign in to update stars.' }
  const from = String(fromName || '').trim()
  const to = String(toName || '').trim()
  if (!from || !to || from === to) return { ok: true }
  const { error } = await supabase
    .from('learning_records')
    .update({ category: to })
    .eq('user_id', userId)
    .eq('category', from)
  if (error) return dbError(error, 'Could not update stars for that category.')
  return { ok: true }
}

export async function removeRecord(userId, id) {
  if (!userId) return { ok: false, error: 'Sign in to delete a star.' }
  const { error } = await supabase.from('learning_records').delete().eq('id', id).eq('user_id', userId)
  if (error) return dbError(error, 'Could not delete that star.')
  return { ok: true }
}
