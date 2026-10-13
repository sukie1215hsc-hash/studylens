import {
  normalizeVisibility,
  toGalaxyCard,
  toPublicMapPoint,
  toPublicStar,
} from '../lib/communityModel'
import {
  countCommentsByReflectionIds,
  deleteComment as deleteCloudComment,
  insertComment,
  listComments as listCloudComments,
} from '../lib/db/comments'
import {
  deletePublicGalaxy,
  getGalaxyByUserId,
  listPublicGalaxies,
  upsertPublicGalaxy,
} from '../lib/db/galaxies'
import { ensureProfile, listProfilesByUserIds } from '../lib/db/profiles'
import {
  deleteReflection as deleteCloudReflection,
  getReflection as getCloudReflection,
  insertReflection,
  listReflections as listCloudReflections,
  updateReflection,
} from '../lib/db/reflections'

function excerpt(body) {
  const text = String(body || '').replace(/\s+/g, ' ').trim()
  if (text.length <= 180) return text
  return `${text.slice(0, 177).trim()}…`
}

function hashSeed(value) {
  let hash = 2166136261
  const text = String(value)
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619)
  }
  return (hash >>> 0) / 4294967296
}

function profilesByUserId(profiles) {
  const map = new Map()
  ;(profiles || []).forEach((profile) => {
    if (profile?.userId) map.set(profile.userId, profile)
  })
  return map
}

function cardFromRow(row, profile) {
  if (!row) return null
  const username = profile?.username || row.title || ''
  const identity = profile || {
    id: row.user_id,
    userId: row.user_id,
    username,
  }
  return toGalaxyCard(identity, {
    id: row.id,
    profileId: identity.id,
    userId: row.user_id,
    isPublic: true,
    visibility: row.visibility,
    includeNotes: row.include_notes,
    publishedAt: row.created_at,
    updatedAt: row.created_at,
    map: Array.isArray(row.map) ? row.map : [],
    stars: Array.isArray(row.stars) ? row.stars : [],
    stats: row.stats && typeof row.stats === 'object' ? row.stats : {},
  })
}

async function loadProfileMap(userIds) {
  const listed = await listProfilesByUserIds(userIds)
  if (!listed.ok) return profilesByUserId([])
  return profilesByUserId(listed.profiles)
}

function toReflectionView(row, profile, galaxy, commentCount) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    username: profile?.username || '',
    title: row.title,
    body: row.body,
    excerpt: excerpt(row.body),
    category: row.category || '',
    createdAt: row.created_at,
    updatedAt: row.created_at,
    stamp: formatStamp(row.created_at),
    commentCount: commentCount || 0,
    galaxy: galaxy || null,
    galaxyId: row.galaxy_id || null,
  }
}

async function hydrateReflections(rows) {
  const list = Array.isArray(rows) ? rows : []
  const userIds = list.map((row) => row.user_id)
  const [profileMap, galaxiesResult, countsResult] = await Promise.all([
    loadProfileMap(userIds),
    listPublicGalaxies(),
    countCommentsByReflectionIds(list.map((row) => row.id)),
  ])
  if (!galaxiesResult.ok) return { ok: false, reflections: [], error: galaxiesResult.error }
  if (!countsResult.ok) return { ok: false, reflections: [], error: countsResult.error }

  const galaxyById = new Map()
  galaxiesResult.galaxies.forEach((row) => galaxyById.set(row.id, row))

  return {
    ok: true,
    reflections: list
      .map((row) => {
        const profile = profileMap.get(row.user_id)
        const galaxyRow = row.galaxy_id ? galaxyById.get(row.galaxy_id) : null
        const galaxy =
          galaxyRow && galaxyRow.user_id === row.user_id
            ? cardFromRow(galaxyRow, profileMap.get(galaxyRow.user_id) || profile)
            : null
        return toReflectionView(row, profile, galaxy, countsResult.counts[row.id] || 0)
      })
      .filter(Boolean),
  }
}

