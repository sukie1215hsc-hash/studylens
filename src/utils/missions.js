const STORAGE_KEY = 'studylens_today_missions'

export function todayKey() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function normalizeTask(raw) {
  if (!raw || typeof raw !== 'object') return null
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) return null
  return {
    id: typeof raw.id === 'string' ? raw.id : `${Date.now()}`,
    title,
    done: Boolean(raw.done),
    starId: typeof raw.starId === 'string' ? raw.starId : null,
  }
}

export function loadMissions() {
  const today = todayKey()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { date: today, tasks: [] }

    const parsed = JSON.parse(raw)
    if (!parsed || parsed.date !== today || !Array.isArray(parsed.tasks)) {
      const empty = { date: today, tasks: [] }
      saveMissions(empty)
      return empty
    }

    return {
      date: today,
      tasks: parsed.tasks.map(normalizeTask).filter(Boolean),
    }
  } catch (error) {
    console.error('Error loading missions from localStorage:', error)
    return { date: today, tasks: [] }
  }
}

export function saveMissions(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error('Error saving missions to localStorage:', error)
  }
}

export function addMission(title) {
  const current = loadMissions()
  const task = normalizeTask({
    id: `${Date.now()}`,
    title,
    done: false,
  })
  if (!task) return current
  const next = { date: current.date, tasks: [...current.tasks, task] }
  saveMissions(next)
  return next
}

export function toggleMission(id) {
  const current = loadMissions()
  const next = {
    date: current.date,
    tasks: current.tasks.map((task) => {
      if (task.id !== id) return task
      if (task.starId) return task
      return { ...task, done: !task.done }
    }),
  }
  saveMissions(next)
  return next
}

export function clearMissionStarByStarId(starId) {
  if (!starId) return loadMissions()
  const current = loadMissions()
  const next = {
    date: current.date,
    tasks: current.tasks.map((task) =>
      task.starId === starId ? { ...task, starId: null } : task,
    ),
  }
  saveMissions(next)
  return next
}

export function markMissionStarred(id, starId) {
  const current = loadMissions()
  const next = {
    date: current.date,
    tasks: current.tasks.map((task) =>
      task.id === id ? { ...task, done: true, starId } : task,
    ),
  }
  saveMissions(next)
  return next
}

export function removeMission(id) {
  const current = loadMissions()
  const next = {
    date: current.date,
    tasks: current.tasks.filter((task) => task.id !== id),
  }
  saveMissions(next)
  return next
}
