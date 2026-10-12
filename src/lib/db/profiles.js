import { supabase } from '../supabase'
import { dbError } from './errors'

export function mapProfile(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    createdAt: row.created_at,
  }
}

export async function getProfileByUserId(userId) {
  if (!userId) {
    return { ok: false, profile: null, error: 'Sign in first.' }
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, username, created_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('Error loading profile:', error)
    return { ok: false, profile: null, error: error.message || 'Could not load profile.' }
  }
  return { ok: true, profile: mapProfile(data), error: null }
}

export async function isUsernameTaken(username) {
  const name = String(username || '').trim()
  if (!name) return { ok: true, taken: false, error: null }
  const escaped = name.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
  const { data, error } = await supabase.from('profiles').select('id').ilike('username', escaped).limit(1)
  if (error) {
    console.error('Error checking username:', error)
    return { ok: false, taken: false, error: error.message || 'Could not check that username.' }
  }
  return { ok: true, taken: (data || []).length > 0, error: null }
}

export async function listProfilesByUserIds(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  if (ids.length === 0) return { ok: true, profiles: [], error: null }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, username, created_at')
    .in('user_id', ids)
  if (error) {
    console.error('Error loading profiles:', error)
    return { ok: false, profiles: [], error: error.message || 'Could not load profiles.' }
  }
  return { ok: true, profiles: (data || []).map(mapProfile), error: null }
}

function displayUsername(account) {
  const fromName = String(account?.username || '').trim()
  if (fromName.length >= 2) return fromName.slice(0, 24)
  const fromEmail = String(account?.email || '').split('@')[0].trim()
  if (fromEmail.length >= 2) return fromEmail.slice(0, 24)
  return 'learner'
}

export async function ensureProfile(account) {
  if (!account?.id) return { ok: false, profile: null, error: 'Sign in first.' }

  const existing = await getProfileByUserId(account.id)
  if (!existing.ok) {
    return { ok: false, profile: null, error: existing.error || 'Could not load profile.' }
  }

  if (existing.profile) {
    const nextName = String(account.username || '').trim()
    if (nextName.length >= 2 && nextName !== existing.profile.username) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ username: nextName.slice(0, 24) })
        .eq('user_id', account.id)
        .select('id, user_id, username, created_at')
        .single()
      if (error) return { ...dbError(error, 'Could not update profile.'), profile: existing.profile }
      return { ok: true, profile: mapProfile(data), error: null }
    }
    return { ok: true, profile: existing.profile, error: null }
  }

  const username = displayUsername(account)

  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: account.id, username })
    .select('id, user_id, username, created_at')
    .single()
  if (error) return { ...dbError(error, 'Could not create profile.'), profile: null }
  return { ok: true, profile: mapProfile(data), error: null }
}
