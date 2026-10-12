import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import GalaxyView from '../components/GalaxyView'
import TodaysMissions from '../components/TodaysMissions'
import { colorForCategory, formatDuration, formatHours } from '../lib/categories'
import {
  getAccountGalaxy,
  publicMapFromRecords,
  publishAccountGalaxy,
  unpublishAccountGalaxy,
} from '../utils/community'
import styles from './MyGalaxy.module.css'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function MyGalaxy({
  records,
  studyLoading = false,
  studyError = '',
  session = null,
  resumePublish = false,
  onResumePublishConsumed,
  onNeedAuth,
  onViewCommunity,
  onCreateStar,
  onAddMission,
  missionTick,
  focusComposer,
  birth,
  onBirthDone,
  onDeleteStar,
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [pubTick, setPubTick] = useState(0)
  const [published, setPublished] = useState(null)
  const [notice, setNotice] = useState('')
  const [appearingStarId, setAppearingStarId] = useState(null)
  const [particle, setParticle] = useState(null)
  const publishButtonRef = useRef(null)
  const flightStarted = useRef(false)
  const lastBirthId = useRef(null)
  const seedRef = useRef(null)
  const hasRecords = records.length > 0
  const birthId = birth?.starId ?? null
  if (lastBirthId.current !== birthId) {
    lastBirthId.current = birthId
    flightStarted.current = false
  }
  const holdStarId = birth && appearingStarId !== birth.starId ? birth.starId : null
  const leavingMissionId = birth && !appearingStarId ? birth.missionId : null

  const stats = useMemo(() => {
    const minutes = records.reduce((sum, record) => sum + record.duration, 0)
    const categories = new Set(records.map((record) => record.category))
    return {
      minutes,
      sessions: records.length,
      categories: categories.size,
    }
  }, [records])

  useEffect(() => {
    let cancelled = false
    if (!session?.id) {
      setPublished(null)
      return undefined
    }
    getAccountGalaxy(session)
      .then((card) => {
        if (!cancelled) setPublished(card)
      })
      .catch((error) => {
        console.error('Error loading published galaxy:', error)
        if (!cancelled) setPublished(null)
      })
    return () => {
      cancelled = true
    }
  }, [session, pubTick])

  useEffect(() => {
    if (!resumePublish) return undefined
    setPublishOpen(true)
    onResumePublishConsumed?.()
    return undefined
  }, [resumePublish, onResumePublishConsumed])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!expanded) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [expanded])

  useEffect(() => {
    if (!birth) return undefined

    if (prefersReducedMotion()) {
      setAppearingStarId(birth.starId)
      const done = window.setTimeout(() => {
        setAppearingStarId(null)
        onBirthDone?.()
      }, 80)
      return () => window.clearTimeout(done)
    }

    const fallback = window.setTimeout(() => {
      if (flightStarted.current) return
      setAppearingStarId(birth.starId)
      window.setTimeout(() => {
        setAppearingStarId(null)
        onBirthDone?.()
      }, 1100)
    }, 450)

    return () => window.clearTimeout(fallback)
  }, [birth, onBirthDone])

  const handleStarTarget = useCallback((point) => {
    if (!birth || flightStarted.current || !point) return
    flightStarted.current = true
    const origin = birth.origin || point
    setParticle({
      starId: birth.starId,
      from: origin,
      to: point,
      color: colorForCategory(birth.category),
    })
  }, [birth])

  useEffect(() => {
    if (!particle || particle.starId !== birth?.starId) return undefined
    const start = performance.now()
    const duration = 780
    let frame = 0
    let settled = false

    const tick = (now) => {
      const u = Math.min(1, (now - start) / duration)
      const ease = 1 - (1 - u) ** 3
      const el = seedRef.current
      if (el) {
        const x = particle.from.x + (particle.to.x - particle.from.x) * ease
        const y = particle.from.y + (particle.to.y - particle.from.y) * ease
        const fade = u < 0.12 ? u / 0.12 : u > 0.82 ? (1 - u) / 0.18 : 1
        el.style.transform = `translate(${x - 5}px, ${y - 5}px) scale(${1.05 - ease * 0.2})`
        el.style.opacity = String(Math.max(0, fade))
      }
      if (u < 1) {
        frame = requestAnimationFrame(tick)
        return
      }
      settled = true
      setParticle(null)
      setAppearingStarId(particle.starId)
      window.setTimeout(() => {
        setAppearingStarId(null)
        onBirthDone?.()
      }, 1100)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      if (!settled) return
    }
  }, [particle, birth, onBirthDone])

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>{t('galaxy.kicker')}</p>
          <h1 className={styles.title}>{t('galaxy.title')}</h1>
          <p className={styles.lede}>{studyError ? t(studyError) : t('galaxy.lede')}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onAddMission}>
            {t('galaxy.addMission')}
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => setExpanded(true)}
            disabled={!hasRecords}
          >
            {t('galaxy.zoom')}
          </button>
          <button
            ref={publishButtonRef}
            type="button"
            className={published ? styles.published : styles.ghost}
            onClick={() => setPublishOpen(true)}
          >
            {published ? t('galaxy.manage') : t('galaxy.publish')}
          </button>
        </div>
      </header>

      <ul className={styles.stats}>
        <li>
          <span>{t('galaxy.stars')}</span>
          <strong>{stats.sessions}</strong>
        </li>
        <li>
          <span>{t('galaxy.hours')}</span>
          <strong>{formatHours(stats.minutes)}</strong>
        </li>
        <li>
          <span>{t('galaxy.categories')}</span>
          <strong>{stats.categories}</strong>
        </li>
      </ul>

      <div className={styles.layout}>
        <section className={styles.chart} aria-label={t('galaxy.chartLabel')}>
          <GalaxyView
            records={records}
            expanded={expanded}
            onToggleExpand={() => setExpanded((value) => !value)}
            holdStarId={holdStarId}
            appearingStarId={appearingStarId}
            targetStarId={holdStarId || appearingStarId}
            onStarTarget={handleStarTarget}
            onDeleteStar={onDeleteStar}
          />
          {!hasRecords && !studyLoading && (
            <div className={styles.empty}>
              <p className={styles.emptyKicker}>{t('galaxy.kicker')}</p>
              <p className={styles.emptyTitle}>{t('galaxy.emptyTitle')}</p>
              <p>{t('galaxy.empty')}</p>
              <ol className={styles.emptySteps}>
                <li>{t('galaxy.emptyStep1')}</li>
                <li>{t('galaxy.emptyStep2')}</li>
                <li>{t('galaxy.emptyStep3')}</li>
              </ol>
              <button type="button" onClick={onAddMission}>
                {t('galaxy.addAMission')}
              </button>
            </div>
          )}
        </section>

        <aside className={styles.side} aria-label={t('galaxy.missionsLabel')}>
          <TodaysMissions
            onCreateStar={onCreateStar}
            focusComposer={focusComposer}
            refreshKey={missionTick}
            leavingMissionId={leavingMissionId}
          />
        </aside>
      </div>

      {particle && (
        <span
          ref={seedRef}
          className={styles.particle}
          style={{ background: particle.color }}
          aria-hidden="true"
        />
      )}

      {notice ? (
        <p className={styles.toast} role="status">
          {notice}
        </p>
      ) : null}

      {publishOpen ? (
        <PublishGalaxyModal
          session={session}
          records={records}
          stats={stats}
          published={published}
          onNeedAuth={onNeedAuth}
          onViewCommunity={onViewCommunity}
          onChanged={() => setPubTick((value) => value + 1)}
          onCancel={(message) => {
            setPublishOpen(false)
            if (message) setNotice(message)
            publishButtonRef.current?.focus()
          }}
          onClose={() => {
            setPublishOpen(false)
            publishButtonRef.current?.focus()
          }}
        />
      ) : null}
    </div>
  )
}

