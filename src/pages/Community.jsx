import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import ShareReflectionForm from '../components/ShareReflectionForm'
import { colorForCategory } from '../lib/categories'
import { COMMUNITY_PREVIEW } from '../lib/communityPreview'
import {
  addComment,
  deleteReflection,
  getAccountGalaxy,
  removeComment,
  listComments,
  listPublicGalaxyCards,
  listReflections,
  publishReflection,
} from '../utils/community'
import styles from './Community.module.css'

function MiniGalaxy({ map, label }) {
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

function GalaxyCard({ journey, onView }) {
  const { t } = useI18n()
  return (
    <li className={styles.card}>
      <MiniGalaxy map={journey.map} label={t('community.galaxyFor', { name: journey.username })} />
      <p className={styles.user}>{journey.username}</p>
      <p className={styles.mode}>
        {journey.visibility === 'records' ? t('community.chartRecords') : t('community.galaxyOnly')}
      </p>
      <dl className={styles.meta}>
        <div>
          <dt>{t('community.stars')}</dt>
          <dd>{journey.stars}</dd>
        </div>
        <div>
          <dt>{t('community.hours')}</dt>
          <dd>{journey.hours}</dd>
        </div>
      </dl>
      <p className={styles.cats}>
        {journey.categories.map((name) => (
          <span key={name}>
            <i style={{ background: colorForCategory(name) }} aria-hidden="true" />
            {name}
          </span>
        ))}
      </p>
      <button type="button" className={styles.ghost} onClick={() => onView(journey)}>
        {t('community.viewGalaxy')}
      </button>
    </li>
  )
}

function useDialogEscape(onClose, intercept) {
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (intercept?.()) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [intercept, onClose])

  return closeRef
}

