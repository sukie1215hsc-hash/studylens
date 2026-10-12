import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { addCategory, removeCategory } from '../utils/userCategories'
import { todayKey } from '../utils/missions'
import styles from './StarForm.module.css'

const GUEST_NOTICE_KEY = 'studylens_guest_notice_seen'

function guestNoticeSeen() {
  try {
    return localStorage.getItem(GUEST_NOTICE_KEY) === '1'
  } catch (error) {
    return false
  }
}

function markGuestNoticeSeen() {
  try {
    localStorage.setItem(GUEST_NOTICE_KEY, '1')
  } catch (error) {
    console.error('Error saving guest notice:', error)
  }
}

function sanitizeDuration(value) {
  const cleaned = String(value).replace(/[^\d.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  if (rest.length === 0) return whole
  return `${whole}.${rest.join('')}`
}

export default function StarForm({
  mission,
  categories = [],
  usedCategoryNames = [],
  onCategoriesChange,
  onAddCategory,
  onRemoveCategory,
  onRenameCategory,
  onSave,
  onClose,
  session = null,
  hasRecords = false,
  onNeedAuth,
}) {
  const { t } = useI18n()
  const titleId = useId()
  const firstField = useRef(null)
  const nameField = useRef(null)
  const menuRef = useRef(null)
  const [duration, setDuration] = useState('')
  const [category, setCategory] = useState(() => categories[0]?.name || '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(categories.length === 0)
  const [draft, setDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [guestNotice, setGuestNotice] = useState(false)

  const used = new Set(usedCategoryNames.map((name) => String(name).toLowerCase()))

  useEffect(() => {
    const names = categories.map((item) => item.name)
    setCategory((current) => (names.includes(current) ? current : names[0] || ''))
    if (categories.length === 0) setAdding(true)
  }, [categories])

  useEffect(() => {
    firstField.current?.focus()
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      if (pendingDelete) {
        setPendingDelete(null)
        return
      }
      if (renaming) {
        setRenaming(null)
        setDraft('')
        return
      }
      if (guestNotice) {
        setGuestNotice(false)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [guestNotice, onClose, pendingDelete, renaming])

  useEffect(() => {
    if (adding || renaming) nameField.current?.focus()
  }, [adding, renaming])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  const handleCreateCategory = async (event) => {
    event.preventDefault()
    const name = draft.trim()
    if (!name) {
      setError('star.needName')
      return
    }
    setBusy(true)
    try {
      const result = onAddCategory ? await onAddCategory(name) : { ok: true, categories: addCategory(name) }
      if (!result?.ok) {
        setError(result?.error || 'star.needName')
        return
      }
      const next = result.categories || []
      onCategoriesChange?.(next)
      const created = next.find((item) => item.name.toLowerCase() === name.toLowerCase())
      setCategory(created?.name || name)
      setDraft('')
      setAdding(false)
      setOpen(false)
      setError('')
    } catch (err) {
      console.error('Error adding category:', err)
      setError(err.message || 'star.needName')
    } finally {
      setBusy(false)
    }
  }

  const applyDelete = async (item) => {
    setBusy(true)
    try {
      const result = onRemoveCategory
        ? await onRemoveCategory(item.id)
        : { ok: true, categories: removeCategory(item.id) }
      if (!result?.ok) {
        setError(result?.error || 'star.needName')
        return
      }
      const next = result.categories || []
      onCategoriesChange?.(next)
      setPendingDelete(null)
      setCategory((current) => {
        if (current !== item.name) return current
        return next[0]?.name || ''
      })
      if (!next.length) setAdding(true)
    } catch (err) {
      console.error('Error deleting category:', err)
      setError(err.message || 'star.needName')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteCategory = (item) => {
    if (used.has(item.name.toLowerCase())) {
      setPendingDelete(item)
      setOpen(false)
      return
    }
    applyDelete(item)
  }

  const handleRenameCategory = (item) => {
    setRenaming(item)
    setDraft(item.name)
    setAdding(false)
    setOpen(false)
    setError('')
  }

  const applyRename = async (event) => {
    event.preventDefault()
    if (!renaming) return
    const name = draft.trim()
    if (!name) {
      setError('star.needName')
      return
    }
    setBusy(true)
    try {
      const result = onRenameCategory
        ? await onRenameCategory(renaming.id, name)
        : { ok: false, error: 'star.needName' }
      if (!result?.ok) {
        setError(result?.error || 'star.needName')
        return
      }
      const next = result.categories || []
      onCategoriesChange?.(next)
      setCategory((current) => (current === renaming.name ? name : current))
      setRenaming(null)
      setDraft('')
      setError('')
    } catch (err) {
      console.error('Error renaming category:', err)
      setError(err.message || 'star.needName')
    } finally {
      setBusy(false)
    }
  }

  const saveStar = useCallback(async () => {
    const parsedDuration = Number.parseFloat(duration)
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setError('star.needMinutes')
      return
    }
    if (!category) {
      setError('star.needCategory')
      return
    }

    setBusy(true)
    try {
      const result = await onSave({
        id: `${Date.now()}`,
        title: mission.title,
        category,
        duration: parsedDuration,
        date: todayKey(),
        notes: notes.trim(),
        missionId: mission.id,
      })
      if (result?.ok === false) {
        setError(result.error || 'star.needMinutes')
      }
    } catch (err) {
      console.error('Error saving star:', err)
      setError(err.message || 'star.needMinutes')
    } finally {
      setBusy(false)
    }
  }, [duration, category, notes, mission, onSave])

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      const parsedDuration = Number.parseFloat(duration)
      if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
        setError('star.needMinutes')
        return
      }
      if (!category) {
        setError('star.needCategory')
        return
      }
      if (!session?.id && !hasRecords && !guestNoticeSeen()) {
        setGuestNotice(true)
        return
      }
      await saveStar()
    },
    [duration, category, hasRecords, saveStar, session],
  )

  const continueAsGuest = async () => {
    markGuestNoticeSeen()
    setGuestNotice(false)
    await saveStar()
  }

  const goAuth = (pageId) => {
    markGuestNoticeSeen()
    onNeedAuth?.(pageId)
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
        <p className={styles.kicker}>{t('star.kicker')}</p>
        <h2 id={titleId} className={styles.title}>
          {t('star.title')}
        </h2>
        <p className={styles.mission}>{mission.title}</p>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="star-duration" className={styles.label}>
              {t('star.duration')}
            </label>
            <input
              id="star-duration"
              ref={firstField}
              type="text"
              inputMode="decimal"
              value={duration}
              onChange={(event) => setDuration(sanitizeDuration(event.target.value))}
              onPaste={(event) => {
                event.preventDefault()
                const pasted = event.clipboardData.getData('text')
                const input = event.currentTarget
                const start = input.selectionStart ?? duration.length
                const end = input.selectionEnd ?? duration.length
                setDuration(sanitizeDuration(`${duration.slice(0, start)}${pasted}${duration.slice(end)}`))
              }}
              onKeyDown={(event) => {
                if (event.metaKey || event.ctrlKey || event.altKey) return
                const allowed = ['Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
                if (allowed.includes(event.key)) return
                if (event.key === '.' && duration.includes('.')) {
                  event.preventDefault()
                  return
                }
                if (event.key === '.' || /^\d$/.test(event.key)) return
                event.preventDefault()
              }}
              className={styles.input}
              placeholder="45"
            />
          </div>

          <div ref={menuRef} className={styles.categoryField}>
            <span className={styles.label} id="star-category-label">
              {t('star.category')}
            </span>
            <button
              type="button"
              className={styles.select}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-labelledby="star-category-label"
              onClick={() => setOpen((value) => !value)}
            >
              {category || t('star.chooseCategory')}
            </button>
            {open ? (
              <ul className={styles.menu} role="listbox" aria-labelledby="star-category-label">
                {categories.map((item) => (
                    <li key={item.id} className={styles.menuRow}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={category === item.name}
                        className={styles.menuChoice}
                        onClick={() => {
                          setCategory(item.name)
                          setAdding(false)
                          setOpen(false)
                        }}
                      >
                        {item.name}
                      </button>
                      <button
                        type="button"
                        className={styles.menuDelete}
                        aria-label={t('star.renameCategory', { name: item.name })}
                        onClick={() => handleRenameCategory(item)}
                      >
                        {t('star.rename')}
                      </button>
                      <button
                        type="button"
                        className={styles.menuDelete}
                        aria-label={t('star.deleteCategory', { name: item.name })}
                        onClick={() => handleDeleteCategory(item)}
                      >
                        {t('star.delete')}
                      </button>
                    </li>
                ))}
                <li>
                  <button
                    type="button"
                    className={styles.menuAdd}
                    onClick={() => {
                      setAdding(true)
                      setRenaming(null)
                      setDraft('')
                      setOpen(false)
                    }}
                  >
                    {t('star.addCategory')}
                  </button>
                </li>
              </ul>
            ) : null}

            {adding || renaming ? (
              <div className={styles.addRow}>
                <input
                  ref={nameField}
                  type="text"
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value)
                    if (error) setError('')
                  }}
                  className={styles.input}
                  placeholder={renaming ? t('star.renamePlaceholder') : t('star.newCategory')}
                  aria-label={renaming ? t('star.renamePlaceholder') : t('star.newCategory')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      if (renaming) applyRename(event)
                      else handleCreateCategory(event)
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.miniPrimary}
                  onClick={renaming ? applyRename : handleCreateCategory}
                  disabled={busy}
                >
                  {t('star.save')}
                </button>
                {categories.length > 0 || renaming ? (
                  <button
                    type="button"
                    className={styles.miniGhost}
                    onClick={() => {
                      setAdding(false)
                      setRenaming(null)
                      setDraft('')
                      setError('')
                    }}
                  >
                    {t('star.cancel')}
                  </button>
                ) : null}
              </div>
            ) : null}

            {pendingDelete ? (
              <div className={styles.warn} role="alertdialog" aria-labelledby="category-delete-title">
                <p id="category-delete-title">
                  {t('star.categoryUsed', { name: pendingDelete.name })}
                </p>
                <div className={styles.warnActions}>
                  <button type="button" className={styles.miniGhost} onClick={() => setPendingDelete(null)}>
                    {t('star.keep')}
                  </button>
                  <button type="button" className={styles.miniPrimary} disabled={busy} onClick={() => applyDelete(pendingDelete)}>
                    {t('star.deleteCategoryBtn')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label htmlFor="star-notes" className={styles.label}>
              {t('star.notes')}
            </label>
            <textarea
              id="star-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={styles.textarea}
              rows="4"
              placeholder={t('star.notesPlaceholder')}
            />
          </div>

          {error && <p className={styles.error}>{t(error)}</p>}

          {guestNotice ? (
            <div className={styles.warn} role="alertdialog" aria-labelledby="guest-notice-title">
              <p id="guest-notice-title">
                <strong>{t('star.guestNoticeTitle')}</strong>
                {' '}
                {t('star.guestNotice')}
              </p>
              <div className={styles.warnActions}>
                <button type="button" className={styles.miniGhost} onClick={() => goAuth('login')}>
                  {t('account.login')}
                </button>
                <button type="button" className={styles.miniGhost} onClick={() => goAuth('signup')}>
                  {t('account.signup')}
                </button>
                <button type="button" className={styles.miniPrimary} onClick={continueAsGuest} disabled={busy}>
                  {t('star.guestContinue')}
                </button>
              </div>
            </div>
          ) : null}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.secondary}>
              {t('star.cancel')}
            </button>
            <button type="submit" className={styles.primary} disabled={!category || busy}>
              {t('star.place')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