export function publicMapFromRecords(records) {
  const list = Array.isArray(records) ? records : []
  const grouped = new Map()
  list.forEach((record) => {
    const key = record.category || 'Other'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(record)
  })
  const categories = [...grouped.keys()]
  const map = []
  categories.forEach((category, ringIndex) => {
    const items = grouped.get(category).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)))
    const radius =
      categories.length === 1 ? 0.28 : 0.16 + (ringIndex / Math.max(1, categories.length - 1)) * 0.3
    const twist = hashSeed(category) * Math.PI * 2
    const arc = Math.min(1.05, 0.22 + items.length * 0.11)
    items.forEach((record, index) => {
      const jitter = (hashSeed(record.id) - 0.5) * 0.05
      const along = items.length === 1 ? 0.5 : index / (items.length - 1)
      const angle = twist + (along - 0.5) * arc + jitter
      const radial = radius + (hashSeed(`${record.id}-r`) - 0.5) * 0.03
      map.push(
        toPublicMapPoint({
          x: Math.min(0.97, Math.max(0.03, 0.5 + Math.cos(angle) * radial)),
          y: Math.min(0.96, Math.max(0.06, 0.5 + Math.sin(angle) * radial * 0.78)),
          r: Math.min(8, 5.2 + Math.log((Number(record.duration) || 0) + 1) * 2.1),
          category,
        }),
      )
    })
  })
  return map
}

