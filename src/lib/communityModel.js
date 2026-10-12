/**
 * Community data shape.
 *
 * User            → signed-in account (id, username, email)
 * Profile         → public identity (username, whether the galaxy is shared)
 * PublicGalaxy    → a published snapshot of that profile's stars
 * PublicAchievement → a shared completed task on the feed
 */

export function createUser(partial = {}) {
  return {
    id: partial.id || `user-${Date.now()}`,
    username: typeof partial.username === 'string' ? partial.username.trim() : '',
    email: typeof partial.email === 'string' ? partial.email.trim().toLowerCase() : '',
  }
}

export function createProfile(user, partial = {}) {
  return {
    id: partial.id || `profile-${user.id}`,
    userId: user.id,
    username: typeof partial.username === 'string' ? partial.username.trim() : '',
    galaxyPublic: Boolean(partial.galaxyPublic),
  }
}

export function normalizeVisibility(value) {
  return value === 'records' ? 'records' : 'galaxy'
}

export function toPublicStar(record, includeNotes = false) {
  if (!record) return null
  const star = {
    id: record.id,
    title: typeof record.title === 'string' ? record.title : '',
    category: typeof record.category === 'string' ? record.category : '',
    duration: Number(record.duration) || 0,
    date: typeof record.date === 'string' ? record.date : '',
  }
  if (includeNotes && typeof record.notes === 'string' && record.notes.trim()) {
    star.notes = record.notes.trim()
  }
  return star
}

export function toPublicMapPoint(point) {
  if (!point) return null
  return {
    x: Number(point.x) || 0,
    y: Number(point.y) || 0,
    r: Number(point.r) || 0,
    category: typeof point.category === 'string' ? point.category : '',
  }
}

export function createPublicGalaxy(profile, partial = {}) {
  const visibility = normalizeVisibility(partial.visibility)
  const includeNotes = visibility === 'records' && Boolean(partial.includeNotes)
  const stars =
    visibility === 'records'
      ? (Array.isArray(partial.stars) ? partial.stars : [])
          .map((star) => toPublicStar(star, includeNotes))
          .filter(Boolean)
      : []
  const map = (Array.isArray(partial.map) ? partial.map : []).map(toPublicMapPoint).filter(Boolean)
  const categories = partial.categories || [...new Set(map.map((point) => point.category).filter(Boolean))]
  const minutes = (Array.isArray(partial.stars) ? partial.stars : []).reduce(
    (sum, star) => sum + (Number(star.duration) || 0),
    0,
  )
  const isPublic = partial.isPublic ?? profile.galaxyPublic !== false
  return {
    id: partial.id || `galaxy-${profile.id}`,
    profileId: profile.id,
    userId: profile.userId,
    isPublic,
    visibility,
    includeNotes,
    publishedAt: partial.publishedAt || null,
    updatedAt: partial.updatedAt || partial.publishedAt || null,
    stats: {
      starCount: partial.stats?.starCount ?? (visibility === 'records' ? stars.length : map.length),
      hours: partial.stats?.hours ?? Math.round((minutes / 60) * 10) / 10,
      categories,
    },
    stars,
    map,
  }
}

export function createReflection(profile, partial = {}) {
  const now = partial.createdAt || new Date().toISOString()
  return {
    id: partial.id || `reflection-${Date.now()}`,
    profileId: profile.id,
    userId: profile.userId,
    username: profile.username,
    title: typeof partial.title === 'string' ? partial.title.trim() : '',
    body: typeof partial.body === 'string' ? partial.body.trim() : '',
    category: typeof partial.category === 'string' ? partial.category.trim() : '',
    linkGalaxy: Boolean(partial.linkGalaxy),
    galaxyId: partial.linkGalaxy && partial.galaxyId ? partial.galaxyId : null,
    createdAt: now,
    updatedAt: partial.updatedAt || now,
  }
}

export function createComment(profile, reflectionId, partial = {}) {
  return {
    id: partial.id || `comment-${Date.now()}`,
    reflectionId,
    profileId: profile.id,
    userId: profile.userId,
    username: profile.username,
    body: typeof partial.body === 'string' ? partial.body.trim() : '',
    createdAt: partial.createdAt || new Date().toISOString(),
  }
}

export function createPublicAchievement(profile, partial = {}) {
  return {
    id: partial.id || `achievement-${Date.now()}`,
    profileId: profile.id,
    userId: profile.userId,
    username: profile.username,
    title: typeof partial.title === 'string' ? partial.title.trim() : '',
    category: typeof partial.category === 'string' ? partial.category : '',
    hours: Number(partial.hours) || 0,
    reflection: typeof partial.reflection === 'string' ? partial.reflection.trim() : '',
  }
}

export function toGalaxyCard(profile, galaxy) {
  if (!profile || !galaxy || !galaxy.isPublic) return null
  const visibility = normalizeVisibility(galaxy.visibility)
  const includeNotes = visibility === 'records' && Boolean(galaxy.includeNotes)
  return {
    id: galaxy.id,
    profileId: profile.id,
    username: profile.username,
    visibility,
    includeNotes,
    stars: galaxy.stats?.starCount ?? 0,
    hours: galaxy.stats?.hours ?? 0,
    categories: galaxy.stats?.categories ?? [],
    map: (galaxy.map || []).map(toPublicMapPoint).filter(Boolean),
    records:
      visibility === 'records'
        ? (galaxy.stars || []).map((star) => toPublicStar(star, includeNotes)).filter(Boolean)
        : [],
    publishedAt: galaxy.publishedAt || null,
    updatedAt: galaxy.updatedAt || null,
  }
}

export function toFeedItem(achievement) {
  if (!achievement) return null
  return {
    id: achievement.id,
    user: achievement.username,
    title: achievement.title,
    category: achievement.category,
    hours: achievement.hours,
    reflection: achievement.reflection,
  }
}