function ReflectionReader({ article, session, onClose, onEdit, onDelete }) {
  const { t } = useI18n()
  const titleId = useId()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isOwner = Boolean(session && session.id === article.userId)
  const intercept = useCallback(() => {
    if (!confirmDelete) return false
    setConfirmDelete(false)
    return true
  }, [confirmDelete])
  const closeRef = useDialogEscape(onClose, intercept)

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.article}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className={styles.modalClose} onClick={onClose}>
          {t('community.close')}
        </button>
        <p className={styles.kicker}>{t('community.reflectionKicker')}</p>
        <h2 id={titleId}>{article.title}</h2>
        <p className={styles.articleMeta}>
          {article.username}
          {article.stamp ? ` · ${article.stamp}` : ''}
          {article.category ? ` · ${article.category}` : ''}
        </p>
        <p className={styles.body}>{article.body}</p>
        {article.galaxy ? (
          <p className={styles.linked}>
            {t('community.linked', { stars: article.galaxy.stars, hours: article.galaxy.hours })}
          </p>
        ) : null}
        {isOwner ? (
          <div className={styles.ownerRow}>
            <button type="button" className={styles.ghost} onClick={() => onEdit(article)}>
              {t('community.edit')}
            </button>
            {confirmDelete ? (
              <>
                <button type="button" className={styles.ghost} onClick={() => setConfirmDelete(false)}>
                  {t('community.keep')}
                </button>
                <button type="button" className={styles.danger} onClick={() => onDelete(article.id)}>
                  {t('community.deleteReflection')}
                </button>
              </>
            ) : (
              <button type="button" className={styles.danger} onClick={() => setConfirmDelete(true)}>
                {t('community.delete')}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ReflectionComments({ article, comments, session, onClose, onNeedAuth, onComment, onDeleteComment }) {
  const { t } = useI18n()
  const titleId = useId()
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const intercept = useCallback(() => {
    if (!confirmDeleteId) return false
    setConfirmDeleteId(null)
    return true
  }, [confirmDeleteId])
  const closeRef = useDialogEscape(onClose, intercept)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const handleComment = async (event) => {
    event.preventDefault()
    if (!session) {
      onNeedAuth?.()
      return
    }
    const result = await onComment(article.id, draft)
    if (!result?.ok) {
      setError(result?.error || 'community.commentFail')
      return
    }
    setDraft('')
    setError('')
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.article}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className={styles.modalClose} onClick={onClose}>
          {t('community.close')}
        </button>
        <p className={styles.kicker}>{t('community.comments')}</p>
        <h2 id={titleId}>{article.title}</h2>
        <p className={styles.articleMeta}>{article.username}</p>
        <section className={styles.comments} aria-labelledby="comments-heading">
          <h3 id="comments-heading">
            {t('community.comments')}
            <span>{comments.length}</span>
          </h3>
          {comments.length === 0 ? (
            <p className={styles.privateNote}>{t('community.noComments')}</p>
          ) : (
            <ul>
              {comments.map((item) => (
                <li key={item.id}>
                  <p className={styles.commentWho}>
                    {item.username}
                    <span>{item.stamp}</span>
                  </p>
                  <p>{item.body}</p>
                  {session && session.id === item.userId ? (
                    <div className={styles.ownerRow}>
                      {confirmDeleteId === item.id ? (
                        <>
                          <button type="button" className={styles.ghost} onClick={() => setConfirmDeleteId(null)}>
                            {t('community.keep')}
                          </button>
                          <button
                            type="button"
                            className={styles.danger}
                            onClick={async () => {
                              const result = await onDeleteComment?.(item.id)
                              if (!result?.ok) {
                                setError(result?.error || 'community.deleteCommentFail')
                                return
                              }
                              setConfirmDeleteId(null)
                              setError('')
                            }}
                          >
                            {t('community.deleteComment')}
                          </button>
                        </>
                      ) : (
                        <button type="button" className={styles.danger} onClick={() => setConfirmDeleteId(item.id)}>
                          {t('community.delete')}
                        </button>
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {session ? (
            <form className={styles.commentForm} onSubmit={handleComment}>
              <label htmlFor="reflection-comment" className={styles.commentLabel}>
                {t('community.yourComment')}
              </label>
              <textarea
                id="reflection-comment"
                rows="3"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t('community.commentPlaceholder')}
              />
              {error ? <p className={styles.commentError}>{t(error)}</p> : null}
              <button type="submit" className={styles.primary}>
                {t('community.postComment')}
              </button>
            </form>
          ) : (
            <p className={styles.commentGate}>
              {t('community.loginToComment')}{' '}
              <button type="button" onClick={onNeedAuth}>
                {t('community.login')}
              </button>
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export default function Community({ categories = [], session = null, onNeedAuth }) {
  const { t } = useI18n()
  const [sharing, setSharing] = useState(false)
  const [editing, setEditing] = useState(null)
  const [preview, setPreview] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [commentId, setCommentId] = useState(null)
  const [showSample, setShowSample] = useState(false)
  const [reflections, setReflections] = useState([])
  const [liveGalaxies, setLiveGalaxies] = useState([])
  const [publishedGalaxy, setPublishedGalaxy] = useState(null)
  const [comments, setComments] = useState([])
  const [communityError, setCommunityError] = useState('')
  const publishingRef = useRef(false)
  const galaxies = showSample ? COMMUNITY_PREVIEW.galaxies : liveGalaxies
  const openArticle = useMemo(
    () => (openId ? reflections.find((item) => item.id === openId) || null : null),
    [openId, reflections],
  )
  const commentArticle = useMemo(
    () => (commentId ? reflections.find((item) => item.id === commentId) || null : null),
    [commentId, reflections],
  )

  const refreshCommunity = useCallback(async () => {
    if (!session?.id) return
    setCommunityError('')
    try {
      const [galaxyResult, reflectionResult, ownGalaxy] = await Promise.all([
        listPublicGalaxyCards(),
        listReflections(),
        session ? getAccountGalaxy(session) : Promise.resolve(null),
      ])
      if (!galaxyResult.ok) {
        setCommunityError(galaxyResult.error || 'community.noGalaxies')
        setLiveGalaxies([])
      } else {
        setLiveGalaxies(galaxyResult.galaxies)
      }
      if (!reflectionResult.ok) {
        setCommunityError(reflectionResult.error || 'community.noReflections')
        setReflections([])
      } else {
        setReflections(reflectionResult.reflections)
      }
      setPublishedGalaxy(ownGalaxy || null)
    } catch (error) {
      console.error('Error loading community:', error)
      setCommunityError(error.message || 'community.noGalaxies')
    }
  }, [session, t])

  useEffect(() => {
    if (!session?.id) return undefined
    refreshCommunity()
    return undefined
  }, [refreshCommunity, session?.id])

  const openComments = async (id) => {
    setOpenId(null)
    setCommentId(id)
    const result = await listComments(id)
    if (!result.ok) {
      setComments([])
      setCommunityError(result.error || 'community.commentFail')
      return
    }
    setComments(result.comments)
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>{t('community.kicker')}</p>
          <h1 className={styles.title}>{t('community.title')}</h1>
          <p className={styles.lede}>{t('community.lede')}</p>
        </div>
        <button
          type="button"
          className={styles.primary}
          onClick={() => (session ? setSharing(true) : onNeedAuth?.())}
        >
          {t('community.share')}
        </button>
      </header>

      {showSample ? (
        <p className={styles.banner} role="status">
          {t('community.sampleBanner')}{' '}
          <button type="button" onClick={() => setShowSample(false)}>
            {t('community.backLive')}
          </button>
        </p>
      ) : (
        <p className={styles.banner} role="note">
          {communityError ? t(communityError) : t('community.localBanner')}
        </p>
      )}

      <section className={styles.section} aria-labelledby="featured-heading">
        <p className={styles.sectionKicker}>{t('community.sharedCharts')}</p>
        <h2 id="featured-heading" className={styles.sectionTitle}>
          {t('community.featured')}
        </h2>
        {galaxies.length === 0 ? (
          <div className={styles.empty}>
            <p>{t('community.noGalaxies')}</p>
            <button type="button" className={styles.ghost} onClick={() => setShowSample(true)}>
              {t('community.previewSample')}
            </button>
          </div>
        ) : (
          <ul className={styles.gallery}>
            {galaxies.map((journey) => (
              <GalaxyCard key={journey.id} journey={journey} onView={setPreview} />
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section} aria-labelledby="reflections-heading">
        <p className={styles.sectionKicker}>{t('community.essays')}</p>
        <h2 id="reflections-heading" className={styles.sectionTitle}>
          {t('community.reflections')}
        </h2>
        {reflections.length === 0 ? (
          <p className={styles.empty}>{t('community.noReflections')}</p>
        ) : (
          <ul className={styles.essays}>
            {reflections.map((item) => (
              <li key={item.id}>
                <p className={styles.feedUser}>{item.username}</p>
                <h3>{item.title}</h3>
                <p className={styles.excerpt}>{item.excerpt}</p>
                <p className={styles.feedMeta}>
                  {item.stamp ? <span>{item.stamp}</span> : null}
                  {item.category ? <span>{item.category}</span> : null}
                </p>
                <div className={styles.essayActions}>
                  <button
                    type="button"
                    className={styles.ghost}
                    onClick={() => {
                      setCommentId(null)
                      setOpenId(item.id)
                    }}
                  >
                    {t('community.read')}
                  </button>
                  <button type="button" className={styles.ghost} onClick={() => openComments(item.id)}>
                    {t('community.commentsCount', { count: item.commentCount })}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {preview ? (
        <div className={styles.overlay} onClick={() => setPreview(null)} role="presentation">
          <div
            className={styles.preview}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className={styles.kicker}>
              {showSample
                ? t('community.sampleJourney')
                : preview.visibility === 'records'
                  ? t('community.publicRecords')
                  : t('community.galaxyOnly')}
            </p>
            <h2 id="preview-title">{preview.username}</h2>
            <p className={styles.lede}>
              {t('community.previewMeta', {
                stars: preview.stars,
                hours: preview.hours,
                cats: preview.categories.join(', '),
              })}
            </p>
            <MiniGalaxy map={preview.map} label={t('community.galaxyFor', { name: preview.username })} />
            {preview.visibility === 'records' && preview.records?.length ? (
              <ul className={styles.records}>
                {preview.records.map((record) => (
                  <li key={record.id}>
                    <span>
                      {record.title || t('community.untitled')}
                      {record.notes ? <em>{record.notes}</em> : null}
                    </span>
                    <span>
                      {record.category}
                      {record.date ? ` · ${record.date}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : showSample ? null : (
              <p className={styles.privateNote}>{t('community.privateNote')}</p>
            )}
            <button type="button" className={styles.ghost} onClick={() => setPreview(null)}>
              {t('community.close')}
            </button>
          </div>
        </div>
      ) : null}

      {openArticle ? (
        <ReflectionReader
          article={openArticle}
          session={session}
          onClose={() => setOpenId(null)}
          onEdit={(item) => {
            setOpenId(null)
            setEditing(item)
          }}
          onDelete={async (id) => {
            const result = await deleteReflection(session, id)
            if (!result.ok) {
              setCommunityError(result.error || 'community.deleteReflectionFail')
              return
            }
            setOpenId(null)
            setCommentId(null)
            refreshCommunity()
          }}
        />
      ) : null}

      {commentArticle ? (
        <ReflectionComments
          article={commentArticle}
          comments={comments}
          session={session}
          onClose={() => setCommentId(null)}
          onNeedAuth={onNeedAuth}
          onComment={async (id, body) => {
            const result = await addComment(session, id, body)
            if (result.ok) {
              setComments(result.comments)
              refreshCommunity()
            }
            return result
          }}
          onDeleteComment={async (commentId) => {
            const result = await removeComment(session, commentId, commentArticle.id)
            if (result.ok) {
              setComments(result.comments)
              refreshCommunity()
            }
            return result
          }}
        />
      ) : null}

      {sharing || editing ? (
        <ShareReflectionForm
          categories={categories}
          publishedGalaxy={publishedGalaxy}
          initial={editing}
          onClose={() => {
            setSharing(false)
            setEditing(null)
          }}
          onShare={async (entry) => {
            if (publishingRef.current) return { ok: false, error: 'community.publishFail' }
            publishingRef.current = true
            try {
              const result = await publishReflection(session, entry)
              if (!result.ok) return result
              setSharing(false)
              setEditing(null)
              setShowSample(false)
              await refreshCommunity()
              if (result.item?.id) setOpenId(result.item.id)
              return result
            } finally {
              publishingRef.current = false
            }
          }}
        />
      ) : null}
    </div>
  )
}