export function formatStamp(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function ensureAccountProfile(account) {
  if (!account?.id) return { ok: false, error: 'Sign in first.' }
  return ensureProfile(account)
}

export async function getAccountGalaxy(account) {
  if (!account?.id) return null
  const result = await getGalaxyByUserId(account.id)
  if (!result.ok || !result.galaxy) return null
  const listed = await listProfilesByUserIds([account.id])
  const profile = listed.ok ? listed.profiles[0] : null
  return cardFromRow(result.galaxy, profile || { id: account.id, userId: account.id, username: account.username })
}

export async function listPublicGalaxyCards() {
  const listed = await listPublicGalaxies()
  if (!listed.ok) return listed
  const profileMap = await loadProfileMap(listed.galaxies.map((row) => row.user_id))
  return {
    ok: true,
    galaxies: listed.galaxies
      .map((row) => cardFromRow(row, profileMap.get(row.user_id)))
      .filter(Boolean),
  }
}

export async function publishAccountGalaxy(account, records, options = {}) {
  if (!account?.id) {
    return { ok: false, error: 'Sign in before publishing.' }
  }

  const ensured = await ensureProfile(account)
  if (!ensured.ok) return ensured
  const username = String(ensured.profile?.username || account.username || '').trim()
  if (!username) {
    return { ok: false, error: 'Your profile needs a public nickname.' }
  }

  const visibility = normalizeVisibility(options.visibility)
  const includeNotes = visibility === 'records' && Boolean(options.includeNotes)
  const source = Array.isArray(records) ? records : []
  const minutes = source.reduce((sum, record) => sum + (Number(record.duration) || 0), 0)
  const categories = [...new Set(source.map((record) => record.category).filter(Boolean))]

  const existing = await getGalaxyByUserId(account.id)
  if (!existing.ok) return existing

  const result = await upsertPublicGalaxy(account.id, {
    title: username,
    visibility,
    includeNotes,
    map: publicMapFromRecords(source),
    stars: visibility === 'records' ? source.map((record) => toPublicStar(record, includeNotes)).filter(Boolean) : [],
    stats: {
      starCount: source.length,
      hours: Math.round((minutes / 60) * 10) / 10,
      categories,
    },
  })
  if (!result.ok) return result

  const card = cardFromRow(result.galaxy, ensured.profile)
  if (!card) return { ok: false, error: 'The galaxy could not be marked public.' }
  return { ok: true, updated: Boolean(existing.galaxy), card }
}

export async function unpublishAccountGalaxy(account) {
  if (!account?.id) {
    return { ok: false, error: 'Sign in before withdrawing a publication.' }
  }

  const existing = await getGalaxyByUserId(account.id)
  if (!existing.ok) return existing
  if (!existing.galaxy) {
    return { ok: false, error: 'There is no public galaxy to withdraw.' }
  }

  return deletePublicGalaxy(account.id)
}

export async function listReflections() {
  const listed = await listCloudReflections()
  if (!listed.ok) return listed
  return hydrateReflections(listed.reflections)
}

export async function getReflection(id) {
  const result = await getCloudReflection(id)
  if (!result.ok) return { ok: false, item: null, error: result.error }
  if (!result.reflection) return { ok: true, item: null }
  const hydrated = await hydrateReflections([result.reflection])
  if (!hydrated.ok) return { ok: false, item: null, error: hydrated.error }
  return { ok: true, item: hydrated.reflections[0] || null }
}

let publishReflectionInFlight = false

export async function publishReflection(account, entry) {
  if (!account?.id) return { ok: false, error: 'Sign in before sharing a reflection.' }
  const title = String(entry?.title || '').trim()
  const body = String(entry?.body || '').trim()
  if (!title) return { ok: false, error: 'community.needTitle' }
  if (!body) return { ok: false, error: 'community.needBody' }
  if (publishReflectionInFlight) {
    return { ok: false, error: 'community.publishFail' }
  }

  publishReflectionInFlight = true
  try {
    const ensured = await ensureProfile(account)
    if (!ensured.ok) return ensured

    if (entry?.id) {
      const current = await getCloudReflection(entry.id)
      if (!current.ok) return current
      if (!current.reflection) return { ok: false, error: 'That reflection is already gone.' }
      if (current.reflection.user_id !== account.id) {
        return { ok: false, error: 'You can only edit your own reflections.' }
      }
    }

    const publicGalaxy = await getAccountGalaxy(account)
    const payload = {
      title,
      body,
      category: String(entry?.category || '').trim(),
      galaxyId: Boolean(entry?.linkGalaxy) && publicGalaxy ? publicGalaxy.id : null,
    }

    const saved = entry?.id
      ? await updateReflection(account.id, entry.id, payload)
      : await insertReflection(account.id, payload)
    if (!saved.ok) return saved

    const hydrated = await hydrateReflections([saved.item])
    if (!hydrated.ok) return hydrated
    return { ok: true, updated: Boolean(entry?.id), item: hydrated.reflections[0] }
  } finally {
    publishReflectionInFlight = false
  }
}

export async function deleteReflection(account, id) {
  if (!account?.id) return { ok: false, error: 'Sign in before deleting a reflection.' }
  const current = await getCloudReflection(id)
  if (!current.ok) return current
  if (!current.reflection) return { ok: false, error: 'That reflection is already gone.' }
  if (current.reflection.user_id !== account.id) {
    return { ok: false, error: 'You can only delete your own reflections.' }
  }
  return deleteCloudReflection(account.id, id)
}

export async function listComments(reflectionId) {
  const listed = await listCloudComments(reflectionId)
  if (!listed.ok) return listed
  const profileMap = await loadProfileMap(listed.comments.map((row) => row.user_id))
  return {
    ok: true,
    comments: listed.comments.map((row) => ({
      id: row.id,
      reflectionId: row.reflection_id,
      userId: row.user_id,
      username: profileMap.get(row.user_id)?.username || '',
      body: row.body,
      createdAt: row.created_at,
      stamp: formatStamp(row.created_at),
    })),
  }
}

export async function addComment(account, reflectionId, body) {
  if (!account?.id) return { ok: false, error: 'Sign in to comment.' }
  const text = String(body || '').trim()
  if (!text) return { ok: false, error: 'community.needComment' }

  const reflection = await getCloudReflection(reflectionId)
  if (!reflection.ok) return reflection
  if (!reflection.reflection) return { ok: false, error: 'That reflection is no longer here.' }

  const ensured = await ensureProfile(account)
  if (!ensured.ok) return ensured

  const inserted = await insertComment(account.id, reflectionId, text)
  if (!inserted.ok) return inserted
  return listComments(reflectionId)
}

export async function removeComment(account, commentId, reflectionId) {
  if (!account?.id) return { ok: false, error: 'Sign in to delete a comment.' }
  if (!commentId) return { ok: false, error: 'That comment is already gone.' }
  const removed = await deleteCloudComment(account.id, commentId)
  if (!removed.ok) return removed
  return listComments(reflectionId)
}
