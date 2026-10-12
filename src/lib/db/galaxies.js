import { supabase } from '../supabase'
import { dbError } from './errors'

export function mapGalaxy(row, profile) {
  if (!row) return null
  const visibility = row.visibility === 'records' ? 'records' : 'galaxy'
  const includeNotes = visibility === 'records' && Boolean(row.include_notes)
  const stats = row.stats && typeof row.stats === 'object' ? row.stats : {}
  return {
    id: row.id,
    userId: row.user_id,
    profileId: profile?.id || null,
    username: profile?.username || row.title || '',
    title: row.title || '',
    visibility,
    includeNotes,
    map: Array.isArray(row.map) ? row.map : [],
    records: visibility === 'records' && Array.isArray(row.stars) ? row.stars : [],
    stars: stats.starCount ?? 0,
    hours: stats.hours ?? 0,
    categories: stats.categories ?? [],
    stats,
    publishedAt: row.created_at,
    updatedAt: row.created_at,
  }
}

export async function getGalaxyByUserId(userId) {
  if (!userId) return { ok: false, galaxy: null, error: 'Sign in to load this galaxy.' }
  const { data, error } = await supabase.from('public_galaxies').select('*').eq('user_id', userId).maybeSingle()
  if (error) {
    console.error('Error loading galaxy:', error)
    return { ok: false, galaxy: null, error: error.message || 'Could not load this galaxy.' }
  }
  return { ok: true, galaxy: data }
}

export async function listPublicGalaxies() {
  const { data, error } = await supabase
    .from('public_galaxies')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Error loading galaxies:', error)
    return { ok: false, galaxies: [], error: error.message || 'Could not load galaxies.' }
  }
  return { ok: true, galaxies: data || [] }
}

export async function upsertPublicGalaxy(userId, payload) {
  if (!userId) return { ok: false, error: 'Sign in before publishing.' }
  const row = {
    user_id: userId,
    title: payload.title || '',
    visibility: payload.visibility === 'records' ? 'records' : 'galaxy',
    include_notes: Boolean(payload.includeNotes),
    map: payload.map || [],
    stars: payload.stars || [],
    stats: payload.stats || {},
  }
  const { data, error } = await supabase
    .from('public_galaxies')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) return dbError(error, 'Could not publish this galaxy.')
  return { ok: true, galaxy: data }
}

export async function deletePublicGalaxy(userId) {
  if (!userId) return { ok: false, error: 'Sign in before withdrawing a publication.' }
  const { error } = await supabase.from('public_galaxies').delete().eq('user_id', userId)
  if (error) return dbError(error, 'Could not withdraw this publication.')
  return { ok: true }
}
