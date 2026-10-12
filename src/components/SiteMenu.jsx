import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import styles from './SiteMenu.module.css'

const NAV = [
  { id: 'home', key: 'nav.home' },
  { id: 'galaxy', key: 'nav.galaxy' },
  { id: 'lab', key: 'nav.lab' },
  { id: 'community', key: 'nav.community' },
]

export default function SiteMenu({
  currentPage = 'home',
  onNavigate,
  theme = 'light',
  onThemeChange,
}) {
  const { t, language, setLanguage } = useI18n()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [currentPage])

  const go = (id) => {
    setOpen(false)
    onNavigate?.(id)
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? t('menu.close') : t('menu.open')}
      </button>

      {open ? (
        <div className={styles.panel} id={menuId} role="dialog" aria-label={t('menu.label')}>
          <nav className={styles.pages} aria-label={t('nav.mobile')}>
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={currentPage === item.id ? styles.pageActive : undefined}
                aria-current={currentPage === item.id ? 'page' : undefined}
                onClick={() => go(item.id)}
              >
                {t(item.key)}
              </button>
            ))}
          </nav>

          <section className={styles.block}>
            <p>{t('menu.appearance')}</p>
            <div role="group" aria-label={t('menu.appearance')}>
              <button
                type="button"
                aria-pressed={theme === 'light'}
                onClick={() => onThemeChange?.('light')}
              >
                {t('menu.light')}
              </button>
              <button
                type="button"
                aria-pressed={theme === 'dark'}
                onClick={() => onThemeChange?.('dark')}
              >
                {t('menu.dark')}
              </button>
            </div>
          </section>

          <section className={styles.block}>
            <p>{t('menu.language')}</p>
            <div role="group" aria-label={t('menu.language')}>
              <button
                type="button"
                aria-pressed={language === 'en'}
                onClick={() => setLanguage('en')}
              >
                {t('menu.english')}
              </button>
              <button
                type="button"
                aria-pressed={language === 'zh'}
                onClick={() => setLanguage('zh')}
              >
                {t('menu.chinese')}
              </button>
            </div>
          </section>

          <button
            type="button"
            className={styles.account}
            aria-current={currentPage === 'account' ? 'page' : undefined}
            onClick={() => go('account')}
          >
            {t('menu.account')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