function MiniPreview({ map, label }) {
  return (
    <svg className={styles.mini} viewBox="0 0 160 100" role="img" aria-label={label}>
      <ellipse cx="80" cy="50" rx="70" ry="38" fill="none" stroke="currentColor" />
      <ellipse cx="80" cy="50" rx="44" ry="24" fill="none" stroke="currentColor" />
      <line x1="12" y1="50" x2="148" y2="50" stroke="currentColor" />
      <line x1="80" y1="12" x2="80" y2="88" stroke="currentColor" />
      {map.map((star, index) => (
        <circle
          key={`${star.x}-${index}`}
          cx={star.x * 160}
          cy={star.y * 100}
          r={star.r * 0.55}
          fill={colorForCategory(star.category)}
        />
      ))}
    </svg>
  )
}

function PublishGalaxyModal({
  session,
  records,
  stats,
  published,
  onNeedAuth,
  onViewCommunity,
  onChanged,
  onCancel,
  onClose,
}) {
  const titleId = useId()
  const descId = useId()
  const notesId = useId()
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const [phase, setPhase] = useState(published ? 'manage' : 'form')
  const [mode, setMode] = useState(published?.visibility === 'records' ? 'records' : 'galaxy')
  const [includeNotes, setIncludeNotes] = useState(Boolean(published?.includeNotes))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [withdrawn, setWithdrawn] = useState(false)
  const map = useMemo(() => publicMapFromRecords(records), [records])
  const categories = [...new Set(records.map((record) => record.category).filter(Boolean))]
  const { t } = useI18n()
  const hasNotes = records.some((record) => String(record.notes || '').trim())

  useEffect(() => {
    closeRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (phase === 'withdraw') {
          setPhase('manage')
          return
        }
        if (phase === 'form' && session && !published) {
          onCancel(t('publish.cancelled'))
          return
        }
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const nodes = [...panelRef.current.querySelectorAll('button, input')].filter((node) => !node.disabled)
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onCancel, onClose, phase, published, session, t])

  const handlePublish = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await publishAccountGalaxy(session, records, {
        visibility: mode,
        includeNotes: mode === 'records' && includeNotes,
      })
      if (!result.ok) {
        setError(result.error || 'publish.failed')
        setPhase('error')
        return
      }
      setUpdated(Boolean(result.updated))
      setWithdrawn(false)
      onChanged?.()
      setPhase('success')
    } catch (err) {
      console.error('Error publishing galaxy:', err)
      setError(err.message || 'publish.failed')
      setPhase('error')
    } finally {
      setBusy(false)
    }
  }

  const handleWithdraw = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await unpublishAccountGalaxy(session)
      if (!result.ok) {
        setError(result.error || 'publish.withdrawFailed')
        setPhase('error')
        return
      }
      setWithdrawn(true)
      onChanged?.()
      setPhase('success')
    } catch (err) {
      console.error('Error withdrawing galaxy:', err)
      setError(err.message || 'publish.withdrawFailed')
      setPhase('error')
    } finally {
      setBusy(false)
    }
  }

  const dismiss = () => {
    if (phase === 'withdraw') {
      setPhase('manage')
      return
    }
    if (phase === 'form' && session && !published) {
      onCancel(t('publish.cancelled'))
      return
    }
    onClose()
  }

  const modeCopy = mode === 'records' ? t('publish.modeRecords') : t('publish.modeGalaxy')

  return (
    <div className={styles.overlay} onClick={dismiss} role="presentation">
      <div
        ref={panelRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className={styles.modalClose}
          aria-label={t('galaxy.close')}
          onClick={dismiss}
        >
          {t('galaxy.close')}
        </button>

        {!session ? (
          <>
            <p className={styles.modalKicker}>{t('publish.needed')}</p>
            <h2 id={titleId} className={styles.modalTitle}>
              {t('publish.signInTitle')}
            </h2>
            <p id={descId} className={styles.modalLede}>
              {t('publish.signInLede')}
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalGhost} onClick={onClose}>
                {t('publish.cancel')}
              </button>
              <button type="button" className={styles.modalGhost} onClick={() => onNeedAuth?.('signup')}>
                {t('account.signup')}
              </button>
              <button type="button" className={styles.primary} onClick={() => onNeedAuth?.('login')}>
                {t('account.login')}
              </button>
            </div>
          </>
        ) : phase === 'withdraw' ? (
          <>
            <p className={styles.modalKicker}>{t('publish.withdrawKicker')}</p>
            <h2 id={titleId} className={styles.modalTitle}>
              {t('publish.withdrawTitle')}
            </h2>
            <p id={descId} className={styles.modalLede}>
              {t('publish.withdrawLede', { name: session.username })}
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalGhost} onClick={() => setPhase('manage')}>
                {t('publish.cancel')}
              </button>
              <button type="button" className={styles.danger} onClick={handleWithdraw} disabled={busy}>
                {busy ? t('publish.withdrawing') : t('publish.unpublish')}
              </button>
            </div>
          </>
        ) : phase === 'success' ? (
          <>
            <p className={styles.modalKicker}>{t('publish.browser')}</p>
            <h2 id={titleId} className={styles.modalTitle}>
              {withdrawn ? t('publish.gone') : updated ? t('publish.updated') : t('publish.published')}
            </h2>
            <p id={descId} className={styles.modalLede}>
              {withdrawn
                ? t('publish.goneLede')
                : updated
                  ? t('publish.updatedLede', { name: session.username })
                  : t('publish.publishedLede', { name: session.username })}
            </p>
            <p className={styles.modalHint}>{t('publish.localHint')}</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalGhost} onClick={onClose}>
                {t('publish.stay')}
              </button>
              {withdrawn ? null : (
                <button type="button" className={styles.primary} onClick={onViewCommunity}>
                  {t('publish.viewCommunity')}
                </button>
              )}
            </div>
          </>
        ) : phase === 'error' ? (
          <>
            <p className={styles.modalKicker}>{t('publish.notSaved')}</p>
            <h2 id={titleId} className={styles.modalTitle}>
              {t('publish.failedTitle')}
            </h2>
            <p id={descId} className={styles.modalLede}>
              {error ? t(error) : null}
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalGhost} onClick={onClose}>
                {t('galaxy.close')}
              </button>
              <button type="button" className={styles.primary} onClick={published ? () => setPhase('manage') : handlePublish}>
                {t('publish.tryAgain')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.modalKicker}>{published ? t('publish.publicHere') : t('publish.shareChart')}</p>
            <h2 id={titleId} className={styles.modalTitle}>
              {published ? t('galaxy.manage') : t('galaxy.publish')}
            </h2>
            <p id={descId} className={styles.modalLede}>
              {published
                ? t('publish.liveAs', { name: session.username })
                : t('publish.chooseHow', { name: session.username })}
            </p>
            <div className={styles.choices} role="radiogroup" aria-label={t('publish.whatPublic')}>
              <label className={mode === 'galaxy' ? styles.choiceOn : styles.choice}>
                <input
                  type="radio"
                  name="visibility-mode"
                  checked={mode === 'galaxy'}
                  onChange={() => setMode('galaxy')}
                />
                <span>
                  <strong>{t('publish.galaxyOnly')}</strong>
                  {t('publish.galaxyOnlyHint')}
                </span>
              </label>
              <label className={mode === 'records' ? styles.choiceOn : styles.choice}>
                <input
                  type="radio"
                  name="visibility-mode"
                  checked={mode === 'records'}
                  onChange={() => setMode('records')}
                />
                <span>
                  <strong>{t('publish.galaxyRecords')}</strong>
                  {t('publish.galaxyRecordsHint')}
                </span>
              </label>
            </div>
            <MiniPreview map={map} label={t('publish.previewOf', { name: session.username })} />
            <dl className={styles.previewMeta}>
              <div>
                <dt>{t('publish.nickname')}</dt>
                <dd>{session.username}</dd>
              </div>
              <div>
                <dt>{t('galaxy.stars')}</dt>
                <dd>{stats.sessions}</dd>
              </div>
              <div>
                <dt>{t('publish.hours')}</dt>
                <dd>{formatHours(stats.minutes)}</dd>
              </div>
            </dl>
            <p className={styles.previewCats}>
              {categories.length ? categories.join(' · ') : t('publish.noCategories')}
            </p>
            {mode === 'records' ? (
              records.length ? (
                <ul className={styles.recordPreview}>
                  {records.slice(0, 5).map((record) => (
                    <li key={record.id}>
                      <span>
                        {record.title}
                        {includeNotes && record.notes ? <em>{record.notes}</em> : null}
                      </span>
                      <span>
                        {record.category} · {formatDuration(record.duration)}
                      </span>
                    </li>
                  ))}
                  {records.length > 5 ? <li>{t('publish.moreRecords', { count: records.length - 5 })}</li> : null}
                </ul>
              ) : (
                <p className={styles.modalHint}>{t('publish.noStarsYet')}</p>
              )
            ) : (
              <p className={styles.modalHint}>{t('publish.noTaskNames')}</p>
            )}
            {mode === 'records' ? (
              <label className={styles.notesToggle} htmlFor={notesId}>
                <input
                  id={notesId}
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(event) => setIncludeNotes(event.target.checked)}
                />
                {hasNotes ? t('publish.shareNotesOn') : t('publish.shareNotesOff')}
              </label>
            ) : null}
            <p className={styles.modalNote}>{modeCopy}</p>
            <p className={styles.modalHint}>
              {t('publish.localOnly')}
            </p>
            {error ? (
              <p className={styles.modalError} role="alert">
                {t(error)}
              </p>
            ) : null}
            <div className={styles.modalActions}>
              {published ? (
                <button type="button" className={styles.dangerGhost} onClick={() => setPhase('withdraw')}>
                  {t('publish.unpublish')}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.modalGhost}
                onClick={() => (published ? onClose() : onCancel(t('publish.cancelled')))}
              >
                {t('publish.cancel')}
              </button>
              <button type="button" className={styles.primary} onClick={handlePublish} disabled={busy}>
                {busy ? t('publish.saving') : published ? t('publish.update') : t('publish.publishGalaxy')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
