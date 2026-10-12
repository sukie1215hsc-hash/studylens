import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { addMission, loadMissions, removeMission, toggleMission } from '../utils/missions'
import styles from './TodaysMissions.module.css'

export default function TodaysMissions({
  onCreateStar,
  focusComposer = 0,
  refreshKey = 0,
  leavingMissionId = null,
}) {
  const { t } = useI18n()
  const [missions, setMissions] = useState(() => loadMissions())
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const activeTasks = missions.tasks.filter(
    (task) => !task.starId || task.id === leavingMissionId,
  )
  const completed = activeTasks.filter((task) => task.done && !task.starId).length
  const total = activeTasks.length

  useEffect(() => {
    setMissions(loadMissions())
  }, [refreshKey])

  useEffect(() => {
    if (!focusComposer) return
    inputRef.current?.focus()
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusComposer])

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      const next = addMission(draft)
      setMissions(next)
      setDraft('')
    },
    [draft],
  )

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <p className={styles.kicker}>{t('galaxy.missionsKicker')}</p>
        <p className={styles.count}>
          {total === 0 ? t('galaxy.noTasks') : t('galaxy.doneOf', { done: completed, total })}
        </p>
      </div>

      <form className={styles.composer} onSubmit={handleSubmit}>
        <label htmlFor="mission-title" className="sr-only">
          {t('galaxy.newMission')}
        </label>
        <input
          id="mission-title"
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('galaxy.missionPlaceholder')}
          autoComplete="off"
        />
        <button type="submit" disabled={!draft.trim()}>
          {t('galaxy.add')}
        </button>
      </form>

      {total === 0 ? (
        <p className={styles.empty}>{t('galaxy.missionsEmpty')}</p>
      ) : (
        <ul className={styles.list}>
          {activeTasks.map((task) => (
            <li
              key={task.id}
              className={[
                task.done ? styles.done : '',
                task.id === leavingMissionId ? styles.leaving : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <label className={styles.item}>
                <input
                  type="checkbox"
                  checked={task.done}
                  disabled={Boolean(task.starId)}
                  onChange={() => setMissions(toggleMission(task.id))}
                />
                <span>{task.title}</span>
              </label>
              <button
                type="button"
                className={styles.remove}
                aria-label={t('galaxy.removeMission', { title: task.title })}
                onClick={() => setMissions(removeMission(task.id))}
                disabled={Boolean(task.starId)}
              >
                ×
              </button>
              {task.done && !task.starId && (
                <button
                  type="button"
                  className={styles.createStar}
                  onClick={(event) => {
                    const card = event.currentTarget.closest('li')
                    const rect = card?.getBoundingClientRect()
                    onCreateStar(
                      task,
                      rect
                        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
                        : null,
                    )
                  }}
                >
                  <span className={styles.spark} aria-hidden="true" />
                  {t('galaxy.createStar')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
