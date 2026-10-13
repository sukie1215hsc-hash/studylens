import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import styles from './StarForm.module.css'

export default function ShareReflectionForm({
  categories = [],
  publishedGalaxy = null,
  initial = null,
  onClose,
  onShare,
}) {
  const { t } = useI18n()
  const titleId = useId()
  const firstField = useRef(null)
  const names = categories.map((item) => item.name).filter(Boolean)
  const [title, setTitle] = useState(initial?.title || '')
  const [body, setBody] = useState(initial?.body || '')
  const [category, setCategory] = useState(initial?.category || '')
  const [linkGalaxy, setLinkGalaxy] = useState(Boolean(initial?.galaxy) && Boolean(publishedGalaxy))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    firstField.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submittingRef.current || busy) return
    const name = title.trim()
    const text = body.trim()
    if (name.length < 2) {
      setError('community.needTitle')
      return
    }
    if (text.length < 8) {
      setError('community.needBody')
      return
    }
    submittingRef.current = true
    setBusy(true)
    setError('')
    try {
      const result = await onShare({
        id: initial?.id,
        title: name,
        body: text,
        category,
        linkGalaxy: Boolean(linkGalaxy && publishedGalaxy),
      })
      if (result && result.ok === false) setError(result.error || 'community.publishFail')
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <p className={styles.kicker}>{t('community.formKicker')}</p>
        <h2 id={titleId} className={styles.title}>
          {initial ? t('community.editTitle') : t('community.shareTitle')}
        </h2>
        <p className={styles.mission}>{t('community.formLede')}</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label htmlFor="reflection-title" className={styles.label}>
              {t('community.formTitle')}
            </label>
            <input
              id="reflection-title"
              ref={firstField}
              className={styles.input}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('community.titlePlaceholder')}
              maxLength={120}
              required
            />
          </div>
          <div>
            <label htmlFor="reflection-body" className={styles.label}>
              {t('community.formBody')}
            </label>
            <textarea
              id="reflection-body"
              className={styles.textarea}
              rows="8"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t('community.bodyPlaceholder')}
              required
            />
          </div>
          <div>
            <label htmlFor="reflection-category" className={styles.label}>
              {t('community.categoryOptional')} <span>{t('community.optional')}</span>
            </label>
            <select
              id="reflection-category"
              className={styles.input}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">{t('community.noCategory')}</option>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          {publishedGalaxy ? (
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={linkGalaxy}
                onChange={(event) => setLinkGalaxy(event.target.checked)}
              />
              {t('community.linkGalaxy', { stars: publishedGalaxy.stars })}
            </label>
          ) : (
            <p className={styles.mission}>{t('community.linkLater')}</p>
          )}
          {error ? <p className={styles.error}>{t(error)}</p> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onClose} disabled={busy}>
              {t('publish.cancel')}
            </button>
            <button type="submit" className={styles.primary} disabled={busy}>
              {busy ? t('publish.saving') : initial ? t('community.save') : t('community.publish')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
